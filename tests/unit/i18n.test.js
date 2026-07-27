import test from "node:test";
import assert from "node:assert/strict";

const values = new Map();
globalThis.localStorage = {
  getItem: (key) => values.get(key) ?? null,
  setItem: (key, value) => values.set(key, String(value)),
};
Object.defineProperty(globalThis, "navigator", {
  configurable: true,
  value: { language: "ru-RU" },
});
globalThis.dispatchEvent = () => true;
globalThis.CustomEvent = class CustomEvent {
  constructor(type, options) {
    this.type = type;
    this.detail = options?.detail;
  }
};

await import("../../js/i18n.js");

test("localization switches between Russian and English", () => {
  assert.equal(globalThis.OttiskI18n.t("play"), "Играть");
  globalThis.OttiskI18n.setLocale("en");
  assert.equal(globalThis.OttiskI18n.t("play"), "Play");
  assert.equal(values.get("ottisk-lang-v1"), "en");
  globalThis.OttiskI18n.setLocale("ru");
});
