package com.amelin.ottisk;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.net.Uri;
import android.os.Handler;
import android.os.Looper;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;

import com.android.billingclient.api.AcknowledgePurchaseParams;
import com.android.billingclient.api.BillingClient;
import com.android.billingclient.api.BillingClientStateListener;
import com.android.billingclient.api.BillingFlowParams;
import com.android.billingclient.api.BillingResult;
import com.android.billingclient.api.PendingPurchasesParams;
import com.android.billingclient.api.ProductDetails;
import com.android.billingclient.api.Purchase;
import com.android.billingclient.api.PurchasesUpdatedListener;
import com.android.billingclient.api.QueryProductDetailsParams;
import com.android.billingclient.api.QueryPurchasesParams;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.android.play.core.review.ReviewManager;
import com.google.android.play.core.review.ReviewManagerFactory;

import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Google Play Billing + In-App Review bridge for ОТТИСК.
 * Product IDs must match Play Console and js/game.js.
 */
@CapacitorPlugin(name = "OttiskIAP")
public class OttiskIAPPlugin extends Plugin implements PurchasesUpdatedListener {
  private static final String[] PRODUCT_IDS = new String[] {
    "ottisk_marks_60",
    "ottisk_continue_10rub",
    "ottisk_starter_pack",
    "ottisk_submarine",
    "ottisk_hero_eel",
    "ottisk_hero_squid",
    "ottisk_hero_seahorse",
    "ottisk_hero_whale",
    "ottisk_tip_small",
    "ottisk_tip_mid",
    "ottisk_tip_big"
  };

  private final Handler mainHandler = new Handler(Looper.getMainLooper());
  private BillingClient billingClient;
  private final Map<String, ProductDetails> catalog = new HashMap<>();
  private PluginCall pendingPurchase;
  private boolean ready = false;

  @Override
  public void load() {
    PendingPurchasesParams pending = PendingPurchasesParams.newBuilder()
      .enableOneTimeProducts()
      .build();
    billingClient = BillingClient.newBuilder(getContext())
      .setListener(this)
      .enablePendingPurchases(pending)
      .build();
    startConnection(null);
  }

  private void startConnection(@Nullable Runnable onReady) {
    if (billingClient == null) return;
    if (billingClient.isReady()) {
      ready = true;
      if (onReady != null) onReady.run();
      return;
    }
    billingClient.startConnection(new BillingClientStateListener() {
      @Override
      public void onBillingSetupFinished(@NonNull BillingResult billingResult) {
        ready = billingResult.getResponseCode() == BillingClient.BillingResponseCode.OK;
        if (ready) {
          refreshCatalog(() -> {
            if (onReady != null) onReady.run();
          });
        } else if (onReady != null) {
          onReady.run();
        }
      }

      @Override
      public void onBillingServiceDisconnected() {
        ready = false;
      }
    });
  }

  private void refreshCatalog(@Nullable Runnable done) {
    List<QueryProductDetailsParams.Product> products = new ArrayList<>();
    for (String id : PRODUCT_IDS) {
      products.add(
        QueryProductDetailsParams.Product.newBuilder()
          .setProductId(id)
          .setProductType(BillingClient.ProductType.INAPP)
          .build()
      );
    }
    QueryProductDetailsParams params = QueryProductDetailsParams.newBuilder()
      .setProductList(products)
      .build();
    billingClient.queryProductDetailsAsync(params, (result, detailsResult) -> {
      catalog.clear();
      if (result.getResponseCode() == BillingClient.BillingResponseCode.OK && detailsResult != null) {
        List<ProductDetails> detailsList = detailsResult.getProductDetailsList();
        if (detailsList != null) {
          for (ProductDetails details : detailsList) {
            catalog.put(details.getProductId(), details);
          }
        }
      }
      if (done != null) done.run();
    });
  }

  @PluginMethod
  public void isAvailable(PluginCall call) {
    JSObject out = new JSObject();
    out.put("ok", ready && billingClient != null && billingClient.isReady());
    out.put("platform", "android");
    out.put("products", catalog.size());
    call.resolve(out);
  }

  @PluginMethod
  public void purchase(PluginCall call) {
    String productId = call.getString("productId", "");
    if (productId == null || productId.isEmpty()) {
      call.reject("missing_product");
      return;
    }
    ensureReady(() -> launchPurchase(call, productId));
  }

  private void ensureReady(Runnable action) {
    if (ready && billingClient != null && billingClient.isReady()) {
      action.run();
      return;
    }
    startConnection(action);
  }

  private void launchPurchase(PluginCall call, String productId) {
    ProductDetails details = catalog.get(productId);
    if (details == null) {
      refreshCatalog(() -> {
        ProductDetails refreshed = catalog.get(productId);
        if (refreshed == null) {
          resolvePurchaseFail(call, productId, "товар не найден в Google Play — создайте in-app product в Console");
          return;
        }
        startFlow(call, refreshed);
      });
      return;
    }
    startFlow(call, details);
  }

  @Nullable
  private ProductDetails.OneTimePurchaseOfferDetails firstOffer(ProductDetails details) {
    List<ProductDetails.OneTimePurchaseOfferDetails> list = details.getOneTimePurchaseOfferDetailsList();
    if (list != null && !list.isEmpty()) return list.get(0);
    return details.getOneTimePurchaseOfferDetails();
  }

