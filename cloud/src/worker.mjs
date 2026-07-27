const JSON_HEADERS = { "content-type": "application/json; charset=utf-8" };
const SESSION_DAYS = 90;
const MAX_SAVE_BYTES = 64 * 1024;
const MAX_BODY_BYTES = 96 * 1024;
const BOARD_LIMIT = 100;

export default {
  async fetch(request, env) {
    try {
      return await route(request, env);
    } catch (error) {
      console.error("worker_error", error?.name || "Error");
      return json({ error: "internal_error" }, 500, request, env);
    }
  },
};

async function route(request, env) {
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, "") || "/";

  if (request.method === "OPTIONS") {
    if (!originAllowed(request, env)) return json({ error: "origin_not_allowed" }, 403);
    return new Response(null, { status: 204, headers: corsHeaders(request, env) });
  }
  if (!originAllowed(request, env)) return json({ error: "origin_not_allowed" }, 403);
  if (path === "/health" && request.method === "GET") {
    return json({ ok: true }, 200, request, env);
  }
  if (path === "/v1/register" && request.method === "POST") return register(request, env);
  if (path === "/v1/recover" && request.method === "POST") return recover(request, env);
  if (path === "/v1/logout" && request.method === "POST") return logout(request, env);
  if (path === "/v1/save" && request.method === "GET") return getSave(request, env);
  if (path === "/v1/save" && request.method === "PUT") return putSave(request, env);
  if (path === "/v1/scores/daily" && request.method === "POST") return submitDaily(request, env);
  if (path === "/v1/leaderboards/daily" && request.method === "GET") return dailyBoard(request, env);
  if (path === "/v1/leaderboards/season" && request.method === "GET") return seasonBoard(request, env);
  if (path === "/v1/crashes" && request.method === "POST") return ingestCrash(request, env);
  return json({ error: "not_found" }, 404, request, env);
}

function configuredOrigins(env) {
  return String(env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

function originAllowed(request, env) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  const allowed = configuredOrigins(env);
  return allowed.includes("*") || allowed.includes(origin);
}

function corsHeaders(request, env) {
  const headers = {
    "access-control-allow-methods": "GET, PUT, POST, OPTIONS",
    "access-control-allow-headers": "authorization, content-type",
    "access-control-max-age": "86400",
    vary: "Origin",
  };
  const origin = request.headers.get("origin");
  const allowed = configuredOrigins(env);
  if (origin && allowed.includes(origin)) headers["access-control-allow-origin"] = origin;
  else if (origin && allowed.includes("*")) headers["access-control-allow-origin"] = "*";
  return headers;
}

function json(value, status = 200, request, env) {
  return new Response(JSON.stringify(value), {
    status,
    headers: {
      ...JSON_HEADERS,
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
      ...(request && env ? corsHeaders(request, env) : {}),
    },
  });
}

async function readJson(request) {
  const length = Number(request.headers.get("content-length") || 0);
  if (length > MAX_BODY_BYTES) throw new ApiError("body_too_large", 413);
  const text = await request.text();
  if (new TextEncoder().encode(text).length > MAX_BODY_BYTES) {
    throw new ApiError("body_too_large", 413);
  }
  try {
    const parsed = text ? JSON.parse(text) : {};
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("object required");
    }
    return parsed;
  } catch {
    throw new ApiError("invalid_json", 400);
  }
}

class ApiError extends Error {
  constructor(code, status) {
    super(code);
    this.code = code;
    this.status = status;
  }
}

async function guarded(request, env, callback) {
  try {
    return await callback();
  } catch (error) {
    if (error instanceof ApiError) return json({ error: error.code }, error.status, request, env);
    throw error;
  }
}

function randomToken(bytes = 32) {
  const data = crypto.getRandomValues(new Uint8Array(bytes));
  return base64Url(data);
}

