/**
 * Capacitor bridge. Uses window.Capacitor injected by the native shell.
 * On GitHub Pages this stays a harmless no-op.
 */
const Native = {
  isNative: false,
  platform: "web",
  ready: false,
  async haptic() {},
  async purchase() {
    return { ok: false, message: "покупка · только в App Store" };
  },
  async restorePurchases() {
    return { ok: false, message: "восстановление · только в App Store", productIds: [] };
  },
  async requestReview() {
    return false;
  },
};

function plugins() {
  return window.Capacitor?.Plugins || {};
}

async function bootNative() {
  const Cap = window.Capacitor;
  Native.isNative = !!(Cap && (Cap.isNativePlatform?.() || Cap.getPlatform?.() !== "web"));
  Native.platform = Cap?.getPlatform?.() || "web";

  if (!Native.isNative) {
    window.OttiskNative = Native;
    return;
  }

  const p = plugins();
  try {
    await p.StatusBar?.setStyle?.({ style: "DARK" });
    await p.StatusBar?.setBackgroundColor?.({ color: "#120d14" });
    await p.SplashScreen?.hide?.();
  } catch (_) {
    // optional plugins
  }

  try {
    await p.App?.addListener?.("appStateChange", ({ isActive }) => {
      document.dispatchEvent(new CustomEvent("ottisk-app-state", { detail: { isActive } }));
    });
    await p.App?.addListener?.("backButton", ({ canGoBack }) => {
      const over = document.getElementById("screen-over");
      const cont = document.getElementById("screen-continue");
      const donate = document.getElementById("screen-donate");
      const draw = document.getElementById("screen-draw");
      const onboard = document.getElementById("screen-onboard");
      const hero = document.getElementById("screen-hero");
      const diff = document.getElementById("screen-diff");
      const start = document.getElementById("screen-start");
      const visible = (el) => el && !el.classList.contains("hidden");
      if (visible(donate)) {
        document.getElementById("btn-donate-close")?.click?.();
        return;
      }
      if (visible(draw)) {
        document.getElementById("btn-draw-cancel")?.click?.();
        return;
      }
      if (visible(onboard)) {
        onboard.classList.add("hidden");
        start?.classList.remove("hidden");
        return;
      }
      if (visible(diff)) {
        document.getElementById("btn-diff-back")?.click?.();
        return;
      }
      if (visible(hero)) {
        document.getElementById("btn-hero-back")?.click?.();
        return;
      }
      if (visible(cont)) {
        document.getElementById("btn-skip-continue")?.click?.();
        return;
      }
      if (visible(over)) {
        document.getElementById("btn-menu")?.click?.();
        return;
      }
      if (document.getElementById("app")?.classList.contains("in-run")) {
        document.dispatchEvent(new CustomEvent("ottisk-request-pause"));
        return;
      }
      if (canGoBack) window.history.back();
      else p.App?.exitApp?.();
    });
  } catch (_) {
    // noop
  }

  Native.haptic = async (style = "light") => {
    const map = { light: "LIGHT", medium: "MEDIUM", heavy: "HEAVY" };
    try {
      await p.Haptics?.impact?.({ style: map[style] || "LIGHT" });
    } catch (_) {
      // noop
    }
  };

  // Wire a StoreKit plugin here later (e.g. RevenueCat / Native Purchases).
  // Expected product IDs:
  //   ottisk_marks_60, ottisk_continue_10rub, ottisk_starter_pack,
  //   ottisk_submarine, ottisk_hero_eel|squid|seahorse|whale,
  //   ottisk_tip_small|mid|big
  Native.purchase = async (productId) => {
    if (typeof p.OttiskIAP?.purchase === "function") {
      return p.OttiskIAP.purchase({ productId });
    }
    return {
      ok: false,
      message: "StoreKit ещё не подключён в Xcode",
      productId,
    };
  };

  Native.restorePurchases = async () => {
    if (typeof p.OttiskIAP?.restore === "function") {
      return p.OttiskIAP.restore();
    }
    if (typeof p.OttiskIAP?.restorePurchases === "function") {
      return p.OttiskIAP.restorePurchases();
    }
    return {
      ok: false,
      message: "StoreKit restore ещё не подключён",
      productIds: [],
    };
  };

  Native.requestReview = async () => {
    try {
      if (typeof p.OttiskIAP?.requestReview === "function") {
        await p.OttiskIAP.requestReview();
        return true;
      }
      // Fallback: open App Store write-review URL when configured.
      const appId = window.OTTISK_APP_STORE_ID;
      if (appId && p.App?.openUrl) {
        await p.App.openUrl({ url: `itms-apps://itunes.apple.com/app/id${appId}?action=write-review` });
        return true;
      }
    } catch (_) {
      // noop
    }
    return false;
  };

  Native.ready = true;
  window.OttiskNative = Native;
}

window.OttiskNative = Native;
bootNative();
