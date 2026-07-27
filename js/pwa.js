/**
 * Progressive Web App install prompt (A2HS).
 * Exposes window.OttiskPwa.setup(rootEl)
 */
(function attachOttiskPwa(root) {
  "use strict";

  let deferred = null;

  function setup(host) {
    if (!host || host.dataset.pwaReady) return;
    host.dataset.pwaReady = "1";

    const tip = document.createElement("button");
    tip.type = "button";
    tip.id = "btn-install-pwa";
    tip.className = "install-tip install-tip-btn hidden";
    tip.textContent = "Установить на домашний экран";
    tip.setAttribute("aria-label", "Установить ОТТИСК");
    host.appendChild(tip);

    window.addEventListener("beforeinstallprompt", (event) => {
      event.preventDefault();
      deferred = event;
      tip.classList.remove("hidden");
    });

    tip.addEventListener("click", async () => {
      if (!deferred) {
        tip.textContent = "Открой «Поделиться» → На экран «Домой»";
        return;
      }
      deferred.prompt();
      const choice = await deferred.userChoice.catch(() => null);
      deferred = null;
      tip.classList.add("hidden");
      if (choice?.outcome === "accepted") {
        tip.textContent = "Установлено";
      }
    });

    window.addEventListener("appinstalled", () => {
      deferred = null;
      tip.classList.add("hidden");
    });
  }

  root.OttiskPwa = { setup };
})(typeof globalThis !== "undefined" ? globalThis : window);
