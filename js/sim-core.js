/**
 * Deterministic, headless approximation of an Ottisk survival run.
 * It intentionally models balance inputs rather than canvas/DOM behavior.
 *
 * Browser/Node global: globalThis.OttiskSim
 */
(function attachOttiskSimulator(root) {
  "use strict";

  const DIFFICULTIES = Object.freeze({
    easy: Object.freeze({ speed: 0.78, spawn: 1.28, hunters: 0.72, hunger: 0.82, dash: 0.8 }),
    normal: Object.freeze({ speed: 1, spawn: 1, hunters: 1, hunger: 1, dash: 1 }),
    hard: Object.freeze({ speed: 1.2, spawn: 0.8, hunters: 1.22, hunger: 1.18, dash: 1.18 }),
  });

  const HEROES = Object.freeze({
    octopus: Object.freeze({ evade: 0.9 }),
    jellyfish: Object.freeze({ hazard: 0.76 }),
    turtle: Object.freeze({ hunger: 0.78 }),
    crab: Object.freeze({ shields: 1, recharge: 32 }),
    manta: Object.freeze({ hazard: 0.72, collect: 1.04 }),
    angler: Object.freeze({ hazard: 0.68, collect: 1.16 }),
    nautilus: Object.freeze({ shields: 2, recharge: 22 }),
    sub: Object.freeze({ shields: 3, hazard: 0.82, recharge: 45 }),
    eel: Object.freeze({ hazard: 0.78, collect: 1.03 }),
    squid: Object.freeze({ hazard: 0.73 }),
    seahorse: Object.freeze({ shields: 1, recharge: 40, hunger: 0.94 }),
    whale: Object.freeze({ hazard: 0.7, collect: 0.94 }),
    custom: Object.freeze({ evade: 0.9 }),
  });

  const POLICIES = Object.freeze({
    cautious: Object.freeze({ collect: 0.87, hazard: 0.62, still: 1, label: "cautious" }),
    balanced: Object.freeze({ collect: 1, hazard: 1, still: 1.03, label: "balanced" }),
    aggressive: Object.freeze({ collect: 1.18, hazard: 1.42, still: 1.1, label: "aggressive" }),
  });

  const WAVES = Object.freeze([
    Object.freeze({ id: "school", at: 0, pressure: 0.8 }),
    Object.freeze({ id: "darts", at: 45, pressure: 1.08 }),
    Object.freeze({ id: "jellies", at: 100, pressure: 1.02 }),
    Object.freeze({ id: "eels", at: 170, pressure: 1.16 }),
    Object.freeze({ id: "sharks", at: 260, pressure: 1.28 }),
    Object.freeze({ id: "leviathan", at: 360, pressure: 1.5 }),
    Object.freeze({ id: "rays", at: 440, pressure: 1.32 }),
    Object.freeze({ id: "ghosts", at: 540, pressure: 1.48 }),
    Object.freeze({ id: "abyss", at: 660, pressure: 1.62 }),
    Object.freeze({ id: "kraken", at: 780, pressure: 1.8 }),
  ]);

  function hashSeed(value) {
    const text = String(value ?? 1);
    let hash = 2166136261;
    for (let index = 0; index < text.length; index += 1) {
      hash ^= text.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  function mulberry32(seed) {
    let state = seed >>> 0;
    return function random() {
      state = (state + 0x6d2b79f5) | 0;
      let value = Math.imul(state ^ (state >>> 15), 1 | state);
      value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
      return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
    };
  }

  function choice(value, choices, name) {
    if (Object.hasOwn(choices, value)) return value;
    throw new RangeError(`${name} must be one of: ${Object.keys(choices).join(", ")}`);
  }

  function waveFor(score) {
    let selected = WAVES[0];
    for (const wave of WAVES) {
      if (score >= wave.at) selected = wave;
      else break;
    }
    return selected;
  }

  function normalizeOptions(options = {}) {
    const difficulty = choice(String(options.difficulty || "normal"), DIFFICULTIES, "difficulty");
    const heroInput = String(options.hero || "octopus");
    const hero = choice(heroInput === "submarine" ? "sub" : heroInput, HEROES, "hero");
    const policy = choice(String(options.policy || "balanced"), POLICIES, "policy");
    const maxSeconds = Number(options.maxSeconds ?? 600);
    const step = Number(options.step ?? 0.25);
    if (!Number.isFinite(maxSeconds) || maxSeconds <= 0 || maxSeconds > 3600) {
      throw new RangeError("maxSeconds must be between 0 and 3600");
    }
    if (!Number.isFinite(step) || step < 0.05 || step > 1) {
      throw new RangeError("step must be between 0.05 and 1");
    }
    return Object.freeze({
      difficulty,
      hero,
      policy,
      seed: options.seed ?? 1,
      maxSeconds,
      step,
    });
  }

  function simulateRun(options = {}) {
    const input = normalizeOptions(options);
    const seed = hashSeed(input.seed);
    const random = mulberry32(seed);
    const difficulty = DIFFICULTIES[input.difficulty];
    const hero = HEROES[input.hero];
    const policy = POLICIES[input.policy];
    let elapsed = 0;
    let hunger = 100;
    let score = 0;
    let shields = hero.shields || 0;
    let recharge = 0;
    let collected = 0;
    let hazards = 0;
    let death = "timeout";

    while (elapsed < input.maxSeconds) {
      const dt = Math.min(input.step, input.maxSeconds - elapsed);
      elapsed += dt;
      const opening = elapsed <= 10 ? 0.72 : 1;
      hunger -= (100 / 12) * difficulty.hunger * (hero.hunger || 1) * policy.still * opening * dt;

      // Roughly one collectible per second for balanced play. Miss streaks
      // make hunger meaningful while fixed-step RNG preserves determinism.
      const collectRate = 0.96 * policy.collect * (hero.collect || 1);
      if (random() < Math.min(0.92, collectRate * dt)) {
        const rare = random() < 0.08;
        score += rare ? 3 : 1;
        collected += 1;
        hunger = Math.min(100, hunger + (rare ? 34 : 19));
      }

      if (recharge > 0) {
        recharge -= dt;
        if (recharge <= 0 && shields < (hero.shields || 0)) {
          shields += 1;
          recharge = shields < (hero.shields || 0) ? hero.recharge : 0;
        }
      }

      if (hunger <= 0) {
        hunger = 0;
        death = "hunger";
        break;
      }

      if (elapsed > 10) {
        const wave = waveFor(score);
        const scorePressure = 1 + Math.min(2.4, score / 260);
        const difficultyPressure =
          difficulty.speed * difficulty.hunters * difficulty.dash / difficulty.spawn;
        const heroDefense = (hero.hazard || 1) * (hero.evade || 1);
        const hazardRate = 0.0042 * scorePressure * wave.pressure *
          difficultyPressure * policy.hazard * heroDefense;
        if (random() < Math.min(0.6, hazardRate * dt)) {
          hazards += 1;
          if (shields > 0) {
            shields -= 1;
            if (hero.recharge && recharge <= 0) recharge = hero.recharge;
          } else {
            death = wave.id === "leviathan" ? "leviathan" : wave.id === "kraken" ? "kraken" : "hunter";
            break;
          }
        }
      }
    }

    const wave = waveFor(score);
    return Object.freeze({
      seed,
      difficulty: input.difficulty,
      hero: input.hero,
      policy: input.policy,
      score,
      seconds: Math.round(elapsed * 100) / 100,
      death,
      wave: wave.id,
      collected,
      hazards,
      hunger: Math.round(hunger * 10) / 10,
    });
  }

  function simulateBatch(options = {}) {
    const runs = Number(options.runs ?? 100);
    if (!Number.isSafeInteger(runs) || runs < 1 || runs > 100000) {
      throw new RangeError("runs must be an integer between 1 and 100000");
    }
    const baseSeed = hashSeed(options.seed ?? 1);
    const results = [];
    const deaths = {};
    let totalScore = 0;
    let totalSeconds = 0;
    for (let index = 0; index < runs; index += 1) {
      const result = simulateRun({ ...options, seed: (baseSeed + Math.imul(index, 0x9e3779b9)) >>> 0 });
      results.push(result);
      totalScore += result.score;
      totalSeconds += result.seconds;
      deaths[result.death] = (deaths[result.death] || 0) + 1;
    }
    const sorted = results.map((result) => result.score).sort((a, b) => a - b);
    const percentile = (fraction) => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * fraction))];
    return Object.freeze({
      config: Object.freeze({
        difficulty: results[0].difficulty,
        hero: results[0].hero,
        policy: results[0].policy,
        seed: baseSeed,
        runs,
      }),
      summary: Object.freeze({
        averageScore: Math.round((totalScore / runs) * 100) / 100,
        averageSeconds: Math.round((totalSeconds / runs) * 100) / 100,
        medianScore: percentile(0.5),
        p10Score: percentile(0.1),
        p90Score: percentile(0.9),
        deaths: Object.freeze(deaths),
      }),
      results: Object.freeze(results),
    });
  }

  root.OttiskSim = Object.freeze({
    DIFFICULTIES,
    HEROES,
    POLICIES,
    WAVES,
    hashSeed,
    mulberry32,
    simulateRun,
    simulateBatch,
  });
})(globalThis);
