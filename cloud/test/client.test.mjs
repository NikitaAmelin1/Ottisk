import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";
import { webcrypto } from "node:crypto";

const source = await readFile(new URL("../../js/cloud.js", import.meta.url), "utf8");

function clientContext() {
  const values = new Map();
  const calls = [];
  const context = {
    AbortController,
    Response,
    TextEncoder,
    URL,
    clearTimeout,
    crypto: webcrypto,
    setTimeout,
    navigator: { onLine: true },
    localStorage: {
      getItem: (key) => values.get(key) ?? null,
      removeItem: (key) => values.delete(key),
      setItem: (key, value) => values.set(key, value),
    },
    addEventListener() {},
    async fetch(url, options) {
      calls.push({ url, options });
      if (url.endsWith("/v1/register")) {
        return Response.json({ accountId: "account", recoveryCode: "KEEP-ME", sessionToken: "token" }, { status: 201 });
      }
      return new Response(null, { status: 204 });
    },
  };
  vm.runInNewContext(source, context, { filename: "cloud.js" });
  return { client: context.OttiskCloud, context, calls, values };
}

test("empty API configuration is a network-free no-op", async () => {
  const { client, calls } = clientContext();
  assert.equal(client.isLinked(), false);
  assert.equal(await client.register(), null);
  assert.equal(await client.pushSave({ score: 1 }), null);
  assert.equal(await client.reportCrash(new Error("private detail")), null);
  assert.equal(calls.length, 0);
});

test("registration stores a session and authenticates saves", async () => {
  const { client, calls } = clientContext();
  client.configure("https://cloud.example.test/");
  const registration = await client.register();
  assert.equal(registration.recoveryCode, "KEEP-ME");
  assert.equal(client.isLinked(), true);
  await client.pushSave({ score: 7 });
  const save = calls.find((entry) => entry.url.endsWith("/v1/save"));
  assert.equal(save.options.headers.authorization, "Bearer token");
});

test("offline queue coalesces saves and daily scores", async () => {
  const { client, context, values } = clientContext();
  client.configure("https://cloud.example.test");
  await client.register();
  context.navigator.onLine = false;
  await client.pushSave({ score: 1 });
  await client.pushSave({ score: 2 });
  await client.submitDailyScore(3, "A");
  await client.submitDailyScore(9, "B");
  const queue = JSON.parse(values.get("ottisk-cloud-queue-v1"));
  assert.equal(queue.length, 2);
  assert.equal(queue.find((item) => item.type === "save").save.score, 2);
  assert.equal(queue.find((item) => item.type === "score").score, 9);
});
