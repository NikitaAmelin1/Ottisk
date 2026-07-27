import assert from "node:assert/strict";
import { createHash, webcrypto } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const source = await readFile(new URL("../../js/social.js", import.meta.url), "utf8");

function contextWith(values = new Map()) {
  const calls = [];
  const context = {
    AbortController,
    Response,
    TextEncoder,
    Uint8Array,
    clearTimeout,
    crypto: webcrypto,
    navigator: { onLine: true },
    setTimeout,
    localStorage: {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, value),
    },
    async fetch(url, options) {
      calls.push({ url, options });
      if (url.endsWith("/v1/scores/challenge")) {
        return Response.json({
          nonce: "abcdefghijklmnopqrstuvwx",
          purpose: "daily",
          proofVersion: 1,
        }, { status: 201 });
      }
      return Response.json({ day: "2026-07-27", score: 42 });
    },
  };
  vm.runInNewContext(source, context, { filename: "social.js" });
  return { calls, client: context.OttiskSocial, context, values };
}

test("social client is a network-free no-op when unconfigured", async () => {
  const { calls, client } = contextWith();
  assert.equal(client.isAvailable(), false);
  assert.equal(await client.profile(), null);
  assert.equal(await client.addFriend("ABCD-2345"), null);
  assert.equal(await client.submitDailyScore(1, "A", 500, [[0, 0, 0], [500, 1, 1]]), null);
  assert.equal(calls.length, 0);
});

test("social client is a safe no-op while offline", async () => {
  const values = new Map([
    ["ottisk-cloud-config-v1", JSON.stringify({ apiUrl: "https://cloud.test" })],
    ["ottisk-cloud-auth-v1", JSON.stringify({ sessionToken: "session-token" })],
  ]);
  const { calls, client, context } = contextWith(values);
  context.navigator.onLine = false;
  assert.equal(client.isAvailable(), false);
  assert.equal(await client.friends(), null);
  assert.equal(calls.length, 0);
});

test("verified score flow requests nonce and binds a SHA-256 replay proof", async () => {
  const values = new Map([
    ["ottisk-cloud-config-v1", JSON.stringify({ apiUrl: "https://cloud.test/" })],
    ["ottisk-cloud-auth-v1", JSON.stringify({ sessionToken: "session-token" })],
  ]);
  const { calls, client } = contextWith(values);
  const result = await client.submitDailyScore(42, "Игрок", 500, [[0, 1, 2], [500, 3, 4]]);
  assert.equal(result.score, 42);
  assert.equal(calls.length, 2);
  assert.equal(calls[0].options.headers.authorization, "Bearer session-token");
  const body = JSON.parse(calls[1].options.body);
  const canonical = `${body.nonce}\n42\n500\n[[0,1,2],[500,3,4]]`;
  assert.equal(body.replayProof.checksum, createHash("sha256").update(canonical).digest("hex"));
});

test("friend and duel methods encode paths and payloads", async () => {
  const values = new Map([
    ["ottisk-cloud-config-v1", JSON.stringify({ apiUrl: "https://cloud.test" })],
    ["ottisk-cloud-auth-v1", JSON.stringify({ sessionToken: "session-token" })],
  ]);
  const { calls, client } = contextWith(values);
  await client.addFriend("ABCD-2345", "A");
  await client.removeFriend("ABCD-2345");
  assert.deepEqual(JSON.parse(calls[0].options.body), { friendCode: "ABCD-2345", displayName: "A" });
  assert.equal(calls[1].url, "https://cloud.test/v1/friends/ABCD-2345");
  assert.equal(calls[1].options.method, "DELETE");
});
