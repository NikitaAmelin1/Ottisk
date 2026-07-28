import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

test("theme-aware ocean background is cached by palette", () => {
  const source = readFileSync(join(root, "js/game.js"), "utf8");
  assert.match(source, /function drawOceanBackground/);
  assert.match(source, /bgCache\.canvas/);
  assert.match(source, /--bg2/);
  assert.match(source, /effectsEnabled/);
});

test("boss telegraph and maw silhouette are drawn", () => {
  const game = readFileSync(join(root, "js/game.js"), "utf8");
  const art = readFileSync(join(root, "js/creature-art.js"), "utf8");
  assert.match(game, /bossPhase === "telegraph"/);
  assert.match(art, /hunter\.maw/);
  assert.match(art, /suction disc|trench mouth|open = hunter\.bossPhase/);
});

test("css chrome follows theme tokens", () => {
  const css = readFileSync(join(root, "css/style.css"), "utf8");
  assert.match(css, /color-mix\(in srgb, var\(--bg1\)/);
  assert.match(css, /\.aura[\s\S]*var\(--accent-b\)/);
});

test("cache bump for graphics polish", () => {
  const sw = readFileSync(join(root, "sw.js"), "utf8");
  assert.match(sw, /ottisk-v89/);
});
