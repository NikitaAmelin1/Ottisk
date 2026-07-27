/**
 * Feature pack helpers shared by game.js via window.OttiskPack.
 * Kept separate so the big feature set stays maintainable.
 */
(function attachOttiskPack() {
  const STARTER_PACK_PRODUCT_ID = "ottisk_starter_pack";
  const STARTER_PACK_PRICE = "199 ₽";
  const STARTER_PACK_HEROES = ["manta", "angler", "nautilus"];
  const STARTER_PACK_MARKS = 60;

  const TROPHIES = [
    { id: "first_light", title: "Первый свет", sub: "набери 10 света", check: (ctx) => ctx.best >= 10 },
    { id: "leviathan", title: "Левиафан", sub: "доживи до босса", check: (ctx) => ctx.score >= 360 || ctx.best >= 360 },
    { id: "kraken", title: "Кракен", sub: "волна после бездны", check: (ctx) => ctx.score >= 780 || ctx.best >= 780 },
    { id: "word", title: "Слово живо", sub: "собери секретное слово", check: (ctx) => !!ctx.wordDone || !!ctx.meta?.trophyWord },
    { id: "streak7", title: "Неделя следа", sub: "серия 7 дней", check: (ctx) => (ctx.meta?.streak || 0) >= 7 },
    { id: "marks100", title: "Сто следов", sub: "накопи 100 следов", check: (ctx) => (ctx.meta?.marks || 0) >= 100 },
    { id: "iap_hero", title: "Премиум-след", sub: "открой IAP-героя", check: (ctx) => (ctx.meta?.iapHeroes || []).length > 0 },
    { id: "coop", title: "Два пальца", sub: "сыграй в дуэте", check: (ctx) => !!ctx.meta?.trophyCoop },
    { id: "daily", title: "День общий", sub: "забег дня", check: (ctx) => !!ctx.meta?.trophyDaily },
    { id: "ghost", title: "Свой призрак", sub: "столкнись с призраком", check: (ctx) => !!ctx.meta?.trophyGhost },
    { id: "leviathan_clear", title: "За кольцом", sub: "переживи левиафана", check: (ctx) => (ctx.meta?.bossClears?.leviathan || 0) > 0 },
    { id: "kraken_clear", title: "Чернильный след", sub: "переживи кракена", check: (ctx) => (ctx.meta?.bossClears?.kraken || 0) > 0 },
    { id: "weekly", title: "Испытание недели", sub: "заверши недельное задание", check: (ctx) => !!ctx.meta?.weekRewardTaken },
    { id: "endless", title: "За горизонтом", sub: "начни бесконечный забег", check: (ctx) => !!ctx.meta?.trophyEndless },
    { id: "boss_rush", title: "Зов титанов", sub: "вызови череду боссов", check: (ctx) => !!ctx.meta?.trophyBossRush },
    { id: "calm_run", title: "Тихая вода", sub: "сыграй в спокойном режиме", check: (ctx) => !!ctx.meta?.trophyCalm },
  ];

  function daySeed(dayKey) {
    let h = 2166136261;
    const s = String(dayKey || "day");
    for (let i = 0; i < s.length; i += 1) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function mulberry32(seed) {
    let a = seed >>> 0;
    return function rand() {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function seasonId(weekId) {
    const week = Number(String(weekId || "").split("-W")[1] || 1);
    const seasons = ["thaw", "bloom", "tide", "ember"];
    return seasons[Math.floor(((week - 1) % 52) / 13)] || "thaw";
  }

  function seasonCosmetic(weekId) {
    const id = seasonId(weekId);
    const map = {
      thaw: { skin: "season_thaw", frame: "season_ring", name: "оттепель", color: "#b8e8ff" },
      bloom: { skin: "season_bloom", frame: "season_ring", name: "цветение", color: "#ffb0d0" },
      tide: { skin: "season_tide", frame: "season_ring", name: "прилив", color: "#7affd4" },
      ember: { skin: "season_ember", frame: "season_ring", name: "жар", color: "#ffb068" },
    };
    return map[id] || map.thaw;
  }

  const root = typeof globalThis !== "undefined" ? globalThis : window;
  root.OttiskPack = {
    STARTER_PACK_PRODUCT_ID,
    STARTER_PACK_PRICE,
    STARTER_PACK_HEROES,
    STARTER_PACK_MARKS,
    TROPHIES,
    daySeed,
    mulberry32,
    seasonId,
    seasonCosmetic,
  };
})();
