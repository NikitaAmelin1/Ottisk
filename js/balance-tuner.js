/**
 * Conservative recommendations from local aggregate analytics.
 * It never records identifiers, uploads data, or mutates game state.
 *
 * Browser/Node global: globalThis.OttiskBalanceTuner
 */
(function attachOttiskBalanceTuner(root) {
  "use strict";

  const SCORE_MIDPOINTS = Object.freeze({
    "0-9": 5,
    "10-29": 20,
    "30-99": 60,
    "100-299": 180,
    "300+": 360,
  });
  const MIN_RUNS = 20;
  const MAX_ADJUSTMENT = 0.05;

  function count(value) {
    const number = Number(value);
    return Number.isFinite(number) && number > 0 ? Math.floor(number) : 0;
  }

  function cleanCounts(value) {
    const result = {};
    if (!value || typeof value !== "object") return result;
    for (const [key, raw] of Object.entries(value)) {
      const valueCount = count(raw);
      if (valueCount) result[String(key)] = valueCount;
    }
    return result;
  }

  function sum(values) {
    return Object.values(values).reduce((total, value) => total + value, 0);
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function round(value, places = 3) {
    const scale = 10 ** places;
    return Math.round(value * scale) / scale;
  }

  function analyze(summary) {
    const safe = summary && typeof summary === "object" ? summary : {};
    const scores = cleanCounts(safe.scores);
    const deaths = cleanCounts(safe.deaths);
    const heroes = cleanCounts(safe.heroes);
    const events = cleanCounts(safe.events);
    const scoredRuns = sum(scores);
    const endedRuns = count(events.run_end);
    // Prefer bucket totals: old/corrupt event counts cannot inflate confidence.
    const runs = scoredRuns || endedRuns;
    let weightedScore = 0;
    for (const [bucket, midpoint] of Object.entries(SCORE_MIDPOINTS)) {
      weightedScore += (scores[bucket] || 0) * midpoint;
    }
    const lowRuns = (scores["0-9"] || 0) + (scores["10-29"] || 0);
    const highRuns = (scores["100-299"] || 0) + (scores["300+"] || 0);
    return Object.freeze({
      runs,
      days: count(safe.days),
      averageScore: scoredRuns ? round(weightedScore / scoredRuns, 1) : 0,
      earlyExitRate: scoredRuns ? round(lowRuns / scoredRuns) : 0,
      highScoreRate: scoredRuns ? round(highRuns / scoredRuns) : 0,
      hungerDeathRate: runs ? round((deaths.hunger || 0) / runs) : 0,
      hunterDeathRate: runs
        ? round(((deaths.hunter || 0) + (deaths.leviathan || 0) + (deaths.kraken || 0)) / runs)
        : 0,
      scores,
      deaths,
      heroes,
    });
  }

  function tune(summary, options = {}) {
    const metrics = analyze(summary);
    const minRuns = Math.max(MIN_RUNS, count(options.minRuns));
    const neutral = {
      hunterSpeed: 1,
      hungerDrain: 1,
      sparkInterval: 1,
    };
    if (metrics.runs < minRuns) {
      return Object.freeze({
        applied: false,
        reason: `insufficient-data:${metrics.runs}/${minRuns}`,
        sampleSize: metrics.runs,
        adjustments: Object.freeze(neutral),
        metrics,
      });
    }

    // The broad target is intentionally forgiving. Adjustments are capped at
    // five percent and use aggregate trends, not a single run.
    const tooHard = clamp(
      Math.max(
        (metrics.earlyExitRate - 0.45) / 0.4,
        (metrics.hungerDeathRate - 0.42) / 0.45,
        ((metrics.hunterDeathRate - 0.68) / 0.3) *
          clamp(metrics.earlyExitRate / 0.45, 0, 1)
      ),
      0,
      1
    );
    const tooEasy = clamp(
      Math.max(
        (metrics.highScoreRate - 0.42) / 0.45,
        (metrics.averageScore - 145) / 220
      ),
      0,
      1
    );
    // Conflicting evidence cancels rather than making a speculative change.
    const pressure = clamp(tooEasy - tooHard, -1, 1);
    const magnitude = MAX_ADJUSTMENT * pressure;
    const hungerBias = metrics.hungerDeathRate > 0.42 && pressure < 0 ? 1.15 : 0.75;
    const hunterBias = metrics.hunterDeathRate > 0.68 && pressure < 0 ? 1.15 : 0.85;
    const adjustments = Object.freeze({
      hunterSpeed: round(clamp(1 + magnitude * hunterBias, 0.95, 1.05)),
      hungerDrain: round(clamp(1 + magnitude * hungerBias, 0.95, 1.05)),
      // Longer interval is harder; keep resource changes smaller.
      sparkInterval: round(clamp(1 + magnitude * 0.5, 0.975, 1.025)),
    });
    const applied = Object.values(adjustments).some((value) => value !== 1);
    return Object.freeze({
      applied,
      reason: applied ? (pressure < 0 ? "aggregate-too-hard" : "aggregate-too-easy") : "within-target",
      sampleSize: metrics.runs,
      adjustments,
      metrics,
    });
  }

  function fromAnalytics(analytics = root.OttiskAnalytics, options) {
    if (!analytics || typeof analytics.summary !== "function") {
      return tune(null, options);
    }
    try {
      return tune(analytics.summary(), options);
    } catch (_) {
      return tune(null, options);
    }
  }

  root.OttiskBalanceTuner = Object.freeze({
    MIN_RUNS,
    MAX_ADJUSTMENT,
    analyze,
    tune,
    fromAnalytics,
  });
})(globalThis);
