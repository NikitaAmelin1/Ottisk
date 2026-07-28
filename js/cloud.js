/**
 * Dependency-free ОТТИСК cloud client.
 *
 * Loading this file does not make a request. With an empty apiUrl every method
 * is a safe no-op, so builds can include it before a backend is configured.
 */
(function attachOttiskCloud(global) {
  "use strict";

  const CONFIG_KEY = "ottisk-cloud-config-v1";
  const AUTH_KEY = "ottisk-cloud-auth-v1";
  const QUEUE_KEY = "ottisk-cloud-queue-v1";
  const MAX_QUEUE = 25;
  const TIMEOUT_MS = 10000;
  let memory = Object.create(null);
  let syncing = null;

  function storageGet(key) {
    try {
      return global.localStorage?.getItem(key) ?? memory[key] ?? null;
    } catch (_) {
      return memory[key] ?? null;
    }
  }

  function storageSet(key, value) {
    memory[key] = value;
    try {
      global.localStorage?.setItem(key, value);
    } catch (_) {
      // Private browsing and full storage must not affect gameplay.
    }
  }

  function storageRemove(key) {
    delete memory[key];
    try {
      global.localStorage?.removeItem(key);
    } catch (_) {
      // Best effort.
    }
  }

  function parseStored(key, fallback) {
    try {
      const value = JSON.parse(storageGet(key) || "");
      return value && typeof value === "object" ? value : fallback;
    } catch (_) {
      return fallback;
    }
  }

  function config() {
    const value = parseStored(CONFIG_KEY, {});
    return {
      apiUrl: typeof value.apiUrl === "string" ? value.apiUrl : "",
      release: safeTag(value.release, 32),
      platform: safeTag(value.platform, 24),
    };
  }

  function auth() {
    const value = parseStored(AUTH_KEY, {});
    return typeof value.sessionToken === "string" ? value : {};
  }

  function configure(options) {
    const previous = config();
    const input = typeof options === "string" ? { apiUrl: options } : (options || {});
    const rawUrl = Object.prototype.hasOwnProperty.call(input, "apiUrl")
      ? String(input.apiUrl || "").trim()
      : previous.apiUrl;
    let apiUrl = rawUrl.replace(/\/+$/, "");
    if (apiUrl) {
      try {
        const parsed = new URL(apiUrl);
        if (!["http:", "https:"].includes(parsed.protocol)) throw new Error("unsupported protocol");
        apiUrl = parsed.href.replace(/\/+$/, "");
      } catch (_) {
        throw new Error("Invalid ОТТИСК cloud API URL");
      }
    }
    const next = {
      apiUrl,
      release: safeTag(input.release ?? previous.release, 32),
      platform: safeTag(input.platform ?? previous.platform, 24),
    };
    storageSet(CONFIG_KEY, JSON.stringify(next));
    if (next.apiUrl) void sync();
    return { ...next };
  }

  function isEnabled() {
    return Boolean(config().apiUrl);
  }

  function isLinked() {
    return Boolean(isEnabled() && auth().sessionToken);
  }

  async function api(path, options = {}) {
    const current = config();
    if (!current.apiUrl) return null;
    const controller = typeof AbortController === "function" ? new AbortController() : null;
    const timer = controller ? setTimeout(() => controller.abort(), TIMEOUT_MS) : null;
    const headers = { accept: "application/json", ...(options.headers || {}) };
    if (options.auth !== false) {
      const token = auth().sessionToken;
      if (!token) throw new CloudError("not_linked", 401);
      headers.authorization = `Bearer ${token}`;
    }
    if (options.body !== undefined) headers["content-type"] = "application/json";
    try {
      const response = await fetch(`${current.apiUrl}${path}`, {
        method: options.method || "GET",
        headers,
        body: options.body === undefined ? undefined : JSON.stringify(options.body),
        signal: controller?.signal,
      });
      const data = response.status === 204
        ? null
        : await response.json().catch(() => ({ error: "invalid_response" }));
      if (!response.ok) throw new CloudError(data?.error || "request_failed", response.status);
      return data;
    } catch (error) {
      if (error instanceof CloudError) throw error;
      throw new CloudError("offline", 0, error);
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  class CloudError extends Error {
    constructor(code, status, cause) {
      super(code);
      this.name = "OttiskCloudError";
      this.code = code;
      this.status = status;
      if (cause) this.cause = cause;
    }
  }

  function storeAuth(result) {
    storageSet(AUTH_KEY, JSON.stringify({
      accountId: result.accountId,
      sessionToken: result.sessionToken,
    }));
    void sync();
    return result;
  }

  async function register() {
    if (!isEnabled()) return null;
    const result = await api("/v1/register", { method: "POST", body: {}, auth: false });
    return storeAuth(result);
  }

  async function registerEmail({ email, password, displayName } = {}) {
    if (!isEnabled()) return null;
    const result = await api("/v1/register/email", {
      method: "POST",
      body: {
        email: String(email || "").trim().toLowerCase(),
        password: String(password || ""),
        displayName: String(displayName || "").slice(0, 24),
      },
      auth: false,
    });
    return storeAuth(result);
  }

  async function loginEmail({ email, password } = {}) {
    if (!isEnabled()) return null;
    const result = await api("/v1/login", {
      method: "POST",
      body: {
        email: String(email || "").trim().toLowerCase(),
        password: String(password || ""),
      },
      auth: false,
    });
    return storeAuth(result);
  }

  async function recover(recoveryCode) {
    if (!isEnabled()) return null;
    const result = await api("/v1/recover", {
      method: "POST",
      body: { recoveryCode: String(recoveryCode || "") },
      auth: false,
    });
    return storeAuth(result);
  }

  function loadQueue() {
    const queue = parseStored(QUEUE_KEY, []);
    return Array.isArray(queue) ? queue.filter(validQueueItem).slice(-MAX_QUEUE) : [];
  }

  function validQueueItem(item) {
    return item && typeof item === "object"
      && ["save", "score", "crash"].includes(item.type)
      && typeof item.id === "string";
  }

  function saveQueue(queue) {
    storageSet(QUEUE_KEY, JSON.stringify(queue.slice(-MAX_QUEUE)));
  }

  function removeQueueItem(itemId) {
    const queue = loadQueue().filter((entry) => entry.id !== itemId);
    saveQueue(queue);
    return queue;
  }

  function enqueue(item) {
    const queue = loadQueue();
    if (item.type === "save") {
      for (let i = queue.length - 1; i >= 0; i -= 1) {
        if (queue[i].type === "save") queue.splice(i, 1);
      }
    } else if (item.type === "score") {
      const existing = queue.find((entry) => entry.type === "score" && entry.day === item.day);
      if (existing) {
        if (item.score >= existing.score) {
          existing.score = item.score;
          existing.displayName = item.displayName;
        }
        saveQueue(queue);
        return existing;
      }
    } else if (item.type === "crash") {
      const existing = queue.find((entry) =>
        entry.type === "crash" && entry.fingerprint === item.fingerprint
        && entry.release === item.release && entry.platform === item.platform);
      if (existing) return existing;
    }
    queue.push(item);
    saveQueue(queue);
    return item;
  }

  function id() {
    if (global.crypto?.randomUUID) return global.crypto.randomUUID();
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  }

  function online() {
    return typeof global.navigator === "undefined" || global.navigator.onLine !== false;
  }

  async function pushSave(save) {
    if (!isEnabled()) return null;
    const copy = jsonCopy(save);
    enqueue({ id: id(), type: "save", save: copy });
    if (!isLinked() || !online()) return null;
    const result = await sync();
    return result.lastSave || null;
  }

  async function pullSave() {
    if (!isLinked() || !online()) return null;
    try {
      return await api("/v1/save");
    } catch (error) {
      if (error.status === 0) return null;
      if (error.status === 401) clearAuth();
      throw error;
    }
  }

  async function submitDailyScore(score, displayName) {
    if (!isEnabled()) return null;
    const numeric = Number(score);
    if (!Number.isSafeInteger(numeric) || numeric < 0 || numeric > 100000000) {
      throw new Error("Score must be an integer between 0 and 100000000");
    }
    const day = new Date().toISOString().slice(0, 10);
    enqueue({
      id: id(),
      type: "score",
      day,
      score: numeric,
      displayName: cleanName(displayName),
    });
    if (!isLinked() || !online()) return null;
    const result = await sync();
    return result.lastScore || null;
  }

  async function fetchDailyBoard(day) {
    if (!isEnabled() || !online()) return null;
    const query = day ? `?day=${encodeURIComponent(day)}` : "";
    try {
      return await api(`/v1/leaderboards/daily${query}`, { auth: false });
    } catch (error) {
      if (error.status === 0) return null;
      throw error;
    }
  }

  async function fetchSeasonBoard(season) {
    if (!isEnabled() || !online()) return null;
    const query = season ? `?season=${encodeURIComponent(season)}` : "";
    try {
      return await api(`/v1/leaderboards/season${query}`, { auth: false });
    } catch (error) {
      if (error.status === 0) return null;
      throw error;
    }
  }

  async function reportCrash(error, details = {}) {
    if (!isEnabled()) return null;
    const source = crashSource(error);
    const fingerprint = await digest(source);
    const current = config();
    enqueue({
      id: id(),
      type: "crash",
      fingerprint,
      category: safeTag(details.category || error?.name || "Error", 32),
      release: safeTag(details.release || current.release, 32),
      platform: safeTag(details.platform || current.platform, 24),
    });
    if (!online()) return null;
    const result = await sync();
    return result.lastCrash || null;
  }

  function crashSource(error) {
    const name = String(error?.name || "Error");
    const stack = String(error?.stack || error?.message || error || "")
      .replace(/https?:\/\/[^\s)]+/g, (url) => {
        try {
          const parsed = new URL(url);
          return `${parsed.origin}${parsed.pathname}`;
        } catch (_) {
          return "url";
        }
      })
      .replace(/\b\d{2,}\b/g, "#")
      .slice(0, 4000);
    return `${name}\n${stack}`;
  }

  async function digest(value) {
    if (global.crypto?.subtle && typeof TextEncoder === "function") {
      const result = await global.crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
      return [...new Uint8Array(result)]
        .map((byte) => byte.toString(16).padStart(2, "0"))
        .join("");
    }
    let hash = 2166136261;
    for (let i = 0; i < value.length; i += 1) {
      hash ^= value.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    const short = (hash >>> 0).toString(16).padStart(8, "0");
    return `${short}${short}`;
  }

  async function sync() {
    if (syncing) return syncing;
    if (!isEnabled() || !online()) return { pending: loadQueue().length };
    syncing = drainQueue().finally(() => {
      syncing = null;
    });
    return syncing;
  }

  async function drainQueue() {
    const summary = { sent: 0, dropped: 0, pending: 0 };
    const attempted = new Set();
    while (true) {
      const item = loadQueue().find((entry) => {
        if (attempted.has(entry.id)) return false;
        return entry.type === "crash" || isLinked();
      });
      if (!item) break;
      attempted.add(item.id);
      try {
        let result;
        if (item.type === "save") {
          result = await api("/v1/save", { method: "PUT", body: { save: item.save } });
          summary.lastSave = result;
        } else if (item.type === "score") {
          result = await api("/v1/scores/daily", {
            method: "POST",
            body: { score: item.score, displayName: item.displayName },
          });
          summary.lastScore = result;
        } else {
          result = await api("/v1/crashes", {
            method: "POST",
            auth: false,
            body: {
              fingerprint: item.fingerprint,
              category: item.category,
              release: item.release,
              platform: item.platform,
            },
          });
          summary.lastCrash = result;
        }
        removeQueueItem(item.id);
        summary.sent += 1;
      } catch (error) {
        if (error.status === 401) {
          clearAuth();
          break;
        }
        if (error.status === 0 || error.status >= 500 || error.status === 429) break;
        removeQueueItem(item.id);
        summary.dropped += 1;
      }
    }
    summary.pending = loadQueue().length;
    return summary;
  }

  async function logout() {
    if (isEnabled() && isLinked() && online()) {
      try {
        await api("/v1/logout", { method: "POST" });
      } catch (_) {
        // Local logout always succeeds.
      }
    }
    clearAuth();
    saveQueue(loadQueue().filter((item) => item.type === "crash"));
  }

  function clearAuth() {
    storageRemove(AUTH_KEY);
  }

  function jsonCopy(value) {
    try {
      const encoded = JSON.stringify(value);
      if (encoded === undefined) throw new Error("not JSON");
      return JSON.parse(encoded);
    } catch (_) {
      throw new Error("Cloud save must be JSON-serializable");
    }
  }

  function cleanName(value) {
    return String(value || "").normalize("NFKC")
      .replace(/[\u0000-\u001f\u007f]/g, "")
      .trim()
      .slice(0, 24);
  }

  function safeTag(value, max) {
    return String(value || "unknown").replace(/[^A-Za-z0-9._-]/g, "").slice(0, max) || "unknown";
  }

  if (typeof global.addEventListener === "function") {
    global.addEventListener("online", () => void sync());
  }

  global.OttiskCloud = Object.freeze({
    configure,
    register,
    registerEmail,
    loginEmail,
    recover,
    isEnabled,
    isLinked,
    pushSave,
    pullSave,
    submitDailyScore,
    fetchDailyBoard,
    fetchSeasonBoard,
    reportCrash,
    sync,
    logout,
  });
})(globalThis);
