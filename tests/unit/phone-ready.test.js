import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

test("phone-ready section and helpers exist", () => {
  const html = readFileSync(join(root, "index.html"), "utf8");
  const game = readFileSync(join(root, "js/game.js"), "utf8");
  const pwa = readFileSync(join(root, "js/pwa.js"), "utf8");
  assert.match(html, /phone-qa-list/);
  assert.match(html, /btn-copy-game-link/);
  assert.match(game, /function renderPhoneReady/);
  assert.match(game, /function shareInvite/);
  assert.match(pwa, /isIos/);
  assert.match(pwa, /isStandalone/);
});

test("phone docs separate phone vs PC work", () => {
  const phone = readFileSync(join(root, "store/PHONE_NOW.md"), "utf8");
  const play = readFileSync(join(root, "store/PLAY_CHECKLIST.md"), "utf8");
  assert.match(phone, /С телефона/);
  assert.match(phone, /На ПК/);
  assert.match(play, /PHONE_NOW\.md/);
});

test("cache bump for phone-ready pack", () => {
  const sw = readFileSync(join(root, "sw.js"), "utf8");
  assert.match(sw, /ottisk-v\d+/);
});
