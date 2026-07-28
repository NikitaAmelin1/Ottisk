import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import vm from "node:vm";

function loadAccount() {
  const source = readFileSync(new URL("../../js/account.js", import.meta.url), "utf8");
  const store = new Map();
  const sandbox = {
    localStorage: {
      getItem: (key) => (store.has(key) ? store.get(key) : null),
      setItem: (key, value) => { store.set(String(key), String(value)); },
      removeItem: (key) => { store.delete(String(key)); },
    },
    crypto: {
      getRandomValues(bytes) {
        for (let i = 0; i < bytes.length; i += 1) bytes[i] = (i * 17 + 3) & 255;
        return bytes;
      },
      subtle: {
        async digest(_algo, data) {
          const view = data instanceof ArrayBuffer ? new Uint8Array(data) : new Uint8Array(data.buffer || data);
          const out = new Uint8Array(32);
          for (let i = 0; i < view.length; i += 1) out[i % 32] ^= view[i];
          return out.buffer;
        },
      },
    },
    TextEncoder,
    console,
  };
  sandbox.globalThis = sandbox;
  vm.runInNewContext(source, sandbox, { filename: "account.js" });
  return { api: sandbox.OttiskAccount, store };
}

test("local account register and login preserve meta and purchases", async () => {
  const { api, store } = loadAccount();
  store.set("ottisk-meta-v1", JSON.stringify({
    best: 12,
    marks: 40,
    iapHeroes: ["whale"],
    starterPackBought: true,
    unlockedHeroes: ["jellyfish"],
  }));
  assert.equal(api.isReady(), false);
  await api.register({ email: "Hero@Ottisk.dev", password: "secret12", displayName: "Герой" });
  assert.equal(api.isUser(), true);
  assert.equal(api.session().email, "hero@ottisk.dev");
  assert.match(store.get("ottisk-meta-v1"), /"marks":40/);

  api.logout();
  assert.equal(api.isReady(), false);
  store.set("ottisk-meta-v1", JSON.stringify({ best: 0, marks: 0 }));

  await api.login({ email: "hero@ottisk.dev", password: "secret12" });
  const meta = JSON.parse(store.get("ottisk-meta-v1"));
  assert.equal(meta.marks, 40);
  assert.deepEqual(meta.iapHeroes, ["whale"]);
  assert.equal(meta.starterPackBought, true);
});

test("guest session unlocks play without account vault", () => {
  const { api } = loadAccount();
  api.continueAsGuest();
  assert.equal(api.isGuest(), true);
  assert.equal(api.isReady(), true);
});
