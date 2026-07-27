const JSON_HEADERS = { "content-type": "application/json; charset=utf-8" };
const SESSION_DAYS = 90;
const MAX_SAVE_BYTES = 64 * 1024;
const MAX_BODY_BYTES = 96 * 1024;
const BOARD_LIMIT = 100;
const FRIEND_LIMIT = 200;
const DUEL_LIMIT = 50;
const REPLAY_MIN_SAMPLES = 2;
const REPLAY_MAX_SAMPLES = 96;
const REPLAY_MAX_DURATION_MS = 60 * 60 * 1000;
const SCORE_CHALLENGE_MINUTES = 10;

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
  if (path === "/v1/social/profile" && request.method === "GET") return socialProfile(request, env);
  if (path === "/v1/friends" && request.method === "GET") return listFriends(request, env);
  if (path === "/v1/friends" && request.method === "POST") return addFriend(request, env);
  const friendMatch = /^\/v1\/friends\/([A-Za-z0-9-]+)$/.exec(path);
  if (friendMatch && request.method === "DELETE") return removeFriend(request, env, friendMatch[1]);
  if (path === "/v1/scores/challenge" && request.method === "POST") return scoreChallenge(request, env);
  if (path === "/v1/scores/daily" && request.method === "POST") return submitDaily(request, env);
  if (path === "/v1/leaderboards/daily" && request.method === "GET") return dailyBoard(request, env);
  if (path === "/v1/leaderboards/season" && request.method === "GET") return seasonBoard(request, env);
  if (path === "/v1/leagues/season" && request.method === "GET") return seasonLeague(request, env);
  if (path === "/v1/duels" && request.method === "GET") return listDuels(request, env);
  if (path === "/v1/duels" && request.method === "POST") return createDuel(request, env);
  const duelMatch = /^\/v1\/duels\/([0-9a-f-]{36})\/result$/.exec(path);
  if (duelMatch && request.method === "POST") return completeDuel(request, env, duelMatch[1]);
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
  return sha256(`${pepper}\0${value}`);
}

async function sha256(value) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function recoveryCode() {
  const raw = randomToken(24).toUpperCase().replace(/[-_]/g, "A");
  return raw.match(/.{1,4}/g).join("-");
}

const FRIEND_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

function newFriendCode() {
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  let code = "";
  for (const byte of bytes) code += FRIEND_ALPHABET[byte % FRIEND_ALPHABET.length];
  return `${code.slice(0, 4)}-${code.slice(4)}`;
}

