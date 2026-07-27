import assert from "node:assert/strict";
import { webcrypto } from "node:crypto";
import test from "node:test";

import worker, { internals } from "../src/worker.mjs";

if (!globalThis.crypto) globalThis.crypto = webcrypto;

class ScoreDb {
  constructor() {
    this.challenge = null;
    this.used = false;
  }

  prepare(sql) {
    const database = this;
    return {
      bind(...values) {
        return {
          async first() {
            if (sql.includes("FROM sessions")) return { account_id: "account-1" };
            if (sql.includes("FROM social_profiles")) {
              return { friend_code: "ABCD2345", display_name: "Player" };
            }
            if (sql.includes("SELECT score FROM daily_scores")) return { score: 42 };
            return null;
          },
          async run() {
            if (sql.includes("INSERT INTO score_challenges")) {
              database.challenge = {
                nonceHash: values[0],
                accountId: values[1],
                scope: values[2],
              };
            }
            if (sql.includes("UPDATE score_challenges")) {
              const matches = !database.used
                && database.challenge?.nonceHash === values[0]
                && database.challenge?.accountId === values[1]
                && database.challenge?.scope === values[2];
              if (matches) database.used = true;
              return { meta: { changes: matches ? 1 : 0 } };
            }
            return { meta: { changes: 1 } };
          },
          async all() {
            return { results: [] };
          },
        };
      },
    };
  }
}

function request(path, body) {
  return new Request(`https://cloud.test${path}`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${"a".repeat(32)}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

async function checksum(value) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

test("existing health endpoint remains available", async () => {
  const response = await worker.fetch(new Request("https://cloud.test/health"), {
    ALLOWED_ORIGINS: "",
  });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true });
});

test("daily endpoint consumes a scoped nonce exactly once", async () => {
  const DB = new ScoreDb();
  const env = { DB, TOKEN_PEPPER: "test-pepper", ALLOWED_ORIGINS: "" };
  const challengeResponse = await worker.fetch(
    request("/v1/scores/challenge", { purpose: "daily" }),
    env,
  );
  assert.equal(challengeResponse.status, 201);
  const challenge = await challengeResponse.json();
  assert.notEqual(DB.challenge.nonceHash, challenge.nonce);
  assert.match(DB.challenge.scope, /^daily:\d{4}-\d{2}-\d{2}$/);

  const replayProof = {
    durationMs: 500,
    samples: [[0, 1, 2], [500, 3, 4]],
  };
  replayProof.checksum = await checksum(internals.canonicalReplay(challenge.nonce, 42, replayProof));
  const payload = {
    score: 42,
    displayName: "Player",
    nonce: challenge.nonce,
    replayProof,
  };
  const accepted = await worker.fetch(request("/v1/scores/daily", payload), env);
  const acceptedBody = await accepted.json();
  assert.equal(accepted.status, 200, JSON.stringify(acceptedBody));
  assert.deepEqual(acceptedBody, {
    day: new Date().toISOString().slice(0, 10),
    score: 42,
  });

  const replayed = await worker.fetch(request("/v1/scores/daily", payload), env);
  assert.equal(replayed.status, 409);
  assert.deepEqual(await replayed.json(), { error: "score_challenge_expired_or_used" });
});
