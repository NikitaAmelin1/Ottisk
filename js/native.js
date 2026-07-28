/**
 * Capacitor bridge. Uses window.Capacitor injected by the native shell.
 * On GitHub Pages this stays a harmless no-op.
 */
const Native = {
  isNative: false,
  platform: "web",
  ready: false,
  billingAvailable: false,
  appVersion: "1.2.1",
  versionCode: 13,
  async haptic() {},
  async purchase() {
    return { ok: false, message: "покупка · только в приложении" };
  },
  async restorePurchases() {
    return { ok: false, message: "восстановление · только в приложении", productIds: [] };
  },
  async requestReview() {
    return false;
  },
  async getAppInfo() {
    return { version: Native.appVersion, build: String(Native.versionCode), platform: Native.platform };
  },
  async openStoreListing() {
    return false;
  },
  async scheduleDailyReminder() {
    return false;
  },
  async cancelDailyReminder() {
    return false;
  },
};

function plugins() {
  return window.Capacitor?.Plugins || {};
}

function storeUrl() {
  if (Native.platform === "android") {
    return "https://play.google.com/store/apps/details?id=com.amelin.ottisk";
  }
  const appId = window.OTTISK_APP_STORE_ID;
  if (appId) return `https://apps.apple.com/app/id${appId}`;
  return "https://nikitaamelin1.github.io/Ottisk/";
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
    const info = await p.App?.getInfo?.();
    if (info?.version) Native.appVersion = String(info.version);
    if (info?.build) Native.versionCode = Number(info.build) || Native.versionCode;
  } catch (_) {}

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
      const more = document.getElementById("screen-more");
      const auth = document.getElementById("screen-auth");
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
      if (visible(more)) {
        document.getElementById("btn-more-back")?.click?.();
        return;
      }
      if (visible(auth)) {
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

  Native.getAppInfo = async () => {
    try {
      const info = await p.App?.getInfo?.();
      if (info) {
        return {
          version: String(info.version || Native.appVersion),
          build: String(info.build || Native.versionCode),
          platform: Native.platform,
        };
      }
    } catch (_) {}
    return { version: Native.appVersion, build: String(Native.versionCode), platform: Native.platform };
  };

  Native.openStoreListing = async () => {
    try {
      const url = storeUrl();
      if (p.App?.openUrl) {
        await p.App.openUrl({ url });
        return true;
      }
      window.open(url, "_blank");
      return true;
    } catch (_) {
      return false;
    }
  };

  const hasIap = typeof p.OttiskIAP?.purchase === "function";
  if (hasIap) {
    try {
      const avail = await p.OttiskIAP.isAvailable?.();
      Native.billingAvailable = avail?.ok !== false;
    } catch (_) {
      Native.billingAvailable = true;
    }
  } else {
    Native.billingAvailable = false;
  }

  Native.purchase = async (productId) => {
    if (!Native.billingAvailable || typeof p.OttiskIAP?.purchase !== "function") {
      return {
        ok: false,
        message: Native.platform === "android"
          ? "Google Play Billing недоступен"
          : "StoreKit ещё не подключён в Xcode",
        productId,
      };
    }
    return p.OttiskIAP.purchase({ productId });
  };

  Native.restorePurchases = async () => {
    if (!Native.billingAvailable) {
      return {
        ok: false,
        message: Native.platform === "android"
          ? "восстановление · Google Play недоступен"
          : "StoreKit restore ещё не подключён",
        productIds: [],
      };
    }
    if (typeof p.OttiskIAP?.restore === "function") return p.OttiskIAP.restore();
    if (typeof p.OttiskIAP?.restorePurchases === "function") return p.OttiskIAP.restorePurchases();
    return { ok: false, message: "restore недоступен", productIds: [] };
  };

  Native.requestReview = async () => {
    try {
      if (typeof p.OttiskIAP?.requestReview === "function") {
        await p.OttiskIAP.requestReview();
        return true;
      }
      if (Native.platform === "android") {
        return Native.openStoreListing();
      }
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

  Native.scheduleDailyReminder = async (options = {}) => {
    try {
      const LocalNotifications = p.LocalNotifications;
      if (!LocalNotifications) return false;
      const perm = await LocalNotifications.requestPermissions?.() || await LocalNotifications.checkPermissions?.();
      if (perm && perm.display && perm.display !== "granted") return false;
      const hour = Number(options.hour ?? 19);
      const minute = Number(options.minute ?? 0);
      const title = options.title || "ОТТИСК";
      const body = options.body || "Ежедневный подарок и забег дня ждут";
      await LocalNotifications.cancel?.({ notifications: [{ id: 7101 }] });
      await LocalNotifications.schedule?.({
        notifications: [{
          id: 7101,
          title,
          body,
          schedule: {
            on: { hour, minute },
            repeats: true,
            allowWhileIdle: true,
          },
          channelId: "ottisk-daily",
        }],
      });
      return true;
    } catch (_) {
      return false;
    }
  };

  Native.cancelDailyReminder = async () => {
    try {
      await p.LocalNotifications?.cancel?.({ notifications: [{ id: 7101 }] });
      return true;
    } catch (_) {
      return false;
    }
  };

  try {
    await p.LocalNotifications?.createChannel?.({
      id: "ottisk-daily",
      name: "Ежедневные напоминания",
      description: "Подарки и забег дня",
      importance: 3,
      visibility: 1,
    });
  } catch (_) {}

  Native.ready = true;
  window.OttiskNative = Native;
  document.dispatchEvent(new CustomEvent("ottisk-native-ready", { detail: { platform: Native.platform } }));
}

window.OttiskNative = Native;
bootNative();
