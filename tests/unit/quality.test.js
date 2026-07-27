import test from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

await import("../../js/perf.js");
await import("../../js/balance-tuner.js");
await import("../../js/sim-core.js");

test("browser modules attach Node-safe globals", () => {
  assert.equal(typeof globalThis.OttiskPerf.createMonitor, "function");
  assert.equal(typeof globalThis.OttiskBalanceTuner.fromAnalytics, "function");
  assert.equal(typeof globalThis.OttiskSim.simulateRun, "function");
});

test("FPS monitor degrades and recovers only after sustained windows", () => {
  const monitor = globalThis.OttiskPerf.createMonitor({
    windowSize: 10,
    minSamples: 10,
    degradeWindows: 2,
    recoverWindows: 2,
    initialTier: "high",
  });
  const changes = [];
  monitor.subscribe((snapshot, previous) => changes.push([previous, snapshot.tier]));

  for (let index = 0; index < 19; index += 1) monitor.sample(30); // 33 FPS
  assert.equal(monitor.snapshot().tier, "high");
  monitor.sample(30);
  assert.equal(monitor.snapshot().tier, "medium");

  for (let index = 0; index < 20; index += 1) monitor.sample(30);
  assert.equal(monitor.snapshot().tier, "low");
  for (let index = 0; index < 19; index += 1) monitor.sample(16); // old slow samples keep recovery conservative
  assert.equal(monitor.snapshot().tier, "low");
  for (let index = 0; index < 11; index += 1) monitor.sample(16);
  assert.equal(monitor.snapshot().tier, "medium");
  assert.deepEqual(changes.slice(0, 3), [
    ["high", "medium"],
    ["medium", "low"],
    ["low", "medium"],
  ]);
});

test("FPS hysteresis dead band and suspended frames prevent oscillation", () => {
  const monitor = globalThis.OttiskPerf.createMonitor({
    windowSize: 10,
    minSamples: 10,
    degradeWindows: 2,
    recoverWindows: 2,
  });
  for (let index = 0; index < 10; index += 1) monitor.sample(30);
  for (let index = 0; index < 10; index += 1) monitor.sample(20); // 50 FPS dead band
  for (let index = 0; index < 10; index += 1) monitor.sample(30);
  assert.equal(monitor.snapshot().tier, "high");
  monitor.sample(1000);
  assert.equal(monitor.snapshot().samples, 0);
  assert.equal(monitor.snapshot().tier, "high");
});

test("balance tuner waits for a meaningful aggregate sample", () => {
  const result = globalThis.OttiskBalanceTuner.tune({
    events: { run_end: 4 },
    scores: { "0-9": 4 },
    deaths: { hunger: 4 },
  });
  assert.equal(result.applied, false);
  assert.equal(result.reason, "insufficient-data:4/20");
  assert.deepEqual(result.adjustments, {
    hunterSpeed: 1,
    hungerDrain: 1,
    sparkInterval: 1,
  });
});

test("balance tuner makes bounded, directional recommendations", () => {
  const tooHard = globalThis.OttiskBalanceTuner.tune({
    days: 8,
    events: { run_end: 40 },
    scores: { "0-9": 25, "10-29": 10, "30-99": 5 },
    deaths: { hunger: 24, hunter: 16 },
    heroes: { octopus: 40 },
  });
  assert.equal(tooHard.reason, "aggregate-too-hard");
  assert.ok(tooHard.adjustments.hungerDrain >= 0.95);
  assert.ok(tooHard.adjustments.hungerDrain < 1);
  assert.ok(tooHard.adjustments.hunterSpeed < 1);

  const tooEasy = globalThis.OttiskBalanceTuner.tune({
    events: { run_end: 40 },
    scores: { "100-299": 10, "300+": 30 },
    deaths: { hunter: 40 },
  });
  assert.equal(tooEasy.reason, "aggregate-too-easy");
  for (const value of Object.values(tooEasy.adjustments)) {
    assert.ok(value >= 0.95 && value <= 1.05);
  }
  assert.ok(tooEasy.adjustments.hunterSpeed > 1);
});

test("balance tuner consumes OttiskAnalytics.summary safely", () => {
  const result = globalThis.OttiskBalanceTuner.fromAnalytics({
    summary: () => ({ events: { run_end: 25 }, scores: { "30-99": 25 } }),
  });
  assert.equal(result.sampleSize, 25);
  const unavailable = globalThis.OttiskBalanceTuner.fromAnalytics(null);
  assert.match(unavailable.reason, /^insufficient-data:/);
});

test("survival simulation is deterministic and validates dimensions", () => {
  const options = { difficulty: "normal", hero: "octopus", policy: "balanced", seed: "same" };
  assert.deepEqual(globalThis.OttiskSim.simulateRun(options), globalThis.OttiskSim.simulateRun(options));
  assert.notDeepEqual(
    globalThis.OttiskSim.simulateRun(options),
    globalThis.OttiskSim.simulateRun({ ...options, seed: "different" })
  );
  assert.throws(
    () => globalThis.OttiskSim.simulateRun({ difficulty: "impossible" }),
    /difficulty must be one of/
  );
  assert.equal(globalThis.OttiskSim.simulateRun({ hero: "submarine" }).hero, "sub");
});

test("simulator exhibits expected aggregate difficulty ordering", () => {
  const common = { hero: "octopus", policy: "balanced", seed: "balance", runs: 300 };
  const easy = globalThis.OttiskSim.simulateBatch({ ...common, difficulty: "easy" });
  const normal = globalThis.OttiskSim.simulateBatch({ ...common, difficulty: "normal" });
  const hard = globalThis.OttiskSim.simulateBatch({ ...common, difficulty: "hard" });
  assert.ok(easy.summary.averageScore > normal.summary.averageScore);
  assert.ok(normal.summary.averageScore > hard.summary.averageScore);
  assert.equal(easy.results.length, 300);
  assert.equal(Object.values(easy.summary.deaths).reduce((sum, count) => sum + count, 0), 300);
});

test("JSON CLI supports batch and single-run modes", async () => {
  const cwd = new URL("../..", import.meta.url);
  const batch = await execFileAsync(
    process.execPath,
    ["scripts/sim-balance.mjs", "--difficulty", "easy", "--hero=manta", "--policy", "cautious", "--seed", "7", "--runs", "3", "--compact"],
    { cwd }
  );
  const batchJson = JSON.parse(batch.stdout);
  assert.equal(batchJson.config.runs, 3);
  assert.equal(batchJson.config.hero, "manta");
  assert.equal(batchJson.results.length, 3);

  const single = await execFileAsync(
    process.execPath,
    ["scripts/sim-balance.mjs", "--single", "--seed", "7", "--compact"],
    { cwd }
  );
  assert.equal(JSON.parse(single.stdout).seed, globalThis.OttiskSim.hashSeed("7"));
});
