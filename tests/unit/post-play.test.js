import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

test("pack trophies include trench maw clear", () => {
  const source = readFileSync(join(root, "js/pack.js"), "utf8");
  assert.match(source, /id:\s*"maw_clear"/);
  assert.match(source, /bossClears\?\.maw/);
});

test("native bridge exposes achievements and rewarded ads stubs", () => {
  const source = readFileSync(join(root, "js/native.js"), "utf8");
  assert.match(source, /unlockAchievement/);
  assert.match(source, /showRewardedAd/);
  assert.match(source, /adsAvailable/);
});

test("trailer page and cache bump exist", () => {
  const trailer = readFileSync(join(root, "trailer.html"), "utf8");
  const sw = readFileSync(join(root, "sw.js"), "utf8");
  assert.match(trailer, /ottisk-ad-ru-15s\.mp4/);
  assert.match(sw, /ottisk-v88/);
  assert.match(sw, /trailer\.html/);
});

test("sim-core knows seal, lantern and trench_maw", async () => {
  await import(pathToFileURL(join(root, "js/sim-core.js")).href);
  const sim = globalThis.OttiskSim;
  assert.ok(sim.HEROES.seal);
  assert.ok(sim.HEROES.lantern);
  assert.ok(sim.WAVES.some((wave) => wave.id === "trench_maw"));
  const run = sim.simulateRun({ hero: "seal", seed: 42, maxSeconds: 20 });
  assert.equal(run.hero, "seal");
  assert.ok(Number.isFinite(run.score));
});

test("weekly boss quest and local board hooks are wired", () => {
  const source = readFileSync(join(root, "js/game.js"), "utf8");
  assert.match(source, /id:\s*"boss_touch"/);
  assert.match(source, /function recordLocalDayScore/);
  assert.match(source, /function renderLocalLeaderboard/);
  assert.match(source, /btn-continue-rewarded/);
  assert.match(source, /id:\s*"trench_maw"/);
  assert.match(source, /id:\s*"seal"/);
  assert.match(source, /id:\s*"lantern"/);
});
