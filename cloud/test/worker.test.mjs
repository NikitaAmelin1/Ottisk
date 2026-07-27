import assert from "node:assert/strict";
import test from "node:test";

import { internals, sanitizeSave } from "../src/worker.mjs";

test("save sanitizer strips store entitlements at every level", () => {
  assert.deepEqual(
    sanitizeSave({
      score: 42,
      iapHeroes: ["manta"],
      nested: { starterPackBought: true, marks: 3 },
      list: [{ constructor: "ignored", alive: true }],
    }),
    { score: 42, nested: { marks: 3 }, list: [{ alive: true }] },
  );
});

test("save sanitizer rejects excessive depth and non-finite numbers", () => {
  let value = {};
  for (let i = 0; i < 14; i += 1) value = { next: value };
  assert.throws(() => sanitizeSave(value), /save_too_deep/);
  assert.throws(() => sanitizeSave({ score: Infinity }), /invalid_save/);
});

test("date helpers reject normalized invalid dates", () => {
  assert.equal(internals.validDay("2026-02-28"), true);
  assert.equal(internals.validDay("2026-02-30"), false);
  assert.equal(internals.validDay("2026-2-3"), false);
  assert.equal(internals.nextMonth("2026-12"), "2027-01-01");
});

test("recovery and public tags are normalized", () => {
  assert.equal(internals.normalizeRecovery("abcd-1234 efgh"), "ABCD1234EFGH");
  assert.equal(internals.safeTag("web/i os!", 24), "webios");
  assert.equal(internals.sanitizeName("\u0000  Игрок  ", "abcdef00-0000"), "Игрок");
});
