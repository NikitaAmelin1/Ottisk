/**
 * Optional dependency-free social/integrity client.
 *
 * It shares OttiskCloud's stored API URL and bearer session. Loading the file
 * has no side effects; disabled, unlinked, or offline calls safely return null.
 */
(function attachOttiskSocial(global) {
  "use strict";

  const CONFIG_KEY = "ottisk-cloud-config-v1";
  const AUTH_KEY = "ottisk-cloud-auth-v1";
  const TIMEOUT_MS = 10000;

  function stored(key) {
    try {
      const value = JSON.parse(global.localStorage?.getItem(key) || "");
      return value && typeof value === "object" ? value : {};
    } catch (_) {
      return {};
    }
  }

  function apiUrl() {
    return typeof stored(CONFIG_KEY).apiUrl === "string"
      ? stored(CONFIG_KEY).apiUrl.replace(/\/+$/, "")
      : "";
  }

  function token() {
    const value = stored(AUTH_KEY).sessionToken;
    return typeof value === "string" ? value : "";
  }

  function available() {
    return Boolean(apiUrl() && token())
      && (typeof global.navigator === "undefined" || global.navigator.onLine !== false);
  }

  class SocialError extends Error {
    constructor(code, status, cause) {
      super(code);
      this.name = "OttiskSocialError";
      this.code = code;
      this.status = status;
      if (cause) this.cause = cause;
    }
  }

  async function api(path, options = {}) {
    if (!available()) return null;
    const controller = typeof AbortController === "function" ? new AbortController() : null;
    const timer = controller ? setTimeout(() => controller.abort(), TIMEOUT_MS) : null;
    try {
      const response = await fetch(`${apiUrl()}${path}`, {
        method: options.method || "GET",
        headers: {
          accept: "application/json",
          authorization: `Bearer ${token()}`,
          ...(options.body === undefined ? {} : { "content-type": "application/json" }),
        },
        body: options.body === undefined ? undefined : JSON.stringify(options.body),
        signal: controller?.signal,
      });
      const data = response.status === 204
        ? null
        : await response.json().catch(() => ({ error: "invalid_response" }));
      if (!response.ok) throw new SocialError(data?.error || "request_failed", response.status);
      return data;
    } catch (error) {
      if (error instanceof SocialError) throw error;
      return null;
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  function query(value, name) {
    return value ? `?${name}=${encodeURIComponent(value)}` : "";
  }

  function profile() {
    return api("/v1/social/profile");
  }

  function friends() {
    return api("/v1/friends");
  }

  function addFriend(friendCode, displayName) {
    return api("/v1/friends", {
      method: "POST",
      body: { friendCode: String(friendCode || ""), displayName },
    });
  }

  function removeFriend(friendCode) {
    return api(`/v1/friends/${encodeURIComponent(String(friendCode || ""))}`, {
      method: "DELETE",
    });
  }

  function seasonLeague(season) {
    return api(`/v1/leagues/season${query(season, "season")}`);
  }

  function duels() {
    return api("/v1/duels");
  }

  async function challenge(purpose, duelId) {
    return api("/v1/scores/challenge", {
      method: "POST",
      body: { purpose, ...(duelId ? { duelId } : {}) },
    });
  }

  function normalizeSamples(samples) {
    if (!Array.isArray(samples)) throw new Error("Replay samples must be an array");
    return samples.map((sample) => {
      if (!Array.isArray(sample) || sample.length !== 3) {
        throw new Error("Each replay sample must be [timeMs, action, value]");
      }
      return sample.map(Number);
    });
  }

  async function replayProof(nonce, score, durationMs, samples) {
    if (!global.crypto?.subtle || typeof TextEncoder !== "function") {
      throw new Error("Web Crypto is required for replay proofs");
    }
    const proof = {
      durationMs: Number(durationMs),
      samples: normalizeSamples(samples),
    };
    const canonical = `${nonce}\n${Number(score)}\n${proof.durationMs}\n${JSON.stringify(proof.samples)}`;
    const digest = await global.crypto.subtle.digest("SHA-256", new TextEncoder().encode(canonical));
    proof.checksum = [...new Uint8Array(digest)]
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");
    return proof;
  }

  async function submitDailyScore(score, displayName, durationMs, samples) {
    const issued = await challenge("daily");
    if (!issued) return null;
    const proof = await replayProof(issued.nonce, score, durationMs, samples);
    return api("/v1/scores/daily", {
      method: "POST",
      body: { score: Number(score), displayName, nonce: issued.nonce, replayProof: proof },
    });
  }

  async function createDuel(friendCode, score, displayName, durationMs, samples) {
    const issued = await challenge("duel_create");
    if (!issued) return null;
    const proof = await replayProof(issued.nonce, score, durationMs, samples);
    return api("/v1/duels", {
      method: "POST",
      body: {
        friendCode: String(friendCode || ""),
        score: Number(score),
        displayName,
        nonce: issued.nonce,
        replayProof: proof,
      },
    });
  }

  async function completeDuel(duelId, score, durationMs, samples) {
    const issued = await challenge("duel_result", duelId);
    if (!issued) return null;
    const proof = await replayProof(issued.nonce, score, durationMs, samples);
    return api(`/v1/duels/${encodeURIComponent(duelId)}/result`, {
      method: "POST",
      body: { score: Number(score), nonce: issued.nonce, replayProof: proof },
    });
  }

  global.OttiskSocial = Object.freeze({
    SocialError,
    isAvailable: available,
    profile,
    friends,
    addFriend,
    removeFriend,
    seasonLeague,
    duels,
    challenge,
    replayProof,
    submitDailyScore,
    createDuel,
    completeDuel,
  });
})(globalThis);
