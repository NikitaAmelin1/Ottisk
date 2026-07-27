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

test("friend codes normalize, format, and account pairs are canonical", () => {
  assert.equal(internals.normalizeFriendCode("abcd-2345"), "ABCD2345");
  assert.equal(internals.publicFriendCode("ABCD2345"), "ABCD-2345");
  assert.deepEqual(internals.pairAccounts("z-account", "a-account"), ["a-account", "z-account"]);
});

test("league thresholds are deterministic", () => {
  assert.equal(internals.leagueForScore(0), "bronze");
  assert.equal(internals.leagueForScore(10000), "silver");
  assert.equal(internals.leagueForScore(50000), "gold");
  assert.equal(internals.leagueForScore(250000), "obsidian");
});

test("replay proofs enforce compact bounded samples", () => {
  const valid = {
    durationMs: 10000,
    samples: [[0, 1, -2], [5001, 2, 3], [10000, 0, 4]],
    checksum: "a".repeat(64),
  };
  assert.deepEqual(internals.validateReplayShape(valid), valid);
  assert.throws(
    () => internals.validateReplayShape({ ...valid, samples: [[0, 1, 0]] }),
    /invalid_replay_samples/,
  );
  assert.throws(
    () => internals.validateReplayShape({ ...valid, samples: [[6000, 1, 0], [10000, 2, 0]] }),
    /incomplete_replay_samples/,
  );
  assert.throws(
    () => internals.validateReplayShape({
      ...valid,
      samples: [[0, 1, 0], [0, 2, 0], [10000, 3, 0]],
    }),
    /invalid_replay_samples/,
  );
});

test("replay checksum canonicalization binds nonce, score, duration, and samples", () => {
  const proof = { durationMs: 500, samples: [[0, 1, 2], [500, 3, 4]] };
  assert.equal(
    internals.canonicalReplay("nonce", 42, proof),
    'nonce\n42\n500\n[[0,1,2],[500,3,4]]',
  );
  assert.equal(internals.challengeScope("duel_result", "00000000-0000-4000-8000-000000000000"),
    "duel:result:00000000-0000-4000-8000-000000000000");
  assert.throws(() => internals.challengeScope("unknown"), /invalid_challenge_purpose/);
});
