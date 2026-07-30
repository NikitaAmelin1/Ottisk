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

test("owner email and first account become admin on register", async () => {
  const { api } = loadAccount();
  const first = await api.register({ email: "player@example.com", password: "secret12", displayName: "Первый" });
  assert.equal(first.admin, true);
  assert.equal(api.isAdmin(), true);
  assert.equal(api.session().admin, true);
  api.logout();

  const second = await api.register({ email: "other@example.com", password: "secret12" });
  assert.equal(second.admin, false);
  assert.equal(api.isAdmin(), false);
  api.logout();

  const owner = await api.register({ email: "Amelin070411@icloud.com", password: "secret12", displayName: "Никита" });
  assert.equal(owner.admin, true);
  assert.equal(api.isAdmin(), true);
});

test("admin role persists across login", async () => {
  const { api, store } = loadAccount();
  await api.register({ email: "amelin070411@icloud.com", password: "secret99" });
  api.logout();
  store.set("ottisk-meta-v1", JSON.stringify({ best: 0, marks: 0 }));
  const result = await api.login({ email: "amelin070411@icloud.com", password: "secret99" });
  assert.equal(result.admin, true);
  assert.equal(api.isAdmin(), true);
});

test("guest session unlocks play without account vault", () => {
  const { api } = loadAccount();
  api.continueAsGuest();
  assert.equal(api.isGuest(), true);
  assert.equal(api.isReady(), true);
  assert.equal(api.isAdmin(), false);
});
