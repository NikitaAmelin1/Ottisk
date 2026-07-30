/**
 * Progressive Web App install prompt (A2HS).
 * Android/Chrome: beforeinstallprompt. iOS Safari: explicit Share → Home tip.
 * Exposes window.OttiskPwa.setup(rootEl)
 */
(function attachOttiskPwa(root) {
  "use strict";

  let deferred = null;

  function isIos() {
    const ua = navigator.userAgent || "";
    return /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  }

  function isStandalone() {
    return window.matchMedia("(display-mode: standalone)").matches
      || window.navigator.standalone === true
      || document.referrer.includes("android-app://");
  }

  function setup(host) {
    if (!host || host.dataset.pwaReady) return;
    host.dataset.pwaReady = "1";

    const tip = document.createElement("button");
    tip.type = "button";
    tip.id = "btn-install-pwa";
    tip.className = "install-tip install-tip-btn";
    tip.setAttribute("aria-label", "Установить ОТТИСК на домашний экран");
    host.appendChild(tip);

    const paint = () => {
      if (isStandalone()) {
        tip.classList.add("hidden");
        tip.textContent = "Установлено";
        return;
      }
      tip.classList.remove("hidden");
      if (deferred) {
        tip.textContent = "Установить на домашний экран";
      } else if (isIos()) {
        tip.textContent = "iPhone · Поделиться → На экран «Домой»";
      } else {
        tip.textContent = "Добавить на домашний экран";
      }
    };

    paint();

    window.addEventListener("beforeinstallprompt", (event) => {
      event.preventDefault();
      deferred = event;
      paint();
    });

    tip.addEventListener("click", async () => {
      if (isStandalone()) return;
      if (deferred) {
        deferred.prompt();
        const choice = await deferred.userChoice.catch(() => null);
        deferred = null;
        if (choice?.outcome === "accepted") {
          tip.textContent = "Установлено";
          tip.classList.add("hidden");
        } else {
          paint();
        }
        return;
      }
      if (isIos()) {
        tip.textContent = "Поделиться → На экран «Домой»";
        document.dispatchEvent(new CustomEvent("ottisk-toast", {
          detail: { text: "Safari · Поделиться → На экран «Домой»" },
        }));
        return;
      }
      tip.textContent = "Меню браузера → «Установить приложение»";
      document.dispatchEvent(new CustomEvent("ottisk-toast", {
        detail: { text: "Открой меню браузера → Установить / На экран" },
      }));
    });

    window.addEventListener("appinstalled", () => {
      deferred = null;
      tip.classList.add("hidden");
      tip.textContent = "Установлено";
    });

    root.OttiskPwa.isStandalone = isStandalone;
    root.OttiskPwa.isIos = isIos;
    root.OttiskPwa.refresh = paint;
  }

  root.OttiskPwa = { setup, isStandalone, isIos };
})(typeof globalThis !== "undefined" ? globalThis : window);