function normalizeFriendCode(value) {
  return String(value || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
}

async function ensureSocialProfile(env, accountId, displayName) {
  const existing = await env.DB.prepare(
    "SELECT friend_code, display_name FROM social_profiles WHERE account_id = ?",
  ).bind(accountId).first();
  if (existing) {
    if (displayName !== undefined) {
      const clean = sanitizeName(displayName, accountId);
      await env.DB.prepare(
        "UPDATE social_profiles SET display_name = ? WHERE account_id = ?",
      ).bind(clean, accountId).run();
      existing.display_name = clean;
    }
    return existing;
  }
  const clean = sanitizeName(displayName, accountId);
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const friendCode = normalizeFriendCode(newFriendCode());
    try {
      await env.DB.prepare(
        "INSERT INTO social_profiles (account_id, friend_code, display_name) VALUES (?, ?, ?)",
      ).bind(accountId, friendCode, clean).run();
      return { friend_code: friendCode, display_name: clean };
    } catch (error) {
      if (!/unique|constraint/i.test(String(error?.message || error))) throw error;
      const raced = await env.DB.prepare(
        "SELECT friend_code, display_name FROM social_profiles WHERE account_id = ?",
      ).bind(accountId).first();
      if (raced) return raced;
    }
  }
  throw new ApiError("friend_code_unavailable", 503);
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

function publicFriendCode(value) {
  const normalized = normalizeFriendCode(value);
  return `${normalized.slice(0, 4)}-${normalized.slice(4)}`;
}

function pairAccounts(first, second) {
  return first < second ? [first, second] : [second, first];
}

async function socialProfile(request, env) {
  return guarded(request, env, async () => {
    const { accountId } = await authenticate(request, env);
    const profile = await ensureSocialProfile(env, accountId);
    return json({
      accountId,
      friendCode: publicFriendCode(profile.friend_code),
      displayName: profile.display_name,
    }, 200, request, env);
  });
}

async function listFriends(request, env) {
  return guarded(request, env, async () => {
    const { accountId } = await authenticate(request, env);
    await ensureSocialProfile(env, accountId);
    const result = await env.DB.prepare(
      `SELECT p.friend_code AS friendCode, p.display_name AS displayName,
              f.created_at AS friendsSince
       FROM friendships f
       JOIN social_profiles p ON p.account_id =
         CASE WHEN f.account_low = ? THEN f.account_high ELSE f.account_low END
       WHERE f.account_low = ? OR f.account_high = ?
       ORDER BY p.display_name COLLATE NOCASE, p.friend_code
       LIMIT ?`,
    ).bind(accountId, accountId, accountId, FRIEND_LIMIT).all();
    return json({
      friends: (result.results || []).map((entry) => ({
        ...entry,
        friendCode: publicFriendCode(entry.friendCode),
      })),
    }, 200, request, env);
  });
}

async function addFriend(request, env) {
  return guarded(request, env, async () => {
    const { accountId } = await authenticate(request, env);
    const body = await readJson(request);
    const friendCode = normalizeFriendCode(body.friendCode);
    if (!/^[A-Z0-9]{8}$/.test(friendCode)) throw new ApiError("invalid_friend_code", 400);
    await ensureSocialProfile(env, accountId, body.displayName);
    const target = await env.DB.prepare(
      "SELECT account_id, friend_code, display_name FROM social_profiles WHERE friend_code = ?",
    ).bind(friendCode).first();
    if (!target) throw new ApiError("friend_not_found", 404);
    if (target.account_id === accountId) throw new ApiError("cannot_friend_self", 409);
    const [low, high] = pairAccounts(accountId, target.account_id);
    await env.DB.prepare(
      `INSERT INTO friendships (account_low, account_high, created_by)
       VALUES (?, ?, ?) ON CONFLICT(account_low, account_high) DO NOTHING`,
    ).bind(low, high, accountId).run();
    return json({
      friend: {
        friendCode: publicFriendCode(target.friend_code),
        displayName: target.display_name,
      },
    }, 201, request, env);
  });
}

async function removeFriend(request, env, code) {
  return guarded(request, env, async () => {
    const { accountId } = await authenticate(request, env);
    const friendCode = normalizeFriendCode(code);
    if (!/^[A-Z0-9]{8}$/.test(friendCode)) throw new ApiError("invalid_friend_code", 400);
    const target = await env.DB.prepare(
      "SELECT account_id FROM social_profiles WHERE friend_code = ?",
    ).bind(friendCode).first();
    if (target) {
      const [low, high] = pairAccounts(accountId, target.account_id);
      await env.DB.prepare(
        "DELETE FROM friendships WHERE account_low = ? AND account_high = ?",
      ).bind(low, high).run();
    }
    return new Response(null, { status: 204, headers: corsHeaders(request, env) });
  });
}

function challengeScope(purpose, duelId) {
  if (purpose === "daily") return `daily:${currentDay()}`;
  if (purpose === "duel_create") return "duel:create";
  if (purpose === "duel_result" && /^[0-9a-f-]{36}$/.test(String(duelId || ""))) {
    return `duel:result:${duelId}`;
  }
  throw new ApiError("invalid_challenge_purpose", 400);
}

async function scoreChallenge(request, env) {
  return guarded(request, env, async () => {
    const { accountId } = await authenticate(request, env);
    const body = await readJson(request);
    const scope = challengeScope(body.purpose, body.duelId);
    if (body.purpose === "duel_result") {
      const duel = await env.DB.prepare(
        "SELECT target_id, status FROM ghost_duels WHERE id = ?",
      ).bind(body.duelId).first();
      if (!duel || duel.target_id !== accountId || duel.status !== "pending") {
        throw new ApiError("duel_not_actionable", 409);
      }
    }
    const nonce = randomToken(18);
    const nonceHash = await hash(nonce, env.TOKEN_PEPPER || "");
    await env.DB.prepare(
      `INSERT INTO score_challenges (nonce_hash, account_id, scope, expires_at)
       VALUES (?, ?, ?, datetime('now', ?))`,
    ).bind(nonceHash, accountId, scope, `+${SCORE_CHALLENGE_MINUTES} minutes`).run();
    return json({
      nonce,
      purpose: body.purpose,
      expiresInSeconds: SCORE_CHALLENGE_MINUTES * 60,
      proofVersion: 1,
      sampleLimits: { min: REPLAY_MIN_SAMPLES, max: REPLAY_MAX_SAMPLES },
    }, 201, request, env);
  });
}

function canonicalReplay(nonce, score, proof) {
  return `${nonce}\n${score}\n${proof.durationMs}\n${JSON.stringify(proof.samples)}`;
}

function validateReplayShape(proof) {
  if (!proof || typeof proof !== "object" || Array.isArray(proof)) {
    throw new ApiError("invalid_replay_proof", 400);
  }
  const duration = Number(proof.durationMs);
  if (!Number.isSafeInteger(duration) || duration < 250 || duration > REPLAY_MAX_DURATION_MS) {
    throw new ApiError("invalid_replay_duration", 400);
  }
  if (!Array.isArray(proof.samples)
      || proof.samples.length < REPLAY_MIN_SAMPLES
      || proof.samples.length > REPLAY_MAX_SAMPLES) {
    throw new ApiError("invalid_replay_samples", 400);
  }
  let previousTime = -1;
  for (const sample of proof.samples) {
    if (!Array.isArray(sample) || sample.length !== 3) {
      throw new ApiError("invalid_replay_samples", 400);
    }
    const [time, action, value] = sample;
    if (!Number.isSafeInteger(time) || time <= previousTime || time < 0 || time > duration
        || !Number.isSafeInteger(action) || action < 0 || action > 31
        || !Number.isSafeInteger(value) || value < -1000000 || value > 1000000) {
      throw new ApiError("invalid_replay_samples", 400);
    }
    previousTime = time;
  }
  if (proof.samples[0][0] > 5000 || previousTime < duration - 5000) {
    throw new ApiError("incomplete_replay_samples", 400);
  }
  if (!/^[a-f0-9]{64}$/.test(String(proof.checksum || "").toLowerCase())) {
    throw new ApiError("invalid_replay_checksum", 400);
  }
  return {
    durationMs: duration,
    samples: proof.samples,
    checksum: String(proof.checksum).toLowerCase(),
  };
}

async function consumeScoreChallenge(env, accountId, scope, nonce, score, inputProof) {
  if (!/^[A-Za-z0-9_-]{20,40}$/.test(String(nonce || ""))) {
    throw new ApiError("invalid_score_challenge", 400);
  }
  const proof = validateReplayShape(inputProof);
  const expected = await sha256(canonicalReplay(nonce, score, proof));
  if (expected !== proof.checksum) throw new ApiError("replay_checksum_mismatch", 400);
  const nonceHash = await hash(nonce, env.TOKEN_PEPPER || "");
  const result = await env.DB.prepare(
    `UPDATE score_challenges SET used_at = datetime('now')
     WHERE nonce_hash = ? AND account_id = ? AND scope = ?
       AND used_at IS NULL AND expires_at > datetime('now')`,
  ).bind(nonceHash, accountId, scope).run();
  if (!result?.meta?.changes) throw new ApiError("score_challenge_expired_or_used", 409);
  return proof;
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
    await consumeScoreChallenge(env, accountId, `daily:${day}`, body.nonce, score, body.replayProof);
    await ensureSocialProfile(env, accountId, displayName);
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
    const league = url.searchParams.get("league");
    if (league && !validLeague(league)) throw new ApiError("invalid_league", 400);
    const result = await env.DB.prepare(
      `WITH totals AS (
         SELECT account_id, MAX(display_name) AS displayName, SUM(score) AS score
         FROM daily_scores WHERE day >= ? AND day < ? GROUP BY account_id
       ), classified AS (
         SELECT *, ${leagueCase("score")} AS league FROM totals
       )
       SELECT account_id, displayName, score, league FROM classified
       WHERE (? IS NULL OR league = ?)
       ORDER BY score DESC, account_id ASC LIMIT ?`,
    ).bind(`${season}-01`, nextMonth(season), league, league, BOARD_LIMIT).all();
    return json({
      season,
      league: league || null,
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

const LEAGUES = ["bronze", "silver", "gold", "obsidian"];

function validLeague(value) {
  return LEAGUES.includes(value);
}

function leagueForScore(value) {
  const score = Number(value) || 0;
  if (score >= 250000) return "obsidian";
  if (score >= 50000) return "gold";
  if (score >= 10000) return "silver";
  return "bronze";
}

function leagueCase(column) {
  return `CASE WHEN ${column} >= 250000 THEN 'obsidian'
    WHEN ${column} >= 50000 THEN 'gold'
    WHEN ${column} >= 10000 THEN 'silver' ELSE 'bronze' END`;
}

async function seasonLeague(request, env) {
  return guarded(request, env, async () => {
    const { accountId } = await authenticate(request, env);
    const url = new URL(request.url);
    const season = url.searchParams.get("season") || currentSeason();
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(season)) throw new ApiError("invalid_season", 400);
    const start = `${season}-01`;
    const end = nextMonth(season);
    const own = await env.DB.prepare(
      `SELECT COUNT(*) AS days, COALESCE(SUM(score), 0) AS score
       FROM daily_scores WHERE day >= ? AND day < ? AND account_id = ?`,
    ).bind(start, end, accountId).first();
    const score = Number(own?.score || 0);
    const league = leagueForScore(score);
    let rank = null;
    let leagueSize = 0;
    if (Number(own?.days || 0) > 0) {
      const stats = await env.DB.prepare(
        `WITH totals AS (
           SELECT account_id, SUM(score) AS score
           FROM daily_scores WHERE day >= ? AND day < ? GROUP BY account_id
         ), classified AS (
           SELECT *, ${leagueCase("score")} AS league FROM totals
         )
         SELECT COUNT(*) AS leagueSize,
           1 + SUM(CASE WHEN score > ? OR (score = ? AND account_id < ?) THEN 1 ELSE 0 END) AS rank
         FROM classified WHERE league = ?`,
      ).bind(start, end, score, score, accountId, league).first();
      rank = Number(stats?.rank || 1);
      leagueSize = Number(stats?.leagueSize || 0);
    }
    return json({
      season,
      league,
      score,
      rank,
      leagueSize,
      thresholds: { silver: 10000, gold: 50000, obsidian: 250000 },
    }, 200, request, env);
  });
}

async function requireFriend(env, first, second) {
  const [low, high] = pairAccounts(first, second);
  const row = await env.DB.prepare(
    "SELECT 1 AS ok FROM friendships WHERE account_low = ? AND account_high = ?",
  ).bind(low, high).first();
  if (!row) throw new ApiError("duel_requires_friend", 403);
}

function cleanDuel(row, accountId) {
  const challenger = row.challenger_id === accountId;
  const challengerScore = Number(row.challenger_score);
  const targetScore = row.target_score === null || row.target_score === undefined
    ? null
    : Number(row.target_score);
  let outcome = null;
  if (targetScore !== null) {
    if (challengerScore === targetScore) outcome = "draw";
    else {
      const winnerIsChallenger = challengerScore > targetScore;
      outcome = winnerIsChallenger === challenger ? "win" : "loss";
    }
  }
  return {
    id: row.id,
    role: challenger ? "challenger" : "target",
    opponent: {
      friendCode: publicFriendCode(row.opponent_code),
      displayName: row.opponent_name,
    },
    status: row.status,
    challengerScore,
    targetScore,
    outcome,
    ghost: challenger
      ? (row.target_replay ? JSON.parse(row.target_replay) : null)
      : JSON.parse(row.challenger_replay),
    createdAt: row.created_at,
    completedAt: row.completed_at,
  };
}

async function listDuels(request, env) {
  return guarded(request, env, async () => {
    const { accountId } = await authenticate(request, env);
    const result = await env.DB.prepare(
      `SELECT d.*,
         p.friend_code AS opponent_code, p.display_name AS opponent_name
       FROM ghost_duels d
       JOIN social_profiles p ON p.account_id =
         CASE WHEN d.challenger_id = ? THEN d.target_id ELSE d.challenger_id END
       WHERE d.challenger_id = ? OR d.target_id = ?
       ORDER BY d.created_at DESC LIMIT ?`,
    ).bind(accountId, accountId, accountId, DUEL_LIMIT).all();
    return json({
      duels: (result.results || []).map((row) => cleanDuel(row, accountId)),
    }, 200, request, env);
  });
}

async function createDuel(request, env) {
  return guarded(request, env, async () => {
    const { accountId } = await authenticate(request, env);
    const body = await readJson(request);
    const friendCode = normalizeFriendCode(body.friendCode);
    if (!/^[A-Z0-9]{8}$/.test(friendCode)) throw new ApiError("invalid_friend_code", 400);
    const target = await env.DB.prepare(
      "SELECT account_id FROM social_profiles WHERE friend_code = ?",
    ).bind(friendCode).first();
    if (!target || target.account_id === accountId) throw new ApiError("friend_not_found", 404);
    await requireFriend(env, accountId, target.account_id);
    const score = Number(body.score);
    if (!Number.isSafeInteger(score) || score < 0 || score > 100000000) {
      throw new ApiError("invalid_score", 400);
    }
    const proof = await consumeScoreChallenge(
      env,
      accountId,
      "duel:create",
      body.nonce,
      score,
      body.replayProof,
    );
    await ensureSocialProfile(env, accountId, body.displayName);
    const duelId = crypto.randomUUID();
    await env.DB.prepare(
      `INSERT INTO ghost_duels
       (id, challenger_id, target_id, challenger_score, challenger_replay, challenger_checksum)
       VALUES (?, ?, ?, ?, ?, ?)`,
    ).bind(
      duelId,
      accountId,
      target.account_id,
      score,
      JSON.stringify({ durationMs: proof.durationMs, samples: proof.samples }),
      proof.checksum,
    ).run();
    return json({ id: duelId, status: "pending" }, 201, request, env);
  });
}

async function completeDuel(request, env, duelId) {
  return guarded(request, env, async () => {
    const { accountId } = await authenticate(request, env);
    const body = await readJson(request);
    const duel = await env.DB.prepare(
      "SELECT challenger_score, target_id, status FROM ghost_duels WHERE id = ?",
    ).bind(duelId).first();
    if (!duel) throw new ApiError("duel_not_found", 404);
    if (duel.target_id !== accountId) throw new ApiError("duel_forbidden", 403);
    if (duel.status !== "pending") throw new ApiError("duel_already_completed", 409);
    const score = Number(body.score);
    if (!Number.isSafeInteger(score) || score < 0 || score > 100000000) {
      throw new ApiError("invalid_score", 400);
    }
    const proof = await consumeScoreChallenge(
      env,
      accountId,
      `duel:result:${duelId}`,
      body.nonce,
      score,
      body.replayProof,
    );
    const update = await env.DB.prepare(
      `UPDATE ghost_duels SET status = 'completed', target_score = ?,
         target_replay = ?, target_checksum = ?, completed_at = datetime('now')
       WHERE id = ? AND status = 'pending'`,
    ).bind(
      score,
      JSON.stringify({ durationMs: proof.durationMs, samples: proof.samples }),
      proof.checksum,
      duelId,
    ).run();
    if (!update?.meta?.changes) throw new ApiError("duel_already_completed", 409);
    const challengerScore = Number(duel.challenger_score);
    return json({
      id: duelId,
      status: "completed",
      score,
      opponentScore: challengerScore,
      outcome: score === challengerScore ? "draw" : score > challengerScore ? "win" : "loss",
    }, 200, request, env);
  });
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
  canonicalReplay,
  challengeScope,
  leagueForScore,
  normalizeFriendCode,
  pairAccounts,
  publicFriendCode,
  validateReplayShape,
  validDay,
  nextMonth,
  normalizeRecovery,
  sanitizeName,
  safeTag,
};
