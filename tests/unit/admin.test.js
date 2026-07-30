import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

test("admin tools panel exists and is gated in markup", () => {
  const html = readFileSync(join(root, "index.html"), "utf8");
  const game = readFileSync(join(root, "js/game.js"), "utf8");
  const account = readFileSync(join(root, "js/account.js"), "utf8");
  assert.match(html, /id="admin-tools"/);
  assert.match(html, /btn-admin-marks/);
  assert.match(html, /btn-admin-god/);
  assert.match(account, /isAdmin/);
  assert.match(account, /amelin070411@icloud\.com/);
  assert.match(game, /function enterAdminMode/);
  assert.match(game, /created\?\.admin/);
  assert.match(game, /adminGod/);
});

test("cache bump for admin mode", () => {
  const sw = readFileSync(join(root, "sw.js"), "utf8");
  assert.match(sw, /ottisk-v92/);
});
