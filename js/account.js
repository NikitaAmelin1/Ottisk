/**
 * Local account vault for ОТТИСК.
 * Progress and purchases are bound to an email+password profile on this device.
 * When a cloud Worker URL is configured, register/login also creates a cloud session.
 */
(function attachOttiskAccount(global) {
  "use strict";

  const VAULT_KEY = "ottisk-accounts-v1";
  const SESSION_KEY = "ottisk-account-session-v1";
  const META_KEY = "ottisk-meta-v1";
  const BEST_KEY = "ottisk-best-v2";
  /** Owner emails always receive admin on register/login. */
  const OWNER_EMAILS = new Set(["amelin070411@icloud.com"]);

  let memory = Object.create(null);

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
      // Private browsing / quota — keep in-memory copy.
    }
  }

  function storageRemove(key) {
    delete memory[key];
    try {
      global.localStorage?.removeItem(key);
    } catch (_) {}
  }

  function parseJson(key, fallback) {
    try {
      const value = JSON.parse(storageGet(key) || "");
      return value && typeof value === "object" ? value : fallback;
    } catch (_) {
      return fallback;
    }
  }

  function normalizeEmail(email) {
    return String(email || "").trim().toLowerCase().slice(0, 120);
  }

  function validEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length >= 5 && email.length <= 120;
  }

  function validPassword(password) {
    const value = String(password || "");
    return value.length >= 6 && value.length <= 72;
  }

  function randomSalt() {
    if (global.crypto?.getRandomValues) {
      const bytes = global.crypto.getRandomValues(new Uint8Array(16));
      return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
    }
    return `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;
  }

  async function sha256Hex(value) {
    if (global.crypto?.subtle && typeof TextEncoder === "function") {
      const digest = await global.crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
      return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
    }
    let hash = 2166136261;
    const text = String(value);
    for (let i = 0; i < text.length; i += 1) {
      hash ^= text.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(16).padStart(8, "0");
  }

  async function hashPassword(password, salt) {
    return sha256Hex(`${salt}\0${password}\0ottisk-local`);
  }

  function loadVault() {
    const raw = parseJson(VAULT_KEY, {});
    return raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
  }

  function saveVault(vault) {
    storageSet(VAULT_KEY, JSON.stringify(vault));
  }

  function isOwnerEmail(email) {
    return OWNER_EMAILS.has(normalizeEmail(email));
  }

  function resolveAdmin(email, vault, existingRole) {
    if (existingRole === "admin") return true;
    if (isOwnerEmail(email)) return true;
    // First account registered on this device becomes admin.
    const keys = Object.keys(vault || {});
    return keys.length === 0 || (keys.length === 1 && keys[0] === normalizeEmail(email));
  }

  function session() {
    const value = parseJson(SESSION_KEY, null);
    if (!value || typeof value !== "object") return null;
    if (value.mode === "guest") return { mode: "guest", admin: false };
    if (value.mode === "user" && typeof value.email === "string" && validEmail(value.email)) {
      const email = normalizeEmail(value.email);
      const vault = loadVault();
      const entry = vault[email];
      const admin = !!value.admin || resolveAdmin(email, vault, entry?.role);
      return {
        mode: "user",
        email,
        displayName: typeof value.displayName === "string" ? value.displayName.slice(0, 24) : "",
        admin,
      };
    }
    return null;
  }

  function setSession(next) {
    if (!next) {
      storageRemove(SESSION_KEY);
      return null;
    }
    storageSet(SESSION_KEY, JSON.stringify(next));
    return next;
  }

  function isReady() {
    return Boolean(session());
  }

  function isGuest() {
    return session()?.mode === "guest";
  }

  function isUser() {
    return session()?.mode === "user";
  }

  function isAdmin() {
    const current = session();
    return current?.mode === "user" && !!current.admin;
  }

  function readDeviceMeta() {
    try {
      return JSON.parse(storageGet(META_KEY) || "null");
    } catch (_) {
      return null;
    }
  }

  function writeDeviceMeta(meta) {
    if (!meta || typeof meta !== "object") return;
    storageSet(META_KEY, JSON.stringify(meta));
    storageSet(BEST_KEY, String(Math.max(0, Number(meta.best || 0))));
  }

  function continueAsGuest() {
    return setSession({ mode: "guest" });
  }

  async function register({ email, password, displayName } = {}) {
    const cleanEmail = normalizeEmail(email);
    if (!validEmail(cleanEmail)) throw new AccountError("invalid_email");
    if (!validPassword(password)) throw new AccountError("invalid_password");
    const vault = loadVault();
    if (vault[cleanEmail]) throw new AccountError("email_taken");

    const salt = randomSalt();
    const passHash = await hashPassword(password, salt);
    const name = String(displayName || "").trim().slice(0, 24);
    const meta = readDeviceMeta() || {};
    if (name) meta.cloudName = name;

    const admin = resolveAdmin(cleanEmail, vault, null);
    vault[cleanEmail] = {
      email: cleanEmail,
      salt,
      passHash,
      displayName: name,
      role: admin ? "admin" : "user",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      meta,
    };
    saveVault(vault);
    setSession({ mode: "user", email: cleanEmail, displayName: name, admin });
    writeDeviceMeta(meta);

    let cloud = null;
    if (global.OttiskCloud?.isEnabled?.() || global.OttiskCloud?.configure) {
      try {
        if (typeof global.OttiskCloud.registerEmail === "function" && global.OttiskCloud.isEnabled?.()) {
          cloud = await global.OttiskCloud.registerEmail({
            email: cleanEmail,
            password,
            displayName: name,
          });
          if (cloud && meta) await global.OttiskCloud.pushSave?.(meta);
        }
      } catch (_) {
        cloud = { deferred: true };
      }
    }
    return { email: cleanEmail, displayName: name, cloud, admin };
  }

  async function login({ email, password } = {}) {
    const cleanEmail = normalizeEmail(email);
    if (!validEmail(cleanEmail)) throw new AccountError("invalid_email");
    if (!validPassword(password)) throw new AccountError("invalid_password");
    const vault = loadVault();
    const entry = vault[cleanEmail];
    if (!entry) throw new AccountError("not_found");
    const passHash = await hashPassword(password, entry.salt);
    if (passHash !== entry.passHash) throw new AccountError("bad_credentials");

    const meta = entry.meta && typeof entry.meta === "object" ? entry.meta : {};
    const admin = resolveAdmin(cleanEmail, vault, entry.role);
    if (admin && entry.role !== "admin") {
      entry.role = "admin";
      entry.updatedAt = new Date().toISOString();
      vault[cleanEmail] = entry;
      saveVault(vault);
    }
    writeDeviceMeta(meta);
    setSession({
      mode: "user",
      email: cleanEmail,
      displayName: entry.displayName || "",
      admin,
    });

    let cloud = null;
    try {
      if (typeof global.OttiskCloud?.loginEmail === "function" && global.OttiskCloud.isEnabled?.()) {
        cloud = await global.OttiskCloud.loginEmail({ email: cleanEmail, password });
        const remote = await global.OttiskCloud.pullSave?.();
        if (remote?.save && typeof global.OttiskAccountMerge === "function") {
          const merged = global.OttiskAccountMerge(meta, remote.save);
          vault[cleanEmail].meta = merged;
          vault[cleanEmail].updatedAt = new Date().toISOString();
          saveVault(vault);
          writeDeviceMeta(merged);
        } else if (meta) {
          await global.OttiskCloud.pushSave?.(meta);
        }
      }
    } catch (_) {
      cloud = { deferred: true };
    }
    return { email: cleanEmail, displayName: entry.displayName || "", cloud, admin, reloaded: true };
  }

  function logout() {
    persistMeta(readDeviceMeta());
    setSession(null);
    try {
      global.OttiskCloud?.logout?.();
    } catch (_) {}
    return true;
  }

  function persistMeta(meta) {
    const current = session();
    if (!current || current.mode !== "user") return false;
    const vault = loadVault();
    const entry = vault[current.email];
    if (!entry) return false;
    entry.meta = meta && typeof meta === "object" ? meta : entry.meta;
    entry.updatedAt = new Date().toISOString();
    if (meta?.cloudName) entry.displayName = String(meta.cloudName).slice(0, 24);
    vault[current.email] = entry;
    saveVault(vault);
    return true;
  }

  function profileLabel() {
    const current = session();
    if (!current) return "";
    if (current.mode === "guest") return "гость";
    return current.displayName || current.email || "аккаунт";
  }

  class AccountError extends Error {
    constructor(code) {
      super(code);
      this.name = "OttiskAccountError";
      this.code = code;
    }
  }

  global.OttiskAccount = Object.freeze({
    isReady,
    isGuest,
    isUser,
    isAdmin,
    session,
    continueAsGuest,
    register,
    login,
    logout,
    persistMeta,
    profileLabel,
    AccountError,
    OWNER_EMAILS: [...OWNER_EMAILS],
  });
})(globalThis);
