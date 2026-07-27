import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../..", import.meta.url);
const [css, privacy, support] = await Promise.all([
  readFile(new URL("css/style.css", root), "utf8"),
  readFile(new URL("privacy.html", root), "utf8"),
  readFile(new URL("support.html", root), "utf8"),
]);

const stored = new Map([["ottisk-lang-v1", "ru"]]);
globalThis.localStorage = {
  getItem: (key) => stored.get(key) ?? null,
  setItem: (key, value) => stored.set(key, String(value)),
};

await import("../../js/i18n.js");

test("accessibility and product terms are available in Russian and English", () => {
  const terms = [
    "score",
    "difficulty",
    "heroes",
    "restore_purchases",
    "run_complete",
    "cloud_conflict",
    "leaderboard_rank",
    "accessibility",
    "large_ui",
    "one_hand",
    "reduced_transparency",
    "colorblind_deuteranopia",
  ];

  for (const locale of ["ru", "en"]) {
    assert.equal(globalThis.OttiskI18n.setLocale(locale), locale);
    for (const key of terms) {
      const translation = globalThis.OttiskI18n.t(key);
      assert.equal(typeof translation, "string");
      assert.ok(translation.length > 1, `${locale}.${key} should be translated`);
      assert.notEqual(translation, key, `${locale}.${key} should not expose its key`);
    }
  }
});

test("localization remains safe without a DOM or CustomEvent", () => {
  const previous = globalThis.CustomEvent;
  try {
    delete globalThis.CustomEvent;
    assert.doesNotThrow(() => globalThis.OttiskI18n.setLocale("ru"));
    assert.doesNotThrow(() => globalThis.OttiskI18n.apply());
    assert.equal(globalThis.OttiskI18n.t("missing_key", "Readable fallback"), "Readable fallback");
    assert.equal(globalThis.OttiskI18n.t("missing_key"), "missing_key");
  } finally {
    if (previous) globalThis.CustomEvent = previous;
  }
});

test("stylesheet includes visual, motor, and system accessibility modes", () => {
  for (const feature of [
    ":focus-visible",
    ".colorblind-protanopia",
    ".colorblind-deuteranopia",
    ".colorblind-tritanopia",
    ".large-ui",
    ".one-hand",
    ".reduce-transparency",
    "(prefers-reduced-transparency: reduce)",
    "(forced-colors: active)",
  ]) {
    assert.match(css, new RegExp(feature.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});

test("policy and support pages provide keyboard navigation and accurate guidance", () => {
  for (const page of [privacy, support]) {
    assert.match(page, /class="skip-link"/);
    assert.match(page, /href="#content"/);
    assert.match(page, /:focus-visible/);
    assert.match(page, /forced-colors:\s*active/);
  }
  assert.match(privacy, /Настройки доступности также хранятся только на устройстве/);
  assert.match(support, /Для клавиатуры используйте Tab/);
});