  private void startFlow(PluginCall call, ProductDetails details) {
    Activity activity = getActivity();
    if (activity == null) {
      call.reject("no_activity");
      return;
    }
    if (pendingPurchase != null) {
      resolvePurchaseFail(call, details.getProductId(), "покупка уже идёт");
      return;
    }
    ProductDetails.OneTimePurchaseOfferDetails offer = firstOffer(details);
    if (offer == null) {
      resolvePurchaseFail(call, details.getProductId(), "нет предложения Google Play");
      return;
    }
    BillingFlowParams.ProductDetailsParams.Builder productBuilder =
      BillingFlowParams.ProductDetailsParams.newBuilder().setProductDetails(details);
    String offerToken = offer.getOfferToken();
    if (offerToken != null && !offerToken.isEmpty()) {
      productBuilder.setOfferToken(offerToken);
    }
    List<BillingFlowParams.ProductDetailsParams> paramsList = new ArrayList<>();
    paramsList.add(productBuilder.build());
    BillingFlowParams flowParams = BillingFlowParams.newBuilder()
      .setProductDetailsParamsList(paramsList)
      .build();
    pendingPurchase = call;
    BillingResult result = billingClient.launchBillingFlow(activity, flowParams);
    if (result.getResponseCode() != BillingClient.BillingResponseCode.OK) {
      pendingPurchase = null;
      resolvePurchaseFail(call, details.getProductId(), "не удалось открыть оплату · " + result.getResponseCode());
    }
  }

  private void resolvePurchaseFail(PluginCall call, String productId, String message) {
    JSObject fail = new JSObject();
    fail.put("ok", false);
    fail.put("message", message);
    fail.put("productId", productId);
    call.resolve(fail);
  }

  @Override
  public void onPurchasesUpdated(@NonNull BillingResult billingResult, @Nullable List<Purchase> purchases) {
    PluginCall call = pendingPurchase;
    pendingPurchase = null;
    if (call == null) {
      if (purchases != null) {
        for (Purchase purchase : purchases) acknowledge(purchase);
      }
      return;
    }
    if (billingResult.getResponseCode() == BillingClient.BillingResponseCode.USER_CANCELED) {
      resolvePurchaseFail(call, "", "покупка отменена");
      return;
    }
    if (billingResult.getResponseCode() != BillingClient.BillingResponseCode.OK || purchases == null || purchases.isEmpty()) {
      resolvePurchaseFail(call, "", "оплата не завершена");
      return;
    }
    Purchase purchase = purchases.get(0);
    acknowledge(purchase);
    JSObject ok = new JSObject();
    ok.put("ok", true);
    ok.put("productId", purchase.getProducts().isEmpty() ? "" : purchase.getProducts().get(0));
    JSArray ids = new JSArray();
    for (String id : purchase.getProducts()) ids.put(id);
    ok.put("productIds", ids);
    call.resolve(ok);
  }

  private void acknowledge(Purchase purchase) {
    if (purchase.getPurchaseState() != Purchase.PurchaseState.PURCHASED) return;
    if (purchase.isAcknowledged()) return;
    AcknowledgePurchaseParams params = AcknowledgePurchaseParams.newBuilder()
      .setPurchaseToken(purchase.getPurchaseToken())
      .build();
    billingClient.acknowledgePurchase(params, result -> {});
  }

  @PluginMethod
  public void restore(PluginCall call) {
    ensureReady(() -> queryOwned(call));
  }

  @PluginMethod
  public void restorePurchases(PluginCall call) {
    restore(call);
  }

  private void queryOwned(PluginCall call) {
    billingClient.queryPurchasesAsync(
      QueryPurchasesParams.newBuilder().setProductType(BillingClient.ProductType.INAPP).build(),
      (result, purchases) -> {
        Set<String> owned = new HashSet<>();
        if (result.getResponseCode() == BillingClient.BillingResponseCode.OK && purchases != null) {
          for (Purchase purchase : purchases) {
            if (purchase.getPurchaseState() == Purchase.PurchaseState.PURCHASED) {
              acknowledge(purchase);
              owned.addAll(purchase.getProducts());
            }
          }
        }
        JSObject out = new JSObject();
        out.put("ok", true);
        JSArray ids = new JSArray();
        for (String id : owned) ids.put(id);
        out.put("productIds", ids);
        call.resolve(out);
      }
    );
  }

  @PluginMethod
  public void requestReview(PluginCall call) {
    Activity activity = getActivity();
    if (activity == null) {
      call.resolve(new JSObject().put("ok", false));
      return;
    }
    ReviewManager manager = ReviewManagerFactory.create(getContext());
    manager.requestReviewFlow().addOnCompleteListener(task -> mainHandler.post(() -> {
      if (!task.isSuccessful()) {
        openPlayStore();
        call.resolve(new JSObject().put("ok", true).put("fallback", true));
        return;
      }
      manager.launchReviewFlow(activity, task.getResult()).addOnCompleteListener(launch ->
        call.resolve(new JSObject().put("ok", true))
      );
    }));
  }

  private void openPlayStore() {
    Activity activity = getActivity();
    if (activity == null) return;
    String id = activity.getPackageName();
    try {
      activity.startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse("market://details?id=" + id)));
    } catch (ActivityNotFoundException e) {
      activity.startActivity(new Intent(
        Intent.ACTION_VIEW,
        Uri.parse("https://play.google.com/store/apps/details?id=" + id)
      ));
    }
  }
}
