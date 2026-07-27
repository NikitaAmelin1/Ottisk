/**
 * Lightweight adaptive frame-rate monitor.
 *
 * Browser: globalThis.OttiskPerf
 * Node:    await import("./perf.js"); globalThis.OttiskPerf
 */
(function attachOttiskPerf(root) {
  "use strict";

  const TIERS = Object.freeze({
    high: Object.freeze({ id: "high", particleScale: 1, effects: true, renderScale: 1 }),
    medium: Object.freeze({ id: "medium", particleScale: 0.65, effects: true, renderScale: 0.9 }),
    low: Object.freeze({ id: "low", particleScale: 0.35, effects: false, renderScale: 0.75 }),
  });
  const ORDER = Object.freeze(["low", "medium", "high"]);

  function finite(value, fallback) {
    return Number.isFinite(Number(value)) ? Number(value) : fallback;
  }

  class FpsMonitor {
    constructor(options = {}) {
      this.options = {
        windowSize: Math.max(10, Math.round(finite(options.windowSize, 60))),
        minSamples: Math.max(5, Math.round(finite(options.minSamples, 30))),
        degradeFps: finite(options.degradeFps, 42),
        recoverFps: finite(options.recoverFps, 55),
        degradeWindows: Math.max(1, Math.round(finite(options.degradeWindows, 3))),
        recoverWindows: Math.max(1, Math.round(finite(options.recoverWindows, 6))),
        maxFrameMs: Math.max(20, finite(options.maxFrameMs, 250)),
      };
      this.options.minSamples = Math.min(this.options.windowSize, this.options.minSamples);
      if (this.options.recoverFps <= this.options.degradeFps) {
        throw new RangeError("recoverFps must be greater than degradeFps");
      }
      this.tier = ORDER.includes(options.initialTier) ? options.initialTier : "high";
      this.fps = 60;
      this.samples = [];
      this.lastTimestamp = null;
      this.lowWindows = 0;
      this.highWindows = 0;
      this.framesSinceEvaluation = 0;
      this.listeners = new Set();
      this.running = false;
      this.rafId = null;
      this._tick = (timestamp) => {
        if (!this.running) return;
        this.frame(timestamp);
        this.rafId = root.requestAnimationFrame(this._tick);
      };
    }

    frame(timestamp) {
      const now = finite(timestamp, NaN);
      if (!Number.isFinite(now)) return this.snapshot();
      if (this.lastTimestamp != null) this.sample(now - this.lastTimestamp);
      this.lastTimestamp = now;
      return this.snapshot();
    }

    sample(frameMs) {
      const duration = finite(frameMs, 0);
      if (duration <= 0) return this.snapshot();
      // A suspended tab should not permanently force low quality.
      if (duration > this.options.maxFrameMs) {
        this.samples.length = 0;
        this.lowWindows = 0;
        this.highWindows = 0;
        this.framesSinceEvaluation = 0;
        return this.snapshot();
      }
      this.samples.push(duration);
      if (this.samples.length > this.options.windowSize) this.samples.shift();
      const total = this.samples.reduce((sum, value) => sum + value, 0);
      this.fps = total > 0 ? (this.samples.length * 1000) / total : 60;
      this.framesSinceEvaluation += 1;
      if (
        this.samples.length >= this.options.minSamples &&
        this.framesSinceEvaluation >= this.options.windowSize
      ) {
        this.framesSinceEvaluation = 0;
        this._evaluate();
      }
      return this.snapshot();
    }

    _evaluate() {
      if (this.fps < this.options.degradeFps) {
        this.lowWindows += 1;
        this.highWindows = 0;
        if (this.lowWindows >= this.options.degradeWindows) {
          this._setTier(ORDER[Math.max(0, ORDER.indexOf(this.tier) - 1)]);
          this.lowWindows = 0;
        }
      } else if (this.fps > this.options.recoverFps) {
        this.highWindows += 1;
        this.lowWindows = 0;
        if (this.highWindows >= this.options.recoverWindows) {
          this._setTier(ORDER[Math.min(ORDER.length - 1, ORDER.indexOf(this.tier) + 1)]);
          this.highWindows = 0;
        }
      } else {
        // Dead band: unstable boundary FPS cannot accumulate a tier switch.
        this.lowWindows = 0;
        this.highWindows = 0;
      }
    }

    _setTier(next) {
      if (next === this.tier) return;
      const previous = this.tier;
      this.tier = next;
      const detail = this.snapshot();
      for (const listener of this.listeners) {
        try {
          listener(detail, previous);
        } catch (_) {
          // A quality callback must never interrupt the render loop.
        }
      }
    }

    setTier(tier) {
      if (!ORDER.includes(tier)) throw new RangeError(`unknown quality tier: ${tier}`);
      this._setTier(tier);
      return this.snapshot();
    }

    subscribe(listener) {
      if (typeof listener !== "function") throw new TypeError("listener must be a function");
      this.listeners.add(listener);
      return () => this.listeners.delete(listener);
    }

    start() {
      if (this.running || typeof root.requestAnimationFrame !== "function") return false;
      this.running = true;
      this.lastTimestamp = null;
      this.rafId = root.requestAnimationFrame(this._tick);
      return true;
    }

    stop() {
      this.running = false;
      if (this.rafId != null && typeof root.cancelAnimationFrame === "function") {
        root.cancelAnimationFrame(this.rafId);
      }
      this.rafId = null;
      this.lastTimestamp = null;
    }

    reset(tier = this.tier) {
      if (!ORDER.includes(tier)) throw new RangeError(`unknown quality tier: ${tier}`);
      this.stop();
      this.tier = tier;
      this.fps = 60;
      this.samples.length = 0;
      this.lowWindows = 0;
      this.highWindows = 0;
      this.framesSinceEvaluation = 0;
      return this.snapshot();
    }

    snapshot() {
      return Object.freeze({
        tier: this.tier,
        fps: Math.round(this.fps * 10) / 10,
        samples: this.samples.length,
        settings: TIERS[this.tier],
      });
    }
  }

  root.OttiskPerf = Object.freeze({
    TIERS,
    FpsMonitor,
    createMonitor: (options) => new FpsMonitor(options),
  });
})(globalThis);