function base64Url(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function hash(value, pepper = "") {
  const bytes = new TextEncoder().encode(`${pepper}\0${value}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function recoveryCode() {
  const raw = randomToken(24).toUpperCase().replace(/[-_]/g, "A");
  return raw.match(/.{1,4}/g).join("-");
}

async function createSession(env, accountId) {
  const token = randomToken();
  const tokenHash = await hash(token, env.TOKEN_PEPPER || "");
  await env.DB.prepare(
    "INSERT INTO sessions (token_hash, account_id, expires_at) VALUES (?, ?, datetime('now', ?))",
  ).bind(tokenHash, accountId, `+${SESSION_DAYS} days`).run();
  return token;
}

async function register(request, env) {
  return guarded(request, env, async () => {
    await readJson(request);
    const accountId = crypto.randomUUID();
    const code = recoveryCode();
    const recoveryHash = await hash(normalizeRecovery(code), env.TOKEN_PEPPER || "");
    await env.DB.prepare(
      "INSERT INTO accounts (id, recovery_hash) VALUES (?, ?)",
    ).bind(accountId, recoveryHash).run();
    const sessionToken = await createSession(env, accountId);
    return json({ accountId, recoveryCode: code, sessionToken }, 201, request, env);
  });
}

function normalizeRecovery(value) {
  return String(value || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
}

async function recover(request, env) {
  return guarded(request, env, async () => {
    const body = await readJson(request);
    const normalized = normalizeRecovery(body.recoveryCode);
    if (normalized.length < 20 || normalized.length > 64) throw new ApiError("invalid_recovery_code", 400);
    const recoveryHash = await hash(normalized, env.TOKEN_PEPPER || "");
    const account = await env.DB.prepare(
      "SELECT id FROM accounts WHERE recovery_hash = ?",
    ).bind(recoveryHash).first();
    if (!account) throw new ApiError("invalid_recovery_code", 401);
    const sessionToken = await createSession(env, account.id);
    return json({ accountId: account.id, sessionToken }, 200, request, env);
  });
}

async function authenticate(request, env) {
  const match = /^Bearer ([A-Za-z0-9_-]{30,100})$/.exec(request.headers.get("authorization") || "");
  if (!match) throw new ApiError("unauthorized", 401);
  const tokenHash = await hash(match[1], env.TOKEN_PEPPER || "");
  const session = await env.DB.prepare(
    "SELECT account_id FROM sessions WHERE token_hash = ? AND expires_at > datetime('now')",
  ).bind(tokenHash).first();
  if (!session) throw new ApiError("unauthorized", 401);
  return { accountId: session.account_id, tokenHash };
}

async function logout(request, env) {
  return guarded(request, env, async () => {
    const auth = await authenticate(request, env);
    await env.DB.prepare("DELETE FROM sessions WHERE token_hash = ?").bind(auth.tokenHash).run();
    return new Response(null, { status: 204, headers: corsHeaders(request, env) });
  });
}

async function getSave(request, env) {
  return guarded(request, env, async () => {
    const { accountId } = await authenticate(request, env);
    const row = await env.DB.prepare(
      "SELECT data, revision, updated_at FROM saves WHERE account_id = ?",
    ).bind(accountId).first();
    if (!row) return json({ save: null, revision: 0, updatedAt: null }, 200, request, env);
    return json(
      { save: JSON.parse(row.data), revision: row.revision, updatedAt: row.updated_at },
      200,
      request,
      env,
    );
  });
}

export function sanitizeSave(value, depth = 0) {
  if (depth > 12) throw new ApiError("save_too_deep", 400);
  if (value === null || typeof value === "boolean" || typeof value === "string") return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new ApiError("invalid_save", 400);
    return value;
  }
  if (Array.isArray(value)) {
    if (value.length > 5000) throw new ApiError("invalid_save", 400);
    return value.map((entry) => sanitizeSave(entry, depth + 1));
  }
  if (!value || typeof value !== "object") throw new ApiError("invalid_save", 400);
  const output = {};
  for (const [key, entry] of Object.entries(value)) {
    if (["__proto__", "prototype", "constructor", "iapHeroes", "starterPackBought"].includes(key)) continue;
    if (key.length > 80) throw new ApiError("invalid_save", 400);
    output[key] = sanitizeSave(entry, depth + 1);
  }
  return output;
}

async function putSave(request, env) {
  return guarded(request, env, async () => {
    const { accountId } = await authenticate(request, env);
    const body = await readJson(request);
    if (!Object.prototype.hasOwnProperty.call(body, "save")) throw new ApiError("save_required", 400);
    const save = sanitizeSave(body.save);
    const encoded = JSON.stringify(save);
    if (new TextEncoder().encode(encoded).length > MAX_SAVE_BYTES) {
      throw new ApiError("save_too_large", 413);
    }
    await env.DB.prepare(
      `INSERT INTO saves (account_id, data, revision, updated_at)
       VALUES (?, ?, 1, datetime('now'))
       ON CONFLICT(account_id) DO UPDATE SET
         data = excluded.data, revision = saves.revision + 1, updated_at = datetime('now')`,
    ).bind(accountId, encoded).run();
    const row = await env.DB.prepare(
      "SELECT revision, updated_at FROM saves WHERE account_id = ?",
    ).bind(accountId).first();
    return json({ revision: row.revision, updatedAt: row.updated_at }, 200, request, env);
  });
}

function validDay(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ""))) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}

function currentDay() {
  return new Date().toISOString().slice(0, 10);
}

function currentSeason() {
  return new Date().toISOString().slice(0, 7);
}

function sanitizeName(value, accountId) {
  const fallback = `След-${accountId.replace(/-/g, "").slice(0, 6)}`;
  if (typeof value !== "string") return fallback;
  const clean = value.normalize("NFKC").replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, 24);
  return clean || fallback;
}

async function submitDaily(request, env) {
  return guarded(request, env, async () => {
    const { accountId } = await authenticate(request, env);
    const body = await readJson(request);
    const score = Number(body.score);
    if (!Number.isSafeInteger(score) || score < 0 || score > 100000000) {
      throw new ApiError("invalid_score", 400);
    }
    const day = currentDay();
    const displayName = sanitizeName(body.displayName, accountId);
    await env.DB.prepare(
      `INSERT INTO daily_scores (day, account_id, score, display_name, updated_at)
       VALUES (?, ?, ?, ?, datetime('now'))
       ON CONFLICT(day, account_id) DO UPDATE SET
         score = MAX(daily_scores.score, excluded.score),
         display_name = CASE WHEN excluded.score >= daily_scores.score THEN excluded.display_name ELSE daily_scores.display_name END,
         updated_at = datetime('now')`,
    ).bind(day, accountId, score, displayName).run();
    const row = await env.DB.prepare(
      "SELECT score FROM daily_scores WHERE day = ? AND account_id = ?",
    ).bind(day, accountId).first();
    return json({ day, score: row.score }, 200, request, env);
  });
}

function boardDay(url) {
  const day = url.searchParams.get("day") || currentDay();
  if (!validDay(day)) throw new ApiError("invalid_day", 400);
  return day;
}

async function dailyBoard(request, env) {
  return guarded(request, env, async () => {
    const day = boardDay(new URL(request.url));
    const result = await env.DB.prepare(
      `SELECT display_name AS displayName, score
       FROM daily_scores WHERE day = ?
       ORDER BY score DESC, updated_at ASC LIMIT ?`,
    ).bind(day, BOARD_LIMIT).all();
    return json({
      day,
      entries: (result.results || []).map((row, index) => ({ rank: index + 1, ...row })),
    }, 200, request, env);
  });
}

async function seasonBoard(request, env) {
  return guarded(request, env, async () => {
    const url = new URL(request.url);
    const season = url.searchParams.get("season") || currentSeason();
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(season)) throw new ApiError("invalid_season", 400);
    const result = await env.DB.prepare(
      `SELECT account_id, MAX(display_name) AS displayName, SUM(score) AS score
       FROM daily_scores WHERE day >= ? AND day < ?
       GROUP BY account_id ORDER BY score DESC, account_id ASC LIMIT ?`,
    ).bind(`${season}-01`, nextMonth(season), BOARD_LIMIT).all();
    return json({
      season,
      entries: (result.results || []).map(({ account_id: _, ...row }, index) => ({
        rank: index + 1,
        ...row,
      })),
    }, 200, request, env);
  });
}

function nextMonth(season) {
  const [year, month] = season.split("-").map(Number);
  return new Date(Date.UTC(year, month, 1)).toISOString().slice(0, 10);
}

async function ingestCrash(request, env) {
  return guarded(request, env, async () => {
    const body = await readJson(request);
    const fingerprint = String(body.fingerprint || "").toLowerCase();
    if (!/^[a-f0-9]{16,64}$/.test(fingerprint)) throw new ApiError("invalid_fingerprint", 400);
    const release = safeTag(body.release, 32);
    const platform = safeTag(body.platform, 24);
    const category = safeTag(body.category, 32);
    const signature = await hash(fingerprint, env.CRASH_PEPPER || env.TOKEN_PEPPER || "");
    await env.DB.prepare(
      `INSERT INTO crash_aggregates (day, signature, release, platform, category, occurrences, last_seen_at)
       VALUES (?, ?, ?, ?, ?, 1, datetime('now'))
       ON CONFLICT(day, signature, release, platform, category) DO UPDATE SET
         occurrences = crash_aggregates.occurrences + 1, last_seen_at = datetime('now')`,
    ).bind(currentDay(), signature, release, platform, category).run();
    return new Response(null, { status: 204, headers: corsHeaders(request, env) });
  });
}

function safeTag(value, max) {
  return String(value || "unknown").replace(/[^A-Za-z0-9._-]/g, "").slice(0, max) || "unknown";
}

export const internals = {
  validDay,
  nextMonth,
  normalizeRecovery,
  sanitizeName,
  safeTag,
};
