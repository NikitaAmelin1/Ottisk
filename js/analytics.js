/**
 * Privacy-safe, local-only aggregate analytics.
 * Nothing is sent over the network and no device/user identifier is created.
 */
(function attachOttiskAnalytics() {
  const KEY = "ottisk-analytics-v1";
  const MAX_DAYS = 30;

  function dayKey(date = new Date()) {
    return date.toISOString().slice(0, 10);
  }

  function load() {
    try {
      const value = JSON.parse(localStorage.getItem(KEY) || "{}");
      return value && typeof value === "object" ? value : {};
    } catch (_) {
      return {};
    }
  }

  function save(data) {
    try {
      const days = Object.keys(data).sort();
      while (days.length > MAX_DAYS) delete data[days.shift()];
      localStorage.setItem(KEY, JSON.stringify(data));
    } catch (_) {
      // Analytics must never affect gameplay.
    }
  }

  function scoreBucket(score) {
    const n = Math.max(0, Number(score) || 0);
    if (n < 10) return "0-9";
    if (n < 30) return "10-29";
    if (n < 100) return "30-99";
    if (n < 300) return "100-299";
    return "300+";
  }

  function track(event, details = {}) {
    if (!event || typeof event !== "string") return;
    const data = load();
    const day = dayKey();
    const row = data[day] || { events: {}, scores: {}, heroes: {}, deaths: {}, modes: {} };
    row.events[event] = (row.events[event] || 0) + 1;
    if (event === "run_end") {
      const bucket = scoreBucket(details.score);
      row.scores[bucket] = (row.scores[bucket] || 0) + 1;
      const hero = ["octopus", "jellyfish", "turtle", "crab", "dolphin", "starfish", "manta", "angler", "nautilus", "sub", "eel", "squid", "seahorse", "whale", "custom"]
        .includes(details.hero) ? details.hero : "other";
      const death = ["hunger", "hunter", "leviathan", "kraken", "release", "other"]
        .includes(details.death) ? details.death : "other";
      row.heroes[hero] = (row.heroes[hero] || 0) + 1;
      row.deaths[death] = (row.deaths[death] || 0) + 1;
      const mode = ["normal", "endless", "boss", "calm", "daily", "coop"].includes(details.mode)
        ? details.mode : "normal";
      row.modes[mode] = (row.modes[mode] || 0) + 1;
    }
    data[day] = row;
    save(data);
  }

  function summary() {
    const data = load();
    const total = { days: Object.keys(data).length, events: {}, scores: {}, heroes: {}, deaths: {}, modes: {} };
    for (const row of Object.values(data)) {
      for (const [key, count] of Object.entries(row.events || {})) {
        total.events[key] = (total.events[key] || 0) + count;
      }
      for (const [key, count] of Object.entries(row.scores || {})) {
        total.scores[key] = (total.scores[key] || 0) + count;
      }
      for (const [key, count] of Object.entries(row.heroes || {})) {
        total.heroes[key] = (total.heroes[key] || 0) + count;
      }
      for (const [key, count] of Object.entries(row.deaths || {})) {
        total.deaths[key] = (total.deaths[key] || 0) + count;
      }
      for (const [key, count] of Object.entries(row.modes || {})) {
        total.modes[key] = (total.modes[key] || 0) + count;
      }
    }
    return total;
  }

  function clear() {
    localStorage.removeItem(KEY);
  }

  globalThis.OttiskAnalytics = { track, summary, clear, key: KEY };
})();
