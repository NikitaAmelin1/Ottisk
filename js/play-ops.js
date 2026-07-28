/**
 * Play-ready helpers: soft update banner + daily local reminder.
 */
(function attachOttiskPlayOps(global) {
  "use strict";

  const REMINDER_KEY = "ottisk-daily-reminder-v1";
  const UPDATE_DISMISS_KEY = "ottisk-update-dismiss-v1";

  function locale() {
    return global.OttiskI18n?.locale === "en" ? "en" : "ru";
  }

  function t(ru, en) {
    return locale() === "en" ? en : ru;
  }

  async function checkSoftUpdate() {
    const banner = global.document?.getElementById("update-banner");
    if (!banner) return null;
    try {
      const res = await fetch("./version.json", { cache: "no-store" });
      if (!res.ok) return null;
      const remote = await res.json();
      const info = await global.OttiskNative?.getAppInfo?.() || {};
      const platform = global.OttiskNative?.platform || "web";
      const dismissed = String(global.localStorage?.getItem(UPDATE_DISMISS_KEY) || "");

      let outdated = false;
      let remoteToken = "";
      let storeUrl = remote?.storeUrl?.[platform] || remote?.storeUrl?.web || "";

      if (platform === "android") {
        const localCode = Number(info.build || global.OttiskNative?.versionCode || 0);
        const remoteCode = Number(remote?.android?.versionCode || 0);
        remoteToken = String(remoteCode);
        outdated = remoteCode > 0 && localCode > 0 && remoteCode > localCode;
        storeUrl = remote?.storeUrl?.android || storeUrl;
      } else if (platform === "ios") {
        const local = String(info.version || "");
        const remoteVer = String(remote?.ios?.version || "");
        remoteToken = remoteVer;
        outdated = !!(local && remoteVer && local !== remoteVer);
        storeUrl = remote?.storeUrl?.ios || storeUrl;
      } else {
        const local = String(info.version || global.OttiskNative?.appVersion || "");
        const remoteVer = String(remote?.web?.version || "");
        remoteToken = remoteVer;
        // Web soft-update only when hosted version.json is newer than baked appVersion
        // and user is on an older cached build — compare as strings for now.
        outdated = !!(local && remoteVer && remoteVer !== local);
        storeUrl = remote?.storeUrl?.web || storeUrl;
      }

      if (!outdated || dismissed === remoteToken) {
        banner.classList.add("hidden");
        return null;
      }

      const msg = remote?.message?.[locale()] || remote?.message?.ru || t(
        "Доступна новая версия",
        "A new version is available",
      );
      const text = banner.querySelector("#update-banner-text");
      if (text) text.textContent = msg;
      banner.dataset.remoteCode = remoteToken;
      banner.dataset.storeUrl = storeUrl;
      banner.classList.remove("hidden");
      return remote;
    } catch (_) {
      banner.classList.add("hidden");
      return null;
    }
  }

  function wireUpdateBanner() {
    const banner = global.document?.getElementById("update-banner");
    if (!banner || banner.dataset.wired) return;
    banner.dataset.wired = "1";
    banner.querySelector("#update-banner-open")?.addEventListener("click", async () => {
      if (global.OttiskNative?.openStoreListing) {
        await global.OttiskNative.openStoreListing();
        return;
      }
      const url = banner.dataset.storeUrl;
      if (url) global.open(url, "_blank");
    });
    banner.querySelector("#update-banner-dismiss")?.addEventListener("click", () => {
      try {
        global.localStorage?.setItem(UPDATE_DISMISS_KEY, banner.dataset.remoteCode || "1");
      } catch (_) {}
      banner.classList.add("hidden");
    });
  }

  function reminderEnabled() {
    try {
      return global.localStorage?.getItem(REMINDER_KEY) === "1";
    } catch (_) {
      return false;
    }
  }

  function setReminderEnabled(on) {
    try {
      global.localStorage?.setItem(REMINDER_KEY, on ? "1" : "0");
    } catch (_) {}
  }

  async function syncReminderToggle() {
    const btn = global.document?.getElementById("btn-daily-reminder");
    if (!btn) return;
    const on = reminderEnabled();
    btn.classList.toggle("on", on);
    btn.setAttribute("aria-pressed", on ? "true" : "false");
    btn.textContent = on
      ? t("напоминание · вкл", "reminder · on")
      : t("напоминание · выкл", "reminder · off");
  }

  async function toggleReminder() {
    const next = !reminderEnabled();
    if (next) {
      const ok = await global.OttiskNative?.scheduleDailyReminder?.({
        hour: 19,
        minute: 0,
        title: "ОТТИСК",
        body: t("Ежедневный подарок и забег дня ждут", "Your daily gift and run are waiting"),
      });
      if (!ok && global.OttiskNative?.isNative) {
        setReminderEnabled(false);
        await syncReminderToggle();
        return { ok: false, message: t("разрешите уведомления", "allow notifications") };
      }
      setReminderEnabled(true);
      await syncReminderToggle();
      return { ok: true, message: t("напоминание на 19:00", "reminder at 19:00") };
    }
    await global.OttiskNative?.cancelDailyReminder?.();
    setReminderEnabled(false);
    await syncReminderToggle();
    return { ok: true, message: t("напоминание выкл", "reminder off") };
  }

  async function ensureReminderScheduled() {
    if (!reminderEnabled()) return;
    await global.OttiskNative?.scheduleDailyReminder?.({
      hour: 19,
      minute: 0,
      title: "ОТТИСК",
      body: t("Ежедневный подарок и забег дня ждут", "Your daily gift and run are waiting"),
    });
  }

  global.OttiskPlayOps = Object.freeze({
    checkSoftUpdate,
    wireUpdateBanner,
    toggleReminder,
    syncReminderToggle,
    ensureReminderScheduled,
    reminderEnabled,
  });
})(globalThis);
