import test from "node:test";
import assert from "node:assert/strict";

const storage = new Map();
globalThis.localStorage = {
  getItem: (key) => storage.get(key) ?? null,
  setItem: (key, value) => storage.set(key, String(value)),
  removeItem: (key) => storage.delete(key),
};

await import("../../js/pack.js");
await import("../../js/backup.js");
await import("../../js/analytics.js");

test("daily seed is deterministic", () => {
  const seed = globalThis.OttiskPack.daySeed("2026-07-27");
  const a = globalThis.OttiskPack.mulberry32(seed);
  const b = globalThis.OttiskPack.mulberry32(seed);
  assert.deepEqual([a(), a(), a()], [b(), b(), b()]);
});

test("portable backup round-trips and strips store ownership", () => {
  const backup = globalThis.OttiskBackup.create({
    best: 120,
    marks: 75,
    iapHeroes: ["sub"],
    starterPackBought: true,
  });
  const restored = globalThis.OttiskBackup.parse(backup.code);
  assert.equal(restored.best, 120);
  assert.equal(restored.marks, 75);
  assert.equal(restored.iapHeroes, undefined);
  assert.equal(restored.starterPackBought, undefined);
});

test("analytics stores only aggregate counts", () => {
  globalThis.OttiskAnalytics.clear();
  globalThis.OttiskAnalytics.track("game_start");
  globalThis.OttiskAnalytics.track("run_end", { score: 45 });
  const summary = globalThis.OttiskAnalytics.summary();
  assert.equal(summary.events.game_start, 1);
  assert.equal(summary.events.run_end, 1);
  assert.equal(summary.scores["30-99"], 1);
});
