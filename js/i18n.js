/**
 * Lightweight Russian/English UI localization.
 * Dynamic gameplay may request keys through OttiskI18n.t().
 */
(function attachOttiskI18n(root) {
  const KEY = "ottisk-lang-v1";
  const STRINGS = {
    ru: {
      record: "рекорд",
      shop: "Магазин",
      shop_sub: "герои · следы · донат",
      hold_title: "Удерживай палец",
      joystick_title: "Веди джойстиком",
      hold_lead: "Существо живёт только в касании",
      joystick_lead: "Держи стик — герой живёт, пока касание активно",
      play: "Играть",
      daily: "день",
      coop: "дуэт",
      endless: "бесконечный",
      boss_rush: "боссы",
      calm: "спокойный",
      normal_run: "обычный забег",
      less_motion: "меньше движения",
      contrast: "контраст",
      quality_auto: "качество · авто",
      trophies: "Трофеи",
      progress: "Прогресс",
      progress_help: "Сохрани файл или перенеси код на другое устройство.",
      save: "Сохранить",
      transfer_code: "Код переноса",
      load: "Загрузить",
      cloud: "Облако и рейтинг",
      cloud_setup: "Подключить",
      cloud_sync: "Синхронизировать",
      leaderboard: "Рейтинг дня",
      crashes: "отчёты об ошибках",
      about: "О игре",
      privacy: "Конфиденциальность",
      support: "Поддержка",
      run_broken: "След оборвался",
      light: "света",
      share: "Поделиться",
      retry: "Ещё раз",
      menu: "В меню",
      mode_endless: "бесконечный океан",
      mode_boss: "босс-раш",
      mode_calm: "спокойный режим",
    },
    en: {
      record: "best",
      shop: "Shop",
      shop_sub: "heroes · trails · support",
      hold_title: "Hold your finger",
      joystick_title: "Guide with the joystick",
      hold_lead: "The creature lives only while you touch",
      joystick_lead: "Hold the stick — your creature lives while touch is active",
      play: "Play",
      daily: "daily",
      coop: "duo",
      endless: "endless",
      boss_rush: "bosses",
      calm: "calm",
      normal_run: "normal run",
      less_motion: "less motion",
      contrast: "contrast",
      quality_auto: "quality · auto",
      trophies: "Trophies",
      progress: "Progress",
      progress_help: "Save a file or use a transfer code on another device.",
      save: "Save",
      transfer_code: "Transfer code",
      load: "Load",
      cloud: "Cloud and leaderboard",
      cloud_setup: "Connect",
      cloud_sync: "Sync",
      leaderboard: "Daily leaderboard",
      crashes: "anonymous crash reports",
      about: "About",
      privacy: "Privacy",
      support: "Support",
      run_broken: "The trail ended",
      light: "light",
      share: "Share",
      retry: "Again",
      menu: "Menu",
      mode_endless: "endless ocean",
      mode_boss: "boss rush",
      mode_calm: "calm mode",
    },
  };

  function detect() {
    const saved = root.localStorage?.getItem(KEY);
    if (saved === "ru" || saved === "en") return saved;
    return String(root.navigator?.language || "ru").toLowerCase().startsWith("en") ? "en" : "ru";
  }

  let locale = detect();

  function t(key, fallback = "") {
    return STRINGS[locale]?.[key] ?? STRINGS.ru[key] ?? fallback ?? key;
  }

  function apply() {
    if (!root.document) return;
    root.document.documentElement.lang = locale;
    root.document.querySelectorAll("[data-i18n]").forEach((node) => {
      node.textContent = t(node.dataset.i18n, node.textContent);
    });
    root.document.querySelectorAll("[data-i18n-aria]").forEach((node) => {
      node.setAttribute("aria-label", t(node.dataset.i18nAria, node.getAttribute("aria-label") || ""));
    });
    const button = root.document.getElementById("btn-lang");
    if (button) {
      button.textContent = locale === "ru" ? "EN" : "RU";
      button.setAttribute("aria-label", locale === "ru" ? "Switch to English" : "Переключить на русский");
    }
  }

  function setLocale(next) {
    if (!STRINGS[next]) return locale;
    locale = next;
    try { root.localStorage?.setItem(KEY, locale); } catch (_) {}
    apply();
    root.dispatchEvent?.(new CustomEvent("ottisk-language", { detail: { locale } }));
    return locale;
  }

  function toggle() {
    return setLocale(locale === "ru" ? "en" : "ru");
  }

  root.OttiskI18n = { t, apply, setLocale, toggle, get locale() { return locale; } };
})(globalThis);
