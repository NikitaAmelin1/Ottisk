import "./pack.js";

const BEST_KEY = "ottisk-best-v2";
const META_KEY = "ottisk-meta-v1";
const HOLD_SECONDS = 0.62;
const OPENING_SEC = 12;
const HUNGER_DRAIN_PER_SEC = 100 / 12;
const ECHO_FADE_SEC = 2.35;
const FREE_CONTINUES_PER_RUN = 1;
const MARKS_CONTINUE_COST = 15;
const MAX_CONTINUES_PER_RUN = 3;
const MARKS_PACK_AMOUNT = 60;
const MARKS_PACK_PRODUCT_ID = "ottisk_marks_60";
const SUBMARINE_PRODUCT_ID = "ottisk_submarine";
const SUBMARINE_PRICE_LABEL = "99 ₽";
const SUBMARINE_LIVES = 3;
const CONTINUE_PRODUCT_ID = "ottisk_continue_10rub";
const CONTINUE_PRICE_LABEL = "10 ₽";
const STARTER_PACK_PRODUCT_ID = "ottisk_starter_pack";
const STARTER_PACK_PRICE_LABEL = "199 ₽";
const STARTER_PACK_MARKS = 60;
const STARTER_PACK_HEROES = ["manta", "angler", "nautilus"];
const GHOST_SAMPLE_SEC = 0.12;
const GHOST_MAX_POINTS = 240;
const MAX_PARTICLES = 110;
const MAX_FLOATERS = 20;
const MAX_VEINS = 56;
const CSS_VARS = [
  "--bg0", "--bg1", "--bg2", "--foam", "--sand", "--mute", "--line",
  "--gold", "--life", "--ember", "--danger", "--accent-a", "--accent-b",
];
const cssCache = Object.create(null);
const rgbCache = new Map();
const mixCache = new Map();
const bgCache = { w: 0, h: 0, key: "", canvas: null, vignette: null };
const pointerCache = { left: 0, top: 0, scaleX: 1, scaleY: 1 };
const uiCache = { hunger: -1, wave: "", dive: -1, diveShow: null, score: -1 };
let humAcc = 0;
let lastHumKey = "";
let portraitSkip = 0;
let perfMonitor = null;
let cloudSaveTimer = null;
const EEL_PRODUCT_ID = "ottisk_hero_eel";
const SQUID_PRODUCT_ID = "ottisk_hero_squid";
const SEAHORSE_PRODUCT_ID = "ottisk_hero_seahorse";
const WHALE_PRODUCT_ID = "ottisk_hero_whale";
const WEEKLY_REWARD = 25;
const STARTER_MARKS = 15;
const DAILY_QUEST_REWARD = 10;
const GLYPH_WORD_REWARD = 10;
const SHARE_URL = "https://nikitaamelin1.github.io/Ottisk/";
const PRIVACY_URL = `${SHARE_URL}privacy.html`;
const SUPPORT_URL = `${SHARE_URL}support.html`;
const DONATE_URL = `${SHARE_URL}donate.html`;
/** Tip packs: native StoreKit IDs; web opens donate.html. */
const DONATE_TIPS = [
  {
    id: "tip_small",
    productId: "ottisk_tip_small",
    title: "Чаевые",
    sub: "спасибо за след",
    marks: 30,
    priceLabel: "99 ₽",
  },
  {
    id: "tip_mid",
    productId: "ottisk_tip_mid",
    title: "Сильный след",
    sub: "поддержка разработки",
    marks: 90,
    priceLabel: "249 ₽",
  },
  {
    id: "tip_big",
    productId: "ottisk_tip_big",
    title: "Глубина",
    sub: "большой донат",
    marks: 220,
    priceLabel: "499 ₽",
  },
];
const THEME_COUNT = 8;
const ONBOARD_STEPS = [
  "Удерживай палец — существо живёт, пока касание активно.",
  "Лови свет. Отпустишь палец — забег оборвётся.",
];
const SECRET_WORD = "ЯЕЩЁЗДЕСЬ";
const SCORE_MILESTONES = [
  { at: 10, marks: 2, text: "первый ритм" },
  { at: 25, marks: 3, text: "след держится" },
  { at: 50, marks: 5, text: "половина сотни" },
  { at: 100, marks: 8, text: "новая тема" },
  { at: 150, marks: 10, text: "глубокий след" },
  { at: 200, marks: 12, text: "легенда света" },
  { at: 300, marks: 15, text: "без конца" },
  { at: 450, marks: 16, text: "дальше бездны" },
  { at: 600, marks: 20, text: "мастер касания" },
  { at: 800, marks: 25, text: "живой миф" },
  { at: 1000, marks: 30, text: "вечный след" },
];
const DEATH = {
  HUNTER: "охотник поймал оттиск",
  ECHO: "тень сожрала след",
  HUNGER: "свет иссяк — слишком долго без пищи",
};

const PHOTO_VER = "5";
const PHOTOS = {
  fish: {
    src: new URL(`../assets/fish-evil.png?v=${PHOTO_VER}`, import.meta.url).href,
    img: null,
    ready: false,
  },
};

function loadImage(entry) {
  return new Promise((resolve) => {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => {
      entry.img = img;
      entry.ready = true;
      resolve(true);
    };
    img.onerror = () => resolve(false);
    img.src = entry.src;
  });
}

function loadPhotos() {
  return loadImage(PHOTOS.fish);
}

function drawImageCover(img, x, y, w, h) {
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  if (!iw || !ih) return;
  const scale = Math.max(w / iw, h / ih);
  const sw = w / scale;
  const sh = h / scale;
  const sx = (iw - sw) * 0.5;
  const sy = (ih - sh) * 0.5;
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}

const BLAST_STYLES = [
  "spray",
  "ring",
  "nova",
  "shards",
  "spiral",
  "cross",
  "rain",
  "bloom",
  "scatter",
  "pulse",
  "streaks",
  "firework",
];
let lastBlastStyle = -1;

const MUTATIONS = [
  { id: "spark", at: 0, name: "искра" },
  { id: "cool", at: 5, name: "хладь" },
  { id: "magnet", at: 12, name: "магнит" },
  { id: "veins", at: 20, name: "жилы" },
  { id: "fang", at: 30, name: "клык" },
  { id: "bloom", at: 42, name: "цвет" },
  { id: "current", at: 60, name: "течение" },
  { id: "renewal", at: 90, name: "обновление" },
];

const SKINS = [
  { id: "ink", name: "чернь", at: 0, color: "#fff1e4" },
  { id: "mint", name: "мята", at: 25, color: "#7dffc8" },
  { id: "ember", name: "жар", at: 60, color: "#ffb068" },
  { id: "frost", name: "иней", at: 100, color: "#b8dcff" },
  { id: "void", name: "пусто", at: 160, color: "#e0b8ff" },
  { id: "pulse", name: "пульс", at: 220, color: "#ff8ab4" },
  { id: "coral", name: "коралл", at: 320, color: "#ff7a8a" },
  { id: "reef", name: "риф", at: 460, color: "#6a8cff" },
  { id: "aurora", name: "заря", at: 650, color: "#a8ffce" },
  { id: "myth", name: "миф", at: 900, color: "#ffd0a0" },
  { id: "solar", name: "солнце", at: 9999, cost: 75, color: "#ffe08a", premium: true },
  { id: "noir", name: "нуар", at: 9999, cost: 115, color: "#8ab4ff", premium: true },
  { id: "pearl", name: "жемчуг", at: 9999, cost: 180, color: "#f5f0ff", premium: true },
  { id: "season_thaw", name: "оттепель", at: 9999, color: "#b8e8ff", seasonal: true },
  { id: "season_bloom", name: "цветение", at: 9999, color: "#ffb0d0", seasonal: true },
  { id: "season_tide", name: "прилив", at: 9999, color: "#7affd4", seasonal: true },
  { id: "season_ember", name: "жар-сезон", at: 9999, color: "#ffb068", seasonal: true },
];

const HEROES = [
  { id: "octopus", name: "осьминог", glyph: "Ос", ability: "рывок", tip: "РЕЗКИЙ СВАЙП — РЫВОК" },
  { id: "jellyfish", name: "медуза", glyph: "Ме", ability: "аура", tip: "АУРА ЗАМЕДЛЯЕТ" },
  { id: "turtle", name: "черепаха", glyph: "Че", ability: "панцирь", tip: "ПАНЦИРЬ ДЕРЖИТ ДОЛЬШЕ" },
  { id: "crab", name: "краб", glyph: "Кр", ability: "щит", tip: "ЩИТ НА 1 УДАР" },
  { id: "dolphin", name: "дельфин", glyph: "Де", ability: "быстрый рывок", tip: "РЫВОК ПЕРЕЗАРЯЖАЕТСЯ БЫСТРЕЕ" },
  { id: "starfish", name: "морская звезда", glyph: "Зв", ability: "регенерация", tip: "ГОЛОД УХОДИТ МЕДЛЕННЕЕ" },
  { id: "seal", name: "нерпа", glyph: "Не", ability: "скользкий рывок", tip: "РЫВОК + КОРОТКАЯ НЕУЯЗВИМОСТЬ", premium: true, cost: 40, blurb: "скользит мимо ударов" },
  { id: "lantern", name: "фонарик", glyph: "Фо", ability: "пульс света", tip: "ИМПУЛЬС ТЯНЕТ СВЕТ К ТЕБЕ", premium: true, cost: 90, blurb: "магнит света" },
  { id: "manta", name: "скат", glyph: "Ск", ability: "крыло-шторм", tip: "РЫВОК РЕЖЕТ И ОСТАВЛЯЕТ СЛЕД", premium: true, cost: 60, blurb: "рывки рвут строй" },
  { id: "angler", name: "удильщик", glyph: "Уд", ability: "манок света", tip: "ФОНАРЬ ТЯНЕТ СВЕТ И ТОРМОЗИТ", premium: true, cost: 110, blurb: "свет плывёт к тебе" },
  { id: "nautilus", name: "наутилус", glyph: "На", ability: "2 раковины", tip: "ДВЕ РАКОВИНЫ · ПОТОМ ВОССТАНОВЛЕНИЕ", premium: true, cost: 170, blurb: "двойная броня" },
  {
    id: "sub",
    name: "субмарина",
    glyph: "Су",
    ability: "пушки · 3 жизни",
    tip: "ПУШКИ БЬЮТ ХИЩНИКОВ",
    premium: true,
    iap: true,
    productId: SUBMARINE_PRODUCT_ID,
    priceLabel: SUBMARINE_PRICE_LABEL,
    blurb: "пушки и корпус",
  },
  {
    id: "eel",
    name: "угорь",
    glyph: "Уг",
    ability: "цепная молния",
    tip: "ДЕРЖИ — МОЛНИЯ УБИВАЕТ ЦЕПОЧКОЙ",
    premium: true,
    iap: true,
    productId: EEL_PRODUCT_ID,
    priceLabel: "99 ₽",
    blurb: "молния по цепочке",
  },
  {
    id: "squid",
    name: "кальмар",
    glyph: "Ка",
    ability: "чернильный туман",
    tip: "ЧЕРНИЛА СЛЕПЯТ И ПЕРЕЗАРЯЖАЮТСЯ",
    premium: true,
    iap: true,
    productId: SQUID_PRODUCT_ID,
    priceLabel: "99 ₽",
    blurb: "слепящий туман",
  },
  {
    id: "seahorse",
    name: "конёк",
    glyph: "Кн",
    ability: "откат времени",
    tip: "ОТКАТ · ВОССТАНАВЛИВАЕТСЯ ЗА СВЕТ",
    premium: true,
    iap: true,
    productId: SEAHORSE_PRODUCT_ID,
    priceLabel: "129 ₽",
    blurb: "откат и восстановление",
  },
  {
    id: "whale",
    name: "кит",
    glyph: "Ки",
    ability: "двойной сонар",
    tip: "СОНАР ОГЛУШАЕТ И БЬЁТ ДВАЖДЫ",
    premium: true,
    iap: true,
    productId: WHALE_PRODUCT_ID,
    priceLabel: "149 ₽",
    blurb: "оглушающий сонар",
  },
  { id: "custom", name: "свой", glyph: "✦", ability: "рывок", tip: "РЕЗКИЙ СВАЙП — РЫВОК" },
];

const TRAILS = [
  { id: "plain", name: "чистый", sub: "без эффекта", cost: 0 },
  { id: "gold", name: "золотой", sub: "тёплый след", cost: 45, color: "#ffe08a" },
  { id: "foam", name: "пена", sub: "светлая лента", cost: 75, color: "#d8f6ff" },
  { id: "ember", name: "жар", sub: "огненные искры", cost: 110, color: "#ff9a62" },
  { id: "veil", name: "вуаль", sub: "глубокий шлейф", cost: 160, color: "#7aa0ff" },
];

const FRAMES = [
  { id: "none", name: "без рамки", sub: "по умолчанию", cost: 0 },
  { id: "ring", name: "кольцо", sub: "мягкий ореол", cost: 60 },
  { id: "hex", name: "грань", sub: "геометрия вокруг", cost: 95 },
  { id: "crown", name: "корона", sub: "статус поддержки", cost: 150 },
  { id: "season_ring", name: "сезон", sub: "рамка недели", cost: 0, seasonal: true },
];

const CONTROL_MODES = [
  { id: "hand", name: "рука", blurb: "палец = герой" },
  { id: "joystick", name: "джойстик", blurb: "держи и веди" },
];

const STICK_RADIUS = 78;
const STICK_SPEED = 310;

const DIFFICULTIES = [
  { id: "easy", name: "лёгкий", blurb: "спокойнее хищники", speed: 0.78, spawn: 1.28, hunters: 0.72, hunger: 0.82, dash: 0.8 },
  { id: "normal", name: "обычный", blurb: "как задумано", speed: 1, spawn: 1, hunters: 1, hunger: 1, dash: 1 },
  { id: "hard", name: "сложный", blurb: "быстрее и злее", speed: 1.2, spawn: 0.8, hunters: 1.22, hunger: 1.18, dash: 1.18 },
];

const HOUR_MS = 60 * 60 * 1000;
const GIFTS = [
  {
    id: "hourly",
    kicker: "каждый час",
    title: "Часовой",
    amount: 4,
    ready: (meta, now) => now >= (meta.hourlyGiftAt || 0),
    waitMs: (meta, now) => Math.max(0, (meta.hourlyGiftAt || 0) - now),
    claim: (meta, now) => {
      meta.hourlyGiftAt = now + HOUR_MS;
      return 4;
    },
  },
  {
    id: "daily",
    kicker: "раз в день",
    title: "Дневной",
    amount: 12,
    ready: (meta) => meta.dailyGiftDay !== localDayKey(),
    waitMs: () => msUntilNextLocalDay(),
    claim: (meta) => {
      meta.dailyGiftDay = localDayKey();
      return 12;
    },
  },
  {
    id: "weekly",
    kicker: "раз в неделю",
    title: "Недельный",
    amount: 30,
    ready: (meta) => meta.weeklyGiftWeek !== weekKey(),
    waitMs: () => msUntilNextWeek(),
    claim: (meta) => {
      meta.weeklyGiftWeek = weekKey();
      return 30;
    },
  },
  {
    id: "streak",
    kicker: "за серию",
    title: "Серия",
    amount: 0,
    ready: (meta) => (meta.streak || 0) >= 2 && meta.streakGiftDay !== localDayKey(),
    waitMs: (meta) => ((meta.streak || 0) >= 2 ? msUntilNextLocalDay() : 0),
    claim: (meta) => {
      meta.streakGiftDay = localDayKey();
      return 4 + Math.min(10, Math.max(0, (meta.streak || 0) - 1) * 2);
    },
    amountLabel: (meta) => `+${4 + Math.min(10, Math.max(0, (meta.streak || 0) - 1) * 2)}`,
    lockedLabel: (meta) => ((meta.streak || 0) < 2 ? "нужно 2 дня" : ""),
  },
  {
    id: "return",
    kicker: "возвращение",
    title: "С возвращением",
    amount: 12,
    ready: (meta) => meta.returnAvailableDay === localDayKey() && meta.returnGiftAt !== localDayKey(),
    waitMs: () => msUntilNextLocalDay(),
    claim: (meta) => {
      meta.returnGiftAt = localDayKey();
      return 12;
    },
    lockedLabel: () => "зайди завтра",
  },
];

/** Difficulty waves: each tier swaps predator species + pacing. */
const WAVES = [
  {
    id: "school",
    at: 0,
    name: "стая",
    species: "fish",
    maxBonus: 0,
    speedMul: 1,
    intervalMul: 1,
    label: "ВОЛНА 1 · СТАЯ",
  },
  {
    id: "darts",
    at: 45,
    name: "стрелки",
    species: "dart",
    maxBonus: 1,
    speedMul: 1.18,
    intervalMul: 0.9,
    label: "ВОЛНА 2 · СТРЕЛКИ",
  },
  {
    id: "jellies",
    at: 100,
    name: "медузы",
    species: "jelly",
    maxBonus: 1,
    speedMul: 0.66,
    intervalMul: 0.98,
    label: "ВОЛНА 3 · МЕДУЗЫ",
  },
  {
    id: "eels",
    at: 170,
    name: "угри",
    species: "eel",
    maxBonus: 1,
    speedMul: 1.02,
    intervalMul: 0.84,
    label: "ВОЛНА 4 · УГРИ",
  },
  {
    id: "sharks",
    at: 260,
    name: "акулы",
    species: "shark",
    maxBonus: 1,
    speedMul: 0.95,
    intervalMul: 0.92,
    label: "ВОЛНА 5 · АКУЛЫ",
  },
  {
    id: "leviathan",
    at: 360,
    name: "левиафан",
    species: "boss",
    maxBonus: 0,
    speedMul: 0.9,
    intervalMul: 8,
    boss: true,
    label: "БОСС · ЛЕВИАФАН",
  },
  {
    id: "rays",
    at: 440,
    name: "скаты",
    species: "ray",
    maxBonus: 1,
    speedMul: 0.88,
    intervalMul: 0.95,
    label: "ВОЛНА 7 · СКАТЫ",
  },
  {
    id: "ghosts",
    at: 540,
    name: "призраки",
    species: "ghost",
    maxBonus: 2,
    speedMul: 1.05,
    intervalMul: 0.88,
    label: "ВОЛНА 8 · ПРИЗРАКИ",
  },
  {
    id: "trench_maw",
    at: 600,
    name: "пасть бездны",
    species: "boss",
    maxBonus: 0,
    speedMul: 0.92,
    intervalMul: 8,
    boss: true,
    maw: true,
    label: "БОСС · ПАСТЬ БЕЗДНЫ",
  },
  {
    id: "abyss",
    at: 660,
    name: "бездна",
    species: "mix",
    maxBonus: 2,
    speedMul: 1.08,
    intervalMul: 0.82,
    label: "ВОЛНА 10 · БЕЗДНА",
  },
  {
    id: "kraken",
    at: 780,
    name: "кракен",
    species: "boss",
    maxBonus: 0,
    speedMul: 0.95,
    intervalMul: 8,
    boss: true,
    label: "БОСС · КРАКЕН",
  },
  {
    id: "titans",
    at: 900,
    name: "титаны",
    species: "mix",
    maxBonus: 3,
    speedMul: 1.14,
    intervalMul: 0.76,
    label: "ВОЛНА 12 · ТИТАНЫ",
  },
];

const MIX_SPECIES = ["fish", "dart", "jelly", "eel", "shark", "ray", "ghost", "crab", "urchin", "mirror"];

const customHeroImage = { img: null, src: "", ready: false };

const app = document.getElementById("app");
const stage = document.getElementById("stage");
const canvas = document.getElementById("game");
let ctx = canvas.getContext("2d");

const statusEl = document.getElementById("status");
const scoreEl = document.getElementById("score");
const comboEl = document.getElementById("combo");
const toastEl = document.getElementById("toast");
const coachEl = document.getElementById("coach");
const heatEl = document.getElementById("heat");
const heatFillEl = document.getElementById("heat-fill");
const heatPctEl = document.getElementById("heat-pct");
const mutTrackFillEl = document.getElementById("mut-track-fill");
const diveMeterEl = document.getElementById("dive-meter");
const diveFillEl = document.getElementById("dive-fill");
const holdFillEl = document.getElementById("hold-fill");
const holdFillOverEl = document.getElementById("hold-fill-over");
const screenStartEl = document.getElementById("screen-start");
const screenHeroEl = document.getElementById("screen-hero");
const screenDiffEl = document.getElementById("screen-diff");
const heroPortraitEl = document.getElementById("hero-portrait");
const heroPickNameEl = document.getElementById("hero-pick-name");
const btnHeroBack = document.getElementById("btn-hero-back");
const btnHeroNext = document.getElementById("btn-hero-next");
const btnDiffBack = document.getElementById("btn-diff-back");
const screenDrawEl = document.getElementById("screen-draw");
const heroListEl = document.getElementById("hero-list");
const btnDrawHero = document.getElementById("btn-draw-hero");
const drawCanvasEl = document.getElementById("draw-canvas");
const btnDrawClear = document.getElementById("btn-draw-clear");
const btnDrawCancel = document.getElementById("btn-draw-cancel");
const btnDrawSave = document.getElementById("btn-draw-save");
const screenOverEl = document.getElementById("screen-over");
const drawCtx = drawCanvasEl?.getContext?.("2d") || null;
const bestStartEl = document.getElementById("best-start");
const bestOverEl = document.getElementById("best-over");
const finalScoreEl = document.getElementById("final-score");
const deathReasonEl = document.getElementById("death-reason");
const mutSummaryEl = document.getElementById("mut-summary");
const skinResultEl = document.getElementById("skin-result");
const skinNameEl = document.getElementById("skin-name");
const skinUnlocksEl = document.getElementById("skin-unlocks");
const btnStart = document.getElementById("btn-start");
const btnStartSub = document.getElementById("btn-start-sub");
const btnRetry = document.getElementById("btn-retry");
const nextGoalEl = document.getElementById("next-goal");
const dailyCardEl = document.getElementById("daily-card");
const streakStartEl = document.getElementById("streak-start");
const marksStartEl = document.getElementById("marks-start");
const screenContinueEl = document.getElementById("screen-continue");
const continueReasonEl = document.getElementById("continue-reason");
const continueHintEl = document.getElementById("continue-hint");
const btnContinue = document.getElementById("btn-continue");
const continueLabelEl = document.getElementById("continue-label");
const continueSubEl = document.getElementById("continue-sub");
const btnSkipContinue = document.getElementById("btn-skip-continue");
const btnShare = document.getElementById("btn-share");
const streakOverEl = document.getElementById("streak-over");
const dailyResultEl = document.getElementById("daily-result");
const marksResultEl = document.getElementById("marks-result");
const weeklyCardEl = document.getElementById("weekly-card");
const btnSound = document.getElementById("btn-sound");
const btnHaptics = document.getElementById("btn-haptics");
const btnMarksPack = document.getElementById("btn-marks-pack");
const btnRate = document.getElementById("btn-rate");
const screenOnboardEl = document.getElementById("screen-onboard");
const onboardTextEl = document.getElementById("onboard-text");
const btnOnboard = document.getElementById("btn-onboard");
const onboardLabelEl = document.getElementById("onboard-label");
const onboardSubEl = document.getElementById("onboard-sub");
const shareCanvasEl = document.getElementById("share-canvas");

const BASE_RUN_EVENTS = [
  { id: "rain", title: "ливень света", dur: 4.2 },
  { id: "raid", title: "облава", dur: 3.2 },
  { id: "calm", title: "тишина", dur: 5.0 },
  { id: "comet", title: "комета", dur: 0.8 },
  { id: "sanctuary", title: "светлый сад", dur: 5.2 },
  { id: "blackout", title: "затмение", dur: 4.4 },
  { id: "tidepull", title: "тяга прилива", dur: 4.8 },
];
const RUN_EVENTS = [
  ...BASE_RUN_EVENTS,
  ...(window.OttiskContent?.DEFAULT_CATALOG?.events || [])
    .filter((event) => !BASE_RUN_EVENTS.some((base) => base.id === event.id))
    .map((event) => ({ id: event.id, title: event.name.toLowerCase(), dur: Math.min(12, event.duration) })),
];

const DAILY_DEFS = [
  {
    id: "score30",
    title: "30 света",
    label: (s) => `${Math.min(s.score, 30)}/30`,
    check: (s) => s.score >= 30,
  },
  {
    id: "rare2",
    title: "2 редких",
    label: (s) => `редкие ${Math.min(s.stats.rareEats, 2)}/2`,
    check: (s) => s.stats.rareEats >= 2,
  },
  {
    id: "survive30",
    title: "30 секунд",
    label: (s) => `${Math.min(Math.floor(s.elapsed), 30)}/30с`,
    check: (s) => s.elapsed >= 30,
  },
  {
    id: "fang",
    title: "клык за забег",
    label: () => (hasMut("fang") ? "клык" : `${Math.min(state.score, 30)}/30`),
    check: () => hasMut("fang"),
  },
  {
    id: "combo5",
    title: "цепь ×5",
    label: (s) => `цепь ${Math.min(s.stats.maxCombo, 5)}/5`,
    check: (s) => s.stats.maxCombo >= 5,
  },
  {
    id: "dodge3",
    title: "3 мимо",
    label: (s) => `мимо ${Math.min(s.stats.nearMisses, 3)}/3`,
    check: (s) => s.stats.nearMisses >= 3,
  },
];

const WEEKLY_DEFS = [
  {
    id: "light",
    title: "Глубокий след",
    target: 140,
    unit: "света",
    value: (score) => Math.max(0, score),
    mode: "best",
  },
  {
    id: "runs",
    title: "Пять погружений",
    target: 5,
    unit: "забегов",
    value: () => 1,
    mode: "sum",
  },
  {
    id: "dodges",
    title: "Точный пловец",
    target: 12,
    unit: "уклонений",
    value: () => state.stats.nearMisses,
    mode: "sum",
  },
  {
    id: "rare",
    title: "Охота за редким",
    target: 8,
    unit: "редких огней",
    value: () => state.stats.rareEats,
    mode: "sum",
  },
  {
    id: "boss_touch",
    title: "Переживи босса",
    target: 1,
    unit: "боссов",
    value: () => state.stats.bossClearsThisRun || 0,
    mode: "sum",
  },
];
const LOCAL_BOARD_KEY = "ottisk-local-board-v1";
const LOCAL_BOARD_MAX = 10;

const state = {
  running: false,
  demo: true,
  width: 0,
  height: 0,
  dpr: 1,
  time: 0,
  elapsed: 0,
  lastTs: 0,
  score: 0,
  combo: 0,
  comboClock: 0,
  hunger: 100,
  best: 0,
  theme: 0,
  mutation: MUTATIONS[0],
  unlockedMuts: ["spark"],
  touchActive: false,
  pointerId: null,
  stick: null,
  hasTouchedCanvas: false,
  life: null,
  echo: null,
  guideSpark: null,
  lastVeinX: 0,
  lastVeinY: 0,
  sparks: [],
  hunters: [],
  veins: [],
  particles: [],
  floaters: [],
  spawnAcc: 0,
  hunterAcc: 0,
  slowHunterSeen: false,
  bloomPulse: 0,
  flash: 0,
  shake: 0,
  deathReason: "",
  coachCount: 0,
  hold: null,
  meta: null,
  runUnlockedSkins: [],
  pendingDeathReason: "",
  continuesUsed: 0,
  safeUntil: 0,
  continueBusy: false,
  paused: false,
  runMarks: 0,
  milestonesHit: [],
  hungerWarnClock: 0,
  timeScale: 1,
  slowmoUntil: 0,
  onboardStep: 0,
  event: null,
  eventAcc: 0,
  eventNext: 11,
  eventRainAcc: 0,
  pulseCd: 0,
  holdLifeTime: 0,
  fever: false,
  stillAcc: 0,
  inkDive: 0,
  inkDiveCd: 0,
  glyphs: [],
  glyphIndex: 0,
  glyphSpawnAcc: 0,
  wordDone: false,
  symbiote: null,
  openingBurst: false,
  firstEatDone: false,
  waveId: "school",
  waveIndex: 0,
  heroDashCd: 0,
  heroShield: true,
  heroShieldCd: 0,
  shipLives: 0,
  shots: [],
  cannonCd: 0,
  eelCd: 0,
  whaleCd: 0,
  inkCloud: null,
  squidInkReady: true,
  squidEats: 0,
  squidInkCd: 0,
  lifeHistory: [],
  seahorseReady: true,
  seahorseEats: 0,
  seahorseCd: 0,
  shellCharges: 0,
  mantaWake: null,
  eelBolts: [],
  sonarRings: [],
  whalePulse2: 0,
  bestAtStart: 0,
  shopReturn: "home",
  dailyMode: false,
  coopMode: false,
  life2: null,
  touchActive2: false,
  pointerId2: null,
  stick2: null,
  ghost: null,
  ghostPath: [],
  ghostSampleAcc: 0,
  ghostIndex: 0,
  rng: null,
  mechanicCard: null,
  tutorialRun: false,
  tutorialStep: 0,
  runMode: "normal",
  qualityTier: "high",
  tuning: { hunterSpeed: 1, hungerDrain: 1, sparkInterval: 1 },
  progressionEffects: {},
  maxHunger: 100,
  progressionRevives: 0,
  replaySamples: [],
  replaySampleAcc: 0,
  tipFlags: {
    move: false,
    hunter: false,
    hunger: false,
    echo: false,
    dive: false,
    shadow: false,
    word: false,
    boss: false,
    ability: false,
  },
  stats: {
    sparkEats: 0,
    rareEats: 0,
    hunterEats: 0,
    maxCombo: 0,
    nearMisses: 0,
    shadowsSpawned: 0,
    glyphsTaken: 0,
    bossClearsThisRun: 0,
  },
  rewardedContinueUsed: false,
  audio: null,
  humNode: null,
  demoClock: 0,
  demoDownClock: 0,
};

function inOpening() {
  return state.running && state.elapsed < OPENING_SEC;
}

function pulseUnlock(color = cssVar("--life", "#7affd4"), strength = 0.14) {
  state.flash = Math.max(state.flash, strength);
  burst(state.width * 0.5, state.height * 0.38, color, 20, 4.6);
  mutationDing();
  buzz([8, 18, 8]);
}

function spawnOpeningRing(x, y) {
  const count = 2;
  for (let i = 0; i < count; i += 1) {
    const a = (i / count) * Math.PI * 2 + rand(-0.12, 0.12);
    const d = rand(130, 190);
    spawnSpark({
      near: { x: x + Math.cos(a) * d, y: y + Math.sin(a) * d },
      type: i === 0 ? "rare" : "normal",
      tutorial: i === 0,
      opening: true,
    });
  }
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function tr(key, fallback = "") {
  return window.OttiskI18n?.t?.(key, fallback) ?? fallback;
}

function rand(min, max) {
  return min + Math.random() * (max - min);
}

function dist(ax, ay, bx, by) {
  return Math.hypot(ax - bx, ay - by);
}

function dist2(ax, ay, bx, by) {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy;
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function refreshCssCache() {
  const style = getComputedStyle(app);
  for (const name of CSS_VARS) {
    cssCache[name] = style.getPropertyValue(name).trim();
  }
  rgbCache.clear();
  mixCache.clear();
  invalidateBgCache();
}

function cssVar(name, fallback) {
  const cached = cssCache[name];
  if (cached) return cached;
  const value = getComputedStyle(app).getPropertyValue(name).trim();
  if (value) cssCache[name] = value;
  return value || fallback;
}

function hexToRgb(hex) {
  const key = typeof hex === "string" ? hex : String(hex);
  const hit = rgbCache.get(key);
  if (hit) return hit;
  const value = key.trim();
  let rgb;
  if (value.startsWith("rgb")) {
    const nums = value.match(/[\d.]+/g) || ["255", "255", "255"];
    rgb = [Number(nums[0]) || 255, Number(nums[1]) || 255, Number(nums[2]) || 255];
  } else {
    const clean = value.replace("#", "");
    const full = clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean.padEnd(6, "0");
    rgb = [
      parseInt(full.slice(0, 2), 16) || 0,
      parseInt(full.slice(2, 4), 16) || 0,
      parseInt(full.slice(4, 6), 16) || 0,
    ];
  }
  rgbCache.set(key, rgb);
  return rgb;
}

function mixColor(a, b, t) {
  const q = (clamp(t, 0, 1) * 20 + 0.5) | 0;
  const key = `${a}|${b}|${q}`;
  const hit = mixCache.get(key);
  if (hit) return hit;
  const aa = hexToRgb(a);
  const bb = hexToRgb(b);
  const u = q / 20;
  const out = `rgb(${(aa[0] + (bb[0] - aa[0]) * u + 0.5) | 0},${(aa[1] + (bb[1] - aa[1]) * u + 0.5) | 0},${(aa[2] + (bb[2] - aa[2]) * u + 0.5) | 0})`;
  mixCache.set(key, out);
  return out;
}


let OttiskArt = null;
function bindOttiskArt() {
  if (OttiskArt || typeof globalThis.OttiskArtFactory !== "function") return;
  OttiskArt = globalThis.OttiskArtFactory({
    mixColor,
    cssVar,
    clamp,
    rand,
    lifeInkColor: () => lifeInkColor(),
    effects: () => effectsEnabled(),
  });
}
function artDraw(name, ...args) {
  bindOttiskArt();
  if (!OttiskArt || typeof OttiskArt[name] !== "function") return false;
  OttiskArt.use(ctx);
  OttiskArt[name](...args);
  return true;
}

function invalidateBgCache() {
  bgCache.w = 0;
  bgCache.h = 0;
  bgCache.key = "";
  bgCache.canvas = null;
  bgCache.vignette = null;
}

function effectsEnabled() {
  return window.OttiskPerf?.TIERS?.[state.qualityTier]?.effects !== false;
}

function rgbaFromCss(name, fallback, alpha = 1) {
  const [r, g, b] = hexToRgb(cssVar(name, fallback));
  return `rgba(${r}, ${g}, ${b}, ${clamp(alpha, 0, 1)})`;
}

function particleRoom() {
  return Math.max(0, MAX_PARTICLES - state.particles.length);
}

function soundEnabled() {
  return state.meta?.sound !== false;
}

function hapticsEnabled() {
  return state.meta?.haptics !== false;
}

function buzz(pattern = 8) {
  if (!hapticsEnabled()) return;
  if (navigator.vibrate) navigator.vibrate(pattern);
  const native = window.OttiskNative;
  if (native?.isNative) {
    const style = Array.isArray(pattern) || pattern >= 16 ? "medium" : "light";
    native.haptic?.(style);
  }
}

function ensureAudio() {
  if (!soundEnabled()) return null;
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return null;
  if (!state.audio) state.audio = new AudioCtx();
  const ac = state.audio;
  if (!state.audioBus) {
    const master = ac.createGain();
    master.gain.value = 1.15;
    // Keep the path short for iOS Safari reliability.
    master.connect(ac.destination);
    state.audioBus = { master };
    state.noiseBuffer = null;
    state.audioUnlocked = false;
  }
  if (ac.state === "suspended") {
    try {
      const p = ac.resume();
      if (p && typeof p.catch === "function") p.catch(() => {});
    } catch (_) {
      // ignore
    }
  }
  return ac;
}

function audioOut() {
  const ac = ensureAudio();
  if (!ac || !state.audioBus) return null;
  return { ac, out: state.audioBus.master };
}

/** Must run inside a user gesture on iPhone or WebAudio stays muted. */
function unlockAudio() {
  if (!soundEnabled()) return false;
  const ac = ensureAudio();
  if (!ac || !state.audioBus) return false;
  try {
    if (ac.state === "suspended") {
      const p = ac.resume();
      if (p && typeof p.catch === "function") p.catch(() => {});
    }
  } catch (_) {
    // ignore
  }
  if (!state.audioUnlocked) {
    try {
      // Silent buffer kick — required so iOS keeps the audio graph alive.
      const buf = ac.createBuffer(1, 1, ac.sampleRate);
      const src = ac.createBufferSource();
      src.buffer = buf;
      src.connect(state.audioBus.master);
      src.start(0);
      state.audioUnlocked = true;
    } catch (_) {
      // ignore
    }
  }
  return ac.state === "running" || state.audioUnlocked;
}

function getNoiseBuffer() {
  const ac = ensureAudio();
  if (!ac) return null;
  if (state.noiseBuffer) return state.noiseBuffer;
  const len = Math.max(1, Math.floor(ac.sampleRate * 0.8));
  const buffer = ac.createBuffer(1, len, ac.sampleRate);
  const data = buffer.getChannelData(0);
  let last = 0;
  for (let i = 0; i < len; i += 1) {
    // Soft pink-ish noise for underwater grit.
    const white = Math.random() * 2 - 1;
    last = (last + 0.02 * white) / 1.02;
    data[i] = (white * 0.35 + last * 0.65) * 0.55;
  }
  state.noiseBuffer = buffer;
  return buffer;
}

function envGain(ac, out, gain, attack, dur, release = 0.04, delay = 0) {
  const amp = ac.createGain();
  const at = ac.currentTime + Math.max(0, delay);
  const att = Math.max(0.006, attack);
  const peak = Math.max(0.001, gain);
  const end = at + Math.max(att + 0.02, dur + release);
  amp.gain.setValueAtTime(0.0001, at);
  amp.gain.linearRampToValueAtTime(peak, at + att);
  amp.gain.linearRampToValueAtTime(0.0001, end);
  amp.connect(out);
  return { amp, at, stopAt: end + 0.03 };
}

function rampFreq(param, from, to, at, dur) {
  const a = Math.max(20, from);
  const b = Math.max(20, to);
  param.setValueAtTime(a, at);
  if (Math.abs(a - b) < 1) return;
  // linearRamp is safer across Safari than exponentialRamp.
  param.linearRampToValueAtTime(b, at + Math.max(0.01, dur));
}

function playOsc({
  freq = 440,
  endFreq = null,
  type = "sine",
  gain = 0.03,
  dur = 0.12,
  delay = 0,
  attack = 0.01,
  release = 0.05,
  detune = 0,
  filterFreq = 0,
  filterQ = 0.8,
  filterType = "lowpass",
} = {}) {
  if (!soundEnabled()) return;
  unlockAudio();
  const bus = audioOut();
  if (!bus) return;
  try {
    const { ac, out } = bus;
    const { amp, at, stopAt } = envGain(ac, out, gain * 1.35, attack, dur, release, delay);
    const osc = ac.createOscillator();
    osc.type = type;
    rampFreq(osc.frequency, freq, endFreq == null ? freq : endFreq, at, dur);
    if (detune) osc.detune.setValueAtTime(detune, at);
    if (filterFreq > 0) {
      const filter = ac.createBiquadFilter();
      filter.type = filterType;
      filter.frequency.setValueAtTime(Math.max(40, filterFreq), at);
      filter.Q.value = filterQ;
      osc.connect(filter);
      filter.connect(amp);
    } else {
      osc.connect(amp);
    }
    osc.start(at);
    osc.stop(stopAt);
  } catch (_) {
    // Never let audio errors kill the game loop.
  }
}

function playNoise({
  gain = 0.03,
  dur = 0.12,
  delay = 0,
  attack = 0.005,
  release = 0.06,
  filterFreq = 1200,
  endFilter = null,
  filterType = "bandpass",
  filterQ = 1.2,
} = {}) {
  if (!soundEnabled()) return;
  unlockAudio();
  const bus = audioOut();
  if (!bus) return;
  const buffer = getNoiseBuffer();
  if (!buffer) return;
  try {
    const { ac, out } = bus;
    const { amp, at, stopAt } = envGain(ac, out, gain * 1.25, attack, dur, release, delay);
    const src = ac.createBufferSource();
    src.buffer = buffer;
    const filter = ac.createBiquadFilter();
    filter.type = filterType;
    filter.Q.value = filterQ;
    rampFreq(filter.frequency, filterFreq, endFilter == null ? filterFreq : endFilter, at, dur);
    src.connect(filter);
    filter.connect(amp);
    src.start(at);
    src.stop(stopAt);
  } catch (_) {
    // ignore
  }
}

/** Legacy thin beep kept as a tiny wrapper for any leftover call sites. */
function tone(freq, dur = 0.08, type = "sine", gain = 0.04, delay = 0) {
  playOsc({ freq, type, gain: gain * 0.85, dur, delay, attack: 0.008, release: 0.04, filterFreq: freq * 3.2 });
}

function hum(on) {
  if (!on) {
    lastHumKey = "";
    humAcc = 0;
    if (!state.humNode || !state.audio) {
      state.humNode = null;
      return;
    }
    const ac = state.audio;
    const node = state.humNode;
    const t = ac.currentTime;
    node.g.gain.cancelScheduledValues(t);
    node.g.gain.setTargetAtTime(0.0001, t, 0.08);
    node.noiseGain.gain.setTargetAtTime(0.0001, t, 0.08);
    try {
      node.o1.stop(t + 0.22);
      node.o2.stop(t + 0.22);
      node.o3.stop(t + 0.22);
      node.lfo.stop(t + 0.22);
      node.noise.stop(t + 0.22);
    } catch (_) {
      // already stopped
    }
    state.humNode = null;
    return;
  }
  if (!soundEnabled()) return;
  unlockAudio();
  const bus = audioOut();
  if (!bus) return;
  if (state.humNode) return;
  const { ac, out } = bus;
  const o1 = ac.createOscillator();
  const o2 = ac.createOscillator();
  const o3 = ac.createOscillator();
  const lfo = ac.createOscillator();
  const lfoGain = ac.createGain();
  const g = ac.createGain();
  const filter = ac.createBiquadFilter();
  const noise = ac.createBufferSource();
  const noiseFilter = ac.createBiquadFilter();
  const noiseGain = ac.createGain();
  const buffer = getNoiseBuffer();
  o1.type = "sine";
  o2.type = "triangle";
  o3.type = "sine";
  lfo.type = "sine";
  o1.frequency.value = 48;
  o2.frequency.value = 72;
  o3.frequency.value = 96;
  lfo.frequency.value = 0.18;
  lfoGain.gain.value = 7;
  filter.type = "lowpass";
  filter.frequency.value = 420;
  filter.Q.value = 0.9;
  g.gain.value = 0.0001;
  noiseGain.gain.value = 0.0001;
  noiseFilter.type = "bandpass";
  noiseFilter.frequency.value = 280;
  noiseFilter.Q.value = 0.7;
  if (buffer) {
    noise.buffer = buffer;
    noise.loop = true;
  }
  lfo.connect(lfoGain);
  lfoGain.connect(o1.frequency);
  lfoGain.connect(o2.frequency);
  o1.connect(filter);
  o2.connect(filter);
  o3.connect(filter);
  filter.connect(g);
  g.connect(out);
  if (buffer) {
    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(out);
    noise.start();
  }
  o1.start();
  o2.start();
  o3.start();
  lfo.start();
  state.humNode = { o1, o2, o3, lfo, g, noise, noiseGain, filter, noiseFilter };
}

function updateHum(dt = 0.016) {
  if (!state.humNode || !state.audio || !state.life) return;
  humAcc += dt;
  if (humAcc < 0.07) return;
  humAcc = 0;
  const urgency = 1 - state.hunger / Math.max(1, state.maxHunger || 100);
  let hunterBoost = 0;
  for (const h of state.hunters) {
    const d2 = dist2(h.x, h.y, state.life.x, state.life.y);
    hunterBoost = Math.max(hunterBoost, clamp(1 - Math.sqrt(d2) / 220, 0, 1));
  }
  const key = `${(urgency * 20) | 0}|${(hunterBoost * 20) | 0}`;
  if (key === lastHumKey) return;
  lastHumKey = key;
  const ac = state.audio;
  const base = 46 + urgency * 54 + hunterBoost * 28;
  const t = ac.currentTime;
  state.humNode.o1.frequency.setTargetAtTime(base, t, 0.1);
  state.humNode.o2.frequency.setTargetAtTime(base * 1.5, t, 0.1);
  state.humNode.o3.frequency.setTargetAtTime(base * 2.02, t, 0.12);
  state.humNode.filter.frequency.setTargetAtTime(320 + urgency * 520 + hunterBoost * 380, t, 0.12);
  state.humNode.g.gain.setTargetAtTime(0.01 + urgency * 0.022 + hunterBoost * 0.014, t, 0.1);
  state.humNode.noiseGain.gain.setTargetAtTime(0.004 + urgency * 0.012 + hunterBoost * 0.01, t, 0.12);
  state.humNode.noiseFilter.frequency.setTargetAtTime(220 + hunterBoost * 700 + urgency * 260, t, 0.14);
}

function screenVisible(el) {
  return !!el && !el.classList.contains("hidden");
}

function inMainMenu() {
  const screenMoreEl = document.getElementById("screen-more");
  const screenAuthEl = document.getElementById("screen-auth");
  return !state.running && (
    screenVisible(screenStartEl)
    || screenVisible(screenHeroEl)
    || screenVisible(screenDiffEl)
    || screenVisible(screenMoreEl)
    || screenVisible(screenAuthEl)
  );
}

function hideFlowScreens() {
  screenStartEl?.classList.add("hidden");
  screenHeroEl?.classList.add("hidden");
  screenDiffEl?.classList.add("hidden");
  screenOnboardEl?.classList.add("hidden");
  document.getElementById("screen-donate")?.classList.add("hidden");
  document.getElementById("screen-more")?.classList.add("hidden");
  document.getElementById("screen-auth")?.classList.add("hidden");
  screenDrawEl?.classList.add("hidden");
}

function updateStartButtonCopy() {
  if (!btnStartSub) return;
  btnStartSub.textContent = (state.meta?.runs || 0) === 0
    ? "первый забег сразу"
    : "герой и сложность";
}

function showHomeMenu() {
  hideFlowScreens();
  screenStartEl?.classList.remove("hidden");
  updateStartButtonCopy();
  updateModeToggles();
  renderTrophyList();
  renderAccountUi();
  syncMenuMusic();
  maybeShowOnboardTips();
}

function showMoreMenu() {
  hideFlowScreens();
  document.getElementById("screen-more")?.classList.remove("hidden");
  updateModeToggles();
  renderControlPicker();
  renderTrophyList();
  renderGifts();
  renderProgression();
  renderStory();
  renderAccountUi();
  renderCloudStatus();
  renderLocalLeaderboard();
  syncMenuMusic();
}

let authMode = "register";

function trAuth(key, fallback) {
  return window.OttiskI18n?.t?.(key) || fallback;
}

function setAuthMode(mode) {
  authMode = mode === "login" ? "login" : "register";
  const reg = document.getElementById("auth-tab-register");
  const login = document.getElementById("auth-tab-login");
  const nameWrap = document.getElementById("auth-name-wrap");
  const label = document.getElementById("auth-submit-label");
  const sub = document.querySelector("#auth-submit .btn-sub");
  const password = document.getElementById("auth-password");
  reg?.classList.toggle("on", authMode === "register");
  login?.classList.toggle("on", authMode === "login");
  reg?.setAttribute("aria-selected", authMode === "register" ? "true" : "false");
  login?.setAttribute("aria-selected", authMode === "login" ? "true" : "false");
  if (nameWrap) nameWrap.classList.toggle("hidden", authMode === "login");
  if (label) {
    label.textContent = authMode === "login"
      ? trAuth("auth_enter", "Войти")
      : trAuth("auth_create", "Создать аккаунт");
  }
  if (sub) {
    sub.textContent = authMode === "login"
      ? trAuth("auth_enter_sub", "загрузить прогресс")
      : trAuth("auth_create_sub", "прогресс и покупки");
  }
  if (password) {
    password.autocomplete = authMode === "login" ? "current-password" : "new-password";
  }
  const err = document.getElementById("auth-error");
  err?.classList.add("hidden");
}

function showAuthScreen(preferredMode = "register") {
  hideFlowScreens();
  setAuthMode(preferredMode);
  document.getElementById("screen-auth")?.classList.remove("hidden");
  syncMenuMusic();
}

function authErrorMessage(code) {
  const map = {
    invalid_email: trAuth("auth_err_email", "Введите корректный email"),
    invalid_password: trAuth("auth_err_password", "Пароль от 6 символов"),
    email_taken: trAuth("auth_err_taken", "Этот email уже зарегистрирован"),
    not_found: trAuth("auth_err_not_found", "Аккаунт не найден"),
    bad_credentials: trAuth("auth_err_bad", "Неверный email или пароль"),
  };
  return map[code] || trAuth("auth_err_generic", "Не удалось войти");
}

function renderAccountUi() {
  const chip = document.getElementById("account-chip");
  const status = document.getElementById("account-status");
  const logoutBtn = document.getElementById("btn-account-logout");
  const manageBtn = document.getElementById("btn-account-manage");
  const session = window.OttiskAccount?.session?.();
  if (chip) {
    if (!session) chip.textContent = trAuth("account", "аккаунт");
    else if (session.mode === "guest") chip.textContent = window.OttiskI18n?.locale === "en" ? "guest" : "гость";
    else chip.textContent = (session.displayName || session.email || "аккаунт").slice(0, 14);
  }
  if (status) {
    status.textContent = session?.mode === "user"
      ? `${trAuth("auth_user_status", "аккаунт · прогресс и покупки сохранены")}${session.email ? ` · ${session.email}` : ""}`
      : trAuth("auth_guest_status", "гость · прогресс только на устройстве");
  }
  logoutBtn?.classList.toggle("hidden", session?.mode !== "user");
  if (manageBtn) {
    manageBtn.textContent = session?.mode === "user"
      ? trAuth("auth_login", "Вход")
      : trAuth("auth_register", "Регистрация");
  }
}

async function submitAuthForm(event) {
  event?.preventDefault?.();
  const email = document.getElementById("auth-email")?.value || "";
  const password = document.getElementById("auth-password")?.value || "";
  const displayName = document.getElementById("auth-name")?.value || "";
  const err = document.getElementById("auth-error");
  const submit = document.getElementById("auth-submit");
  if (submit) submit.disabled = true;
  try {
    if (authMode === "login") {
      await window.OttiskAccount.login({ email, password });
      location.reload();
      return;
    }
    await window.OttiskAccount.register({ email, password, displayName });
    if (displayName && state.meta) {
      state.meta.cloudName = displayName.slice(0, 24);
      saveMeta();
    }
    showToast(trAuth("auth_create", "аккаунт создан"));
    showHomeMenu();
    renderAccountUi();
  } catch (error) {
    if (err) {
      err.textContent = authErrorMessage(error?.code || error?.message);
      err.classList.remove("hidden");
    }
  } finally {
    if (submit) submit.disabled = false;
  }
}

function finishGuestEntry() {
  window.OttiskAccount?.continueAsGuest?.();
  showHomeMenu();
  renderAccountUi();
  showToast(trAuth("auth_guest_status", "гость · прогресс только на устройстве"));
}

function showHeroPick() {
  hideFlowScreens();
  screenHeroEl?.classList.remove("hidden");
  renderHeroPicker();
  paintHeroPortrait();
  syncMenuMusic();
}

function showDiffPick() {
  hideFlowScreens();
  screenDiffEl?.classList.remove("hidden");
  renderDifficultyPicker();
  syncMenuMusic();
}

function beginPlayFlow() {
  unlockAudio();
  sfxUiTap(1);
  // First session: skip hero/difficulty so the core hook hits immediately.
  if (state.meta && (state.meta.runs || 0) === 0) {
    if (!isHeroOwned(state.meta.activeHero || "octopus")) {
      state.meta.activeHero = "octopus";
    }
    if (!DIFFICULTIES.some((d) => d.id === state.meta.difficulty)) {
      state.meta.difficulty = "normal";
    }
    saveMeta();
    startGame();
    return;
  }
  showHeroPick();
}

function paintHeroPortrait() {
  if (!heroPortraitEl || !screenVisible(screenHeroEl)) return;
  const pctx = heroPortraitEl.getContext("2d");
  if (!pctx) return;
  const w = heroPortraitEl.width;
  const h = heroPortraitEl.height;
  const t = performance.now() / 1000;
  pctx.clearRect(0, 0, w, h);
  const glow = pctx.createRadialGradient(w * 0.5, h * 0.55, 8, w * 0.5, h * 0.55, w * 0.42);
  glow.addColorStop(0, "rgba(122, 255, 212, 0.16)");
  glow.addColorStop(0.55, "rgba(90, 170, 200, 0.08)");
  glow.addColorStop(1, "transparent");
  pctx.fillStyle = glow;
  pctx.beginPath();
  pctx.arc(w * 0.5, h * 0.55, w * 0.42, 0, Math.PI * 2);
  pctx.fill();

  const previewId = state.meta?.activeHero && HEROES.some((h) => h.id === state.meta.activeHero)
    ? state.meta.activeHero
    : activeHeroId();
  const prev = ctx;
  ctx = pctx;
  try {
    drawLifeBody(
      {
        x: w * 0.5,
        y: h * 0.54,
        r: Math.min(w, h) * 0.2,
        wobble: t * 2.4,
        aim: -Math.PI / 2 + Math.sin(t * 1.1) * 0.14,
      },
      1,
      previewId
    );
  } catch (_) {
    // ignore portrait paint errors
  } finally {
    ctx = prev;
  }
}

function playMenuNote(ac, dest, freq, gain, dur, when) {
  try {
    const osc = ac.createOscillator();
    const harm = ac.createOscillator();
    const amp = ac.createGain();
    const filt = ac.createBiquadFilter();
    osc.type = "sine";
    harm.type = "triangle";
    osc.frequency.setValueAtTime(freq, when);
    harm.frequency.setValueAtTime(freq * 2.01, when);
    filt.type = "lowpass";
    filt.frequency.setValueAtTime(Math.min(2200, freq * 2.6), when);
    filt.Q.value = 0.8;
    amp.gain.setValueAtTime(0.0001, when);
    amp.gain.linearRampToValueAtTime(gain, when + 0.05);
    amp.gain.linearRampToValueAtTime(gain * 0.55, when + dur * 0.45);
    amp.gain.linearRampToValueAtTime(0.0001, when + dur);
    const hg = ac.createGain();
    hg.gain.value = 0.35;
    osc.connect(filt);
    harm.connect(hg);
    hg.connect(filt);
    filt.connect(amp);
    amp.connect(dest);
    osc.start(when);
    harm.start(when);
    osc.stop(when + dur + 0.04);
    harm.stop(when + dur + 0.04);
  } catch (_) {
    // ignore
  }
}

function playMenuBass(ac, dest, freq, when) {
  try {
    const osc = ac.createOscillator();
    const amp = ac.createGain();
    const filt = ac.createBiquadFilter();
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, when);
    osc.frequency.linearRampToValueAtTime(freq * 0.92, when + 0.9);
    filt.type = "lowpass";
    filt.frequency.value = 240;
    amp.gain.setValueAtTime(0.0001, when);
    amp.gain.linearRampToValueAtTime(0.034, when + 0.08);
    amp.gain.linearRampToValueAtTime(0.0001, when + 1.05);
    osc.connect(filt);
    filt.connect(amp);
    amp.connect(dest);
    osc.start(when);
    osc.stop(when + 1.1);
  } catch (_) {
    // ignore
  }
}

function stopMenuMusic(fade = 0.4) {
  const mm = state.menuMusic;
  if (!mm) return;
  mm.alive = false;
  if (mm.timer) {
    clearTimeout(mm.timer);
    mm.timer = 0;
  }
  const ac = state.audio;
  if (ac && mm.master) {
    const t = ac.currentTime;
    try {
      mm.master.gain.cancelScheduledValues(t);
      mm.master.gain.setTargetAtTime(0.0001, t, Math.max(0.04, fade * 0.22));
    } catch (_) {
      // ignore
    }
    const stopAt = t + fade + 0.08;
    for (const osc of mm.oscs || []) {
      try {
        osc.stop(stopAt);
      } catch (_) {
        // already stopped
      }
    }
    try {
      mm.noise?.stop(stopAt);
    } catch (_) {
      // already stopped
    }
  }
  state.menuMusic = null;
}

/** Soft underwater loop for the title screen — starts after a user gesture unlocks audio. */
function startMenuMusic() {
  if (!soundEnabled() || state.running || state.menuMusic || !inMainMenu()) return;
  unlockAudio();
  const bus = audioOut();
  if (!bus) return;
  const { ac, out } = bus;

  const master = ac.createGain();
  master.gain.value = 0.0001;
  master.connect(out);

  const padGain = ac.createGain();
  padGain.gain.value = 0.05;
  const padFilter = ac.createBiquadFilter();
  padFilter.type = "lowpass";
  padFilter.frequency.value = 620;
  padFilter.Q.value = 0.75;
  padGain.connect(padFilter);
  padFilter.connect(master);

  const padFreqs = [73.42, 110, 146.83, 174.61]; // D2 · A2 · D3 · F3
  const oscs = [];
  for (const f of padFreqs) {
    const o = ac.createOscillator();
    o.type = f < 100 ? "sine" : "triangle";
    o.frequency.value = f;
    const g = ac.createGain();
    g.gain.value = f < 100 ? 0.58 : 0.26;
    o.connect(g);
    g.connect(padGain);
    o.start();
    oscs.push(o);
  }

  const lfo = ac.createOscillator();
  const lfoG = ac.createGain();
  lfo.type = "sine";
  lfo.frequency.value = 0.06;
  lfoG.gain.value = 160;
  lfo.connect(lfoG);
  lfoG.connect(padFilter.frequency);
  lfo.start();
  oscs.push(lfo);

  let noise = null;
  const buffer = getNoiseBuffer();
  if (buffer) {
    noise = ac.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;
    const nf = ac.createBiquadFilter();
    nf.type = "bandpass";
    nf.frequency.value = 380;
    nf.Q.value = 0.55;
    const ng = ac.createGain();
    ng.gain.value = 0.016;
    noise.connect(nf);
    nf.connect(ng);
    ng.connect(master);
    noise.start();
  }

  const leadBus = ac.createGain();
  leadBus.gain.value = 1;
  leadBus.connect(master);

  master.gain.setTargetAtTime(1, ac.currentTime, 0.9);

  const melody = [293.66, 349.23, 392.0, 440.0, 349.23, 293.66, 261.63, 220.0];
  const bass = [73.42, 65.41, 87.31, 73.42];
  const mm = {
    alive: true,
    master,
    oscs,
    noise,
    timer: 0,
    nextT: ac.currentTime + 0.35,
    step: 0,
  };
  state.menuMusic = mm;

  const tick = () => {
    if (!state.menuMusic || state.menuMusic !== mm || !mm.alive) return;
    if (!soundEnabled() || !inMainMenu()) {
      stopMenuMusic();
      return;
    }
    const now = ac.currentTime;
    while (mm.nextT < now + 0.4) {
      const i = mm.step;
      const freq = melody[i % melody.length];
      const accent = i % 4 === 0;
      playMenuNote(ac, leadBus, freq, accent ? 0.026 : 0.016, accent ? 0.78 : 0.48, mm.nextT);
      if (i % 4 === 0) playMenuBass(ac, leadBus, bass[(i / 4) % bass.length], mm.nextT);
      if (i % 8 === 5) {
        playNoise({
          gain: 0.01,
          dur: 0.12,
          delay: Math.max(0, mm.nextT - now),
          filterFreq: 1600,
          endFilter: 500,
          filterType: "bandpass",
          filterQ: 1.2,
        });
      }
      mm.nextT += 0.64;
      mm.step += 1;
    }
    mm.timer = setTimeout(tick, 160);
  };
  tick();
}

function syncMenuMusic() {
  if (inMainMenu() && soundEnabled()) startMenuMusic();
  else stopMenuMusic();
}

function sfxBubblePop(pitch = 1) {
  playNoise({
    gain: 0.028,
    dur: 0.07,
    attack: 0.002,
    release: 0.05,
    filterFreq: 1800 * pitch,
    endFilter: 700 * pitch,
    filterType: "bandpass",
    filterQ: 2.4,
  });
  playOsc({
    freq: 520 * pitch,
    endFreq: 180 * pitch,
    type: "sine",
    gain: 0.03,
    dur: 0.09,
    attack: 0.004,
    filterFreq: 2400,
  });
}

/** Soft gravitational swallow + crystal ping — eating a light-planet. */
function sfxPlanktonEat(combo = 0) {
  const pitch = 1 + Math.min(12, combo) * 0.038;
  // mass absorb (low whoomp)
  playOsc({
    freq: 210 * pitch,
    endFreq: 68 * pitch,
    type: "sine",
    gain: 0.042,
    dur: 0.15,
    attack: 0.003,
    release: 0.08,
    filterFreq: 520,
  });
  playOsc({
    freq: 140 * pitch,
    endFreq: 48 * pitch,
    type: "triangle",
    gain: 0.02,
    dur: 0.16,
    attack: 0.004,
    filterFreq: 380,
  });
  // planetary core ting
  playOsc({
    freq: 680 * pitch,
    endFreq: 980 * pitch,
    type: "triangle",
    gain: 0.03,
    dur: 0.11,
    delay: 0.018,
    attack: 0.002,
    filterFreq: 2600,
    filterQ: 1.2,
  });
  // bright overtone sparkle
  playOsc({
    freq: 1360 * pitch,
    endFreq: 1880 * pitch,
    type: "sine",
    gain: 0.016,
    dur: 0.1,
    delay: 0.045,
    filterFreq: 3400,
  });
  // light-dust hush
  playNoise({
    gain: 0.02,
    dur: 0.11,
    attack: 0.002,
    release: 0.07,
    filterFreq: 2600 * pitch,
    endFilter: 480 * pitch,
    filterType: "bandpass",
    filterQ: 1.6,
  });
}

function sfxRareEat() {
  playOsc({ freq: 160, endFreq: 70, type: "sine", gain: 0.036, dur: 0.18, attack: 0.006, filterFreq: 500 });
  playOsc({ freq: 740, endFreq: 1180, type: "triangle", gain: 0.032, dur: 0.14, delay: 0.02, filterFreq: 3200 });
  playOsc({ freq: 1180, endFreq: 1680, type: "sine", gain: 0.02, dur: 0.16, delay: 0.07 });
  playNoise({ gain: 0.018, dur: 0.12, delay: 0.02, filterFreq: 2800, endFilter: 700, filterQ: 1.8 });
}

function sfxCoolEat() {
  playOsc({ freq: 420, endFreq: 180, type: "sine", gain: 0.03, dur: 0.18, attack: 0.008, filterFreq: 1200 });
  playOsc({ freq: 840, endFreq: 420, type: "triangle", gain: 0.018, dur: 0.2, delay: 0.03 });
  playNoise({ gain: 0.016, dur: 0.16, filterFreq: 1100, endFilter: 220, filterType: "lowpass" });
}

function sfxBaitEat() {
  playOsc({ freq: 180, endFreq: 90, type: "sawtooth", gain: 0.018, dur: 0.14, filterFreq: 500, filterQ: 1.4 });
  playOsc({ freq: 240, endFreq: 120, type: "square", gain: 0.012, dur: 0.12, delay: 0.04, filterFreq: 700 });
  playNoise({ gain: 0.022, dur: 0.12, filterFreq: 420, endFilter: 160, filterQ: 0.8 });
}

function sfxCometEat() {
  playNoise({ gain: 0.03, dur: 0.18, filterFreq: 3200, endFilter: 400, filterType: "lowpass", filterQ: 0.6 });
  playOsc({ freq: 980, endFreq: 220, type: "sawtooth", gain: 0.02, dur: 0.2, filterFreq: 1800 });
  playOsc({ freq: 1460, endFreq: 420, type: "triangle", gain: 0.018, dur: 0.16, delay: 0.03 });
}

function sfxDeepEat() {
  playOsc({ freq: 140, endFreq: 70, type: "sine", gain: 0.04, dur: 0.28, attack: 0.02, filterFreq: 500 });
  playOsc({ freq: 210, endFreq: 105, type: "triangle", gain: 0.02, dur: 0.26, delay: 0.04 });
  playNoise({ gain: 0.02, dur: 0.22, filterFreq: 180, endFilter: 80, filterType: "lowpass" });
}

function sfxSeedEat() {
  playOsc({ freq: 180, endFreq: 90, type: "sine", gain: 0.028, dur: 0.14, attack: 0.006, filterFreq: 480 });
  playOsc({ freq: 720, endFreq: 1080, type: "triangle", gain: 0.022, dur: 0.13, delay: 0.03, filterFreq: 2600 });
  playOsc({ freq: 1080, endFreq: 1440, type: "sine", gain: 0.014, dur: 0.12, delay: 0.08 });
  playNoise({ gain: 0.014, dur: 0.1, delay: 0.02, filterFreq: 2200, endFilter: 600, filterQ: 1.5 });
}

function sfxPulsarEat() {
  playNoise({ gain: 0.038, dur: 0.24, filterFreq: 1800, endFilter: 240, filterType: "bandpass", filterQ: 0.85 });
  playOsc({ freq: 150, endFreq: 55, type: "sine", gain: 0.048, dur: 0.3, attack: 0.012, filterFreq: 420 });
  playOsc({ freq: 480, endFreq: 960, type: "triangle", gain: 0.032, dur: 0.2, delay: 0.04, filterFreq: 2800 });
  playOsc({ freq: 960, endFreq: 1440, type: "sine", gain: 0.024, dur: 0.22, delay: 0.1 });
  playOsc({ freq: 1440, endFreq: 360, type: "triangle", gain: 0.016, dur: 0.24, delay: 0.16 });
}

function goalChime() {
  playOsc({ freq: 523, type: "sine", gain: 0.03, dur: 0.12, filterFreq: 2600 });
  playOsc({ freq: 659, type: "triangle", gain: 0.026, dur: 0.13, delay: 0.07, filterFreq: 2800 });
  playOsc({ freq: 784, type: "sine", gain: 0.024, dur: 0.16, delay: 0.14, filterFreq: 3000 });
  playOsc({ freq: 1046, type: "triangle", gain: 0.016, dur: 0.18, delay: 0.2 });
  playNoise({ gain: 0.012, dur: 0.12, delay: 0.08, filterFreq: 2800, endFilter: 1200, filterQ: 1.8 });
}

function mutationDing() {
  playOsc({ freq: 700, endFreq: 1050, type: "triangle", gain: 0.03, dur: 0.14, filterFreq: 3200 });
  playOsc({ freq: 1050, endFreq: 1400, type: "sine", gain: 0.022, dur: 0.16, delay: 0.07 });
  playNoise({ gain: 0.016, dur: 0.12, delay: 0.03, filterFreq: 2400, endFilter: 900 });
}

function sfxAwaken() {
  playNoise({ gain: 0.035, dur: 0.28, filterFreq: 600, endFilter: 2200, filterType: "lowpass", filterQ: 0.7 });
  playOsc({ freq: 110, endFreq: 220, type: "sine", gain: 0.04, dur: 0.3, attack: 0.02 });
  playOsc({ freq: 220, endFreq: 440, type: "triangle", gain: 0.028, dur: 0.24, delay: 0.06 });
  playOsc({ freq: 440, endFreq: 880, type: "sine", gain: 0.02, dur: 0.2, delay: 0.14 });
  playOsc({ freq: 880, endFreq: 1320, type: "triangle", gain: 0.014, dur: 0.16, delay: 0.22 });
  sfxBubblePop(0.85);
  sfxBubblePop(1.25);
}

function sfxPulse() {
  playNoise({ gain: 0.03, dur: 0.16, filterFreq: 500, endFilter: 140, filterType: "lowpass" });
  playOsc({ freq: 180, endFreq: 70, type: "sine", gain: 0.034, dur: 0.18, attack: 0.008 });
  playOsc({ freq: 90, endFreq: 45, type: "triangle", gain: 0.02, dur: 0.2, delay: 0.03 });
}

function sfxDeath() {
  playNoise({ gain: 0.05, dur: 0.42, filterFreq: 900, endFilter: 90, filterType: "lowpass", filterQ: 0.6 });
  playOsc({ freq: 160, endFreq: 48, type: "sawtooth", gain: 0.03, dur: 0.38, attack: 0.01, filterFreq: 700 });
  playOsc({ freq: 96, endFreq: 36, type: "triangle", gain: 0.034, dur: 0.42, delay: 0.05, filterFreq: 400 });
  playOsc({ freq: 220, endFreq: 55, type: "sine", gain: 0.02, dur: 0.3, delay: 0.1 });
}

function sfxNearMiss() {
  playNoise({ gain: 0.02, dur: 0.08, filterFreq: 2200, endFilter: 700, filterQ: 2 });
  playOsc({ freq: 980, endFreq: 420, type: "triangle", gain: 0.02, dur: 0.09, filterFreq: 2600 });
}

function sfxWaveShift() {
  playNoise({ gain: 0.028, dur: 0.22, filterFreq: 300, endFilter: 1800, filterType: "bandpass", filterQ: 0.9 });
  playOsc({ freq: 180, endFreq: 360, type: "sine", gain: 0.028, dur: 0.2 });
  playOsc({ freq: 270, endFreq: 540, type: "triangle", gain: 0.02, dur: 0.22, delay: 0.06 });
  playOsc({ freq: 540, endFreq: 810, type: "sine", gain: 0.014, dur: 0.18, delay: 0.12 });
}

function sfxDiveIn() {
  playNoise({ gain: 0.03, dur: 0.24, filterFreq: 1400, endFilter: 180, filterType: "lowpass" });
  playOsc({ freq: 240, endFreq: 80, type: "sine", gain: 0.03, dur: 0.26, attack: 0.02 });
  playOsc({ freq: 160, endFreq: 60, type: "triangle", gain: 0.018, dur: 0.28, delay: 0.05 });
}

function sfxDiveOut() {
  playNoise({ gain: 0.022, dur: 0.16, filterFreq: 200, endFilter: 1600, filterType: "lowpass" });
  playOsc({ freq: 120, endFreq: 320, type: "sine", gain: 0.026, dur: 0.18 });
  playOsc({ freq: 240, endFreq: 480, type: "triangle", gain: 0.016, dur: 0.16, delay: 0.05 });
}

function sfxHunterWarn() {
  playOsc({ freq: 140, endFreq: 90, type: "sawtooth", gain: 0.02, dur: 0.16, filterFreq: 500, filterQ: 1.8 });
  playNoise({ gain: 0.02, dur: 0.14, filterFreq: 260, endFilter: 120, filterType: "lowpass" });
}

/** School fish — wet chatter / nibble. */
function sfxFishCall() {
  playNoise({ gain: 0.018, dur: 0.08, filterFreq: 1400, endFilter: 500, filterType: "bandpass", filterQ: 1.4 });
  playOsc({ freq: 320, endFreq: 180, type: "triangle", gain: 0.022, dur: 0.1, filterFreq: 1200 });
  playOsc({ freq: 480, endFreq: 260, type: "sine", gain: 0.014, dur: 0.08, delay: 0.04 });
  sfxBubblePop(0.9);
}

/** Dart — sharp zip. */
function sfxDartCall() {
  playNoise({ gain: 0.02, dur: 0.06, filterFreq: 3200, endFilter: 900, filterType: "highpass", filterQ: 0.8 });
  playOsc({ freq: 880, endFreq: 1480, type: "sawtooth", gain: 0.016, dur: 0.07, filterFreq: 2800, filterQ: 1.6 });
  playOsc({ freq: 1320, endFreq: 420, type: "triangle", gain: 0.018, dur: 0.09, delay: 0.02, filterFreq: 3400 });
}

function sfxDartDash() {
  playNoise({ gain: 0.03, dur: 0.1, filterFreq: 2600, endFilter: 400, filterType: "lowpass" });
  playOsc({ freq: 1100, endFreq: 220, type: "sawtooth", gain: 0.022, dur: 0.12, filterFreq: 2200 });
  playOsc({ freq: 1600, endFreq: 380, type: "triangle", gain: 0.014, dur: 0.1, delay: 0.02 });
}

/** Jelly — gel wobble. */
function sfxJellyCall() {
  playOsc({ freq: 180, endFreq: 110, type: "sine", gain: 0.03, dur: 0.2, attack: 0.03, filterFreq: 700 });
  playOsc({ freq: 260, endFreq: 200, type: "triangle", gain: 0.018, dur: 0.22, delay: 0.04, filterFreq: 900 });
  playOsc({ freq: 90, endFreq: 140, type: "sine", gain: 0.016, dur: 0.18, delay: 0.08 });
  playNoise({ gain: 0.012, dur: 0.16, filterFreq: 500, endFilter: 180, filterType: "lowpass" });
}

/** Eel — electric crackle. */
function sfxEelCall() {
  playNoise({ gain: 0.028, dur: 0.1, filterFreq: 2400, endFilter: 800, filterType: "bandpass", filterQ: 2.4 });
  playOsc({ freq: 720, endFreq: 180, type: "square", gain: 0.012, dur: 0.08, filterFreq: 1600, filterQ: 2 });
  playOsc({ freq: 240, endFreq: 90, type: "sawtooth", gain: 0.016, dur: 0.12, delay: 0.03, filterFreq: 900 });
  playNoise({ gain: 0.016, dur: 0.08, delay: 0.05, filterFreq: 3000, endFilter: 600, filterQ: 1.8 });
}

/** Shark — low growl. */
function sfxSharkCall() {
  playOsc({ freq: 70, endFreq: 42, type: "sawtooth", gain: 0.028, dur: 0.26, attack: 0.02, filterFreq: 280, filterQ: 1.2 });
  playOsc({ freq: 96, endFreq: 55, type: "triangle", gain: 0.022, dur: 0.24, delay: 0.03, filterFreq: 360 });
  playNoise({ gain: 0.022, dur: 0.2, filterFreq: 220, endFilter: 80, filterType: "lowpass" });
}

function sfxSharkDash() {
  playNoise({ gain: 0.034, dur: 0.16, filterFreq: 500, endFilter: 120, filterType: "lowpass" });
  playOsc({ freq: 110, endFreq: 40, type: "sawtooth", gain: 0.03, dur: 0.18, attack: 0.01, filterFreq: 420 });
  playOsc({ freq: 160, endFreq: 60, type: "triangle", gain: 0.018, dur: 0.16, delay: 0.04 });
}

/** Ray — wing sweep. */
function sfxRayCall() {
  playNoise({ gain: 0.02, dur: 0.18, filterFreq: 900, endFilter: 220, filterType: "lowpass", filterQ: 0.7 });
  playOsc({ freq: 220, endFreq: 120, type: "sine", gain: 0.026, dur: 0.22, attack: 0.02, filterFreq: 800 });
  playOsc({ freq: 340, endFreq: 180, type: "triangle", gain: 0.016, dur: 0.2, delay: 0.05 });
}

/** Ghost — airy whisper. */
function sfxGhostCall() {
  playOsc({ freq: 520, endFreq: 260, type: "sine", gain: 0.018, dur: 0.24, attack: 0.04, filterFreq: 1400 });
  playOsc({ freq: 780, endFreq: 390, type: "triangle", gain: 0.014, dur: 0.26, delay: 0.05, filterFreq: 1800 });
  playNoise({ gain: 0.016, dur: 0.22, filterFreq: 1600, endFilter: 400, filterType: "bandpass", filterQ: 0.9 });
}

function sfxGhostBlink() {
  playNoise({ gain: 0.018, dur: 0.08, filterFreq: 2000, endFilter: 700, filterType: "bandpass", filterQ: 1.6 });
  playOsc({ freq: 640, endFreq: 180, type: "sine", gain: 0.016, dur: 0.1, filterFreq: 1600 });
}

/** Leviathan — deep roar / charge. */
function sfxBossCall() {
  playNoise({ gain: 0.04, dur: 0.34, filterFreq: 280, endFilter: 70, filterType: "lowpass", filterQ: 0.7 });
  playOsc({ freq: 55, endFreq: 32, type: "sawtooth", gain: 0.036, dur: 0.36, attack: 0.03, filterFreq: 220 });
  playOsc({ freq: 82, endFreq: 48, type: "triangle", gain: 0.028, dur: 0.34, delay: 0.04, filterFreq: 300 });
  playOsc({ freq: 110, endFreq: 70, type: "sine", gain: 0.018, dur: 0.28, delay: 0.1 });
}

function sfxBossWarn() {
  playOsc({ freq: 90, endFreq: 140, type: "sawtooth", gain: 0.026, dur: 0.2, filterFreq: 400, filterQ: 1.5 });
  playOsc({ freq: 140, endFreq: 70, type: "triangle", gain: 0.02, dur: 0.22, delay: 0.05 });
  playNoise({ gain: 0.024, dur: 0.2, filterFreq: 320, endFilter: 100, filterType: "lowpass" });
}

function sfxBossCharge() {
  playNoise({ gain: 0.045, dur: 0.28, filterFreq: 700, endFilter: 90, filterType: "lowpass" });
  playOsc({ freq: 160, endFreq: 40, type: "sawtooth", gain: 0.034, dur: 0.3, attack: 0.01, filterFreq: 500 });
  playOsc({ freq: 220, endFreq: 55, type: "triangle", gain: 0.022, dur: 0.26, delay: 0.05 });
  playOsc({ freq: 90, endFreq: 30, type: "sine", gain: 0.026, dur: 0.32, delay: 0.02 });
}

function sfxShadow() {
  playOsc({ freq: 90, endFreq: 45, type: "sine", gain: 0.034, dur: 0.28, attack: 0.03 });
  playOsc({ freq: 135, endFreq: 60, type: "triangle", gain: 0.02, dur: 0.26, delay: 0.05 });
  playNoise({ gain: 0.024, dur: 0.24, filterFreq: 180, endFilter: 70, filterType: "lowpass" });
}

const predatorSfxGate = Object.create(null);

function playPredatorSfx(species, kind = "call") {
  const key = `${species || "fish"}:${kind}`;
  const now = performance.now();
  const gap = kind === "dash" || kind === "charge" ? 120 : 220;
  if ((predatorSfxGate[key] || 0) + gap > now) return;
  predatorSfxGate[key] = now;
  if (species === "dart") {
    if (kind === "dash") sfxDartDash();
    else sfxDartCall();
    return;
  }
  if (species === "jelly") {
    sfxJellyCall();
    return;
  }
  if (species === "eel") {
    sfxEelCall();
    return;
  }
  if (species === "shark") {
    if (kind === "dash") sfxSharkDash();
    else sfxSharkCall();
    return;
  }
  if (species === "ray") {
    sfxRayCall();
    return;
  }
  if (species === "ghost") {
    if (kind === "dash" || kind === "blink") sfxGhostBlink();
    else sfxGhostCall();
    return;
  }
  if (species === "crab") {
    playOsc({ freq: 140, endFreq: 90, type: "triangle", gain: 0.02, dur: 0.09, filterFreq: 600 });
    playNoise({ gain: 0.014, dur: 0.07, filterFreq: 500, endFilter: 180, filterType: "bandpass", filterQ: 1.4 });
    return;
  }
  if (species === "urchin") {
    playOsc({ freq: 520, endFreq: 260, type: "sine", gain: 0.016, dur: 0.12 });
    return;
  }
  if (species === "mirror") {
    playOsc({ freq: 880, endFreq: 1320, type: "triangle", gain: 0.015, dur: 0.08, filterFreq: 3200 });
    return;
  }
  if (species === "boss") {
    if (kind === "charge") sfxBossCharge();
    else if (kind === "warn") sfxBossWarn();
    else sfxBossCall();
    return;
  }
  if (species === "shadow") {
    sfxShadow();
    return;
  }
  sfxFishCall();
}

function sfxUiTap(step = 0) {
  playOsc({
    freq: 520 + step * 70,
    endFreq: 780 + step * 40,
    type: "triangle",
    gain: 0.018,
    dur: 0.07,
    filterFreq: 2400,
  });
  playNoise({ gain: 0.01, dur: 0.05, filterFreq: 2600, endFilter: 1200, filterQ: 2 });
}

function sfxContinue() {
  playOsc({ freq: 330, endFreq: 520, type: "sine", gain: 0.028, dur: 0.14 });
  playOsc({ freq: 520, endFreq: 780, type: "triangle", gain: 0.02, dur: 0.16, delay: 0.07 });
  sfxBubblePop(1.1);
}

function sfxHungerTick(hunger = 20) {
  const danger = clamp((28 - hunger) / 28, 0, 1);
  playOsc({
    freq: 120 + danger * 90,
    endFreq: 70 + danger * 40,
    type: "triangle",
    gain: 0.012 + danger * 0.012,
    dur: 0.07,
    filterFreq: 500,
  });
  playNoise({
    gain: 0.01 + danger * 0.012,
    dur: 0.06,
    filterFreq: 300 + danger * 400,
    endFilter: 120,
    filterType: "bandpass",
    filterQ: 1.5,
  });
}

function playSparkTone(type) {
  if (type === "super") sfxPulsarEat();
  else if (type === "rare") sfxRareEat();
  else if (type === "cool") sfxCoolEat();
  else if (type === "bait") sfxBaitEat();
  else if (type === "comet") sfxCometEat();
  else if (type === "deep") sfxDeepEat();
  else if (type === "seed") sfxSeedEat();
  else if (type === "ember") sfxCometEat();
  else if (type === "mirror") sfxCoolEat();
  else sfxPlanktonEat(state.combo || 0);
}

function showCombo(text, fever = false) {
  comboEl.textContent = text;
  comboEl.className = `combo show${fever ? " fever" : ""}`;
  clearTimeout(showCombo.timer);
  showCombo.timer = setTimeout(() => {
    comboEl.classList.remove("show");
    if (!state.fever) comboEl.classList.remove("fever");
  }, 750);
}

function setEventChip(text) {
  if (!waveLabelEl) return;
  if (text) {
    const label = String(text);
    uiCache.wave = label;
    waveLabelEl.textContent = label;
    waveLabelEl.classList.add("event");
    return;
  }
  waveLabelEl.classList.remove("event");
  uiCache.wave = "";
  if (state.running) updateWaveUi(false);
}

function activeEventId() {
  return state.event?.id || "";
}

function startRunEvent(def) {
  state.event = { id: def.id, title: def.title, t: def.dur };
  setEventChip(`событие · ${def.title}`);
  pulseUnlock(cssVar("--gold", "#ffe898"), 0.12);
  tipOnce(`event_${def.id}`, def.title.toUpperCase(), 1600, {
    persist: true,
    first: `Событие: ${def.title}`,
    firstMs: 2200,
  });
  if (def.id === "raid") {
    spawnHunter(false);
    spawnHunter(false);
  } else if (def.id === "comet") {
    spawnComet();
  } else if (def.id === "rain") {
    state.eventRainAcc = 0;
    for (let i = 0; i < 2; i += 1) spawnSpark({ edge: true });
  } else if (def.id === "sanctuary") {
    state.eventRainAcc = 0;
    for (let i = 0; i < 4; i += 1) spawnSpark({ edge: true, type: i === 0 ? "rare" : null });
  } else if (def.id === "blackout") {
    state.flash = Math.max(state.flash, 0.22);
    spawnHunter(false);
  } else if (def.id === "light-bloom") {
    for (let i = 0; i < 5; i += 1) spawnSpark({ edge: true, type: i === 0 ? "rare" : null });
  } else if (def.id === "tangled-path") {
    spawnHunter(false);
  } else if (def.id === "mirror-tide") {
    spawnHunter(false);
    spawnSpark({ edge: true, type: "mirror" });
  } else if (def.id === "ember-rain") {
    for (let i = 0; i < 4; i += 1) spawnSpark({ edge: true, type: i === 0 ? "ember" : null });
  } else if (def.id === "tidepull") {
    state.eventRainAcc = 0;
    for (let i = 0; i < 3; i += 1) spawnSpark({ edge: true, type: i === 0 ? "rare" : null });
  }
}

function updateRunEvents(dt) {
  if (state.event) {
    state.event.t -= dt;
    if (state.event.id === "rain") {
      state.eventRainAcc += dt;
      while (state.eventRainAcc >= 0.38) {
        state.eventRainAcc -= 0.38;
        spawnSpark({ edge: true, type: Math.random() < 0.18 ? "rare" : null });
      }
    }
    if (state.event.id === "sanctuary") {
      state.eventRainAcc += dt;
      while (state.eventRainAcc >= 0.8) {
        state.eventRainAcc -= 0.8;
        spawnSpark({ edge: true, type: Math.random() < 0.22 ? "rare" : null });
      }
    }
    if (state.event.id === "tidepull" && state.life) {
      for (const spark of state.sparks) {
        if (spark.comet) continue;
        const d = dist(spark.x, spark.y, state.life.x, state.life.y);
        if (d < 10 || d > 280) continue;
        const pull = (1 - d / 280) * 0.28;
        spark.vx += ((state.life.x - spark.x) / d) * pull;
        spark.vy += ((state.life.y - spark.y) / d) * pull;
      }
    }
    if (state.event.t <= 0) {
      state.event = null;
      setEventChip("");
      state.eventNext = rand(10, 16);
      state.eventAcc = 0;
    }
    return;
  }
  if (state.elapsed < OPENING_SEC + 2) return;
  state.eventAcc += dt;
  if (state.eventAcc < state.eventNext) return;
  const pick = RUN_EVENTS[Math.floor(Math.random() * RUN_EVENTS.length)];
  startRunEvent(pick);
}

function inInkDive() {
  return state.inkDive > 0;
}

function setDiveMeter(progress) {
  if (!diveMeterEl || !diveFillEl) return;
  const show = progress > 0.05 && progress < 1 && !inInkDive();
  const pct = Math.round(clamp(progress, 0, 1) * 100);
  if (uiCache.diveShow !== show) {
    uiCache.diveShow = show;
    diveMeterEl.classList.toggle("show", show);
  }
  if (uiCache.dive !== pct) {
    uiCache.dive = pct;
    diveFillEl.style.width = `${pct}%`;
  }
}

function enterInkDive() {
  if (inInkDive() || state.inkDiveCd > 0 || !state.life) return;
  state.inkDive = 5.2;
  state.inkDiveCd = 16;
  state.stillAcc = 0;
  setDiveMeter(0);
  app.classList.add("ink-dive");
  refreshCssCache();
  pulseUnlock("#8ae0ff", 0.16);
  tipOnce("dive", "ЗДЕСЬ ТИХО", 1600, {
    persist: true,
    first: "Стоишь на месте — нырок в тишину. Хищники слабее.",
  });
  sfxDiveIn();
  buzz([12, 20, 12]);
  state.flash = Math.max(state.flash, 0.16);
  for (let i = 0; i < 5; i += 1) spawnSpark({ edge: true, type: "deep" });
}

function exitInkDive() {
  state.inkDive = 0;
  app.classList.remove("ink-dive");
  refreshCssCache();
  if (!state.event) setEventChip("");
  pulseUnlock(cssVar("--life", "#7affd4"), 0.1);
  sfxDiveOut();
}

function spawnShadowHunter(x, y) {
  state.stats.shadowsSpawned += 1;
  state.hunters.push({
    x,
    y,
    vx: 0,
    vy: 0,
    r: 15,
    anger: 0.78,
    slow: false,
    warn: 1,
    phase: Math.random() * Math.PI * 2,
    nearMissed: false,
    shadow: true,
    wobble: Math.random() * Math.PI * 2,
  });
  tipOnce("shadow", "СЛЕД ОЖИЛ", 1700, {
    persist: true,
    first: "Старый след ожил и охотится. Не отпускай палец рядом.",
  });
  sfxShadow();
  buzz([16, 24, 16]);
}

function maybeAwakenEcho() {
  if (!state.echo) return;
  if (state.elapsed < OPENING_SEC + 6) return;
  if (state.score < 10) return;
  if (state.stats.shadowsSpawned >= 3) return;
  const chance = 0.42 + Math.min(0.25, state.score * 0.002);
  if (Math.random() > chance) return;
  spawnShadowHunter(state.echo.x, state.echo.y);
}

function spawnGlyph(x, y) {
  if (state.wordDone || state.glyphIndex >= SECRET_WORD.length) return;
  const ch = SECRET_WORD[state.glyphIndex];
  state.glyphs.push({
    x: clamp(x + rand(-26, 26), 24, state.width - 24),
    y: clamp(y + rand(-26, 26), 40, state.height - 24),
    ch,
    index: state.glyphIndex,
    life: 1,
    pulse: Math.random() * Math.PI * 2,
  });
}

function updateGlyphs(dt) {
  for (let i = state.glyphs.length - 1; i >= 0; i -= 1) {
    const g = state.glyphs[i];
    g.pulse += dt * 4;
    g.life -= dt * 0.12;
    if (g.life <= 0) {
      state.glyphs.splice(i, 1);
      continue;
    }
    if (!state.life) continue;
    if (dist(g.x, g.y, state.life.x, state.life.y) > state.life.r * 0.85) continue;
    if (g.index !== state.glyphIndex) {
      burst(g.x, g.y, cssVar("--danger", "#e2556d"), 6, 2.5);
      state.glyphs.splice(i, 1);
      continue;
    }
    state.glyphs.splice(i, 1);
    state.glyphIndex += 1;
    state.stats.glyphsTaken += 1;
    state.hunger = clamp(state.hunger + 12, 0, state.maxHunger || 100);
    updateHungerUi();
    floatText(g.x, g.y - 10, g.ch, cssVar("--foam", "#f3eee8"), 20);
    sfxUiTap(state.glyphIndex);
    tipOnce("word", "БУКВЫ ЖИВЫЕ", 1500, {
      persist: true,
      first: "Живые буквы. Собери слово — бонус следов.",
    });
    if (state.glyphIndex >= SECRET_WORD.length) {
      state.wordDone = true;
      pulseUnlock(cssVar("--life", "#7affd4"), 0.18);
      goalChime();
      awardMarks(GLYPH_WORD_REWARD, {
        x: state.width * 0.5,
        y: state.height * 0.2,
        color: cssVar("--life", "#6fd9b0"),
        size: 17,
      });
      addScore(15, state.width * 0.5, state.height * 0.28, {
        combo: false,
        color: cssVar("--life", "#6fd9b0"),
      });
      state.safeUntil = performance.now() + 1800;
      burst(state.life.x, state.life.y, cssVar("--life", "#6fd9b0"), 28, 5.5);
    } else {
      burst(g.x, g.y, cssVar("--gold", "#ffe898"), 8, 3.2);
    }
  }
}

function attachSymbiote(x, y) {
  state.symbiote = { ang: Math.random() * Math.PI * 2, life: 1 };
  burst(x, y, "#9cf0d0", 16, 4.2);
  sfxSeedEat();
}

function consumeSymbioteShield(hunter) {
  if (!state.symbiote || !state.life) return false;
  state.symbiote = null;
  buzz([10, 18, 10]);
  sfxPulse();
  burst(state.life.x, state.life.y, "#9cf0d0", 20, 5);
  const ang = Math.atan2(hunter.y - state.life.y, hunter.x - state.life.x);
  hunter.vx += Math.cos(ang) * 8;
  hunter.vy += Math.sin(ang) * 8;
  hunter.warn = 1;
  state.safeUntil = performance.now() + 700;
  return true;
}

function updateWeirdSystems(dt) {
  state.inkDiveCd = Math.max(0, state.inkDiveCd - dt);
  if (inInkDive()) {
    state.inkDive -= dt;
    if (state.inkDive <= 0) exitInkDive();
    else if (Math.random() < dt * 1.4) spawnSpark({ edge: true, type: "deep" });
  }

  if (state.life && !inInkDive() && state.inkDiveCd <= 0 && state.elapsed > OPENING_SEC + 4) {
    const still = (state.life.speed || 0) < 5.5;
    state.stillAcc = still ? state.stillAcc + dt : Math.max(0, state.stillAcc - dt * 1.8);
    setDiveMeter(state.stillAcc / 1.05);
    if (state.stillAcc >= 1.05) enterInkDive();
  } else {
    state.stillAcc = 0;
    setDiveMeter(0);
  }

  if (state.life) {
    state.glyphSpawnAcc += dt * clamp((state.life.speed || 0) / 18, 0, 1);
    if (!state.wordDone && state.glyphSpawnAcc > 1.35 && state.glyphs.length < 2 && state.elapsed > OPENING_SEC + 8) {
      state.glyphSpawnAcc = 0;
      if (Math.random() < 0.55) spawnGlyph(state.life.x, state.life.y);
    }
  }

  if (state.symbiote) {
    state.symbiote.ang += dt * 3.4;
    state.symbiote.life = Math.min(1, state.symbiote.life + dt * 0.05);
  }

  updateGlyphs(dt);
}

function showToast(text, ms = 1450) {
  toastEl.textContent = text;
  toastEl.className = "toast show";
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toastEl.classList.remove("show"), ms);
}

function showCoach(text, ms = 1600, force = false) {
  if (!force && state.coachCount >= 3) return;
  if (!force) state.coachCount += 1;
  coachEl.textContent = text;
  coachEl.className = "coach show";
  clearTimeout(showCoach.timer);
  showCoach.timer = setTimeout(() => coachEl.classList.remove("show"), ms);
}

function tipOnce(key, text, ms = 1700, opts = {}) {
  if (state.tipFlags[key]) return;
  state.tipFlags[key] = true;
  if (opts.persist && state.meta) {
    const seen = state.meta.seenRunTips || [];
    if (seen.includes(key)) return;
    state.meta.seenRunTips = [...seen, key];
    saveMeta();
    showCoach(opts.first || text, opts.firstMs || Math.max(ms, 2400), true);
    return;
  }
  showCoach(text, ms, true);
}

function playerDifficulty() {
  const id = state.meta?.difficulty || "normal";
  return DIFFICULTIES.find((d) => d.id === id) || DIFFICULTIES[1];
}

function skillSoftScale() {
  const best = Math.max(state.best || 0, state.meta?.best || 0);
  if (best < 12) return 0.52;
  if (best < 30) return 0.68;
  if (best < 60) return 0.82;
  if (best < 100) return 0.92;
  return 1;
}

function difficultyScale() {
  return skillSoftScale() * playerDifficulty().speed;
}

/** Ease the mid-run spike across the longer wave ladder. */
function midgamePace() {
  const s = state.score || 0;
  let pace = 1;
  if (s < 40) pace = 1;
  else if (s < 90) pace = 0.86;
  else if (s < 160) pace = 0.78;
  else if (s < 250) pace = 0.82;
  else if (s < 360) pace = 0.88;
  else if (s < 480) pace = 0.92;
  else if (s < 620) pace = 0.95;
  else pace = 1;
  // Easy stays gentler late; hard keeps more pressure.
  if (playerDifficulty().id === "easy") pace *= 0.94;
  if (playerDifficulty().id === "hard") pace = Math.min(1, pace + 0.06);
  // Live balance tuner softens/hardens the mid-run spike from analytics.
  const tuned = Number(state.tuning?.hunterSpeed);
  if (Number.isFinite(tuned) && tuned > 0) {
    pace *= clamp(0.86 + (tuned - 1) * 0.45, 0.78, 1.06);
  }
  const hungerTune = Number(state.tuning?.hungerDrain);
  if (Number.isFinite(hungerTune) && hungerTune > 1.02) {
    pace = Math.min(1, pace + 0.03);
  }
  return pace;
}

const waveLabelEl = document.getElementById("wave-label");

function bossKindForStage(stage) {
  const cycle = Math.max(0, stage) % 3;
  if (cycle === 1) return "maw";
  if (cycle === 2) return "kraken";
  return "leviathan";
}

function waveForScore(score = state.score) {
  if (state.runMode === "boss") {
    const stage = Math.max(0, Math.floor(score / 90));
    const kind = bossKindForStage(stage);
    const title = kind === "kraken" ? "кракен" : kind === "maw" ? "пасть бездны" : "левиафан";
    return {
      id: `rush-${kind}-${stage}`,
      at: stage * 90,
      name: title,
      species: "boss",
      maxBonus: 0,
      speedMul: 0.9 + Math.min(0.35, stage * 0.035),
      intervalMul: 8,
      boss: true,
      kraken: kind === "kraken",
      maw: kind === "maw",
      index: stage,
      label: `БОСС ${stage + 1} · ${title.toUpperCase()}`,
    };
  }
  if (state.runMode === "endless" && score >= 900) {
    const stage = Math.floor((score - 900) / 120);
    const boss = stage > 0 && stage % 4 === 0;
    const kind = boss ? bossKindForStage(Math.floor(stage / 4)) : "";
    const title = kind === "kraken" ? "кракен" : kind === "maw" ? "пасть бездны" : "левиафан";
    return {
      id: `endless-${boss ? kind : "deep"}-${stage}`,
      at: 900 + stage * 120,
      name: boss ? title : `глубина ${stage + 1}`,
      species: boss ? "boss" : "mix",
      maxBonus: boss ? 0 : Math.min(7, 3 + Math.floor(stage / 2)),
      speedMul: Math.min(1.55, 1.14 + stage * 0.035),
      intervalMul: boss ? 8 : Math.max(0.5, 0.76 - stage * 0.018),
      boss,
      kraken: kind === "kraken",
      maw: kind === "maw",
      index: WAVES.length + stage,
      label: boss ? `БЕСКОНЕЧНЫЙ БОСС · ${title.toUpperCase()}` : `БЕСКОНЕЧНОСТЬ · ${stage + 1}`,
    };
  }
  let current = WAVES[0];
  for (const wave of WAVES) {
    if (score >= wave.at) current = wave;
  }
  return current;
}

function waveNumber(wave = waveForScore()) {
  return Math.max(1, Number.isFinite(wave.index) ? wave.index + 1 : WAVES.indexOf(wave) + 1);
}

function updateWaveUi(flash = false) {
  if (!waveLabelEl) return;
  if (state.event?.title) {
    setEventChip(`событие · ${state.event.title}`);
    return;
  }
  const wave = waveForScore();
  const number = waveNumber(wave);
  const text = `волна ${number} · ${wave.name}`;
  waveLabelEl.classList.remove("event");
  if (uiCache.wave !== text) {
    uiCache.wave = text;
    waveLabelEl.textContent = text;
  }
  if (flash) {
    waveLabelEl.classList.remove("flash");
    void waveLabelEl.offsetWidth;
    waveLabelEl.classList.add("flash");
  }
}

function rollHunterSpecies(waveSpecies) {
  if (waveSpecies === "mix") {
    return MIX_SPECIES[Math.floor(Math.random() * MIX_SPECIES.length)];
  }
  return waveSpecies || "fish";
}

function applySpeciesToHunter(hunter, species) {
  const kind = rollHunterSpecies(species);
  hunter.species = kind;
  hunter.boss = kind === "boss";
  hunter.dashCd = kind === "dart" || kind === "mirror" ? rand(0.4, 1.1) : kind === "shark" ? rand(2.2, 3.4) : kind === "ghost" ? rand(1.4, 2.4) : kind === "crab" ? rand(1.8, 2.8) : kind === "boss" ? rand(1.6, 2.4) : 0;
  hunter.dashT = 0;
  hunter.pulse = Math.random() * Math.PI * 2;
  hunter.weave = Math.random() * Math.PI * 2;
  hunter.phaseAlpha = 1;
  if (kind === "dart") hunter.r = rand(11, 14);
  else if (kind === "jelly") hunter.r = rand(18, 24);
  else if (kind === "eel") hunter.r = rand(13, 16);
  else if (kind === "shark") hunter.r = rand(16, 20);
  else if (kind === "ray") hunter.r = rand(18, 23);
  else if (kind === "ghost") hunter.r = rand(13, 17);
  else if (kind === "crab") hunter.r = rand(15, 19);
  else if (kind === "urchin") hunter.r = rand(16, 21);
  else if (kind === "mirror") hunter.r = rand(12, 15);
  else if (kind === "boss") {
    hunter.r = 40;
    hunter.bossPhase = "orbit";
    hunter.bossTimer = 2.1;
    hunter.anger = Math.max(hunter.anger || 1, 1.05);
  } else hunter.r = rand(15, 19);
  if (kind === "crab") hunter.dashCd = rand(1.8, 2.8);
  if (kind === "mirror") hunter.dashCd = rand(0.9, 1.6);
}

function spawnBoss() {
  const point = hunterSpawnPointAwayFromPlayer();
  const activeWave = waveForScore();
  const isKraken = !!activeWave.kraken || state.waveId === "kraken" || state.waveId.includes("kraken");
  const isMaw = !!activeWave.maw || state.waveId === "trench_maw" || state.waveId.includes("maw") || state.waveId.includes("trench");
  const boss = {
    x: point.x,
    y: point.y,
    vx: 0,
    vy: 0,
    r: isKraken ? 46 : isMaw ? 44 : 40,
    anger: isKraken ? 1.18 : isMaw ? 1.12 : 1.08,
    slow: false,
    warn: 1.2,
    phase: Math.random() * Math.PI * 2,
    nearMissed: false,
    grace: 1.8,
    orbit: Math.random() * Math.PI * 2,
    orbitR: isKraken ? 168 : isMaw ? 158 : 150,
    orbitSpeed: isKraken ? 1.05 : isMaw ? 0.72 : 0.85,
    species: "boss",
    boss: true,
    bossPhase: "orbit",
    bossTimer: isKraken ? 1.8 : isMaw ? 2.1 : 2.4,
    chargeTx: 0,
    chargeTy: 0,
    dashCd: 0,
    dashT: 0,
    pulse: Math.random() * Math.PI * 2,
    weave: Math.random() * Math.PI * 2,
    phaseAlpha: 1,
    kraken: isKraken,
    maw: isMaw,
    attackCount: 0,
    chainCharges: 0,
  };
  state.hunters.push(boss);
  if (isKraken) {
    tipOnce("boss-kraken", "КРАКЕН", 1900, {
      persist: true,
      first: "Кракен. Быстрее левиафана — держи дистанцию.",
    });
  } else if (isMaw) {
    tipOnce("boss-maw", "ПАСТЬ БЕЗДНЫ", 1900, {
      persist: true,
      first: "Пасть тянет к себе. Кружи шире и лови окна.",
    });
  } else {
    tipOnce("boss", "ЛЕВИАФАН", 1900, {
      persist: true,
      first: "Левиафан. Кружи вокруг и лови окна атаки.",
    });
  }
  playPredatorSfx("boss", "call");
  sfxWaveShift();
  buzz([16, 22, 16, 22, 16]);
  state.flash = Math.max(state.flash, 0.2);
  state.shake = Math.max(state.shake, 8);
}

function grantBossClear(id) {
  if (!state.running || !state.meta) return;
  const raw = String(id);
  const kind = raw.includes("kraken")
    ? "kraken"
    : raw.includes("maw") || raw.includes("trench")
      ? "maw"
      : raw.includes("leviathan")
        ? "leviathan"
        : "";
  if (!kind) return;
  const baseReward = kind === "kraken" ? 25 : kind === "maw" ? 18 : 12;
  const reward = Math.max(1, Math.round(baseReward * (state.progressionEffects?.waveRewardMultiplier || 1)));
  state.meta.bossClears = state.meta.bossClears || { leviathan: 0, kraken: 0, maw: 0 };
  state.meta.bossClears[kind] = (state.meta.bossClears[kind] || 0) + 1;
  state.stats.bossClearsThisRun = (state.stats.bossClearsThisRun || 0) + 1;
  awardMarks(reward, {
    x: state.width * 0.5,
    y: state.height * 0.28,
    color: cssVar("--gold", "#ffe898"),
    size: 18,
  });
  const label = kind === "kraken" ? "КРАКЕН" : kind === "maw" ? "ПАСТЬ" : "ЛЕВИАФАН";
  showCombo(`${label} ПРОЙДЕН · +${reward}`, true);
  goalChime();
  saveMeta();
}

function isBossWaveId(id) {
  const text = String(id || "");
  return text.includes("leviathan") || text.includes("kraken") || text.includes("maw") || text.includes("trench");
}

function syncWave(announce = true) {
  const wave = waveForScore();
  if (wave.id === state.waveId) {
    return wave;
  }
  const prevId = state.waveId;
  state.waveId = wave.id;
  state.waveIndex = Number.isFinite(wave.index) ? wave.index : WAVES.indexOf(wave);
  if (wave.boss) {
    if (isBossWaveId(prevId)) grantBossClear(prevId);
    // Boss arena: clear the field once, then only the arena boss.
    state.hunters = state.hunters.filter((h) => h.shadow);
    spawnBoss();
  } else {
    // Soft handoff: keep positions, swap species gradually, no mass teleport.
    for (let i = state.hunters.length - 1; i >= 0; i -= 1) {
      const hunter = state.hunters[i];
      if (hunter.shadow || hunter.demo) continue;
      if (hunter.boss || hunter.species === "boss") {
        state.hunters.splice(i, 1);
        continue;
      }
      // Stagger conversion so the field does not flip in one frame.
      if (Math.random() < 0.55) {
        applySpeciesToHunter(hunter, wave.species);
        hunter.warn = Math.max(hunter.warn, 0.7);
        hunter.grace = Math.max(hunter.grace || 0, 1.1);
        hunter.vx *= 0.4;
        hunter.vy *= 0.4;
      } else {
        // Leave old species; next spawn / later sync will catch up.
        hunter.pendingSpecies = wave.species;
        hunter.grace = Math.max(hunter.grace || 0, 0.7);
      }
    }
    // If we just left the boss and the field is empty, seed one new hunter.
    if (isBossWaveId(prevId) && !state.hunters.some((h) => !h.shadow)) {
      grantBossClear(prevId);
      spawnHunter(true);
    }
  }
  updateWaveUi(true);
  if (announce && state.running && !inOpening()) {
    tipOnce(`wave-${wave.id}`, wave.label, 1900);
    showCombo(wave.label, true);
    buzz([12, 18, 12]);
    sfxWaveShift();
    state.flash = Math.max(state.flash, 0.12);
  }
  return wave;
}

function floatText(x, y, text, color = "#f2c15a", size = 13) {
  if (state.floaters.length >= MAX_FLOATERS) {
    state.floaters[0] = state.floaters[state.floaters.length - 1];
    state.floaters.pop();
  }
  state.floaters.push({ x, y, text, color, size, life: 1, vy: -0.45 });
}

function pushParticle(p) {
  if (state.particles.length >= MAX_PARTICLES) return false;
  state.particles.push({
    x: p.x,
    y: p.y,
    vx: p.vx || 0,
    vy: p.vy || 0,
    life: p.life ?? 1,
    decay: p.decay ?? rand(0.012, 0.028),
    size: p.size ?? rand(1.4, 3.8),
    color: p.color,
    kind: p.kind || "dot",
    rot: p.rot || 0,
    spin: p.spin || 0,
    grav: p.grav ?? 0.03,
  });
  return true;
}

function burst(x, y, color, count = 12, speed = 3.5) {
  const qualityScale = window.OttiskPerf?.TIERS?.[state.qualityTier]?.particleScale || 1;
  const motionCount = Math.ceil((state.meta?.reduceMotion ? count * 0.35 : count) * qualityScale);
  const n = Math.min(motionCount, particleRoom());
  if (n <= 0) return;
  const accent = cssVar("--accent-b", cssVar("--gold", "#ffd27a"));
  for (let i = 0; i < n; i += 1) {
    const a = Math.random() * Math.PI * 2;
    const s = rand(0.7, speed);
    pushParticle({
      x,
      y,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s,
      life: 1,
      decay: rand(0.012, 0.028),
      size: rand(1.4, 3.8),
      color: Math.random() < 0.35 ? accent : color,
      kind: "dot",
    });
  }
}

function pickBlastStyle() {
  if (BLAST_STYLES.length <= 1) return BLAST_STYLES[0];
  let idx = Math.floor(Math.random() * BLAST_STYLES.length);
  if (idx === lastBlastStyle) idx = (idx + 1 + Math.floor(Math.random() * (BLAST_STYLES.length - 1))) % BLAST_STYLES.length;
  lastBlastStyle = idx;
  return BLAST_STYLES[idx];
}

function eatSparkBlast(spark, opening = false) {
  const style = pickBlastStyle();
  const power =
    (spark.type === "super" ? 1.85 : spark.type === "rare" || spark.comet ? 1.4 : spark.type === "deep" ? 1.25 : 1) *
    (opening ? 1.25 : 1);
  const color = spark.color;
  const accent = mixColor(color, "#ffffff", 0.35);
  const gold = cssVar("--gold", "#ffe898");
  const x = spark.x;
  const y = spark.y;
  state.shake = Math.max(state.shake, (7 + Math.random() * 9) * power);
  state.flash = Math.max(state.flash, (0.1 + Math.random() * 0.08) * power);

  if (style === "spray") {
    for (let i = 0; i < Math.round(16 * power); i += 1) {
      const a = Math.random() * Math.PI * 2;
      const s = rand(1.2, 4.8) * power;
      pushParticle({
        x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
        size: rand(1.6, 4.2), color: Math.random() < 0.4 ? accent : color, kind: "dot",
      });
    }
  } else if (style === "ring") {
    const n = Math.round(22 * power);
    for (let i = 0; i < n; i += 1) {
      const a = (i / n) * Math.PI * 2;
      const s = (2.6 + Math.random() * 0.6) * power;
      pushParticle({
        x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
        size: rand(1.8, 3.2), color: i % 2 ? accent : color, kind: "ring", grav: 0.01, decay: 0.018,
      });
    }
  } else if (style === "nova") {
    for (let i = 0; i < Math.round(10 * power); i += 1) {
      const a = (i / Math.round(10 * power)) * Math.PI * 2;
      const s = (4.2 + Math.random()) * power;
      pushParticle({
        x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
        size: rand(2.2, 5), color: gold, kind: "streak", rot: a, spin: 0, grav: 0.005, decay: 0.02,
      });
    }
    burst(x, y, color, Math.round(12 * power), 2.4 * power);
  } else if (style === "shards") {
    for (let i = 0; i < Math.round(14 * power); i += 1) {
      const a = Math.random() * Math.PI * 2;
      const s = rand(1.8, 5.2) * power;
      pushParticle({
        x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
        size: rand(2.4, 5.5), color: Math.random() < 0.5 ? accent : color,
        kind: "shard", rot: a, spin: rand(-0.35, 0.35), grav: 0.04,
      });
    }
  } else if (style === "spiral") {
    for (let i = 0; i < Math.round(20 * power); i += 1) {
      const a = i * 0.55;
      const s = (1.2 + i * 0.12) * power * 0.35;
      pushParticle({
        x, y, vx: Math.cos(a) * s * 3.2, vy: Math.sin(a) * s * 3.2,
        size: rand(1.5, 3.6), color: i % 3 ? color : accent, kind: "dot", grav: 0.015, decay: 0.016,
      });
    }
  } else if (style === "cross") {
    for (let arm = 0; arm < 4; arm += 1) {
      const base = (arm * Math.PI) / 2 + Math.random() * 0.2;
      for (let i = 0; i < Math.round(5 * power); i += 1) {
        const a = base + (Math.random() - 0.5) * 0.28;
        const s = rand(2, 5.5) * power;
        pushParticle({
          x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
          size: rand(1.8, 4), color: arm % 2 ? gold : color, kind: "streak", rot: a, grav: 0.02,
        });
      }
    }
  } else if (style === "rain") {
    for (let i = 0; i < Math.round(18 * power); i += 1) {
      pushParticle({
        x: x + rand(-18, 18) * power,
        y: y + rand(-8, 8),
        vx: rand(-0.6, 0.6),
        vy: rand(-4.8, -2.2) * power,
        size: rand(1.4, 3.4),
        color: Math.random() < 0.35 ? accent : color,
        kind: "dot",
        grav: 0.12,
        decay: 0.014,
      });
    }
  } else if (style === "bloom") {
    for (let i = 0; i < Math.round(12 * power); i += 1) {
      const a = (i / Math.round(12 * power)) * Math.PI * 2 + rand(-0.1, 0.1);
      const s = rand(0.8, 2.2) * power;
      pushParticle({
        x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
        size: rand(3.5, 7), color: mixColor(color, "#ffffff", 0.2),
        kind: "bloom", rot: a, spin: rand(-0.08, 0.08), grav: 0.008, decay: 0.011, life: 1.15,
      });
    }
  } else if (style === "scatter") {
    for (let c = 0; c < 3; c += 1) {
      const cx = x + rand(-22, 22);
      const cy = y + rand(-22, 22);
      for (let i = 0; i < Math.round(6 * power); i += 1) {
        const a = Math.random() * Math.PI * 2;
        const s = rand(0.8, 3.2) * power;
        pushParticle({
          x: cx, y: cy, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
          size: rand(1.5, 3.8), color: c === 1 ? gold : color, kind: "dot",
        });
      }
    }
  } else if (style === "pulse") {
    for (let ring = 0; ring < 2; ring += 1) {
      const n = Math.round(16 * power);
      const speed = (1.6 + ring * 1.8) * power;
      for (let i = 0; i < n; i += 1) {
        const a = (i / n) * Math.PI * 2;
        pushParticle({
          x, y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed,
          size: rand(1.6, 3.2), color: ring ? accent : color, kind: "ring", grav: 0, decay: 0.02,
        });
      }
    }
  } else if (style === "streaks") {
    for (let i = 0; i < Math.round(16 * power); i += 1) {
      const a = Math.random() * Math.PI * 2;
      const s = rand(2.5, 6) * power;
      pushParticle({
        x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
        size: rand(2, 4.5), color: Math.random() < 0.4 ? gold : color,
        kind: "streak", rot: a, grav: 0.01, decay: 0.022,
      });
    }
  } else {
    // firework: tight core then secondary scatter
    burst(x, y, color, Math.round(10 * power), 2.2 * power);
    for (let i = 0; i < Math.round(14 * power); i += 1) {
      const a = Math.random() * Math.PI * 2;
      const s = rand(2.8, 5.8) * power;
      pushParticle({
        x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
        size: rand(1.8, 4.2), color: i % 2 ? gold : accent,
        kind: "shard", rot: a, spin: rand(-0.4, 0.4), grav: 0.05, decay: 0.015,
      });
    }
  }

  if (spark.type === "super") {
    state.shake = Math.max(state.shake, 26);
    state.flash = Math.max(state.flash, 1.25);
    floatText(x, y - 26, "ПУЛЬСАР", "#ff2f45", 22);
    buzz([14, 20, 14, 28]);
  }
}

function localDayKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function msUntilNextLocalDay(now = Date.now()) {
  const d = new Date(now);
  const next = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1, 0, 0, 0, 0);
  return Math.max(0, next.getTime() - now);
}

function msUntilNextWeek(now = Date.now()) {
  const d = new Date(now);
  const day = d.getDay(); // 0 Sun
  const daysToMon = day === 0 ? 1 : 8 - day;
  const next = new Date(d.getFullYear(), d.getMonth(), d.getDate() + daysToMon, 0, 0, 0, 0);
  return Math.max(0, next.getTime() - now);
}

function formatWait(ms) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h}ч ${String(m).padStart(2, "0")}м`;
  if (m > 0) return `${m}м ${String(s).padStart(2, "0")}с`;
  return `${s}с`;
}

function parseDayKey(dayKey) {
  if (!dayKey || !/^\d{4}-\d{2}-\d{2}$/.test(dayKey)) return null;
  const [year, month, day] = dayKey.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function dayDiff(fromKey, toKey) {
  const from = parseDayKey(fromKey);
  const to = parseDayKey(toKey);
  if (!from || !to) return 0;
  const diff = to.getTime() - from.getTime();
  return Math.round(diff / 86400000);
}

function ownedSkinIds(meta = state.meta) {
  if (!meta) return ["ink"];
  const ids = new Set(["ink", ...(meta.unlockedSkins || []), ...(meta.premiumUnlocked || [])]);
  return [...ids];
}

function isSkinOwned(id, meta = state.meta) {
  return ownedSkinIds(meta).includes(id);
}

function currentDailyDef() {
  return DAILY_DEFS.find((daily) => daily.id === state.meta?.dailyId) || DAILY_DEFS[0];
}

function weeklyIdForKey(key = weekKey()) {
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  return WEEKLY_DEFS[hash % WEEKLY_DEFS.length].id;
}

function currentWeeklyDef() {
  const id = state.meta?.weekQuestId || weeklyIdForKey();
  return WEEKLY_DEFS.find((quest) => quest.id === id) || WEEKLY_DEFS[0];
}

function pickDailyId(prevId = "") {
  const pool = DAILY_DEFS.filter((daily) => daily.id !== prevId);
  const choices = pool.length ? pool : DAILY_DEFS;
  return choices[Math.floor(Math.random() * choices.length)].id;
}

function weekKey(date = new Date()) {
  const tmp = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  tmp.setDate(tmp.getDate() + 3 - ((tmp.getDay() + 6) % 7));
  const week1 = new Date(tmp.getFullYear(), 0, 4);
  const week = 1 + Math.round(((tmp - week1) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
  return `${tmp.getFullYear()}-W${String(week).padStart(2, "0")}`;
}

function normalizeProgression(value) {
  const api = window.OttiskProgression;
  if (!api) return value && typeof value === "object" ? value : null;
  try {
    if (api.validateState(value).valid) return api.deserialize(value);
  } catch (_) {}
  return api.createState();
}

function loadMeta() {
  let raw = null;
  try {
    raw = JSON.parse(localStorage.getItem(META_KEY) || "null");
  } catch (_) {
    raw = null;
  }
  const oldBest = Number(localStorage.getItem(BEST_KEY) || 0);
  const best = Math.max(0, Number(raw?.best || 0), oldBest);
  const seasonalUnlocks = Array.isArray(raw?.seasonalUnlocks) ? raw.seasonalUnlocks.filter((id) => typeof id === "string") : [];
  const unlockedSkins = SKINS.filter((skin) => !skin.premium && !skin.seasonal && best >= skin.at).map((skin) => skin.id);
  const premiumUnlocked = SKINS.filter((skin) => skin.premium && Array.isArray(raw?.premiumUnlocked) && raw.premiumUnlocked.includes(skin.id))
    .map((skin) => skin.id);
  for (const id of seasonalUnlocks) {
    if (SKINS.some((s) => s.id === id && s.seasonal) && !unlockedSkins.includes(id)) unlockedSkins.push(id);
  }
  const streak = Math.max(0, Number(raw?.streak || 0));
  const marks = Math.max(0, Number(raw?.marks || 0));
  const activeId = typeof raw?.activeSkin === "string" ? raw.activeSkin : "";
  const activeSkin = isSkinOwned(activeId, { unlockedSkins, premiumUnlocked })
    ? activeId
    : ownedSkinIds({ unlockedSkins, premiumUnlocked }).slice(-1)[0] || "ink";
  const currentWeek = weekKey();
  const savedWeek = typeof raw?.weekId === "string" ? raw.weekId : "";
  const weekFresh = savedWeek !== currentWeek;
  return {
    best,
    unlockedSkins,
    activeSkin,
    marks,
    streak,
    lastPlayDay: typeof raw?.lastPlayDay === "string" ? raw.lastPlayDay : "",
    dailyDay: typeof raw?.dailyDay === "string" ? raw.dailyDay : "",
    dailyId: typeof raw?.dailyId === "string" ? raw.dailyId : "",
    dailyDone: !!raw?.dailyDone,
    premiumUnlocked,
    sound: raw?.sound !== false,
    haptics: raw?.haptics !== false,
    reduceMotion: typeof raw?.reduceMotion === "boolean"
      ? raw.reduceMotion
      : !!window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches,
    highContrast: !!raw?.highContrast,
    largeUi: !!raw?.largeUi,
    oneHand: ["off", "left", "right"].includes(raw?.oneHand) ? raw.oneHand : "off",
    colorblind: ["off", "protanopia", "deuteranopia", "tritanopia"].includes(raw?.colorblind) ? raw.colorblind : "off",
    progression: normalizeProgression(raw?.progression),
    seenChapters: Array.isArray(raw?.seenChapters) ? raw.seenChapters.filter((id) => typeof id === "string") : [],
    // Returning players skip onboarding even if the flag was added later.
    onboarded: !!raw?.onboarded || best > 0 || marks > 0 || Math.max(0, Number(raw?.runs || 0)) > 0,
    starterGift: !!raw?.starterGift || best > 0 || marks > 0,
    ratePrompted: !!raw?.ratePrompted,
    rateAutoAsked: !!raw?.rateAutoAsked,
    runs: Math.max(0, Number(raw?.runs || 0)),
    weekId: currentWeek,
    weekBest: weekFresh ? 0 : Math.max(0, Number(raw?.weekBest || 0)),
    weekQuestId: weekFresh
      ? weeklyIdForKey(currentWeek)
      : (WEEKLY_DEFS.some((quest) => quest.id === raw?.weekQuestId) ? raw.weekQuestId : weeklyIdForKey(currentWeek)),
    weekProgress: weekFresh ? 0 : Math.max(0, Number(raw?.weekProgress || raw?.weekBest || 0)),
    weekRewardTaken: weekFresh ? false : !!raw?.weekRewardTaken,
    iapMarksBought: Math.max(0, Number(raw?.iapMarksBought || 0)),
    donateCount: Math.max(0, Number(raw?.donateCount || 0)),
    donateMarks: Math.max(0, Number(raw?.donateMarks || 0)),
    seenAbilityTips: Array.isArray(raw?.seenAbilityTips)
      ? raw.seenAbilityTips.filter((id) => typeof id === "string")
      : [],
    seenRunTips: Array.isArray(raw?.seenRunTips)
      ? raw.seenRunTips.filter((id) => typeof id === "string")
      : [],
    activeHero: HEROES.some((h) => h.id === raw?.activeHero) ? raw.activeHero : "octopus",
    customHero: typeof raw?.customHero === "string" && raw.customHero.startsWith("data:image") ? raw.customHero : "",
    unlockedHeroes: Array.isArray(raw?.unlockedHeroes)
      ? raw.unlockedHeroes.filter((id) => HEROES.some((h) => h.id === id && h.premium && !h.iap))
      : [],
    iapHeroes: Array.isArray(raw?.iapHeroes)
      ? raw.iapHeroes.filter((id) => HEROES.some((h) => h.id === id && h.iap))
      : [],
    controlMode: CONTROL_MODES.some((m) => m.id === raw?.controlMode) ? raw.controlMode : "hand",
    unlockedTrails: Array.isArray(raw?.unlockedTrails)
      ? ["plain", ...raw.unlockedTrails.filter((id) => TRAILS.some((t) => t.id === id && t.cost > 0))]
      : ["plain"],
    activeTrail: (() => {
      const id = TRAILS.some((t) => t.id === raw?.activeTrail) ? raw.activeTrail : "plain";
      const unlocked = Array.isArray(raw?.unlockedTrails) ? raw.unlockedTrails : [];
      if (id === "plain" || unlocked.includes(id)) return id;
      return "plain";
    })(),
    unlockedFrames: Array.isArray(raw?.unlockedFrames)
      ? ["none", ...raw.unlockedFrames.filter((id) => FRAMES.some((f) => f.id === id && f.cost > 0))]
      : ["none"],
    activeFrame: (() => {
      const id = FRAMES.some((f) => f.id === raw?.activeFrame) ? raw.activeFrame : "none";
      const unlocked = Array.isArray(raw?.unlockedFrames) ? raw.unlockedFrames : [];
      if (id === "none" || unlocked.includes(id)) return id;
      return "none";
    })(),
    difficulty: DIFFICULTIES.some((d) => d.id === raw?.difficulty) ? raw.difficulty : "normal",
    runMode: ["normal", "endless", "boss", "calm"].includes(raw?.runMode) ? raw.runMode : "normal",
    qualityMode: ["auto", "high", "medium", "low"].includes(raw?.qualityMode) ? raw.qualityMode : "auto",
    cloudName: typeof raw?.cloudName === "string" ? raw.cloudName.slice(0, 24) : "",
    hourlyGiftAt: Math.max(0, Number(raw?.hourlyGiftAt || 0)),
    dailyGiftDay: typeof raw?.dailyGiftDay === "string" ? raw.dailyGiftDay : "",
    weeklyGiftWeek: typeof raw?.weeklyGiftWeek === "string" ? raw.weeklyGiftWeek : "",
    streakGiftDay: typeof raw?.streakGiftDay === "string" ? raw.streakGiftDay : "",
    returnGiftAt: typeof raw?.returnGiftAt === "string" ? raw.returnGiftAt : "",
    returnAvailableDay: typeof raw?.returnAvailableDay === "string" ? raw.returnAvailableDay : "",
    lastVisitAt: Math.max(0, Number(raw?.lastVisitAt || 0)),
    starterPackBought: !!raw?.starterPackBought,
    trophies: Array.isArray(raw?.trophies) ? raw.trophies.filter((id) => typeof id === "string") : [],
    trophyWord: !!raw?.trophyWord,
    trophyCoop: !!raw?.trophyCoop,
    trophyDaily: !!raw?.trophyDaily,
    trophyGhost: !!raw?.trophyGhost,
    trophyEndless: !!raw?.trophyEndless,
    trophyBossRush: !!raw?.trophyBossRush,
    trophyCalm: !!raw?.trophyCalm,
    dailyBest: Math.max(0, Number(raw?.dailyBest || 0)),
    dailyBestDay: typeof raw?.dailyBestDay === "string" ? raw.dailyBestDay : "",
    ghostPath: Array.isArray(raw?.ghostPath)
      ? raw.ghostPath.filter((p) => p && typeof p.x === "number" && typeof p.y === "number").slice(0, GHOST_MAX_POINTS)
      : [],
    ghostScore: Math.max(0, Number(raw?.ghostScore || 0)),
    lastReplay: raw?.lastReplay && Array.isArray(raw.lastReplay.samples)
      ? {
          score: Math.max(0, Number(raw.lastReplay.score || 0)),
          durationMs: Math.max(250, Number(raw.lastReplay.durationMs || 250)),
          samples: raw.lastReplay.samples.filter((sample) => Array.isArray(sample) && sample.length === 3).slice(0, 96),
        }
      : null,
    seasonalUnlocks: Array.isArray(raw?.seasonalUnlocks)
      ? raw.seasonalUnlocks.filter((id) => typeof id === "string")
      : [],
    seenMechanicCards: Array.isArray(raw?.seenMechanicCards)
      ? raw.seenMechanicCards.filter((id) => typeof id === "string")
      : [],
    coopEnabled: !!raw?.coopEnabled,
    dailyModeEnabled: !!raw?.dailyModeEnabled,
    ghostRaceEnabled: raw?.ghostRaceEnabled !== false,
    bossClears: {
      leviathan: Math.max(0, Number(raw?.bossClears?.leviathan || 0)),
      kraken: Math.max(0, Number(raw?.bossClears?.kraken || 0)),
      maw: Math.max(0, Number(raw?.bossClears?.maw || 0)),
    },
  };
}

function saveMeta() {
  if (!state.meta) return;
  localStorage.setItem(META_KEY, JSON.stringify(state.meta));
  localStorage.setItem(BEST_KEY, String(state.meta.best));
  try {
    window.OttiskAccount?.persistMeta?.(state.meta);
  } catch (_) {}
  if (window.OttiskCloud?.isLinked?.()) {
    clearTimeout(cloudSaveTimer);
    cloudSaveTimer = setTimeout(() => {
      window.OttiskCloud?.pushSave?.(state.meta).catch(() => {});
    }, 2500);
  }
}

function skinById(id) {
  return SKINS.find((skin) => skin.id === id) || SKINS[0];
}

function activeSkin() {
  return skinById(state.meta?.activeSkin || "ink");
}

function activeHeroId() {
  const id = state.meta?.activeHero || "octopus";
  if (id === "custom" && !state.meta?.customHero) return "octopus";
  if (!HEROES.some((h) => h.id === id)) return "octopus";
  if (!isHeroOwned(id)) return "octopus";
  return id;
}

function activeHero() {
  return HEROES.find((h) => h.id === activeHeroId()) || HEROES[0];
}

function isHeroOwned(id, meta = state.meta) {
  const hero = HEROES.find((h) => h.id === id);
  if (!hero) return false;
  if (hero.iap) return (meta?.iapHeroes || []).includes(id);
  if (!hero.premium) return true;
  return (meta?.unlockedHeroes || []).includes(id);
}

function nextLockedPremiumHero() {
  return HEROES.find((h) => h.premium && !h.iap && !isHeroOwned(h.id)) || null;
}

function nextScoreSkinGoal() {
  return SKINS.find((skin) => !skin.premium && !isSkinOwned(skin.id)) || null;
}

function controlMode() {
  return state.meta?.controlMode === "joystick" ? "joystick" : "hand";
}

function setControlMode(id) {
  if (!state.meta) return;
  if (!CONTROL_MODES.some((m) => m.id === id)) return;
  state.meta.controlMode = id;
  saveMeta();
  renderControlPicker();
  updateControlCopy();
  showToast(id === "joystick" ? "джойстик" : "управление рукой");
}

function updateControlCopy() {
  const title = document.querySelector(".menu-title");
  const lead = document.querySelector(".menu-lead");
  const joy = controlMode() === "joystick";
  if (title) title.textContent = tr(joy ? "joystick_title" : "hold_title", joy ? "Веди джойстиком" : "Удерживай палец");
  if (lead) lead.textContent = tr(joy ? "joystick_lead" : "hold_lead", joy ? "Держи стик — герой живёт, пока касание активно" : "Существо живёт только в касании");
}

function renderControlPicker() {
  const list = document.getElementById("control-list");
  if (!list || !state.meta) return;
  list.textContent = "";
  const current = controlMode();
  for (const mode of CONTROL_MODES) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `control-chip${mode.id === current ? " on" : ""}`;
    btn.textContent = mode.name;
    btn.title = mode.blurb;
    btn.setAttribute("aria-pressed", mode.id === current ? "true" : "false");
    btn.addEventListener("click", () => setControlMode(mode.id));
    list.appendChild(btn);
  }
}

function playerIsSafe() {
  return performance.now() < (state.safeUntil || 0);
}

function heroCanDash() {
  const id = activeHeroId();
  return id === "octopus" || id === "custom" || id === "manta" || id === "dolphin" || id === "seal";
}

function heroHasAura() {
  const id = activeHeroId();
  return id === "jellyfish" || id === "angler" || id === "lantern";
}

function heroHungerMul() {
  const id = activeHeroId();
  if (id === "turtle") return 0.78;
  if (id === "starfish") return 0.72;
  if (id === "seal") return 0.92;
  return 1;
}

function heroHasShield() {
  const id = activeHeroId();
  return id === "crab" || id === "nautilus";
}

function heroAuraSlowMul(hunter) {
  if (!heroHasAura() || !state.life || !hunter) return 1;
  const id = activeHeroId();
  const angler = id === "angler";
  const lantern = id === "lantern";
  const pulse = 0.5 + 0.5 * Math.sin(state.time * 3.2);
  const reach = (angler ? 168 : lantern ? 140 : 118) + Math.sin(state.time * 2.4) * 6;
  const d = dist(hunter.x, hunter.y, state.life.x, state.life.y);
  if (d > reach) return 1;
  if (angler) {
    const deep = 0.22 + (1 - pulse) * 0.08;
    return deep + 0.2 * clamp(d / reach, 0, 1);
  }
  if (lantern) {
    return 0.62 + 0.22 * clamp(d / reach, 0, 1);
  }
  return 0.52 + 0.28 * clamp(d / reach, 0, 1);
}

function tryHeroDash(dx, dy, moved) {
  if (!heroCanDash() || !state.life || state.heroDashCd > 0 || inOpening()) return false;
  if ((state.holdLifeTime || 0) < 0.35) return false;
  if (moved < 26) return false;
  const len = Math.hypot(dx, dy) || 1;
  const nx = dx / len;
  const ny = dy / len;
  const manta = activeHeroId() === "manta";
  const dolphin = activeHeroId() === "dolphin";
  const seal = activeHeroId() === "seal";
  const fromX = state.life.x;
  const fromY = state.life.y;
  const boost = manta ? 108 : dolphin ? 74 : seal ? 68 : 56;
  state.life.x += nx * boost;
  state.life.y += ny * boost;
  clampLife();
  state.life.aim = Math.atan2(ny, nx);
  state.heroDashCd = manta ? 1.35 : dolphin ? 1.55 : seal ? 1.7 : 2.6;
  state.safeUntil = performance.now() + (manta ? 720 : dolphin ? 440 : seal ? 560 : 320);
  if (manta) {
    state.timeScale = 0.5;
    state.slowmoUntil = performance.now() + 320;
    state.mantaWake = {
      x: (fromX + state.life.x) * 0.5,
      y: (fromY + state.life.y) * 0.5,
      nx,
      ny,
      t: 1.05,
      halfW: 42,
      len: boost * 0.92,
    };
  }
  const pushR = manta ? 168 : 96;
  let sliced = 0;
  let nearMiss = false;
  for (let hi = state.hunters.length - 1; hi >= 0; hi -= 1) {
    const hunter = state.hunters[hi];
    if (hunter.boss) continue;
    const d = dist(hunter.x, hunter.y, state.life.x, state.life.y);
    // path proximity for manta slice
    let pathD = d;
    if (manta) {
      const vx = hunter.x - fromX;
      const vy = hunter.y - fromY;
      const proj = clamp((vx * nx + vy * ny) / boost, 0, 1);
      const px = fromX + nx * boost * proj;
      const py = fromY + ny * boost * proj;
      pathD = dist(hunter.x, hunter.y, px, py);
      if (pathD < 34) nearMiss = true;
    }
    if (manta && !hunter.shadow && hunter.r < 24 && pathD < 28) {
      burst(hunter.x, hunter.y, cssVar("--accent-b", "#7affd4"), 14, 4.5);
      state.hunters.splice(hi, 1);
      sliced += 1;
      addScore(6, hunter.x, hunter.y - 16, { color: cssVar("--accent-b", "#7affd4") });
      continue;
    }
    if (d > pushR || d < 0.1) continue;
    const push = ((pushR - d) / pushR) * (manta ? 16 : 7.5);
    hunter.vx += ((hunter.x - state.life.x) / d) * push;
    hunter.vy += ((hunter.y - state.life.y) / d) * push;
    hunter.warn = Math.max(hunter.warn, 0.7);
    hunter.grace = Math.max(hunter.grace || 0, manta ? 0.65 : 0.35);
    if (manta && hunter.r < 22 && d < 80) {
      hunter.x += ((hunter.x - state.life.x) / d) * 48;
      hunter.y += ((hunter.y - state.life.y) / d) * 48;
    }
  }
  if (manta && nearMiss) state.heroDashCd = Math.max(0.35, state.heroDashCd - 0.55);
  for (let i = 0; i < (manta ? 28 : 10); i += 1) {
    pushParticle({
      x: state.life.x - nx * i * 4,
      y: state.life.y - ny * i * 4,
      vx: -nx * rand(1.2, 3.2) + (manta ? -ny * rand(-1.2, 1.2) : 0),
      vy: -ny * rand(1.2, 3.2) + (manta ? nx * rand(-1.2, 1.2) : 0),
      size: rand(2, 5),
      color: manta ? cssVar("--accent-b", "#7affd4") : cssVar("--life", "#7affd4"),
      kind: "streak",
      decay: rand(0.04, 0.07),
    });
  }
  floatText(state.life.x, state.life.y - 22, manta ? (sliced ? "шторм" : "крыло") : "рывок", cssVar("--life", "#7affd4"), 15);
  tipOnce("ability", activeHero().tip || "РЫВОК", 1400);
  if (manta) sfxHeroAbility("manta");
  else sfxPulse();
  buzz([8, 14, 8]);
  state.flash = Math.max(state.flash, manta ? 0.18 : 0.1);
  return true;
}

function tryCrabShield(hunter) {
  if (!heroHasShield() || !state.life) return false;
  const nautilus = activeHeroId() === "nautilus";
  if (nautilus) {
    if ((state.shellCharges || 0) <= 0) return false;
    state.shellCharges -= 1;
    if (state.shellCharges <= 0) state.heroShieldCd = 7.2;
  } else {
    if (!state.heroShield) return false;
    state.heroShield = false;
  }
  buzz([12, 20, 12]);
  sfxPulse();
  burst(state.life.x, state.life.y, cssVar("--accent-a", "#ff9a62"), nautilus ? 36 : 22, nautilus ? 6.8 : 5.2);
  const label = nautilus
    ? (state.shellCharges > 0 ? `раковина · ${state.shellCharges}` : "раковины кончились")
    : "щит";
  floatText(state.life.x, state.life.y - 20, label, cssVar("--accent-a", "#ff9a62"), 16);
  tipOnce("ability", nautilus ? "ДВОЙНАЯ РАКОВИНА" : "ЩИТ СЛОМАН", 1400);
  if (hunter) {
    const ang = Math.atan2(hunter.y - state.life.y, hunter.x - state.life.x) || 0;
    hunter.vx += Math.cos(ang) * (nautilus ? 16 : 9);
    hunter.vy += Math.sin(ang) * (nautilus ? 16 : 9);
    hunter.warn = 1;
    hunter.grace = Math.max(hunter.grace || 0, nautilus ? 1.0 : 0.55);
    if (!hunter.boss) placeHunterOnEdge(hunter);
  }
  state.safeUntil = performance.now() + (nautilus ? 1800 : 900);
  return true;
}

function tryShipHull(hunter) {
  if (activeHeroId() !== "sub" || !state.life) return false;
  if ((state.shipLives || 0) <= 0) return false;
  state.shipLives -= 1;
  if (state.shipLives <= 0) return false;
  buzz([16, 24, 16]);
  sfxPulse();
  burst(state.life.x, state.life.y, cssVar("--gold", "#ffe898"), 26, 5.6);
  floatText(state.life.x, state.life.y - 26, `жизнь · ${state.shipLives}`, cssVar("--gold", "#ffe898"), 16);
  tipOnce("ability", "КОРПУС ДЕРЖИТ", 1400);
  if (hunter) {
    const ang = Math.atan2(hunter.y - state.life.y, hunter.x - state.life.x) || 0;
    hunter.vx += Math.cos(ang) * 14;
    hunter.vy += Math.sin(ang) * 14;
    hunter.warn = 1;
    hunter.grace = Math.max(hunter.grace || 0, 0.8);
    if (!hunter.boss && hunter.r < 30) placeHunterOnEdge(hunter);
  }
  state.safeUntil = performance.now() + 1600;
  state.flash = Math.max(state.flash, 0.18);
  state.shake = Math.max(state.shake, 7);
  return true;
}

function fireShipCannons(dt) {
  if (activeHeroId() !== "sub" || !state.life || !state.touchActive || state.paused) return;
  state.cannonCd = Math.max(0, (state.cannonCd || 0) - dt);
  if (state.cannonCd > 0) return;
  let best = null;
  let bestD = Infinity;
  for (const h of state.hunters) {
    if (h.shadow) continue;
    const d = dist(h.x, h.y, state.life.x, state.life.y);
    if (d < bestD) {
      bestD = d;
      best = h;
    }
  }
  if (!best || bestD > 430) return;
  const ang = Math.atan2(best.y - state.life.y, best.x - state.life.x);
  const muzzle = state.life.r * 1.45;
  const mkShot = (spread, speed, radius, life) => {
    const a = ang + spread;
    state.shots.push({
      x: state.life.x + Math.cos(a) * muzzle,
      y: state.life.y + Math.sin(a) * muzzle,
      vx: Math.cos(a) * speed,
      vy: Math.sin(a) * speed,
      life,
      r: radius,
    });
  };
  mkShot(0, 560, 5.2, 0.9);
  mkShot(0.16, 520, 4.1, 0.78);
  mkShot(-0.16, 520, 4.1, 0.78);
  state.cannonCd = 0.24;
  sfxHeroAbility("sub");
  buzz(5);
}

function updateShipShots(dt) {
  if (!state.shots?.length) return;
  for (let i = state.shots.length - 1; i >= 0; i -= 1) {
    const s = state.shots[i];
    s.x += s.vx * dt;
    s.y += s.vy * dt;
    s.life -= dt;
    if (
      s.life <= 0 ||
      s.x < -40 ||
      s.y < -40 ||
      s.x > state.width + 40 ||
      s.y > state.height + 40
    ) {
      state.shots.splice(i, 1);
      continue;
    }
    let hit = false;
    for (let j = state.hunters.length - 1; j >= 0; j -= 1) {
      const h = state.hunters[j];
      if (dist(h.x, h.y, s.x, s.y) > h.r + s.r) continue;
      const ang = Math.atan2(h.y - s.y, h.x - s.x) || 0;
      h.vx += Math.cos(ang) * (h.boss ? 7 : 16);
      h.vy += Math.sin(ang) * (h.boss ? 7 : 16);
      h.warn = 1;
      h.grace = Math.max(h.grace || 0, 0.35);
      burst(s.x, s.y, "rgba(255,214,140,0.95)", 10, 4.2);
      state.flash = Math.max(state.flash, 0.06);
      state.shake = Math.max(state.shake, 3);
      sfxNearMiss();
      hit = true;
      if (!h.boss && !h.shadow && h.r < 28) {
        burst(h.x, h.y, cssVar("--danger", "#ff6888"), 16, 5);
        state.hunters.splice(j, 1);
        addScore(5, h.x, h.y - 18, { color: cssVar("--gold", "#ffe898") });
      } else if (h.boss) {
        h.grace = Math.max(h.grace || 0, 0.55);
        floatText(h.x, h.y - 22, "отпор", cssVar("--gold", "#ffe898"), 13);
      } else {
        placeHunterOnEdge(h);
      }
      break;
    }
    if (hit) state.shots.splice(i, 1);
  }
}


function recordLifeHistory(dt) {
  if (!state.life || activeHeroId() !== "seahorse") {
    if (activeHeroId() !== "seahorse") state.lifeHistory = [];
    return;
  }
  state.lifeHistory.push({ x: state.life.x, y: state.life.y, t: state.elapsed });
  while (state.lifeHistory.length && state.elapsed - state.lifeHistory[0].t > 1.2) {
    state.lifeHistory.shift();
  }
}

function updateMantaWake(dt) {
  if (!state.mantaWake) return;
  state.mantaWake.t -= dt;
  if (state.mantaWake.t <= 0) {
    state.mantaWake = null;
    return;
  }
  const w = state.mantaWake;
  for (let hi = state.hunters.length - 1; hi >= 0; hi -= 1) {
    const h = state.hunters[hi];
    if (h.boss || h.shadow) continue;
    const vx = h.x - w.x;
    const vy = h.y - w.y;
    const along = vx * w.nx + vy * w.ny;
    if (along < -w.len * 0.5 || along > w.len * 0.5) continue;
    const px = w.x + w.nx * along;
    const py = w.y + w.ny * along;
    const side = dist(h.x, h.y, px, py);
    if (side > w.halfW) continue;
    h.vx += w.nx * 10 * dt + (h.x - px) * 0.08;
    h.vy += w.ny * 10 * dt + (h.y - py) * 0.08;
    h.grace = Math.max(h.grace || 0, 0.25);
  }
}

function fireEelZap(dt) {
  if (activeHeroId() !== "eel" || !state.life || !state.touchActive || state.paused) return;
  state.eelCd = Math.max(0, (state.eelCd || 0) - dt);
  if (state.eelBolts?.length) {
    for (let i = state.eelBolts.length - 1; i >= 0; i -= 1) {
      state.eelBolts[i].t -= dt;
      if (state.eelBolts[i].t <= 0) state.eelBolts.splice(i, 1);
    }
  }
  if (state.eelCd > 0) return;
  let best = null;
  let bestD = Infinity;
  for (const h of state.hunters) {
    if (h.shadow) continue;
    const d = dist(h.x, h.y, state.life.x, state.life.y);
    if (d < bestD) {
      bestD = d;
      best = h;
    }
  }
  if (!best || bestD > 220) return;
  state.eelCd = 0.92;
  const chain = [best];
  let tip = best;
  for (let n = 0; n < 3; n += 1) {
    let next = null;
    let nextD = Infinity;
    for (const h of state.hunters) {
      if (h.shadow || chain.includes(h)) continue;
      const d = dist(h.x, h.y, tip.x, tip.y);
      if (d < nextD && d < 155) {
        nextD = d;
        next = h;
      }
    }
    if (!next) break;
    chain.push(next);
    tip = next;
  }
  state.eelBolts = state.eelBolts || [];
  let prev = { x: state.life.x, y: state.life.y };
  for (let ci = 0; ci < chain.length; ci += 1) {
    const h = chain[ci];
    state.eelBolts.push({
      x0: prev.x, y0: prev.y, x1: h.x, y1: h.y, t: 0.22,
    });
    prev = h;
    const ang = Math.atan2(h.y - state.life.y, h.x - state.life.x) || 0;
    h.vx += Math.cos(ang) * (h.boss ? 7 : 15);
    h.vy += Math.sin(ang) * (h.boss ? 7 : 15);
    h.warn = 1;
    h.grace = Math.max(h.grace || 0, 0.55);
    h.stunT = Math.max(h.stunT || 0, h.boss ? 0.45 : 0.85);
    burst(h.x, h.y, "rgba(160,220,255,0.95)", 12, 4);
    const kill = !h.boss && !h.shadow && h.r < 26 && (ci === 0 || Math.random() < 0.55);
    if (kill) {
      burst(h.x, h.y, cssVar("--life", "#7affd4"), 16, 5);
      const idx = state.hunters.indexOf(h);
      if (idx >= 0) {
        state.hunters.splice(idx, 1);
        addScore(5, h.x, h.y - 16, { color: cssVar("--life", "#7affd4") });
      }
    } else if (!h.boss && h.r < 30) {
      placeHunterOnEdge(h);
    }
  }
  floatText(state.life.x, state.life.y - 22, "молния", cssVar("--life", "#9ee8ff"), 14);
  tipOnce("ability", "ЦЕПНАЯ МОЛНИЯ", 1300);
  sfxHeroAbility("eel");
  buzz(8);
  state.flash = Math.max(state.flash, 0.14);
}

function trySquidInk(hunter) {
  if (activeHeroId() !== "squid" || !state.life || !state.squidInkReady) return false;
  state.squidInkReady = false;
  state.squidEats = 0;
  state.inkCloud = {
    x: state.life.x,
    y: state.life.y,
    r: 170,
    t: 4.4,
    blind: true,
  };
  buzz([12, 18, 12]);
  sfxHeroAbility("squid");
  burst(state.life.x, state.life.y, "rgba(40,30,70,0.95)", 34, 6.5);
  floatText(state.life.x, state.life.y - 22, "туман", "#c8b8ff", 15);
  tipOnce("ability", "ЧЕРНИЛЬНЫЙ ТУМАН", 1500);
  if (hunter) {
    const ang = Math.atan2(hunter.y - state.life.y, hunter.x - state.life.x) || 0;
    hunter.vx += Math.cos(ang) * 14;
    hunter.vy += Math.sin(ang) * 14;
    hunter.warn = 1;
    hunter.grace = Math.max(hunter.grace || 0, 0.85);
    hunter.stunT = Math.max(hunter.stunT || 0, 1.1);
    if (!hunter.boss) placeHunterOnEdge(hunter);
  }
  for (const h of state.hunters) {
    const d = dist(h.x, h.y, state.life.x, state.life.y);
    if (d > 180 || d < 0.1) continue;
    h.vx += ((h.x - state.life.x) / d) * 10;
    h.vy += ((h.y - state.life.y) / d) * 10;
    h.stunT = Math.max(h.stunT || 0, 0.7);
    h.grace = Math.max(h.grace || 0, 0.55);
  }
  state.safeUntil = performance.now() + 1700;
  state.flash = Math.max(state.flash, 0.16);
  return true;
}

function updateInkCloud(dt) {
  if (!state.inkCloud) return;
  state.inkCloud.t -= dt;
  if (state.inkCloud.t <= 0) {
    state.inkCloud = null;
    return;
  }
  const cloud = state.inkCloud;
  for (const h of state.hunters) {
    const d = dist(h.x, h.y, cloud.x, cloud.y);
    if (d > cloud.r) continue;
    h.vx *= 0.82;
    h.vy *= 0.82;
    h.grace = Math.max(h.grace || 0, 0.25);
    if (cloud.blind) h.stunT = Math.max(h.stunT || 0, 0.2);
  }
}

function trySeahorseRewind(hunter) {
  if (activeHeroId() !== "seahorse" || !state.life || !state.seahorseReady) return false;
  const hist = state.lifeHistory || [];
  let past = hist.length >= 3 ? hist[0] : null;
  if (!past) {
    const aim = state.life.aim ?? -Math.PI / 2;
    past = {
      x: clamp(state.life.x - Math.cos(aim) * 70, 24, state.width - 24),
      y: clamp(state.life.y - Math.sin(aim) * 70, 40, state.height - 24),
    };
  }
  state.seahorseReady = false;
  state.seahorseEats = 0;
  const ox = state.life.x;
  const oy = state.life.y;
  state.life.x = past.x;
  state.life.y = past.y;
  clampLife();
  state.lifeHistory = [];
  state.hunger = clamp(state.hunger + 18, 0, state.maxHunger || 100);
  updateHungerUi();
  buzz([14, 22, 14]);
  sfxHeroAbility("seahorse");
  burst(past.x, past.y, cssVar("--gold", "#ffe898"), 26, 5.5);
  burst(ox, oy, "rgba(255,200,140,0.5)", 14, 3.5);
  floatText(past.x, past.y - 24, "откат", cssVar("--gold", "#ffe898"), 15);
  tipOnce("ability", "ОТКАТ ВРЕМЕНИ", 1500);
  for (const h of state.hunters) {
    const d = dist(h.x, h.y, past.x, past.y);
    if (d > 145 || d < 0.1) continue;
    h.vx += ((h.x - past.x) / d) * 13;
    h.vy += ((h.y - past.y) / d) * 13;
    h.warn = 1;
    h.grace = Math.max(h.grace || 0, 0.75);
    h.stunT = Math.max(h.stunT || 0, 0.6);
    if (!h.boss && h.r < 28) placeHunterOnEdge(h);
  }
  if (hunter && !hunter.boss) placeHunterOnEdge(hunter);
  state.safeUntil = performance.now() + 1700;
  state.flash = Math.max(state.flash, 0.18);
  state.timeScale = 0.52;
  state.slowmoUntil = performance.now() + 380;
  return true;
}

function fireWhaleSonar(dt) {
  if (activeHeroId() !== "whale" || !state.life || !state.touchActive || state.paused) return;
  state.whaleCd = Math.max(0, (state.whaleCd || 0) - dt);
  if (state.whalePulse2 > 0) {
    state.whalePulse2 -= dt;
    if (state.whalePulse2 <= 0) {
      applyWhalePulse(0.72);
      state.whalePulse2 = 0;
    }
  }
  if (state.sonarRings?.length) {
    for (let i = state.sonarRings.length - 1; i >= 0; i -= 1) {
      const ring = state.sonarRings[i];
      ring.t += dt;
      ring.r += dt * 260;
      if (ring.t > 0.55) state.sonarRings.splice(i, 1);
    }
  }
  if (state.whaleCd > 0) return;
  const reach = 230;
  let nearby = 0;
  for (const h of state.hunters) {
    if (dist(h.x, h.y, state.life.x, state.life.y) <= reach) nearby += 1;
  }
  if (!nearby) return;
  state.whaleCd = 3.1;
  applyWhalePulse(1);
  state.whalePulse2 = 0.34;
  state.sonarRings = state.sonarRings || [];
  state.sonarRings.push({ x: state.life.x, y: state.life.y, r: 20, t: 0 });
  floatText(state.life.x, state.life.y - 24, "сонар", "#9ed4ff", 15);
  tipOnce("ability", "ДВОЙНОЙ СОНАР", 1400);
  sfxHeroAbility("whale");
  buzz([10, 16, 10]);
  state.flash = Math.max(state.flash, 0.14);
}

function applyWhalePulse(power = 1) {
  if (!state.life) return 0;
  const reach = 230 * (0.85 + 0.15 * power);
  let hit = 0;
  for (const h of state.hunters) {
    const d = dist(h.x, h.y, state.life.x, state.life.y);
    if (d > reach || d < 0.1) continue;
    const force = ((reach - d) / reach) * (h.boss ? 9 : 18) * power;
    h.vx += ((h.x - state.life.x) / d) * force;
    h.vy += ((h.y - state.life.y) / d) * force;
    h.warn = 1;
    h.grace = Math.max(h.grace || 0, h.boss ? 0.85 : 0.7);
    h.stunT = Math.max(h.stunT || 0, h.boss ? 0.7 : 1.35);
    if (h.boss) {
      h.bossTimer = Math.max(h.bossTimer || 0, 1.1);
      h.dashT = 0;
      h.chargeTx = h.x;
      h.chargeTy = h.y;
    }
    hit += 1;
  }
  if (hit) {
    addScore(hit, state.life.x, state.life.y - 40, {
      color: "#9ed4ff",
      combo: false,
    });
    state.comboClock = Math.max(state.comboClock, 1.6);
  }
  burst(state.life.x, state.life.y, "rgba(140,200,255,0.55)", 28, 7);
  state.shake = Math.max(state.shake, hit ? 6 : 2);
  state.safeUntil = Math.max(state.safeUntil || 0, performance.now() + 700);
  state.sonarRings = state.sonarRings || [];
  state.sonarRings.push({ x: state.life.x, y: state.life.y, r: 24, t: 0 });
  return hit;
}

function notePremiumEat() {
  if (!state.meta) return;
  const id = activeHeroId();
  if (id === "squid" && !state.squidInkReady) {
    state.squidEats = (state.squidEats || 0) + 1;
    if (state.squidEats >= 10) {
      state.squidInkReady = true;
      state.squidEats = 0;
      floatText(state.life.x, state.life.y - 28, "чернила готовы", "#c8b8ff", 14);
      buzz(6);
    }
  }
  if (id === "seahorse" && !state.seahorseReady) {
    state.seahorseEats = (state.seahorseEats || 0) + 1;
    if (state.seahorseEats >= 12) {
      state.seahorseReady = true;
      state.seahorseEats = 0;
      floatText(state.life.x, state.life.y - 28, "откат готов", cssVar("--gold", "#ffe898"), 14);
      buzz(6);
    }
  }
}

function absorbHunterHit(hunter) {
  if (playerIsSafe()) {
    if (hunter && state.life) {
      const ang = Math.atan2(hunter.y - state.life.y, hunter.x - state.life.x) || 0;
      hunter.vx += Math.cos(ang) * 4.5;
      hunter.vy += Math.sin(ang) * 4.5;
      hunter.grace = Math.max(hunter.grace || 0, 0.4);
    }
    return true;
  }
  if (consumeSymbioteShield(hunter)) return true;
  if (tryCrabShield(hunter)) return true;
  if (tryShipHull(hunter)) return true;
  if (trySquidInk(hunter)) return true;
  if (trySeahorseRewind(hunter)) return true;
  return false;
}

function loadCustomHeroImage(src) {
  if (!src) {
    customHeroImage.img = null;
    customHeroImage.src = "";
    customHeroImage.ready = false;
    return;
  }
  if (customHeroImage.src === src && customHeroImage.ready) return;
  const img = new Image();
  img.onload = () => {
    customHeroImage.img = img;
    customHeroImage.src = src;
    customHeroImage.ready = true;
    paintHeroPortrait();
  };
  img.onerror = () => {
    customHeroImage.img = null;
    customHeroImage.src = "";
    customHeroImage.ready = false;
  };
  img.src = src;
}

function setActiveHero(id) {
  if (!state.meta) return;
  if (id === "custom" && !state.meta.customHero) {
    openDrawHero();
    return;
  }
  if (!isHeroOwned(id)) {
    const hero = HEROES.find((h) => h.id === id);
    if (hero?.iap) {
      state.meta.activeHero = id;
      saveMeta();
      renderHeroPicker();
      paintHeroPortrait();
      purchaseIapHero(id).catch(() => {});
      return;
    }
    tryUnlockHero(id);
    return;
  }
  state.meta.activeHero = id;
  saveMeta();
  renderHeroPicker();
  paintHeroPortrait();
  showToast(`герой · ${activeHero().name}`);
}

function tryUnlockHero(id) {
  if (!state.meta) return false;
  const hero = HEROES.find((h) => h.id === id);
  if (!hero?.premium || hero.iap || isHeroOwned(id)) return false;
  const cost = Math.max(1, Number(hero.cost) || 0);
  const marks = state.meta.marks || 0;
  if (marks < cost) {
    showToast(`нужно ${cost} следов · есть ${marks}`);
    renderHeroPicker();
    paintHeroPortrait();
    return false;
  }
  state.meta.marks = Math.max(0, marks - cost);
  const unlocked = new Set(state.meta.unlockedHeroes || []);
  unlocked.add(id);
  state.meta.unlockedHeroes = [...unlocked];
  state.meta.activeHero = id;
  saveMeta();
  updateEconomyLabels();
  renderHeroPicker();
  paintHeroPortrait();
  goalChime();
  buzz([10, 18, 10]);
  showToast(`открыт · ${hero.name} · −${cost}`);
  return true;
}

async function purchaseIapHero(id) {
  if (!state.meta) return false;
  const hero = HEROES.find((h) => h.id === id && h.iap);
  if (!hero) return false;
  if (isHeroOwned(id)) {
    state.meta.activeHero = id;
    saveMeta();
    renderHeroPicker();
    paintHeroPortrait();
    renderShop();
    showToast(`${hero.name} уже твой`);
    return true;
  }
  const native = window.OttiskNative;
  if (isNativeShop()) {
    showToast(`открываем покупку · ${hero.priceLabel || ""}`);
    const result = await native.purchase(hero.productId).catch(() => null);
    if (result?.ok) {
      unlockIapHero(id, true);
      return true;
    }
    showToast(result?.message || "покупка отменена");
    return false;
  }
  try {
    const url = new URL(DONATE_URL);
    url.searchParams.set("tip", id === "sub" ? "submarine" : id);
    url.searchParams.set("product", hero.productId);
    window.open(url.toString(), "_blank", "noopener,noreferrer");
  } catch (_) {
    location.href = `./donate.html?tip=${encodeURIComponent(id === "sub" ? "submarine" : id)}`;
  }
  showToast(`${hero.name} · ${hero.priceLabel || ""} · ${storePayLabel()}`);
  return false;
}

function unlockIapHero(id, fromPurchase = false) {
  const hero = HEROES.find((h) => h.id === id && h.iap);
  if (!hero || !state.meta) return;
  state.meta.iapHeroes = [...new Set([...(state.meta.iapHeroes || []), id])];
  state.meta.activeHero = id;
  saveMeta();
  renderHeroPicker();
  paintHeroPortrait();
  renderShop();
  goalChime();
  buzz([12, 20, 12]);
  const detail = hero.blurb || hero.ability || "";
  showToast(fromPurchase ? `${hero.name} твой${detail ? ` · ${detail}` : ""}` : `${hero.name} открыт`);
}

async function purchaseSubmarine() {
  return purchaseIapHero("sub");
}

function unlockSubmarine(fromPurchase = false) {
  unlockIapHero("sub", fromPurchase);
}

function updateHeroAbilityHint() {
  const hint = document.getElementById("hero-ability-hint");
  const lock = document.getElementById("hero-lock-hint");
  const buyBtn = document.getElementById("btn-buy-marks-hero");
  const selectedId = state.meta?.activeHero || "octopus";
  const hero = HEROES.find((h) => h.id === selectedId) || activeHero();
  const owned = isHeroOwned(hero.id);
  if (hint) {
    hint.textContent = hero?.ability || "";
  }
  if (heroPickNameEl) {
    const label = hero?.id === "custom" && !state.meta?.customHero ? "свой" : hero?.name || "";
    heroPickNameEl.textContent = label;
  }
  if (lock) {
    if (hero?.premium && !owned) {
      lock.classList.remove("hidden");
      if (hero.iap) {
        lock.textContent = `Премиум · ${hero.priceLabel || "99 ₽"} · ${hero.blurb || hero.ability || ""}`;
      } else {
        const have = state.meta?.marks || 0;
        const need = Math.max(0, hero.cost - have);
        lock.textContent = need > 0
          ? `Закрыт · ${hero.cost} следов · не хватает ${need}`
          : `Можно открыть · ${hero.cost} следов · тапни героя`;
      }
    } else {
      lock.classList.add("hidden");
      lock.textContent = "";
    }
  }
  if (buyBtn) {
    if (hero?.iap && !owned) {
      buyBtn.classList.remove("hidden");
      buyBtn.textContent = `купить · ${hero.priceLabel || "99 ₽"}`;
    } else if (hero?.premium && !owned && !hero.iap && (state.meta?.marks || 0) < hero.cost) {
      buyBtn.classList.remove("hidden");
      buyBtn.textContent = "купить следы";
    } else {
      buyBtn.classList.add("hidden");
    }
  }
}

function renderHeroPicker() {
  if (!heroListEl) return;
  heroListEl.textContent = "";
  const current = state.meta?.activeHero || activeHeroId();
  let activeBtn = null;
  for (const hero of HEROES) {
    const owned = isHeroOwned(hero.id);
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `hero-tile${hero.id === current ? " on" : ""}${hero.premium && !owned ? " locked" : ""}${hero.iap ? " iap" : ""}`;
    const label = hero.id === "custom" && !state.meta?.customHero ? "свой" : hero.name;
    const costHtml = hero.premium && !owned
      ? `<span class="hero-tile-cost">${hero.iap ? (hero.priceLabel || "99 ₽") : hero.cost}</span>`
      : "";
    btn.innerHTML = `<span class="hero-glyph" aria-hidden="true">${hero.glyph || "•"}</span><span class="hero-tile-name">${label}</span>${costHtml}`;
    btn.setAttribute("role", "option");
    const aria = hero.premium && !owned
      ? (hero.iap ? `${label}, ${hero.priceLabel}` : `${label}, ${hero.cost} следов`)
      : hero.ability ? `${label}, ${hero.ability}` : label;
    btn.setAttribute("aria-label", aria);
    btn.setAttribute("aria-selected", hero.id === current ? "true" : "false");
    btn.addEventListener("click", () => {
      if (hero.iap && !isHeroOwned(hero.id)) {
        if (state.meta?.activeHero === hero.id) {
          purchaseIapHero(hero.id).catch(() => {});
        } else {
          state.meta.activeHero = hero.id;
          saveMeta();
          renderHeroPicker();
          paintHeroPortrait();
          showToast(`${hero.name} · ${hero.priceLabel || "99 ₽"}`);
        }
        return;
      }
      if (hero.premium && !hero.iap && !isHeroOwned(hero.id)) {
        if (state.meta?.activeHero === hero.id) tryUnlockHero(hero.id);
        else {
          state.meta.activeHero = hero.id;
          saveMeta();
          renderHeroPicker();
          paintHeroPortrait();
          showToast(`${hero.name} · ${hero.cost} следов`);
        }
        return;
      }
      setActiveHero(hero.id);
    });
    heroListEl.appendChild(btn);
    if (hero.id === current) activeBtn = btn;
  }
  updateHeroAbilityHint();
  if (btnDrawHero) btnDrawHero.textContent = state.meta?.customHero ? "изменить" : "нарисовать";
  if (activeBtn) {
    requestAnimationFrame(() => {
      activeBtn.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
    });
  }
}

function maybeShowHeroAbilityTip() {
  const hero = activeHero();
  if (!hero?.tip || !state.meta) return;
  const seen = state.meta.seenAbilityTips || [];
  if (seen.includes(hero.id)) return;
  state.meta.seenAbilityTips = [...seen, hero.id];
  saveMeta();
  tipOnce("ability", hero.tip, 1600);
}

function touchPlayDay() {
  if (!state.meta) return;
  const today = localDayKey();
  const diff = dayDiff(state.meta.lastPlayDay, today);
  if (!state.meta.lastPlayDay) {
    state.meta.streak = Math.max(1, state.meta.streak || 0);
  } else if (diff === 1) {
    state.meta.streak = Math.max(1, (state.meta.streak || 0) + 1);
  } else if (diff > 1) {
    state.meta.streak = 1;
  }
  state.meta.lastPlayDay = today;
  saveMeta();
}

function refreshDaily() {
  if (!state.meta) return;
  const today = localDayKey();
  let changed = false;
  if (state.meta.dailyDay !== today) {
    state.meta.dailyDay = today;
    state.meta.dailyId = pickDailyId(state.meta.dailyId);
    state.meta.dailyDone = false;
    changed = true;
  } else if (!DAILY_DEFS.some((daily) => daily.id === state.meta.dailyId)) {
    state.meta.dailyId = pickDailyId();
    changed = true;
  }
  if (changed) saveMeta();
}

function updateEconomyLabels() {
  if (!state.meta) return;
  if (marksStartEl) marksStartEl.textContent = `${state.meta.marks || 0} следов`;
  const streakText = `${Math.max(0, state.meta.streak || 0)} дн`;
  if (streakStartEl) streakStartEl.textContent = streakText;
  if (streakOverEl) streakOverEl.textContent = String(Math.max(0, state.meta.streak || 0));
  updateDonateThanks();
  renderShopProgress();
}

function dailyProgressText(daily = currentDailyDef()) {
  if (!daily) return "";
  return state.meta?.dailyDone ? `выполнено · +${DAILY_QUEST_REWARD} следов` : daily.label(state);
}

function renderDailyQuest() {
  const quest = document.getElementById("daily-quest");
  if (!quest || !state.meta) return;
  const daily = currentDailyDef();
  if (!daily) {
    quest.textContent = "";
    return;
  }
  if (state.meta.dailyDone) {
    quest.className = "menu-note done";
    quest.textContent = `Сегодня · ${daily.title} · готово`;
    return;
  }
  quest.className = "menu-note";
  quest.textContent = `Сегодня · ${daily.title} · +${DAILY_QUEST_REWARD} следов`;
}

function renderDaily() {
  const daily = currentDailyDef();
  if (!daily) return;
  if (dailyCardEl) dailyCardEl.textContent = `ежедневка · ${daily.title} · ${dailyProgressText(daily)}`;
  renderDailyQuest();
  renderWeekly();
  renderSettings();
  renderProgression();
  renderStory();
  renderGifts();
}

function giftReady(gift, now = Date.now()) {
  if (!state.meta) return false;
  return !!gift.ready(state.meta, now);
}

function touchVisitClock() {
  if (!state.meta) return;
  const now = Date.now();
  const prev = state.meta.lastVisitAt || 0;
  if (prev && now - prev >= HOUR_MS * 20) {
    state.meta.returnAvailableDay = localDayKey();
  }
  state.meta.lastVisitAt = now;
  saveMeta();
}

function claimGift(giftId, opts = {}) {
  if (!state.meta) return 0;
  const gift = GIFTS.find((g) => g.id === giftId);
  if (!gift) return 0;
  const now = Date.now();
  if (!giftReady(gift, now)) {
    if (!opts.silent) {
      const locked = gift.lockedLabel?.(state.meta, now);
      showToast(locked || "ещё рано");
    }
    return 0;
  }
  const amount = gift.claim(state.meta, now);
  saveMeta();
  awardMarks(amount, { metaOnly: true });
  if (!opts.silent) {
    goalChime();
    buzz([10, 18, 10]);
    showToast(`${gift.title.toLowerCase()} · +${amount} следов`);
    renderGifts();
    updateEconomyLabels();
  }
  return amount;
}

function claimAllReadyGifts() {
  if (!state.meta) return;
  const now = Date.now();
  const ready = GIFTS.filter((gift) => giftReady(gift, now));
  if (!ready.length) return;
  let total = 0;
  for (const gift of ready) total += claimGift(gift.id, { silent: true });
  if (total <= 0) return;
  goalChime();
  buzz([10, 18, 10]);
  showToast(`подарки · +${total} следов`);
  renderGifts();
  updateEconomyLabels();
}

function nextGiftWait(now = Date.now()) {
  if (!state.meta) return null;
  let best = null;
  for (const gift of GIFTS) {
    if (giftReady(gift, now)) continue;
    if (gift.lockedLabel?.(state.meta, now)) continue;
    const wait = gift.waitMs?.(state.meta, now) ?? 0;
    if (wait <= 0) continue;
    if (!best || wait < best.wait) best = { gift, wait };
  }
  return best;
}

function renderGifts() {
  const list = document.getElementById("gift-list");
  const wrap = document.getElementById("menu-gifts");
  const nextEl = document.getElementById("gift-next");
  if (!list || !state.meta) return;
  const now = Date.now();
  const readyGifts = GIFTS.filter((gift) => giftReady(gift, now));
  list.textContent = "";
  if (wrap) wrap.classList.toggle("hidden", readyGifts.length === 0);
  if (readyGifts.length > 1) {
    const all = document.createElement("button");
    all.type = "button";
    all.className = "gift-tile ready gift-all";
    all.innerHTML = `
      <span class="gift-tile-title">Забрать все</span>
      <span class="gift-tile-meta">${readyGifts.length}</span>
    `;
    all.addEventListener("click", () => claimAllReadyGifts());
    list.appendChild(all);
  }
  for (const gift of readyGifts) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "gift-tile ready";
    const amountText = gift.amountLabel?.(state.meta, now) || `+${gift.amount}`;
    btn.innerHTML = `
      <span class="gift-tile-title">${gift.title}</span>
      <span class="gift-tile-meta">${amountText}</span>
    `;
    btn.setAttribute("aria-label", `Забрать подарок ${gift.title} ${amountText}`);
    btn.addEventListener("click", () => claimGift(gift.id));
    list.appendChild(btn);
  }
  if (nextEl) {
    const next = readyGifts.length ? null : nextGiftWait(now);
    if (next) {
      nextEl.classList.remove("hidden");
      nextEl.textContent = `Подарок через ${formatWait(next.wait)}`;
    } else {
      nextEl.classList.add("hidden");
      nextEl.textContent = "";
    }
  }
  updateEconomyLabels();
}

function renderWeekly() {
  if (!weeklyCardEl || !state.meta) return;
  const quest = currentWeeklyDef();
  const progress = Math.min(quest.target, state.meta.weekProgress || 0);
  const cos = packApi()?.seasonCosmetic(state.meta.weekId || weekKey());
  const seasonBit = cos?.name ? ` · ${cos.name}` : "";
  if (state.meta.weekRewardTaken) {
    weeklyCardEl.textContent = `неделя${seasonBit} · ${quest.title} · награда взята`;
    return;
  }
  weeklyCardEl.textContent = `неделя${seasonBit} · ${quest.title} · ${progress}/${quest.target} ${quest.unit} · +${WEEKLY_REWARD}`;
}

function progressionState() {
  const api = window.OttiskProgression;
  if (!api) return null;
  if (!state.meta?.progression || !api.validateState(state.meta.progression).valid) {
    state.meta.progression = api.createState();
  }
  return state.meta.progression;
}

function renderProgression() {
  const api = window.OttiskProgression;
  const progress = progressionState();
  const points = document.getElementById("progression-points");
  const tree = document.getElementById("skill-tree");
  if (!api || !progress || !tree) return;
  if (points) points.textContent = `${window.OttiskI18n?.locale === "en" ? "depth points" : "очки глубины"} · ${progress.available}`;
  tree.textContent = "";
  const english = window.OttiskI18n?.locale === "en";
  const names = {
    "steady-touch": ["Steady trail", "Increase maximum fullness by 8 per rank."],
    "bright-core": ["Bright core", "Collected light is worth 10% more per rank."],
    "quick-current": ["Quick current", "Movement speed grows by 5% per rank."],
    "second-pulse": ["Second pulse", "Prevent defeat once per run."],
    "deep-memory": ["Memory of the deep", "Boss rewards grow by 20%."],
  };
  for (const skill of api.SKILL_TREE) {
    const rank = progress.spent[skill.id] || 0;
    const eligibility = api.canSpend(progress, skill.id);
    const button = document.createElement("button");
    button.type = "button";
    button.className = "skill-node";
    button.disabled = !eligibility.ok;
    const title = english ? names[skill.id]?.[0] || skill.name : skill.name;
    const description = english ? names[skill.id]?.[1] || skill.description : skill.description;
    const name = document.createElement("span");
    name.className = "skill-node-name";
    name.textContent = title;
    const rankEl = document.createElement("span");
    rankEl.className = "skill-node-rank";
    rankEl.textContent = `${rank}/${skill.maxRank} · ${skill.cost}`;
    const desc = document.createElement("span");
    desc.className = "skill-node-desc";
    desc.textContent = description;
    button.append(name, rankEl, desc);
    button.addEventListener("click", () => {
      const result = api.spend(state.meta.progression, skill.id);
      if (!result.ok) return;
      state.meta.progression = result.state;
      state.progressionEffects = api.effects(result.state);
      saveMeta();
      renderProgression();
      showToast(`${title} · ${result.state.spent[skill.id]}`);
    });
    tree.appendChild(button);
  }
}

function earnProgressionFromBest() {
  const api = window.OttiskProgression;
  const progress = progressionState();
  if (!api || !progress) return;
  const target = Math.min(20, Math.floor((state.meta.best || 0) / 100));
  if (target <= progress.totalEarned) return;
  const earned = target - progress.totalEarned;
  state.meta.progression = api.earn(progress, earned);
  saveMeta();
  renderProgression();
  showToast(`${window.OttiskI18n?.locale === "en" ? "depth point" : "очко глубины"} · +${earned}`);
}

function contentBiome(score = state.score) {
  const biomes = window.OttiskContent?.DEFAULT_CATALOG?.biomes || [];
  if (!biomes.length) return null;
  // Prefer the deepest matching band so overlapping legacy ranges still resolve uniquely.
  let best = null;
  for (const biome of biomes) {
    const lo = biome.depth?.[0] ?? 0;
    const hi = biome.depth?.[1] ?? Number.POSITIVE_INFINITY;
    if (score >= lo && score < hi && (!best || lo >= (best.depth?.[0] ?? 0))) best = biome;
  }
  return best || biomes[biomes.length - 1] || null;
}

function storyChapter(score = state.meta?.best || 0) {
  const chapters = window.OttiskContent?.DEFAULT_CATALOG?.chapters || [];
  return [...chapters].filter((chapter) => score >= (chapter.unlock?.score || 0)).sort((a, b) => b.order - a.order)[0] || null;
}

function applyContentBiome() {
  const biome = contentBiome();
  if (!biome) return;
  app.dataset.biome = biome.id;
  if ((state.meta?.colorblind || "off") === "off" && !state.meta?.highContrast) {
    app.style.setProperty("--bg0", biome.palette.background);
    app.style.setProperty("--accent-a", biome.palette.accent);
    app.style.setProperty("--danger", biome.palette.hazard);
  } else {
    app.style.removeProperty("--bg0");
    app.style.removeProperty("--accent-a");
    app.style.removeProperty("--danger");
  }
  refreshCssCache();
}

function renderStory() {
  const chapter = storyChapter();
  const biome = contentBiome(state.meta?.best || 0);
  const chapterEl = document.getElementById("story-chapter");
  const biomeEl = document.getElementById("story-biome");
  if (chapterEl) chapterEl.textContent = chapter ? `${chapter.order}. ${chapter.name} · ${chapter.synopsis}` : "";
  if (biomeEl) biomeEl.textContent = biome ? `${biome.name} · ${biome.description}` : "";
}

function syncStoryChapter() {
  const chapter = storyChapter(state.score);
  if (!chapter || !state.meta) return;
  const seen = state.meta.seenChapters || [];
  if (seen.includes(chapter.id)) return;
  state.meta.seenChapters = [...seen, chapter.id];
  saveMeta();
  renderStory();
  if (state.running) showMechanicCard(`chapter-${chapter.id}`, chapter.name, chapter.synopsis);
}

function applyAccessibilityPrefs() {
  if (!state.meta) return;
  app.classList.toggle("reduce-motion", !!state.meta.reduceMotion);
  app.classList.toggle("high-contrast", !!state.meta.highContrast);
  app.classList.toggle("large-ui", !!state.meta.largeUi);
  app.classList.toggle("one-hand-left", state.meta.oneHand === "left");
  app.classList.toggle("one-hand-right", state.meta.oneHand === "right");
  app.dataset.colorblind = state.meta.colorblind || "off";
  refreshCssCache();
}

function applyQualityMode() {
  const mode = state.meta?.qualityMode || "auto";
  const next = mode === "auto" ? (perfMonitor?.snapshot?.().tier || state.qualityTier || "high") : mode;
  const changed = next !== state.qualityTier;
  state.qualityTier = next;
  app.dataset.quality = next;
  if (changed && state.width > 0) resize();
}

function setupPerformanceMonitor() {
  if (!window.OttiskPerf?.createMonitor) return;
  const android = /Android/i.test(navigator.userAgent || "") || window.OttiskNative?.platform === "android";
  const modestCpu = Number(navigator.hardwareConcurrency || 8) <= 4;
  perfMonitor = window.OttiskPerf.createMonitor({ initialTier: android && modestCpu ? "medium" : "high" });
  perfMonitor.subscribe((snapshot) => {
    if (state.meta?.qualityMode !== "auto") return;
    state.qualityTier = snapshot.tier;
    app.dataset.quality = snapshot.tier;
    resize();
  });
  applyQualityMode();
}

function renderSettings() {
  if (!state.meta) return;
  if (btnSound) {
    btnSound.classList.toggle("on", state.meta.sound !== false);
    btnSound.setAttribute("aria-pressed", state.meta.sound !== false ? "true" : "false");
    btnSound.textContent = state.meta.sound !== false ? "звук" : "звук off";
  }
  if (btnHaptics) {
    btnHaptics.classList.toggle("on", state.meta.haptics !== false);
    btnHaptics.setAttribute("aria-pressed", state.meta.haptics !== false ? "true" : "false");
    btnHaptics.textContent = state.meta.haptics !== false ? "вибро" : "вибро off";
  }
  const hapticsMore = document.getElementById("btn-haptics-more");
  if (hapticsMore) {
    hapticsMore.classList.toggle("on", state.meta.haptics !== false);
    hapticsMore.setAttribute("aria-pressed", state.meta.haptics !== false ? "true" : "false");
    hapticsMore.textContent = state.meta.haptics !== false
      ? tr("haptics", "вибрация")
      : (window.OttiskI18n?.locale === "en" ? "haptics off" : "вибрация off");
  }
  const motion = document.getElementById("btn-reduce-motion");
  const contrast = document.getElementById("btn-high-contrast");
  if (motion) {
    motion.classList.toggle("on", !!state.meta.reduceMotion);
    motion.setAttribute("aria-pressed", state.meta.reduceMotion ? "true" : "false");
  }
  if (contrast) {
    contrast.classList.toggle("on", !!state.meta.highContrast);
    contrast.setAttribute("aria-pressed", state.meta.highContrast ? "true" : "false");
  }
  const quality = document.getElementById("btn-quality");
  if (quality) {
    const mode = state.meta.qualityMode || "auto";
    const names = window.OttiskI18n?.locale === "en"
      ? { auto: "quality · auto", high: "quality · high", medium: "quality · medium", low: "quality · low" }
      : { auto: "качество · авто", high: "качество · высокое", medium: "качество · среднее", low: "качество · низкое" };
    quality.textContent = names[mode];
    quality.classList.toggle("on", mode !== "auto");
    quality.setAttribute("aria-pressed", mode !== "auto" ? "true" : "false");
  }
  const largeUi = document.getElementById("btn-large-ui");
  if (largeUi) {
    largeUi.classList.toggle("on", !!state.meta.largeUi);
    largeUi.setAttribute("aria-pressed", state.meta.largeUi ? "true" : "false");
  }
  const oneHand = document.getElementById("btn-one-hand");
  if (oneHand) {
    const value = state.meta.oneHand || "off";
    oneHand.classList.toggle("on", value !== "off");
    oneHand.setAttribute("aria-pressed", value !== "off" ? "true" : "false");
    oneHand.textContent = value === "left"
      ? tr("one_hand_left", "Левая рука")
      : value === "right" ? tr("one_hand_right", "Правая рука") : tr("one_hand", "Управление одной рукой");
  }
  const colorblind = document.getElementById("btn-colorblind");
  if (colorblind) {
    const value = state.meta.colorblind || "off";
    colorblind.classList.toggle("on", value !== "off");
    colorblind.setAttribute("aria-pressed", value !== "off" ? "true" : "false");
    colorblind.textContent = tr(`colorblind_${value}`, tr("colorblind_mode", "Цветовая схема"));
  }
  renderDifficultyPicker();
  renderControlPicker();
  updateControlCopy();
}

function setDifficulty(id, opts = {}) {
  if (!state.meta) return;
  if (!DIFFICULTIES.some((d) => d.id === id)) return;
  state.meta.difficulty = id;
  saveMeta();
  renderDifficultyPicker();
  const diff = playerDifficulty();
  if (!opts.silent) showToast(`сложность · ${diff.name}`);
  if (opts.start) {
    sfxUiTap(2);
    startGame();
  }
}

function renderDifficultyPicker() {
  const list = document.getElementById("difficulty-list");
  if (!list || !state.meta) return;
  list.textContent = "";
  const current = playerDifficulty().id;
  for (const diff of DIFFICULTIES) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `diff-pick-btn${diff.id === current ? " on" : ""}`;
    btn.innerHTML = `<span class="diff-pick-name">${diff.name}</span><span class="diff-pick-sub">${diff.blurb || ""}</span>`;
    btn.setAttribute("aria-pressed", diff.id === current ? "true" : "false");
    btn.addEventListener("click", () => setDifficulty(diff.id, { start: true, silent: true }));
    list.appendChild(btn);
  }
}

function evaluateWeekly(score) {
  if (!state.meta) return false;
  const currentWeek = weekKey();
  if (state.meta.weekId !== currentWeek) {
    state.meta.weekId = currentWeek;
    state.meta.weekBest = 0;
    state.meta.weekQuestId = weeklyIdForKey(currentWeek);
    state.meta.weekProgress = 0;
    state.meta.weekRewardTaken = false;
  }
  const quest = currentWeeklyDef();
  state.meta.weekBest = Math.max(state.meta.weekBest || 0, score);
  const gained = Math.max(0, Number(quest.value(score)) || 0);
  state.meta.weekProgress = quest.mode === "best"
    ? Math.max(state.meta.weekProgress || 0, gained)
    : Math.min(quest.target, (state.meta.weekProgress || 0) + gained);
  saveMeta();
  renderWeekly();
  if (state.meta.weekRewardTaken || state.meta.weekProgress < quest.target) return false;
  state.meta.weekRewardTaken = true;
  awardMarks(WEEKLY_REWARD, {
    x: state.width * 0.5,
    y: state.height * 0.2,
    color: cssVar("--life", "#6fd9b0"),
    size: 16,
  });
  showToast(`${quest.title}: +${WEEKLY_REWARD} следов`);
  goalChime();
  return true;
}

function grantStarterGift() {
  if (!state.meta || state.meta.starterGift) return false;
  state.meta.starterGift = true;
  awardMarks(STARTER_MARKS, { metaOnly: true });
  saveMeta();
  showToast(`подарок · +${STARTER_MARKS} следов`);
  return true;
}

function maybeShowOnboardTips() {
  if (!state.meta || state.meta.onboarded) return false;
  showOnboard();
  return true;
}

function showOnboard() {
  if (!screenOnboardEl) return;
  state.onboardStep = 0;
  refreshOnboardUi();
  hideFlowScreens();
  screenOnboardEl.classList.remove("hidden");
  stopMenuMusic();
}

function refreshOnboardUi() {
  const step = state.onboardStep;
  if (onboardTextEl) onboardTextEl.textContent = ONBOARD_STEPS[step] || ONBOARD_STEPS[0];
  const last = step >= ONBOARD_STEPS.length - 1;
  if (onboardLabelEl) onboardLabelEl.textContent = last ? "К игре" : "Дальше";
  if (onboardSubEl) onboardSubEl.textContent = last ? "дальше выберешь героя" : `шаг ${step + 1} из ${ONBOARD_STEPS.length}`;
}

function advanceOnboard() {
  if (state.onboardStep < ONBOARD_STEPS.length - 1) {
    state.onboardStep += 1;
    refreshOnboardUi();
    sfxUiTap(state.onboardStep);
    return;
  }
  if (state.meta) {
    state.meta.onboarded = true;
    saveMeta();
  }
  grantStarterGift();
  screenOnboardEl?.classList.add("hidden");
  showHomeMenu();
  updateEconomyLabels();
  renderDaily();
}

function isNativeShop() {
  const native = window.OttiskNative;
  return !!(native?.isNative && native.billingAvailable);
}

function isNativeShell() {
  return !!window.OttiskNative?.isNative;
}

function storePayLabel() {
  const native = window.OttiskNative;
  if (native?.platform === "android") return "Google Play";
  if (native?.isNative) return "App Store";
  return window.OttiskI18n?.locale === "en" ? "donate page" : "донат";
}

function canOfferRealMoney() {
  if (isNativeShop()) return true;
  if (isNativeShell()) return false;
  return true;
}

function updateDonateThanks() {
  const el = document.getElementById("donate-thanks");
  if (el && state.meta) {
    const n = state.meta.donateCount || 0;
    const english = window.OttiskI18n?.locale === "en";
    el.textContent = n > 0
      ? (english ? `thank you · ${n} · heroes and trails` : `спасибо · ${n} · герои и следы`)
      : tr("shop_sub", "герои · следы · донат");
  }
  const marksEl = document.getElementById("shop-top-marks");
  if (marksEl && state.meta) marksEl.textContent = String(state.meta.marks || 0);
}

function renderDonateOptions() {
  const list = document.getElementById("donate-list");
  const note = document.getElementById("donate-note");
  if (!list) return;
  list.textContent = "";
  const native = isNativeShop();
  const pay = storePayLabel();
  if (note) {
    if (isNativeShell() && !native) {
      note.textContent = window.OttiskI18n?.locale === "en"
        ? "Real-money purchases are unavailable until store billing is ready. Cosmetics still unlock with trails."
        : "Покупки за деньги временно недоступны, пока не подключён магазин. Косметику по-прежнему открывают следы.";
    } else {
      note.textContent = native
        ? (window.OttiskI18n?.locale === "en"
          ? `Pay with ${pay}. Trails are granted right after a successful purchase.`
          : `Оплата через ${pay}. После покупки сразу начислим следы.`)
        : (window.OttiskI18n?.locale === "en"
          ? "On the website a donate page opens. In the app — Google Play / App Store purchase."
          : "На сайте откроется страница доната. В приложении — покупка через Google Play / App Store.");
    }
  }
  if (!canOfferRealMoney()) {
    updateDonateThanks();
    return;
  }
  for (const tip of DONATE_TIPS) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "donate-tip";
    btn.innerHTML = `
      <span class="donate-tip-copy">
        <span class="donate-tip-title">${tip.title}</span>
        <span class="donate-tip-sub">${tip.sub} · +${tip.marks} следов</span>
      </span>
      <span class="donate-tip-price">${native ? tip.priceLabel : "открыть"}</span>
    `;
    btn.addEventListener("click", () => purchaseDonateTip(tip.id));
    list.appendChild(btn);
  }
  const pack = document.createElement("button");
  pack.type = "button";
  pack.className = "donate-tip pack";
  pack.innerHTML = `
    <span class="donate-tip-copy">
      <span class="donate-tip-title">Пак следов</span>
      <span class="donate-tip-sub">+${MARKS_PACK_AMOUNT} следов</span>
    </span>
    <span class="donate-tip-price">${native ? "IAP" : pay}</span>
  `;
  pack.addEventListener("click", () => purchaseMarksPack());
  list.appendChild(pack);
  updateDonateThanks();
}

function renderShopProgress() {
  const el = document.getElementById("shop-progress");
  if (!el || !state.meta) return;
  const target = nextLockedPremiumHero();
  if (!target) {
    el.innerHTML = "";
    return;
  }
  const have = state.meta.marks || 0;
  const need = target.cost;
  const pct = Math.round(clamp(have / need, 0, 1) * 100);
  el.innerHTML = `До героя «${target.name}» · ${Math.min(have, need)}/${need} следов<div class="progress-bar" aria-hidden="true"><i style="width:${pct}%"></i></div>`;
}

function activeTrail() {
  const id = state.meta?.activeTrail || "plain";
  return TRAILS.find((t) => t.id === id) || TRAILS[0];
}

function activeFrame() {
  const id = state.meta?.activeFrame || "none";
  return FRAMES.find((f) => f.id === id) || FRAMES[0];
}

function isTrailOwned(id) {
  const item = TRAILS.find((t) => t.id === id);
  if (!item) return false;
  if (!item.cost) return true;
  return (state.meta?.unlockedTrails || []).includes(id);
}

function isFrameOwned(id) {
  const item = FRAMES.find((f) => f.id === id);
  if (!item) return false;
  if (item.seasonal) return (state.meta?.seasonalUnlocks || []).includes(id) || (state.meta?.unlockedFrames || []).includes(id);
  if (!item.cost) return true;
  return (state.meta?.unlockedFrames || []).includes(id);
}

function buyCosmetic(kind, id) {
  if (!state.meta) return;
  if (kind === "skin") {
    buyShopSkin(id);
    return;
  }
  const list = kind === "trail" ? TRAILS : FRAMES;
  const item = list.find((x) => x.id === id);
  if (!item) return;
  const owned = kind === "trail" ? isTrailOwned(id) : isFrameOwned(id);
  if (owned) {
    if (kind === "trail") state.meta.activeTrail = id;
    else state.meta.activeFrame = id;
    saveMeta();
    renderShop();
    showToast(`${item.name} · выбран`);
    return;
  }
  if ((state.meta.marks || 0) < item.cost) {
    showToast(`нужно ${item.cost} следов`);
    return;
  }
  state.meta.marks = Math.max(0, (state.meta.marks || 0) - item.cost);
  if (kind === "trail") {
    state.meta.unlockedTrails = [...new Set([...(state.meta.unlockedTrails || ["plain"]), id])];
    state.meta.activeTrail = id;
  } else {
    state.meta.unlockedFrames = [...new Set([...(state.meta.unlockedFrames || ["none"]), id])];
    state.meta.activeFrame = id;
  }
  saveMeta();
  updateEconomyLabels();
  renderShop();
  renderShopProgress();
  goalChime();
  showToast(`куплен · ${item.name}`);
}

function buyShopSkin(id) {
  if (!state.meta) return;
  const item = skinById(id);
  if (!item) return;
  if (isSkinOwned(id)) {
    state.meta.activeSkin = id;
    saveMeta();
    renderShop();
    renderSkinMeta();
    showToast(`${item.name} · выбран`);
    return;
  }
  if (!item.premium) {
    showToast(`откроется при рекорде ${item.at}`);
    return;
  }
  const cost = Math.max(1, Number(item.cost) || 0);
  if ((state.meta.marks || 0) < cost) {
    showToast(`нужно ${cost} следов`);
    return;
  }
  state.meta.marks = Math.max(0, (state.meta.marks || 0) - cost);
  state.meta.premiumUnlocked = [...new Set([...(state.meta.premiumUnlocked || []), id])];
  state.meta.activeSkin = id;
  saveMeta();
  updateEconomyLabels();
  renderShop();
  renderSkinMeta();
  goalChime();
  showToast(`куплен · ${item.name}`);
}

function renderShopCosmetics() {
  const list = document.getElementById("shop-cosmetics");
  if (!list || !state.meta) return;
  list.textContent = "";
  const addItem = (kind, item, sub, metaLabel, locked = false) => {
    const btn = document.createElement("button");
    btn.type = "button";
    const active =
      (kind === "trail" && activeTrail().id === item.id) ||
      (kind === "frame" && activeFrame().id === item.id) ||
      (kind === "skin" && activeSkin().id === item.id);
    btn.className = `shop-item${active ? " on" : ""}${locked ? " locked" : ""}`;
    btn.innerHTML = `<span><span class="shop-item-title">${item.name}</span><span class="shop-item-sub">${sub}</span></span><span class="shop-item-meta">${metaLabel}</span>`;
    if (!locked) btn.addEventListener("click", () => buyCosmetic(kind, item.id));
    list.appendChild(btn);
  };
  for (const item of SKINS.filter((s) => s.premium)) {
    const owned = isSkinOwned(item.id);
    const active = activeSkin().id === item.id;
    addItem("skin", item, "премиум-окрас", owned ? (active ? "выбран" : "выбрать") : `${item.cost}`);
  }
  for (const item of TRAILS) {
    const owned = isTrailOwned(item.id);
    const active = activeTrail().id === item.id;
    addItem("trail", item, item.sub, owned ? (active ? "выбран" : "выбрать") : `${item.cost}`);
  }
  for (const item of FRAMES) {
    const owned = isFrameOwned(item.id);
    const active = activeFrame().id === item.id;
    addItem("frame", item, item.sub, owned ? (active ? "выбран" : "выбрать") : `${item.cost}`);
  }
}

function openShop(returnTo = "home") {
  unlockAudio();
  sfxUiTap(1);
  state.shopReturn = returnTo || "home";
  hideFlowScreens();
  screenOverEl?.classList.add("hidden");
  screenContinueEl?.classList.add("hidden");
  renderShop();
  document.getElementById("screen-donate")?.classList.remove("hidden");
  window.OttiskAnalytics?.track("shop_open");
}

function openDonate() {
  openShop("home");
}

function closeDonate() {
  document.getElementById("screen-donate")?.classList.add("hidden");
  if (state.running) return;
  const back = state.shopReturn || "home";
  if (back === "hero") showHeroPick();
  else if (back === "continue") {
    screenContinueEl?.classList.remove("hidden");
    refreshContinueUi();
  } else if (back === "over") {
    screenOverEl?.classList.remove("hidden");
  } else {
    showHomeMenu();
  }
  updateDonateThanks();
  renderShopProgress();
}

function renderShop() {
  if (!state.meta) return;
  const bal = document.getElementById("shop-balance");
  if (bal) bal.textContent = `${state.meta.marks || 0} следов`;
  const goal = document.getElementById("shop-hero-goal");
  const iapLocked = HEROES.filter((h) => h.iap && !isHeroOwned(h.id));
  const target = nextLockedPremiumHero();
  if (goal) {
    if (iapLocked.length) {
      const next = iapLocked[0];
      goal.textContent = `Дальше по героям · ${next.name} · ${next.priceLabel} · ${next.blurb || next.ability}`;
    } else if (target) {
      goal.textContent = `До героя «${target.name}» · ещё ${Math.max(0, target.cost - (state.meta.marks || 0))} следов`;
    } else {
      goal.textContent = "Все платные герои открыты. Можно взять косметику или поддержать игру.";
    }
  }
  const packSub = document.getElementById("shop-pack-sub");
  const packBtn = document.getElementById("btn-shop-pack");
  const pay = storePayLabel();
  const money = canOfferRealMoney();
  if (packSub) {
    packSub.textContent = !money
      ? (window.OttiskI18n?.locale === "en" ? "billing unavailable" : "оплата недоступна")
      : (isNativeShop() ? `купить следы · ${pay}` : `купить следы · ${pay}`);
  }
  if (packBtn) {
    packBtn.classList.toggle("hidden", !money);
    packBtn.disabled = !money;
  }
  const starterBtn = document.getElementById("btn-shop-starter");
  if (starterBtn) {
    const owned = !!state.meta.starterPackBought;
    starterBtn.classList.toggle("hidden", !money && !owned);
    starterBtn.classList.toggle("owned", owned);
    starterBtn.disabled = owned || !money;
    starterBtn.innerHTML = owned
      ? `<span class="btn-main">Стартовый пак · твой</span><span class="btn-sub">скат + удильщик + наутилус</span>`
      : `<span class="btn-main">Стартовый пак · ${STARTER_PACK_PRICE_LABEL}</span><span class="btn-sub">3 героя + 60 следов · ${pay}</span>`;
  }
  const restoreBtn = document.getElementById("btn-restore");
  if (restoreBtn) restoreBtn.classList.toggle("hidden", !isNativeShop());
  renderShopIapHeroes();
  renderShopCosmetics();
  renderDonateOptions();
  updateDonateThanks();
}

function renderShopIapHeroes() {
  const list = document.getElementById("shop-iap-heroes");
  if (!list || !state.meta) return;
  list.textContent = "";
  const money = canOfferRealMoney();
  const pay = storePayLabel();
  for (const hero of HEROES.filter((h) => h.iap)) {
    const owned = isHeroOwned(hero.id);
    if (!owned && !money) continue;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `btn btn-secondary shop-sub-btn${owned ? " owned" : ""}`;
    btn.disabled = !owned && !money;
    btn.innerHTML = `<span class="btn-main">${hero.name} · ${owned ? "твой" : (hero.priceLabel || "")}</span><span class="btn-sub">${owned ? `${hero.blurb || hero.ability} · нажми, чтобы выбрать` : `${hero.blurb || hero.ability} · ${pay}`}</span>`;
    btn.addEventListener("click", () => {
      if (owned) {
        state.meta.activeHero = hero.id;
        saveMeta();
        renderHeroPicker();
        paintHeroPortrait();
        renderShop();
        showToast(`${hero.name} · выбран`);
        return;
      }
      if (!money) {
        showToast(window.OttiskI18n?.locale === "en" ? "billing unavailable" : "оплата недоступна");
        return;
      }
      purchaseIapHero(hero.id).catch(() => showToast("покупка недоступна"));
    });
    list.appendChild(btn);
  }
  if (!list.children.length) {
    const empty = document.createElement("p");
    empty.className = "shop-section-hint";
    empty.textContent = money
      ? ""
      : (window.OttiskI18n?.locale === "en"
        ? "Paid heroes unlock after Google Play products are configured."
        : "Платные герои появятся после настройки продуктов Google Play.");
    if (empty.textContent) list.appendChild(empty);
  }
}

async function purchaseDonateTip(tipId) {
  if (!state.meta) return;
  const tip = DONATE_TIPS.find((t) => t.id === tipId);
  if (!tip) return;
  const native = window.OttiskNative;
  if (isNativeShop()) {
    showToast("открываем донат…");
    const result = await native.purchase(tip.productId).catch(() => null);
    if (result?.ok) {
      state.meta.donateCount = (state.meta.donateCount || 0) + 1;
      state.meta.donateMarks = (state.meta.donateMarks || 0) + tip.marks;
      saveMeta();
      awardMarks(tip.marks, { metaOnly: true });
      goalChime();
      showToast(`спасибо · +${tip.marks} следов`);
      updateDonateThanks();
      renderDonateOptions();
      return;
    }
    showToast(result?.message || "донат отменён");
    return;
  }
  // Web: honest external donate page (no fake IAP / free marks).
  try {
    const url = new URL(DONATE_URL);
    url.searchParams.set("tip", tip.id);
    url.searchParams.set("marks", String(tip.marks));
    window.open(url.toString(), "_blank", "noopener,noreferrer");
  } catch (_) {
    location.href = `./donate.html?tip=${encodeURIComponent(tip.id)}`;
  }
  showToast("открыли страницу доната");
}

async function purchaseMarksPack() {
  if (!state.meta) return;
  const native = window.OttiskNative;
  if (isNativeShop()) {
    showToast("открываем покупку…");
    const result = await native.purchase(MARKS_PACK_PRODUCT_ID).catch(() => null);
    if (result?.ok) {
      state.meta.iapMarksBought = (state.meta.iapMarksBought || 0) + 1;
      saveMeta();
      awardMarks(MARKS_PACK_AMOUNT, { metaOnly: true });
      showToast(`+${MARKS_PACK_AMOUNT} следов`);
      renderShop();
      renderShopProgress();
      refreshContinueUi();
      updateHeroAbilityHint();
      return;
    }
    showToast(result?.message || "покупка отменена");
    return;
  }
  try {
    window.open(`${DONATE_URL}?tip=marks`, "_blank", "noopener,noreferrer");
  } catch (_) {
    location.href = "./donate.html?tip=marks";
  }
  showToast(window.OttiskI18n?.locale === "en"
    ? `on the site · or in ${storePayLabel()}`
    : `на сайте · или в ${storePayLabel()}`);
}

async function maybeAskRate() {
  if (!state.meta || state.meta.ratePrompted) {
    btnRate?.classList.add("hidden");
    return;
  }
  const strong = state.score >= 40 || state.score >= state.best;
  const enoughRuns = (state.meta.runs || 0) >= 3;
  if (!strong || !enoughRuns) {
    btnRate?.classList.add("hidden");
    return;
  }
  btnRate?.classList.remove("hidden");
  // Native stores: auto-trigger in-app review once after a strong run.
  if (window.OttiskNative?.isNative && !state.meta.rateAutoAsked) {
    state.meta.rateAutoAsked = true;
    saveMeta();
    await requestReview().catch(() => {});
  }
}

async function requestReview() {
  if (!state.meta) return;
  state.meta.ratePrompted = true;
  saveMeta();
  btnRate?.classList.add("hidden");
  const native = window.OttiskNative;
  if (native?.isNative && typeof native.requestReview === "function") {
    await native.requestReview().catch(() => {});
    showToast(window.OttiskI18n?.locale === "en" ? "thanks" : "спасибо");
    return;
  }
  showToast(window.OttiskI18n?.locale === "en"
    ? "thanks — rate us on the store page"
    : "спасибо — оценка будет в магазине");
}

function awardMarks(amount, opts = {}) {
  if (!state.meta || !amount) return;
  const gained = Math.max(0, Math.round(amount));
  state.meta.marks = Math.max(0, Math.round((state.meta.marks || 0) + gained));
  if (!opts.metaOnly) state.runMarks += gained;
  saveMeta();
  updateEconomyLabels();
  renderDaily();
  renderSkinMeta();
  if (opts.x != null && opts.y != null) {
    floatText(opts.x, opts.y, `+${gained} следов`, opts.color || cssVar("--gold", "#f2c15a"), opts.size || 15);
  }
}

function checkScoreMilestones() {
  for (const mile of SCORE_MILESTONES) {
    if (state.score < mile.at || state.milestonesHit.includes(mile.at)) continue;
    state.milestonesHit.push(mile.at);
    pulseUnlock(cssVar("--gold", "#ffe898"), 0.1);
    goalChime();
    buzz([8, 16, 8]);
    awardMarks(mile.marks, {
      x: state.width * 0.5,
      y: state.height * 0.2,
      color: cssVar("--gold", "#f2c15a"),
      size: 16,
    });
  }
}

function evaluateDaily() {
  if (!state.meta || state.meta.dailyDone) return false;
  const daily = currentDailyDef();
  if (!daily || !daily.check(state)) {
    renderDaily();
    return false;
  }
  state.meta.dailyDone = true;
  awardMarks(DAILY_QUEST_REWARD, {
    x: state.life?.x ?? state.width * 0.5,
    y: state.life?.y ?? state.height * 0.22,
    color: cssVar("--life", "#6fd9b0"),
    size: 17,
  });
  showToast(`ежедневка: ${daily.title}`);
  goalChime();
  buzz([10, 18, 10]);
  renderDaily();
  return true;
}

function syncMetaFromBest() {
  if (!state.meta) return [];
  const prev = new Set(state.meta.unlockedSkins);
  const hadPremiumSkin = !!skinById(state.meta.activeSkin).premium && state.meta.premiumUnlocked.includes(state.meta.activeSkin);
  state.meta.best = Math.max(state.meta.best, state.score);
  state.best = state.meta.best;
  state.meta.unlockedSkins = SKINS.filter((skin) => !skin.premium && !skin.seasonal && state.meta.best >= skin.at).map((skin) => skin.id);
  const newlyUnlocked = state.meta.unlockedSkins.filter((id) => !prev.has(id));
  if (!isSkinOwned(state.meta.activeSkin) || (!hadPremiumSkin && newlyUnlocked.length)) {
    state.meta.activeSkin = newlyUnlocked[newlyUnlocked.length - 1]
      || state.meta.unlockedSkins[state.meta.unlockedSkins.length - 1]
      || "ink";
  }
  saveMeta();
  updateBestLabels();
  updateEconomyLabels();
  renderDaily();
  renderSkinMeta();
  return newlyUnlocked;
}

function renderSkinMeta() {
  const skin = activeSkin();
  app.dataset.skin = skin.id;
  if (skinNameEl) skinNameEl.textContent = skin.name;
  if (!skinUnlocksEl) return;
  skinUnlocksEl.textContent = "";
  for (const item of SKINS) {
    const pill = document.createElement("button");
    const owned = isSkinOwned(item.id);
    const premiumLocked = !!item.premium && !owned;
    const scoreLocked = !item.premium && !owned;
    pill.type = "button";
    pill.className = `skin-pill${owned ? " on" : ""}${item.id === skin.id ? " active" : ""}${item.premium ? " premium" : ""}${!owned ? " locked" : ""}`;
    pill.disabled = scoreLocked;
    pill.setAttribute("aria-pressed", item.id === skin.id ? "true" : "false");
    if (owned) {
      pill.textContent = item.id === skin.id ? `${item.name} · выбран` : item.name;
      pill.addEventListener("click", () => {
        if (!state.meta || state.meta.activeSkin === item.id) return;
        state.meta.activeSkin = item.id;
        saveMeta();
        renderSkinMeta();
      });
    } else if (premiumLocked) {
      pill.textContent = `${item.name} · ${item.cost} следов`;
      pill.addEventListener("click", () => {
        if (!state.meta) return;
        if ((state.meta.marks || 0) < item.cost) {
          showToast(`нужно ${item.cost} следов`);
          return;
        }
        state.meta.marks = Math.max(0, state.meta.marks - item.cost);
        state.meta.premiumUnlocked = [...new Set([...(state.meta.premiumUnlocked || []), item.id])];
        state.meta.activeSkin = item.id;
        saveMeta();
        updateEconomyLabels();
        renderSkinMeta();
        showToast(`куплен оттиск: ${item.name}`);
      });
    } else {
      pill.textContent = `${item.name} · рекорд ${item.at}`;
    }
    skinUnlocksEl.appendChild(pill);
  }
}

function updateBestLabels() {
  bestStartEl.textContent = String(state.best);
  bestOverEl.textContent = String(state.best);
}

function mutationForScore(score) {
  let current = MUTATIONS[0];
  for (const mut of MUTATIONS) {
    if (score >= mut.at) current = mut;
  }
  return current;
}

function hasMut(id) {
  return state.unlockedMuts.includes(id);
}

function updateMutationUi() {
  if (!mutTrackFillEl) return;
  const currentIdx = MUTATIONS.findIndex((m) => m.id === state.mutation.id);
  const next = MUTATIONS[currentIdx + 1];
  if (!next) {
    mutTrackFillEl.style.width = "100%";
    return;
  }
  const span = Math.max(1, next.at - state.mutation.at);
  const progress = clamp((state.score - state.mutation.at) / span, 0, 1);
  mutTrackFillEl.style.width = `${Math.round(progress * 100)}%`;
}

function applyThemeFromScore(announce = false) {
  const theme = Math.floor(state.score / 100) % THEME_COUNT;
  const changed = theme !== state.theme;
  if (!changed && !announce) return;
  state.theme = theme;
  app.dataset.theme = String(theme);
  applyContentBiome();
  refreshCssCache();
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", cssVar("--bg0", "#241828"));
  if (changed && announce && state.score >= 100) {
    pulseUnlock(cssVar("--accent-a", "#ff9a62"), 0.18);
    burst(state.width * 0.5, state.height * 0.4, cssVar("--accent-a", "#ff9a62"), 28, 5.2);
  }
}

function updateScoreUi(pop = false) {
  if (!pop && uiCache.score === state.score) return;
  uiCache.score = state.score;
  scoreEl.textContent = String(state.score);
  if (pop) {
    scoreEl.classList.remove("pop");
    void scoreEl.offsetWidth;
    scoreEl.classList.add("pop");
  }
}

function updateHungerUi() {
  const pct = Math.round(clamp((state.hunger / Math.max(1, state.maxHunger || 100)) * 100, 0, 100));
  if (uiCache.hunger !== pct) {
    uiCache.hunger = pct;
    heatFillEl.style.width = `${pct}%`;
    heatPctEl.textContent = `${pct}%`;
    heatEl.classList.toggle("low", pct < 30);
    heatEl.classList.toggle("critical", pct < 18);
  }
  if (pct < 28 && state.running && state.life) tipOnce("hunger", "ЕШЬ СВЕТ", 1500);
}

function renderSkinResult() {
  const current = activeSkin().name;
  if (!state.runUnlockedSkins.length) {
    skinResultEl.textContent = `оттиск: ${current}`;
    return;
  }
  const names = state.runUnlockedSkins.map((id) => skinById(id).name).join(" · ");
  skinResultEl.textContent = `оттиск: ${current} · новый: ${names}`;
}

function renderDailyResult() {
  const daily = currentDailyDef();
  if (!dailyResultEl || !daily) return;
  if (state.meta?.dailyDone) {
    dailyResultEl.textContent = `ежедневка: ${daily.title} · +${DAILY_QUEST_REWARD} следов`;
  } else {
    dailyResultEl.textContent = `ежедневка: ${daily.title} · ${daily.label(state)}`;
  }
  if (marksResultEl) {
    marksResultEl.textContent = state.runMarks > 0
      ? `за забег · +${state.runMarks} следов`
      : "за забег · следы не набраны";
  }
}

function renderNextGoal() {
  if (!nextGoalEl || !state.meta) return;
  const daily = currentDailyDef();
  if (daily && !state.meta.dailyDone) {
    nextGoalEl.textContent = `следующая цель · ${daily.title}: ${daily.label(state)}`;
    return;
  }
  if (!state.meta.weekRewardTaken) {
    const quest = currentWeeklyDef();
    const progress = Math.min(quest.target, state.meta.weekProgress || 0);
    nextGoalEl.textContent = `следующая цель · ${quest.title}: ${progress}/${quest.target} ${quest.unit} · +${WEEKLY_REWARD}`;
    return;
  }
  const skin = nextScoreSkinGoal();
  if (skin) {
    nextGoalEl.textContent = `следующая цель · оттиск «${skin.name}»: рекорд ${state.meta.best || 0}/${skin.at}`;
    return;
  }
  const hero = nextLockedPremiumHero();
  if (hero) {
    const have = Math.min(state.meta.marks || 0, hero.cost);
    nextGoalEl.textContent = `следующая цель · герой «${hero.name}»: ${have}/${hero.cost} следов`;
    return;
  }
  const pearl = SKINS.find((s) => s.id === "pearl");
  if (pearl && !isSkinOwned("pearl")) {
    const have = Math.min(state.meta.marks || 0, pearl.cost);
    nextGoalEl.textContent = `следующая цель · окрас «жемчуг»: ${have}/${pearl.cost} следов`;
    return;
  }
  nextGoalEl.textContent = "следующая цель · новый рекорд";
}

function syncMutation() {
  const now = mutationForScore(state.score);
  const newly = MUTATIONS.filter((mut) => state.score >= mut.at && !state.unlockedMuts.includes(mut.id));
  for (const mut of newly) {
    state.unlockedMuts.push(mut.id);
    mutationDing();
    pulseUnlock(cssVar("--life", "#7affd4"), 0.13);
    burst(state.width * 0.5, state.height * 0.38, cssVar("--life", "#7affd4"), 22, 4.8);
    if (mut.id === "bloom") state.bloomPulse = 1;
  }
  state.mutation = now;
  updateMutationUi();
}

function afterScoreChange(pop = false) {
  updateScoreUi(pop);
  const newlyUnlockedSkins = syncMetaFromBest();
  if (newlyUnlockedSkins.length) {
    state.runUnlockedSkins.push(...newlyUnlockedSkins.filter((id) => !state.runUnlockedSkins.includes(id)));
    pulseUnlock(activeSkin().color, 0.12);
  }
  syncMutation();
  applyThemeFromScore(pop);
  checkScoreMilestones();
  syncStoryChapter();
  earnProgressionFromBest();
  evaluateDaily();
}

function addScore(amount, x, y, opts = {}) {
  if (!amount) return;
  let gained = amount;
  if (opts.combo !== false && (state.fever || state.combo >= 4)) {
    gained = Math.max(amount, Math.round(amount * 1.5));
  }
  state.score += gained;
  if (opts.combo !== false) {
    state.combo += 1;
    state.comboClock = 2.8;
    state.stats.maxCombo = Math.max(state.stats.maxCombo, state.combo);
    const feverNow = state.combo >= 5;
    if (feverNow && !state.fever) {
      pulseUnlock(cssVar("--ember", "#ff9a62"), 0.11);
      state.bloomPulse = Math.max(state.bloomPulse, 0.55);
    }
    state.fever = feverNow;
    if (state.combo >= 2) showCombo(feverNow ? `×${state.combo}` : `×${state.combo}`, feverNow);
    if (state.combo === 8) {
      awardMarks(2, {
        x: state.width * 0.5,
        y: state.height * 0.16,
        color: cssVar("--gold", "#f2c15a"),
        size: 14,
      });
      showToast("цепь ×8");
    }
    if (hasMut("bloom") && state.combo > 0 && state.combo % 6 === 0 && state.life) {
      state.bloomPulse = 1;
      // Spawn at edges — never on top of the player (prevents AFK magnet farm)
      for (let i = 0; i < 2; i += 1) spawnSpark({ edge: true, type: Math.random() < 0.12 ? "rare" : null });
      pulseUnlock(cssVar("--gold", "#ffe898"), 0.1);
    }
  }
  if (!opts.silentFloat && x != null && y != null) {
    floatText(x, y, `+${gained}`, opts.color || cssVar("--gold", "#f2c15a"));
  }
  afterScoreChange(true);
}

function resize() {
  const prevW = state.width || 1;
  const prevH = state.height || 1;
  const rect = stage.getBoundingClientRect();
  const canvasRect = canvas.getBoundingClientRect();
  const qualityDpr = state.qualityTier === "low" ? 1 : state.qualityTier === "medium" ? 1.5 : 2;
  state.dpr = Math.min(window.devicePixelRatio || 1, qualityDpr);
  state.width = Math.max(1, Math.floor(rect.width));
  state.height = Math.max(1, Math.floor(rect.height));
  canvas.width = Math.floor(state.width * state.dpr);
  canvas.height = Math.floor(state.height * state.dpr);
  canvas.style.width = `${state.width}px`;
  canvas.style.height = `${state.height}px`;
  ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
  pointerCache.left = canvasRect.left;
  pointerCache.top = canvasRect.top;
  pointerCache.scaleX = state.width / Math.max(1, canvasRect.width);
  pointerCache.scaleY = state.height / Math.max(1, canvasRect.height);
  invalidateBgCache();
  const sx = state.width / prevW;
  const sy = state.height / prevH;
  if (state.life) {
    state.life.x *= sx;
    state.life.y *= sy;
  }
  if (state.life2) {
    state.life2.x *= sx;
    state.life2.y *= sy;
  }
  if (state.echo) {
    state.echo.x *= sx;
    state.echo.y *= sy;
  }
  for (const list of [state.sparks, state.hunters, state.veins, state.particles, state.floaters]) {
    for (const item of list) {
      if ("x" in item) item.x *= sx;
      if ("y" in item) item.y *= sy;
    }
  }
}

function pointerPos(e) {
  return {
    x: (e.clientX - pointerCache.left) * pointerCache.scaleX,
    y: (e.clientY - pointerCache.top) * pointerCache.scaleY,
  };
}

function clampLife() {
  if (!state.life) return;
  const pad = state.life.r * 0.52;
  state.life.x = clamp(state.life.x, pad, state.width - pad);
  state.life.y = clamp(state.life.y, pad, state.height - pad);
}

function nearestSpark(x, y) {
  let best = null;
  let bestD = Infinity;
  for (const spark of state.sparks) {
    const d = dist(x, y, spark.x, spark.y);
    if (d < bestD) {
      bestD = d;
      best = spark;
    }
  }
  return best;
}

function setHoldVisual(pct, target) {
  if (holdFillEl) holdFillEl.style.width = target === "start" ? pct : "0%";
  if (holdFillOverEl) holdFillOverEl.style.width = target === "retry" ? pct : "0%";
}

function clearHold() {
  state.hold = null;
  if (holdFillEl) holdFillEl.style.width = "0%";
  if (holdFillOverEl) holdFillOverEl.style.width = "0%";
}

function bindHoldButton(button, target) {
  button.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    if (state.running) return;
    unlockAudio();
    syncMenuMusic();
    state.hold = { target, pointerId: e.pointerId, progress: 0 };
    setHoldVisual("0%", target);
    sfxUiTap(0);
    try {
      button.setPointerCapture(e.pointerId);
    } catch (_) {
      // noop
    }
  });
  const release = (e) => {
    if (!state.hold) return;
    if (e && state.hold.pointerId !== e.pointerId) return;
    if (!state.running && state.hold.progress < 1) showToast("держи кнопку");
    clearHold();
  };
  button.addEventListener("pointerup", release);
  button.addEventListener("pointercancel", release);
  button.addEventListener("lostpointercapture", () => clearHold());
  button.addEventListener("click", (e) => e.preventDefault());
}

function canOfferRewardedContinue() {
  if (state.rewardedContinueUsed) return false;
  const native = window.OttiskNative;
  return !!(native?.isNative && native.adsAvailable && typeof native.showRewardedAd === "function");
}

function continueOffer() {
  const used = state.continuesUsed || 0;
  if (used >= MAX_CONTINUES_PER_RUN) {
    return { ok: false, kind: "none", label: "Лимит", sub: "забег исчерпан", cost: 0 };
  }
  if (used < FREE_CONTINUES_PER_RUN) {
    return { ok: true, kind: "free", label: "Продолжить", sub: "бесплатно · 1 раз", cost: 0 };
  }
  if (canOfferRewardedContinue()) {
    return { ok: true, kind: "rewarded", label: "Продолжить", sub: "за рекламу · 1 раз", cost: 0 };
  }
  const marks = state.meta?.marks || 0;
  if (marks >= MARKS_CONTINUE_COST) {
    return {
      ok: true,
      kind: "marks",
      label: "Продолжить",
      sub: `${MARKS_CONTINUE_COST} следов · есть ${marks}`,
      cost: MARKS_CONTINUE_COST,
    };
  }
  return {
    ok: canOfferRealMoney(),
    kind: canOfferRealMoney() ? "iap" : "none",
    label: "Продолжить",
    sub: canOfferRealMoney() ? `${CONTINUE_PRICE_LABEL} · ${storePayLabel()}` : "нужны следы",
    cost: 0,
  };
}

function canOfferContinue() {
  return continueOffer().kind !== "none";
}

function refreshContinueUi() {
  const offer = continueOffer();
  const shopBtn = document.getElementById("btn-continue-shop");
  const iapBtn = document.getElementById("btn-continue-iap");
  const rewardedBtn = document.getElementById("btn-continue-rewarded");
  if (continueLabelEl) continueLabelEl.textContent = offer.label;
  if (continueSubEl) continueSubEl.textContent = offer.sub;
  if (continueHintEl) {
    if (offer.kind === "free") {
      continueHintEl.textContent = "Один бесплатный шанс за забег. Счёт сохранится.";
    } else if (offer.kind === "rewarded") {
      continueHintEl.textContent = "Короткое видео — и ещё один шанс. Счёт сохранится.";
    } else if (offer.kind === "marks") {
      continueHintEl.textContent = `Можно за ${MARKS_CONTINUE_COST} следов или докупить за ${CONTINUE_PRICE_LABEL}.`;
    } else if (offer.kind === "iap") {
      continueHintEl.textContent = `Дополнительный шанс за ${CONTINUE_PRICE_LABEL}. В ${storePayLabel()} — сразу, на сайте — донат.`;
    } else {
      continueHintEl.textContent = "Лимит продолжений за этот забег исчерпан.";
    }
  }
  if (btnContinue) {
    btnContinue.disabled = !offer.ok;
    btnContinue.classList.toggle("hidden", offer.kind === "none" || offer.kind === "rewarded");
  }
  if (rewardedBtn) {
    const showRewarded = offer.kind === "rewarded" || (canOfferRewardedContinue() && offer.kind !== "free" && offer.kind !== "none");
    rewardedBtn.classList.toggle("hidden", !showRewarded);
    rewardedBtn.disabled = !showRewarded;
  }
  if (iapBtn) {
    const showIap = offer.kind === "marks" || offer.kind === "iap";
    iapBtn.classList.toggle("hidden", !showIap);
    iapBtn.disabled = !showIap;
  }
  if (shopBtn) {
    const showShop = offer.kind === "iap";
    shopBtn.classList.toggle("hidden", !showShop);
  }
}

function showContinueScreen(reason) {
  state.pendingDeathReason = reason;
  state.continueBusy = false;
  if (continueReasonEl) continueReasonEl.textContent = reason;
  refreshContinueUi();
  statusEl.classList.add("hidden");
  screenOverEl.classList.add("hidden");
  screenContinueEl?.classList.remove("hidden");
  clearHold();
}


function packApi() {
  return window.OttiskPack || null;
}

function ensureSeasonalUnlock() {
  if (!state.meta) return;
  const pack = packApi();
  if (!pack) return;
  const cos = pack.seasonCosmetic(state.meta.weekId || weekKey());
  const unlocks = new Set(state.meta.seasonalUnlocks || []);
  unlocks.add(cos.skin);
  unlocks.add(cos.frame);
  state.meta.seasonalUnlocks = [...unlocks];
  if (!state.meta.unlockedSkins.includes(cos.skin)) state.meta.unlockedSkins.push(cos.skin);
  if (!(state.meta.unlockedFrames || []).includes(cos.frame)) {
    state.meta.unlockedFrames = [...new Set([...(state.meta.unlockedFrames || ["none"]), cos.frame])];
  }
  saveMeta();
}

function sfxHeroAbility(kind = "pulse") {
  if (!soundEnabled()) return;
  if (kind === "eel") {
    playNoise({ gain: 0.03, dur: 0.12, filterFreq: 2800 });
    playOsc({ freq: 880, endFreq: 220, type: "sawtooth", gain: 0.02, dur: 0.1, filterFreq: 2400 });
  } else if (kind === "whale") {
    playOsc({ freq: 90, endFreq: 55, type: "sine", gain: 0.045, dur: 0.35, attack: 0.02, filterFreq: 400 });
    playOsc({ freq: 180, endFreq: 110, type: "triangle", gain: 0.02, dur: 0.3, delay: 0.05 });
  } else if (kind === "squid") {
    playOsc({ freq: 220, endFreq: 80, type: "sine", gain: 0.03, dur: 0.22, filterFreq: 600 });
    playNoise({ gain: 0.018, dur: 0.16, filterFreq: 900 });
  } else if (kind === "seahorse") {
    playOsc({ freq: 620, endFreq: 980, type: "triangle", gain: 0.028, dur: 0.16, filterFreq: 2600 });
    playOsc({ freq: 980, endFreq: 420, type: "sine", gain: 0.018, dur: 0.2, delay: 0.06 });
  } else if (kind === "manta") {
    playOsc({ freq: 340, endFreq: 180, type: "triangle", gain: 0.025, dur: 0.14, filterFreq: 1800 });
  } else if (kind === "sub") {
    playOsc({ freq: 160, endFreq: 90, type: "square", gain: 0.016, dur: 0.08, filterFreq: 900 });
  } else {
    sfxPulse();
  }
}

function showMechanicCard(id, title, body) {
  if (!state.meta) return;
  const seen = state.meta.seenMechanicCards || [];
  if (seen.includes(id)) return;
  state.meta.seenMechanicCards = [...seen, id];
  saveMeta();
  const el = document.getElementById("mechanic-card");
  const titleEl = document.getElementById("mechanic-card-title");
  const bodyEl = document.getElementById("mechanic-card-body");
  if (!el || !titleEl || !bodyEl) {
    showCoach(`${title}: ${body}`, 2600, true);
    return;
  }
  titleEl.textContent = title;
  bodyEl.textContent = body;
  el.classList.remove("hidden");
  clearTimeout(showMechanicCard.timer);
  showMechanicCard.timer = setTimeout(() => el.classList.add("hidden"), 3200);
}

function evaluateTrophies(runCtx = {}) {
  if (!state.meta) return [];
  const pack = packApi();
  const list = pack?.TROPHIES || [];
  const have = new Set(state.meta.trophies || []);
  const unlocked = [];
  const ctx = {
    best: state.meta.best || 0,
    score: state.score || 0,
    wordDone: !!state.wordDone || !!runCtx.wordDone,
    meta: state.meta,
  };
  for (const t of list) {
    if (have.has(t.id)) continue;
    if (t.check(ctx)) {
      have.add(t.id);
      unlocked.push(t);
    }
  }
  if (unlocked.length) {
    state.meta.trophies = [...have];
    saveMeta();
    const first = unlocked[0];
    showToast(`трофей · ${first.title}`);
    goalChime();
    for (const trophy of unlocked) {
      window.OttiskNative?.unlockAchievement?.(trophy.id).catch?.(() => {});
    }
  }
  return unlocked;
}

function renderTrophyList() {
  const list = document.getElementById("trophy-list");
  if (!list || !state.meta) return;
  const pack = packApi();
  const defs = pack?.TROPHIES || [];
  const have = new Set(state.meta.trophies || []);
  list.textContent = "";
  for (const t of defs) {
    const row = document.createElement("div");
    const on = have.has(t.id);
    row.className = `trophy-row${on ? " on" : ""}`;
    row.innerHTML = `<strong>${t.title}</strong><span>${on ? "получен" : t.sub}</span>`;
    list.appendChild(row);
  }
}

async function purchaseStarterPack() {
  if (!state.meta) return false;
  if (state.meta.starterPackBought) {
    showToast("стартовый пак уже твой");
    return true;
  }
  if (isNativeShop()) {
    showToast(`открываем · ${STARTER_PACK_PRICE_LABEL}`);
    const result = await window.OttiskNative.purchase(STARTER_PACK_PRODUCT_ID).catch(() => null);
    if (result?.ok) {
      grantStarterPack(true);
      return true;
    }
    showToast(result?.message || "покупка отменена");
    return false;
  }
  try {
    const url = new URL(DONATE_URL);
    url.searchParams.set("tip", "starter");
    url.searchParams.set("product", STARTER_PACK_PRODUCT_ID);
    window.open(url.toString(), "_blank", "noopener,noreferrer");
  } catch (_) {
    location.href = "./donate.html?tip=starter";
  }
  showToast(`стартовый пак · ${STARTER_PACK_PRICE_LABEL}`);
  return false;
}

function grantStarterPack(fromPurchase = false) {
  if (!state.meta) return;
  if (state.meta.starterPackBought) {
    showToast("стартовый пак уже твой");
    return;
  }
  state.meta.starterPackBought = true;
  state.meta.unlockedHeroes = [...new Set([...(state.meta.unlockedHeroes || []), ...STARTER_PACK_HEROES])];
  awardMarks(STARTER_PACK_MARKS, { metaOnly: true });
  ensureSeasonalUnlock();
  saveMeta();
  renderHeroPicker();
  renderShop();
  renderDeathOffers();
  renderTrophyList();
  updateEconomyLabels();
  goalChime();
  showToast(fromPurchase ? "пак открыт · 3 героя + 60 следов" : "стартовый пак");
}

function resolveNextStep() {
  if (!state.meta) return null;
  const daily = currentDailyDef();
  if (daily && !state.meta.dailyDone) {
    return {
      title: `Цель · ${daily.title}`,
      sub: daily.label(state),
      run: () => {
        state.meta.dailyModeEnabled = true;
        saveMeta();
        updateModeToggles();
        hideFlowScreens();
        screenOverEl.classList.add("hidden");
        startGame();
      },
    };
  }
  if (!state.meta.weekRewardTaken) {
    const quest = currentWeeklyDef();
    const progress = Math.min(quest.target, state.meta.weekProgress || 0);
    return {
      title: `Цель · ${quest.title}`,
      sub: `${progress}/${quest.target} ${quest.unit}`,
      run: () => {
        screenOverEl.classList.add("hidden");
        startGame();
      },
    };
  }
  const hero = nextLockedPremiumHero();
  if (hero) {
    return {
      title: `Открыть · ${hero.name}`,
      sub: `${Math.min(state.meta.marks || 0, hero.cost)}/${hero.cost} следов`,
      run: () => {
        goToMenu();
        document.getElementById("btn-shop")?.click();
      },
    };
  }
  if ((state.meta.ghostScore || 0) >= 20 && state.meta.ghostRaceEnabled !== false) {
    return {
      title: "Гонка с призраком",
      sub: `лучший след · ${state.meta.ghostScore}`,
      run: () => {
        state.meta.ghostRaceEnabled = true;
        saveMeta();
        updateModeToggles();
        screenOverEl.classList.add("hidden");
        startGame();
      },
    };
  }
  return {
    title: "Новый рекорд",
    sub: "ещё один забег",
    run: () => {
      screenOverEl.classList.add("hidden");
      startGame();
    },
  };
}

function nextDeathOfferHero() {
  return HEROES.find((h) => h.iap && !isHeroOwned(h.id)) || null;
}

function renderDeathOffers() {
  const box = document.getElementById("death-offers");
  if (!box || !state.meta) return;
  box.textContent = "";
  const step = resolveNextStep();
  if (step) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn btn-secondary death-offer";
    btn.innerHTML = `<span class="btn-main">${step.title}</span><span class="btn-sub">${step.sub}</span>`;
    btn.addEventListener("click", () => step.run());
    box.appendChild(btn);
  }
  const shareSub = document.getElementById("share-sub");
  if (shareSub) {
    shareSub.textContent = state.meta.dailyDone
      ? `ежедневка · +${DAILY_QUEST_REWARD} следов`
      : state.dailyMode
        ? "забег дня · Stories"
        : "Stories · волна и герой";
  }
  box.classList.toggle("hidden", !box.childElementCount);
}

function updateModeToggles() {
  const dailyBtn = document.getElementById("btn-mode-daily");
  const coopBtn = document.getElementById("btn-mode-coop");
  const ghostBtn = document.getElementById("btn-mode-ghost");
  if (dailyBtn) {
    dailyBtn.classList.toggle("on", !!state.meta?.dailyModeEnabled);
    dailyBtn.setAttribute("aria-pressed", state.meta?.dailyModeEnabled ? "true" : "false");
  }
  if (coopBtn) {
    coopBtn.classList.toggle("on", !!state.meta?.coopEnabled);
    coopBtn.setAttribute("aria-pressed", state.meta?.coopEnabled ? "true" : "false");
  }
  if (ghostBtn) {
    const on = state.meta?.ghostRaceEnabled !== false;
    ghostBtn.classList.toggle("on", on);
    ghostBtn.setAttribute("aria-pressed", on ? "true" : "false");
  }
  document.querySelectorAll(".run-mode-btn").forEach((button) => {
    const selected = button.dataset.runMode === (state.meta?.runMode || "normal");
    button.classList.toggle("on", selected);
    button.setAttribute("aria-pressed", selected ? "true" : "false");
  });
  const note = document.getElementById("mode-note");
  if (note) {
    const bits = [];
    if (state.meta?.dailyModeEnabled) bits.push("забег дня");
    if (state.meta?.coopEnabled) bits.push("дуэт");
    if (state.meta?.ghostRaceEnabled !== false && (state.meta?.ghostScore || 0) >= 20) bits.push("призрак");
    if (state.meta?.runMode === "endless") bits.push(tr("mode_endless", "бесконечный океан"));
    if (state.meta?.runMode === "boss") bits.push(tr("mode_boss", "босс-раш"));
    if (state.meta?.runMode === "calm") bits.push(tr("mode_calm", "спокойный режим"));
    const pack = packApi();
    const cos = pack?.seasonCosmetic(state.meta?.weekId || weekKey());
    if (cos) bits.push(`сезон · ${cos.name}`);
    note.textContent = bits.length ? bits.join(" · ") : tr("normal_run", "обычный забег");
  }
}

function restoreMathRandom() {
  if (state._mathRandom) {
    Math.random = state._mathRandom;
    state._mathRandom = null;
  }
}

function rebindDailyRng() {
  if (!state.dailyMode || typeof state.rng !== "function") return;
  if (!state._mathRandom) state._mathRandom = Math.random;
  Math.random = state.rng;
}

function beginSeededRun() {
  restoreMathRandom();
  state.dailyMode = !!state.meta?.dailyModeEnabled;
  state.coopMode = !!state.meta?.coopEnabled;
  state.runMode = state.meta?.runMode || "normal";
  if (state.meta) {
    if (state.runMode === "endless") state.meta.trophyEndless = true;
    if (state.runMode === "boss") state.meta.trophyBossRush = true;
    if (state.runMode === "calm") state.meta.trophyCalm = true;
    saveMeta();
  }
  state.rng = null;
  if (state.dailyMode) {
    const pack = packApi();
    const seed = pack ? pack.daySeed(localDayKey()) : Date.now();
    state.rng = pack ? pack.mulberry32(seed) : null;
    rebindDailyRng();
    if (state.meta) {
      state.meta.trophyDaily = true;
      saveMeta();
    }
    showToast("забег дня");
    showMechanicCard("daily", "Забег дня", "Общий сид на сегодня. Соревнуйся с собой.");
  }
  if (state.coopMode) showToast("дуэт · два пальца");
  if (state.runMode === "endless") showToast(tr("mode_endless", "бесконечный океан"));
  if (state.runMode === "boss") showToast(tr("mode_boss", "босс-раш"));
  if (state.runMode === "calm") showToast(tr("mode_calm", "спокойный режим"));
}

function randGame(a = 0, b = 1) {
  if (state.rng) return a + (b - a) * state.rng();
  return rand(a, b);
}

function recordReplaySample(action = 0, value = 0) {
  const samples = state.replaySamples || (state.replaySamples = []);
  const previous = samples[samples.length - 1]?.[0] ?? -1;
  const time = Math.max(previous + 1, Math.round((state.elapsed || 0) * 1000));
  samples.push([time, Math.max(0, Math.min(31, Math.round(action))), Math.max(-1000000, Math.min(1000000, Math.round(value)))]);
  if (samples.length > 94) {
    const first = samples[0];
    const last = samples[samples.length - 1];
    state.replaySamples = [first, ...samples.slice(1, -1).filter((_, index) => index % 2 === 0), last];
  }
}

function replayPositionValue() {
  if (!state.life) return 0;
  const x = Math.round(clamp(state.life.x / Math.max(1, state.width), 0, 1) * 999);
  const y = Math.round(clamp(state.life.y / Math.max(1, state.height), 0, 1) * 999);
  return x * 1000 + y;
}

function sampleGhostPath(dt) {
  if (!state.life || !state.running) return;
  state.ghostSampleAcc += dt;
  if (state.ghostSampleAcc < GHOST_SAMPLE_SEC) return;
  state.ghostSampleAcc = 0;
  state.ghostPath.push({ x: state.life.x, y: state.life.y });
  if (state.ghostPath.length > GHOST_MAX_POINTS) state.ghostPath.shift();
}

function persistGhostPath() {
  if (!state.meta || state.ghostPath.length < 12) return;
  if (state.score < (state.meta.ghostScore || 0)) return;
  state.meta.ghostPath = state.ghostPath.slice();
  state.meta.ghostScore = state.score;
  saveMeta();
}

function spawnRunGhost() {
  state.ghost = null;
  state.ghostIndex = 0;
  if (state.meta?.ghostRaceEnabled === false) return;
  const path = state.meta?.ghostPath;
  if (!path || path.length < 8) return;
  if ((state.meta.ghostScore || 0) < 20) return;
  state.ghost = {
    x: path[0].x,
    y: path[0].y,
    r: 14,
    life: 1,
    path,
  };
}

function updateRunGhost(dt) {
  if (!state.ghost || !state.running) return;
  const g = state.ghost;
  g.ghostIndex = (g.ghostIndex ?? state.ghostIndex) + dt * 9;
  state.ghostIndex = g.ghostIndex;
  const idx = Math.min(g.path.length - 1, Math.floor(g.ghostIndex));
  const p = g.path[idx];
  g.x += (p.x - g.x) * Math.min(1, dt * 8);
  g.y += (p.y - g.y) * Math.min(1, dt * 8);
  const targets = [state.life, state.life2].filter(Boolean);
  for (const life of targets) {
    if (dist(g.x, g.y, life.x, life.y) < g.r + life.r * 0.7) {
      if (!state.meta.trophyGhost) {
        state.meta.trophyGhost = true;
        saveMeta();
      }
      // soft interference: push player and drain a bit of hunger
      const ang = Math.atan2(life.y - g.y, life.x - g.x) || 0;
      life.x += Math.cos(ang) * 10;
      life.y += Math.sin(ang) * 10;
      clampLifeEntity(life);
      state.hunger = Math.max(0, state.hunger - 4 * dt);
      tipOnce("ghost_run", "ТВОЙ ПРИЗРАК", 1400, {
        persist: true,
        first: "Это твой старый след. Он мешает — обходи.",
      });
    }
  }
}

function clampLifeEntity(life) {
  if (!life) return;
  life.x = clamp(life.x, life.r, state.width - life.r);
  life.y = clamp(life.y, life.r + 18, state.height - life.r - 18);
}

function drawRunGhost() {
  if (!state.ghost || !state.running) return;
  const g = state.ghost;
  ctx.save();
  ctx.globalAlpha = 0.35 + Math.sin(state.time * 4) * 0.08;
  ctx.strokeStyle = "rgba(255,220,160,0.7)";
  ctx.lineWidth = 1.6;
  ctx.setLineDash([4, 5]);
  ctx.beginPath();
  ctx.arc(g.x, g.y, g.r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = "rgba(255,200,120,0.2)";
  ctx.beginPath();
  ctx.arc(g.x, g.y, g.r * 0.7, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function createLife2(x, y) {
  state.life2 = {
    x,
    y,
    px: x,
    py: y,
    speed: 0,
    r: 15,
    wobble: Math.random() * Math.PI * 2,
    aim: -Math.PI / 2,
    teeth: 0,
  };
  burst(x, y, cssVar("--gold", "#ffe898"), 10, 3.2);
  if (state.meta && !state.meta.trophyCoop) {
    state.meta.trophyCoop = true;
    saveMeta();
  }
}

function analyticsDeathKind(reason) {
  const text = String(reason || "").toLowerCase();
  if (text.includes("голод") || text.includes("свет погас")) return "hunger";
  if (text.includes("кракен")) return "kraken";
  if (text.includes("пасть") || text.includes("бездн")) return "maw";
  if (text.includes("левиафан")) return "leviathan";
  if (text.includes("отпуст") || text.includes("касани")) return "release";
  if (text.includes("хищ") || text.includes("рыб") || text.includes("тень")) return "hunter";
  return "other";
}

function finalizeGameOver(reason) {
  state.deathReason = reason;
  state.pendingDeathReason = "";
  state.continueBusy = false;
  state.timeScale = 1;
  const isNewBest = state.score > (state.bestAtStart || 0);
  recordReplaySample(4, replayPositionValue());
  const replayDuration = Math.max(250, Math.round(state.elapsed * 1000), state.replaySamples.at(-1)?.[0] || 0);
  const runReplay = {
    score: state.score,
    durationMs: replayDuration,
    samples: state.replaySamples.slice(0, 96),
  };
  if (state.meta) {
    state.meta.runs = Math.max(0, (state.meta.runs || 0) + 1);
    state.meta.lastReplay = runReplay;
    if (state.tutorialRun) grantStarterGift();
    saveMeta();
  }
  window.OttiskAnalytics?.track("run_end", {
    score: state.score,
    hero: activeHeroId(),
    death: analyticsDeathKind(reason),
    mode: state.dailyMode ? "daily" : state.coopMode ? "coop" : state.runMode,
  });
  if ((state.meta?.runs || 0) % 5 === 0) {
    state.tuning = window.OttiskBalanceTuner?.fromAnalytics?.().adjustments || state.tuning;
  }
  evaluateDaily();
  evaluateWeekly(state.score);
  recordLocalDayScore(state.score);
  finalScoreEl.textContent = String(state.score);
  deathReasonEl.textContent = reason;
  const wave = waveForScore(state.score);
  const waveN = waveNumber(wave);
  const hero = activeHero();
  const runSummaryEl = document.getElementById("run-summary");
  if (runSummaryEl) {
    runSummaryEl.textContent = isNewBest
      ? `новый рекорд · волна ${waveN} · ${hero.name}`
      : `волна ${waveN} · ${wave.name} · ${hero.name}`;
    runSummaryEl.classList.toggle("record", isNewBest);
  }
  const muts = state.unlockedMuts.filter((id) => id !== "spark");
  mutSummaryEl.textContent = muts.length ? `новых сил: ${muts.length}` : "";
  if (state.wordDone && state.meta) state.meta.trophyWord = true;
  persistGhostPath();
  if (state.dailyMode && state.meta) {
    if (state.meta.dailyBestDay !== localDayKey()) {
      state.meta.dailyBestDay = localDayKey();
      state.meta.dailyBest = 0;
    }
    state.meta.dailyBest = Math.max(state.meta.dailyBest || 0, state.score);
    saveMeta();
    if (window.OttiskSocial?.isAvailable?.()) {
      window.OttiskSocial.submitDailyScore(
        state.score,
        state.meta.cloudName || "",
        runReplay.durationMs,
        runReplay.samples,
      ).catch(() => {});
    }
  }
  evaluateTrophies({ wordDone: state.wordDone });
  renderSkinResult();
  renderDailyResult();
  renderNextGoal();
  renderDeathOffers();
  renderTrophyList();
  updateBestLabels();
  updateEconomyLabels();
  renderDaily();
  updateStartButtonCopy();
  maybeAskRate();
  app.classList.remove("in-run");
  statusEl.classList.add("hidden");
  screenContinueEl?.classList.add("hidden");
  screenOverEl.classList.remove("hidden");
  clearHold();
  stopMenuMusic();
  if (isNewBest) {
    goalChime();
    buzz([12, 20, 12]);
  }
  const dailyLine = document.getElementById("daily-mode-result");
  if (dailyLine) {
    if (state.dailyMode) {
      dailyLine.textContent = `забег дня · лучший сегодня ${state.meta?.dailyBest || state.score}`;
      dailyLine.classList.remove("hidden");
    } else dailyLine.classList.add("hidden");
  }
}

function createLife(x, y, opts = {}) {
  state.echo = null;
  state.holdLifeTime = 0;
  state.life = {
    x,
    y,
    px: x,
    py: y,
    speed: 0,
    r: 17,
    wobble: Math.random() * Math.PI * 2,
    aim: -Math.PI / 2,
    teeth: 0,
  };
  state.lastVeinX = x;
  state.lastVeinY = y;
  if (!opts.silent) {
    hum(true);
    if (state.running && !state.openingBurst) {
      state.openingBurst = true;
      burst(x, y, cssVar("--life", "#7affd4"), 32, 5.8);
      burst(x, y, cssVar("--gold", "#ffe898"), 22, 4.6);
      state.flash = Math.max(state.flash, 0.24);
      spawnOpeningRing(x, y);
      sfxAwaken();
      buzz([14, 28, 14]);
      if (state.tutorialRun) {
        state.tutorialStep = Math.max(state.tutorialStep, 2);
        showCoach("К СВЕТУ", 1800, true);
      } else {
        showCoach("ЕШЬ СВЕТ", 1500, true);
      }
    } else {
      burst(x, y, cssVar("--life", "#7affd4"), 12, 3.4);
      sfxBubblePop(1);
      buzz(5);
    }
  }
}

function releasePulse(x, y) {
  if (state.pulseCd > 0 || state.holdLifeTime < 0.45) return false;
  state.pulseCd = 2.6;
  let pushed = 0;
  for (const hunter of state.hunters) {
    const d = dist(hunter.x, hunter.y, x, y);
    if (d > 150) continue;
    const force = (1 - d / 150) * 9.5;
    hunter.vx += ((hunter.x - x) / (d || 1)) * force;
    hunter.vy += ((hunter.y - y) / (d || 1)) * force;
    hunter.warn = Math.max(hunter.warn, 0.7);
    pushed += 1;
  }
  burst(x, y, cssVar("--foam", "#f3eee8"), 14, 4.2);
  state.flash = Math.max(state.flash, 0.08);
  sfxPulse();
  if (pushed) {
    burst(x, y, cssVar("--foam", "#fffdf8"), 18, 4.8);
    buzz(8);
  }
  return pushed > 0;
}

function releaseLife() {
  if (!state.life) return;
  const x = state.life.x;
  const y = state.life.y;
  const wobble = state.life.wobble;
  const r = state.life.r * 0.92;
  releasePulse(x, y);
  if (inInkDive()) exitInkDive();
  state.stillAcc = 0;
  setDiveMeter(0);
  state.echo = {
    x,
    y,
    r,
    wobble,
    aim: state.life.aim ?? -Math.PI / 2,
    life: 1,
  };
  state.life = null;
  state.holdLifeTime = 0;
  state.stick = null;
  hum(false);
  if (state.running) {
    tipOnce("echo", "СЛЕД УЯЗВИМ", 1400, {
      persist: true,
      first: "Отпустил палец — след уязвим. Держи, чтобы жить.",
    });
  }
}

function grantContinue() {
  state.pendingDeathReason = "";
  state.continuesUsed = (state.continuesUsed || 0) + 1;
  state.continueBusy = false;
  state.paused = false;
  state.running = true;
  state.demo = false;
  state.touchActive = false;
  state.pointerId = null;
  state.hunger = 68;
  state.hunters = [];
  state.echo = null;
  state.shots = [];
  state.cannonCd = 0;
  state.eelCd = 0;
  state.whaleCd = 0;
  state.inkCloud = null;
  state.squidInkReady = true;
  state.squidEats = 0;
  state.squidInkCd = 0;
  state.lifeHistory = [];
  state.seahorseReady = true;
  state.seahorseEats = 0;
  state.seahorseCd = 0;
  state.shellCharges = activeHeroId() === "nautilus" ? 2 : 0;
  state.mantaWake = null;
  state.eelBolts = [];
  state.sonarRings = [];
  state.whalePulse2 = 0;
  state.shipLives = activeHeroId() === "sub" ? SUBMARINE_LIVES : 0;
  state.heroShield = heroHasShield();
  state.heroShieldCd = 0;
  state.safeUntil = performance.now() + 2800;
  if (!state.life) createLife(state.width * 0.5, state.height * 0.56);
  else hum(true);
  updateHungerUi();
  renderDaily();
  statusEl.classList.remove("hidden");
  screenContinueEl?.classList.add("hidden");
  screenOverEl.classList.add("hidden");
  state.lastTs = performance.now();
  state.flash = Math.max(state.flash, 0.14);
  burst(state.width * 0.5, state.height * 0.56, cssVar("--life", "#6fd9b0"), 22, 4.8);
  rebindDailyRng();
  sfxContinue();
  showToast("щит · 3 сек");
  buzz([8, 20, 8]);
  window.OttiskNative?.haptic?.("medium");
}

async function requestContinue() {
  if (!state.pendingDeathReason || state.continueBusy) return;
  const offer = continueOffer();
  if (!offer.ok) {
    showToast("лимит шансов");
    refreshContinueUi();
    return;
  }
  unlockAudio();
  if (offer.kind === "iap") {
    await purchaseContinueIap();
    return;
  }
  if (offer.kind === "rewarded") {
    await requestRewardedContinue();
    return;
  }
  state.continueBusy = true;
  if (offer.kind === "marks") {
    if (!state.meta || (state.meta.marks || 0) < offer.cost) {
      state.continueBusy = false;
      showToast(`нужно ${offer.cost} следов`);
      refreshContinueUi();
      return;
    }
    state.meta.marks = Math.max(0, state.meta.marks - offer.cost);
    saveMeta();
    updateEconomyLabels();
    renderSkinMeta();
    showToast(`−${offer.cost} следов`);
  }
  grantContinue();
}

async function requestRewardedContinue() {
  if (!state.pendingDeathReason || state.continueBusy) return;
  if (!canOfferRewardedContinue()) {
    showToast("реклама недоступна");
    refreshContinueUi();
    return;
  }
  unlockAudio();
  state.continueBusy = true;
  const result = await window.OttiskNative.showRewardedAd().catch(() => null);
  if (result?.ok) {
    state.rewardedContinueUsed = true;
    grantContinue();
    return;
  }
  state.continueBusy = false;
  showToast(result?.message || "реклама отменена");
  refreshContinueUi();
}

async function purchaseContinueIap() {
  if (!state.pendingDeathReason || state.continueBusy) return;
  const used = state.continuesUsed || 0;
  if (used < FREE_CONTINUES_PER_RUN || used >= MAX_CONTINUES_PER_RUN) {
    showToast("сейчас недоступно");
    refreshContinueUi();
    return;
  }
  unlockAudio();
  state.continueBusy = true;
  if (isNativeShop()) {
    showToast(`открываем · ${CONTINUE_PRICE_LABEL}`);
    const result = await window.OttiskNative.purchase(CONTINUE_PRODUCT_ID).catch(() => null);
    if (result?.ok) {
      grantContinue();
      return;
    }
    state.continueBusy = false;
    showToast(result?.message || "покупка отменена");
    refreshContinueUi();
    return;
  }
  state.continueBusy = false;
  try {
    const url = new URL(DONATE_URL);
    url.searchParams.set("tip", "continue");
    url.searchParams.set("product", CONTINUE_PRODUCT_ID);
    window.open(url.toString(), "_blank", "noopener,noreferrer");
  } catch (_) {
    location.href = "./donate.html?tip=continue";
  }
  showToast(`продолжение · ${CONTINUE_PRICE_LABEL} · ${storePayLabel()}`);
  refreshContinueUi();
}

function shareText() {
  const wave = waveForScore(state.score);
  const waveN = waveNumber(wave);
  const hero = activeHero();
  const bits = [`Мой след в ОТТИСК: ${state.score} света · волна ${waveN} · ${hero.name}`];
  if (state.dailyMode) bits.push("забег дня");
  if (state.meta?.dailyDone) bits.push(`ежедневка ✓ · +${DAILY_QUEST_REWARD} следов`);
  if ((state.meta?.ghostScore || 0) > 0 && state.meta?.ghostRaceEnabled !== false) {
    bits.push(`призрак ${state.meta.ghostScore}`);
  }
  bits.push(SHARE_URL);
  return bits.join(" · ");
}

function canvasToBlob(canvasEl) {
  return new Promise((resolve) => {
    if (!canvasEl?.toBlob) {
      resolve(null);
      return;
    }
    canvasEl.toBlob((blob) => resolve(blob), "image/png");
  });
}

function buildShareCard() {
  if (!shareCanvasEl) return null;
  const shareCtx = shareCanvasEl.getContext("2d");
  if (!shareCtx) return null;
  const { width, height } = shareCanvasEl;
  const hero = activeHero();
  const wave = waveForScore(state.score);
  const waveN = waveNumber(wave);
  const accent = cssVar("--life", "#7affd4");
  const gold = cssVar("--gold", "#ffe898");

  const gradient = shareCtx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, "#0a2438");
  gradient.addColorStop(0.45, "#081828");
  gradient.addColorStop(1, "#040c18");
  shareCtx.fillStyle = gradient;
  shareCtx.fillRect(0, 0, width, height);

  // Atmospheric depth blooms for Stories
  const bloomA = shareCtx.createRadialGradient(width * 0.78, height * 0.18, 20, width * 0.78, height * 0.18, 220);
  bloomA.addColorStop(0, "rgba(90, 190, 255, 0.22)");
  bloomA.addColorStop(1, "transparent");
  shareCtx.fillStyle = bloomA;
  shareCtx.fillRect(0, 0, width, height);
  const bloomB = shareCtx.createRadialGradient(width * 0.2, height * 0.72, 10, width * 0.2, height * 0.72, 260);
  bloomB.addColorStop(0, "rgba(255, 140, 90, 0.14)");
  bloomB.addColorStop(1, "transparent");
  shareCtx.fillStyle = bloomB;
  shareCtx.fillRect(0, 0, width, height);

  shareCtx.strokeStyle = "rgba(243,238,232,0.14)";
  shareCtx.lineWidth = 2;
  shareCtx.strokeRect(36, 36, width - 72, height - 72);

  shareCtx.textAlign = "left";
  shareCtx.fillStyle = gold;
  shareCtx.font = "800 54px Syne, sans-serif";
  shareCtx.fillText("ОТТИСК", 72, 118);
  shareCtx.fillStyle = "rgba(243,238,232,0.72)";
  shareCtx.font = "600 24px Instrument Sans, sans-serif";
  shareCtx.fillText("живёт только под пальцем", 74, 158);

  shareCtx.fillStyle = accent;
  shareCtx.font = "800 168px Syne, sans-serif";
  shareCtx.fillText(String(state.score), 68, 360);
  shareCtx.fillStyle = "rgba(243,238,232,0.9)";
  shareCtx.font = "700 30px Instrument Sans, sans-serif";
  shareCtx.fillText("света", 78, 408);

  // Wave + hero chips
  const chipY = 480;
  shareCtx.fillStyle = "rgba(255,255,255,0.08)";
  roundRectPath(shareCtx, 72, chipY - 34, 280, 52, 16);
  shareCtx.fill();
  shareCtx.fillStyle = "rgba(255,255,255,0.08)";
  roundRectPath(shareCtx, 370, chipY - 34, 260, 52, 16);
  shareCtx.fill();
  shareCtx.fillStyle = gold;
  shareCtx.font = "700 22px Instrument Sans, sans-serif";
  shareCtx.fillText(`волна ${waveN}`, 92, chipY);
  shareCtx.fillStyle = "rgba(243,238,232,0.88)";
  shareCtx.fillText(wave.name, 92, chipY + 26);
  shareCtx.fillStyle = accent;
  shareCtx.fillText(hero.name, 390, chipY);
  shareCtx.fillStyle = "rgba(243,238,232,0.78)";
  shareCtx.fillText(hero.ability || "свой след", 390, chipY + 26);

  // Hero glyph mark
  shareCtx.save();
  shareCtx.beginPath();
  shareCtx.arc(width - 140, 250, 58, 0, Math.PI * 2);
  shareCtx.fillStyle = "rgba(255,255,255,0.08)";
  shareCtx.fill();
  shareCtx.strokeStyle = "rgba(255,232,160,0.45)";
  shareCtx.lineWidth = 2;
  shareCtx.stroke();
  shareCtx.fillStyle = gold;
  shareCtx.font = "800 42px Syne, sans-serif";
  shareCtx.textAlign = "center";
  shareCtx.fillText(hero.glyph || "✦", width - 140, 264);
  shareCtx.restore();

  shareCtx.textAlign = "left";
  shareCtx.fillStyle = "rgba(243,238,232,0.9)";
  shareCtx.font = "700 28px Instrument Sans, sans-serif";
  shareCtx.fillText(hero.tip || hero.ability || "держи палец", 74, 580);

  const modeBits = [];
  if (state.dailyMode) modeBits.push("забег дня");
  if (state.coopMode) modeBits.push("дуэт");
  if (modeBits.length) {
    shareCtx.fillStyle = "rgba(126, 255, 212, 0.85)";
    shareCtx.font = "600 22px Instrument Sans, sans-serif";
    shareCtx.fillText(modeBits.join(" · "), 74, 620);
  }

  shareCtx.fillStyle = "rgba(243,238,232,0.82)";
  shareCtx.font = "600 26px Instrument Sans, sans-serif";
  shareCtx.fillText(`Рекорд · ${state.best}`, 74, 670);
  if (state.runMarks > 0) {
    shareCtx.fillText(`+${state.runMarks} следов`, 74, 710);
  }

  shareCtx.fillStyle = "rgba(243,238,232,0.55)";
  shareCtx.font = "600 20px Instrument Sans, sans-serif";
  shareCtx.fillText("nikitaamelin1.github.io/Ottisk", 74, 820);

  return shareCanvasEl;
}

function roundRectPath(ctx2d, x, y, w, h, r) {
  const radius = Math.min(r, w * 0.5, h * 0.5);
  ctx2d.beginPath();
  ctx2d.moveTo(x + radius, y);
  ctx2d.arcTo(x + w, y, x + w, y + h, radius);
  ctx2d.arcTo(x + w, y + h, x, y + h, radius);
  ctx2d.arcTo(x, y + h, x, y, radius);
  ctx2d.arcTo(x, y, x + w, y, radius);
  ctx2d.closePath();
}

async function shareRun() {
  const text = shareText();
  const card = buildShareCard();
  try {
    if (navigator.share) {
      const blob = await canvasToBlob(card);
      if (blob && typeof File !== "undefined") {
        const file = new File([blob], "ottisk-share.png", { type: blob.type || "image/png" });
        if (!navigator.canShare || navigator.canShare({ files: [file] })) {
          await navigator.share({ title: "ОТТИСК", text, files: [file] });
          showToast("след отправлен");
          return;
        }
      }
      await navigator.share({ title: "ОТТИСК", text });
      showToast("след отправлен");
      return;
    }
  } catch (err) {
    if (err?.name === "AbortError") {
      showToast("поделиться отменено");
      return;
    }
  }

  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      showToast("текст скопирован");
      return;
    }
  } catch (_) {
    // noop
  }

  showToast(text, 2200);
}

function sparkProfile(type) {
  if (type === "super") {
    return { type, worth: 10, restore: 48, color: "#ff2f45", r: rand(14, 17), super: true, form: "pulsar" };
  }
  if (type === "rare") {
    return { type, worth: 3, restore: 35, color: "#ffcc44", r: rand(14, 18), form: "prism" };
  }
  if (type === "cool") {
    return { type, worth: 1, restore: 25, color: "#58c8ff", r: rand(12.5, 16), form: "frost" };
  }
  if (type === "bait") {
    return { type, worth: 1, restore: 12, color: "#ff58d0", r: rand(12.5, 16), form: "lure" };
  }
  if (type === "comet") {
    return { type, worth: 5, restore: 28, color: "#ffd840", r: rand(15, 19), comet: true, form: "bolt" };
  }
  if (type === "deep") {
    return { type, worth: 4, restore: 32, color: "#70d8ff", r: rand(13.5, 17), form: "abyss" };
  }
  if (type === "seed") {
    return { type, worth: 2, restore: 16, color: "#58ffb0", r: rand(13, 16.5), seed: true, form: "seed" };
  }
  if (type === "ember") {
    return { type, worth: 3, restore: 30, color: "#ff9a62", r: rand(13, 16), form: "ember" };
  }
  if (type === "mirror") {
    return { type, worth: 2, restore: 20, color: "#9be7ff", r: rand(12, 15), form: "mirror", mirror: true };
  }
  const normals = ["#ffd080", "#ffb868", "#7affd4", "#9ad0ff", cssVar("--accent-b", "#62f0c8")];
  return {
    type: "normal",
    worth: 1,
    restore: 18,
    color: normals[Math.floor(Math.random() * normals.length)],
    r: rand(12, 16),
    form: "plankton",
  };
}

function rollSparkType() {
  if (inInkDive()) return Math.random() < 0.7 ? "deep" : "rare";
  if (inOpening()) {
    const r0 = Math.random();
    if (r0 < 0.12) return "cool";
    return "normal";
  }
  const r = Math.random();
  if (r < 0.09) return "rare";
  if (r < 0.17) return "cool";
  if (r < 0.23) return "bait";
  if (r < 0.28) return "ember";
  if (r < 0.32) return "mirror";
  if (r < 0.36 && !state.symbiote) return "seed";
  return "normal";
}

function maybeSpawnSuperStar() {
  // Disabled: the early-game ПУЛЬСАР orb was too large and distracting.
}

function spawnComet() {
  const fromLeft = Math.random() < 0.5;
  const y = rand(state.height * 0.18, state.height * 0.78);
  const x = fromLeft ? -20 : state.width + 20;
  const speed = rand(2.6, 3.6);
  const profile = sparkProfile("comet");
  state.sparks.push({
    x,
    y,
    vx: fromLeft ? speed : -speed,
    vy: rand(-0.28, 0.28),
    pulse: Math.random() * Math.PI * 2,
    tutorial: false,
    grace: 0.1,
    ...profile,
  });
}

function spawnSpark(opts = {}) {
  const margin = 42;
  const type = opts.type || rollSparkType();
  const profile = sparkProfile(type);
  let x = rand(margin, state.width - margin);
  let y = rand(margin + 28, state.height - margin);
  if (opts.near) {
    const a = Math.random() * Math.PI * 2;
    const d = rand(90, 160);
    x = clamp(opts.near.x + Math.cos(a) * d, margin, state.width - margin);
    y = clamp(opts.near.y + Math.sin(a) * d, margin, state.height - margin);
  }
  if (opts.edge) {
    const side = Math.floor(Math.random() * 4);
    if (side === 0) { x = rand(margin, state.width - margin); y = margin + 10; }
    else if (side === 1) { x = state.width - margin - 10; y = rand(margin, state.height - margin); }
    else if (side === 2) { x = rand(margin, state.width - margin); y = state.height - margin - 10; }
    else { x = margin + 10; y = rand(margin, state.height - margin); }
  }
  // Never spawn inside the player's eat radius
  if (state.life && dist(x, y, state.life.x, state.life.y) < state.life.r + 48) {
    const a = Math.atan2(y - state.life.y, x - state.life.x) || rand(0, Math.PI * 2);
    x = clamp(state.life.x + Math.cos(a) * 120, margin, state.width - margin);
    y = clamp(state.life.y + Math.sin(a) * 120, margin, state.height - margin);
  }
  state.sparks.push({
    x,
    y,
    vx: rand(-0.55, 0.55),
    vy: rand(-0.55, 0.55),
    pulse: Math.random() * Math.PI * 2,
    tutorial: !!opts.tutorial,
    grace: opts.opening ? 0.05 : 0.35,
    ...profile,
  });
}

function hunterSpawnPointAwayFromPlayer() {
  const pad = 72;
  const candidates = [
    { x: rand(0, state.width), y: -pad },
    { x: state.width + pad, y: rand(0, state.height) },
    { x: rand(0, state.width), y: state.height + pad },
    { x: -pad, y: rand(0, state.height) },
  ];
  if (!state.life) return candidates[Math.floor(Math.random() * candidates.length)];
  let best = candidates[0];
  let bestD = -1;
  for (const c of candidates) {
    const d = dist(c.x, c.y, state.life.x, state.life.y);
    if (d > bestD) {
      bestD = d;
      best = c;
    }
  }
  return best;
}

function spawnHunter(slow = false) {
  const point = hunterSpawnPointAwayFromPlayer();
  const soft = skillSoftScale();
  const wave = syncWave(false);
  const anger = (slow ? 0.26 : rand(0.58, 0.88) + Math.min(0.28, state.score * 0.0035)) * soft;
  const hunter = {
    x: point.x,
    y: point.y,
    vx: 0,
    vy: 0,
    r: rand(15, 19),
    anger,
    slow,
    warn: 1,
    phase: Math.random() * Math.PI * 2,
    nearMissed: false,
    grace: slow ? 1.6 : state.elapsed < 3 ? 1.2 : 0.85,
    orbit: (state.hunters.length * 2.1) + Math.random() * 1.2,
    orbitR: rand(36, 64),
    orbitSpeed: rand(0.7, 1.25) * (Math.random() < 0.5 ? -1 : 1),
    species: wave.species,
    dashCd: 0,
    dashT: 0,
    pulse: Math.random() * Math.PI * 2,
    weave: Math.random() * Math.PI * 2,
  };
  applySpeciesToHunter(hunter, wave.species);
  state.hunters.push(hunter);
  if (state.running) {
    playPredatorSfx(hunter.species || wave.species || "fish", "call");
    if (!state.tipFlags.hunter) {
      tipOnce("hunter", wave.label.replace("ВОЛНА ", "ХИЩНИК · "), 1500);
    }
  }
}

function registerNearMiss(hunter, x, y) {
  if (hunter.nearMissed) return;
  hunter.nearMissed = true;
  state.stats.nearMisses += 1;
  floatText(x, y - 18, "мимо", cssVar("--foam", "#f3eee8"), 14);
  sfxNearMiss();
  buzz(4);
  if (!state.meta?.reduceMotion) {
    state.timeScale = 0.42;
    state.slowmoUntil = performance.now() + 160;
    state.flash = Math.max(state.flash, 0.06);
  }
  if (state.stats.nearMisses === 1 || state.stats.nearMisses % 4 === 0) {
    floatText(x, y - 24, "!", cssVar("--foam", "#fffdf8"), 16);
  }
}

function resetStats() {
  state.stats.sparkEats = 0;
  state.stats.rareEats = 0;
  state.stats.hunterEats = 0;
  state.stats.maxCombo = 0;
  state.stats.nearMisses = 0;
  state.stats.shadowsSpawned = 0;
  state.stats.glyphsTaken = 0;
  state.stats.bossClearsThisRun = 0;
}

function resetRun() {
  state.time = 0;
  state.tutorialRun = !state.meta?.onboarded && (state.meta?.runs || 0) === 0;
  state.tutorialStep = 0;
  state.elapsed = 0;
  state.score = 0;
  state.combo = 0;
  state.comboClock = 0;
  state.progressionEffects = window.OttiskProgression?.effects?.(progressionState()) || {};
  state.maxHunger = 100 + (state.progressionEffects.maxHunger || 0);
  state.hunger = state.maxHunger;
  state.progressionRevives = state.progressionEffects.revives || 0;
  state.replaySamples = [[0, 0, 0]];
  state.replaySampleAcc = 0;
  state.theme = 0;
  state.mutation = MUTATIONS[0];
  state.unlockedMuts = ["spark"];
  state.touchActive = false;
  state.pointerId = null;
  state.stick = null;
  state.touchActive2 = false;
  state.pointerId2 = null;
  state.stick2 = null;
  state.hasTouchedCanvas = false;
  state.life = null;
  state.life2 = null;
  state.ghost = null;
  state.ghostPath = [];
  state.ghostSampleAcc = 0;
  state.ghostIndex = 0;
  state.echo = null;
  state.guideSpark = null;
  state.sparks = [];
  state.hunters = [];
  state.veins = [];
  state.particles = [];
  state.floaters = [];
  state.spawnAcc = 0;
  state.hunterAcc = 0;
  state.slowHunterSeen = false;
  state.bloomPulse = 0;
  state.flash = 0;
  state.shake = 0;
  state.deathReason = "";
  state.pendingDeathReason = "";
  state.runUnlockedSkins = [];
  state.continuesUsed = 0;
  state.rewardedContinueUsed = false;
  state.safeUntil = 0;
  state.continueBusy = false;
  state.paused = false;
  state.runMarks = 0;
  state.milestonesHit = [];
  state.hungerWarnClock = 0;
  state.coachCount = 0;
  state.tipFlags = { move: false, hunter: false, hunger: false, echo: false, dive: false, shadow: false, word: false, super: false, boss: false, ability: false };
  lastBlastStyle = -1;
  state.event = null;
  state.eventAcc = 0;
  state.eventNext = rand(9, 13);
  state.eventRainAcc = 0;
  state.pulseCd = 0;
  state.holdLifeTime = 0;
  state.fever = false;
  state.stillAcc = 0;
  state.inkDive = 0;
  state.inkDiveCd = 0;
  state.glyphs = [];
  state.glyphIndex = 0;
  state.glyphSpawnAcc = 0;
  state.wordDone = false;
  state.symbiote = null;
  state.openingBurst = false;
  state.firstEatDone = false;
  state.superStarSpawned = false;
  state.superStarEaten = false;
  state.waveId = "school";
  state.waveIndex = 0;
  state.heroDashCd = 0;
  state.heroShield = true;
  state.heroShieldCd = 0;
  state.shots = [];
  state.cannonCd = 0;
  state.eelCd = 0;
  state.whaleCd = 0;
  state.inkCloud = null;
  state.squidInkReady = true;
  state.squidEats = 0;
  state.squidInkCd = 0;
  state.lifeHistory = [];
  state.seahorseReady = true;
  state.seahorseEats = 0;
  state.seahorseCd = 0;
  state.shellCharges = activeHeroId() === "nautilus" ? 2 : 0;
  state.mantaWake = null;
  state.eelBolts = [];
  state.sonarRings = [];
  state.whalePulse2 = 0;
  state.shipLives = activeHeroId() === "sub" ? SUBMARINE_LIVES : 0;
  state.heroShield = activeHeroId() !== "nautilus" || state.shellCharges > 0;
  state.bestAtStart = Math.max(state.best || 0, state.meta?.best || 0);
  beginSeededRun();
  spawnRunGhost();
  app.classList.remove("ink-dive");
  setDiveMeter(0);
  resetStats();
  clearHold();
  applyThemeFromScore(false);
  updateScoreUi(false);
  updateHungerUi();
  updateMutationUi();
  updateWaveUi(false);
  renderDaily();
  setEventChip("");
  comboEl.className = "combo";
  toastEl.className = "toast";
  coachEl.className = "coach";
  finalScoreEl.textContent = "0";
  deathReasonEl.textContent = "";
  mutSummaryEl.textContent = "";
  skinResultEl.textContent = "";
  dailyResultEl.textContent = "";
  if (marksResultEl) marksResultEl.textContent = "";
  const runSummaryEl = document.getElementById("run-summary");
  if (runSummaryEl) {
    runSummaryEl.textContent = "";
    runSummaryEl.classList.remove("record");
  }
  screenContinueEl?.classList.add("hidden");
  for (let i = 0; i < 2; i += 1) spawnSpark();
  spawnSpark({ tutorial: true, type: "normal", near: { x: state.width * 0.5, y: state.height * 0.42 } });
  // First fish enters from the far edge almost immediately after the run starts.
  state.hunters = [];
  state.slowHunterSeen = false;
  state.hunterAcc = 1.2;
}

function resetDemo() {
  state.demo = true;
  state.running = false;
  state.touchActive = false;
  state.pointerId = null;
  state.life = null;
  state.echo = null;
  state.sparks = [];
  state.hunters = [];
  state.veins = [];
  state.particles = [];
  state.floaters = [];
  state.bloomPulse = 0;
  state.demoClock = 0;
  state.demoDownClock = 0;
  applyThemeFromScore(false);
  for (let i = 0; i < 3; i += 1) spawnSpark();
  spawnSpark({ tutorial: true, type: "normal", near: { x: state.width * 0.48, y: state.height * 0.44 } });
  state.hunters.push({
    x: state.width * 0.12,
    y: state.height * 0.28,
    vx: 48,
    vy: 8,
    r: 19,
    anger: 0.4,
    slow: true,
    warn: 0,
    phase: 0,
    nearMissed: true,
    demo: true,
  });
}

function startGame() {
  unlockAudio();
  stopMenuMusic(0.25);
  hum(false);
  touchPlayDay();
  refreshDaily();
  renderDaily();
  updateEconomyLabels();
  hideFlowScreens();
  screenOverEl.classList.add("hidden");
  screenContinueEl?.classList.add("hidden");
  statusEl.classList.remove("hidden");
  app.classList.add("in-run");
  requestAnimationFrame(() => {
    resize();
    resetRun();
    state.running = true;
    window.OttiskAnalytics?.track("game_start");
    state.paused = false;
    state.demo = false;
    state.lastTs = performance.now();
    const coach = state.tutorialRun
      ? "ДЕРЖИ ПАЛЕЦ"
      : state.runMode === "boss"
        ? "БОСС-РАШ"
        : state.runMode === "endless"
          ? "ОКЕАН"
          : state.runMode === "calm"
            ? "СПОКОЙНО"
      : state.coopMode
      ? "ДВА ПАЛЬЦА"
      : state.dailyMode
        ? "ЗАБЕГ ДНЯ"
        : controlMode() === "joystick"
          ? "ДЕРЖИ СТИК"
          : "ДЕРЖИ";
    showCoach(coach, 1400, true);
    setTimeout(() => maybeShowHeroAbilityTip(), 1900);
    if (!state.tutorialRun && (state.meta?.runs || 0) < 2) {
      setTimeout(() => {
        showMechanicCard("hold", "Касание", "Палец на экране — живёшь.");
      }, 2200);
    }
    if (state.ghost) {
      setTimeout(() => {
        showMechanicCard("ghost", "Призрак", "Старый след мешает. Обходи — или врежься ради трофея.");
      }, 4200);
    }
  });
}

function goToMenu() {
  unlockAudio();
  hum(false);
  clearHold();
  restoreMathRandom();
  state.running = false;
  state.paused = false;
  state.demo = false;
  state.touchActive = false;
  state.pointerId = null;
  state.touchActive2 = false;
  state.pointerId2 = null;
  state.life = null;
  state.life2 = null;
  state.ghost = null;
  state.echo = null;
  state.pendingDeathReason = "";
  state.continueBusy = false;
  if (inInkDive()) exitInkDive();
  app.classList.remove("in-run", "ink-dive");
  setDiveMeter(0);
  statusEl.classList.add("hidden");
  screenOverEl.classList.add("hidden");
  screenContinueEl?.classList.add("hidden");
  showHomeMenu();
  updateBestLabels();
  updateEconomyLabels();
  updateDonateThanks();
  updateModeToggles();
  renderTrophyList();
  renderDaily();
  renderGifts();
  resetDemo();
  sfxUiTap(0);
}

function finishRun(reason) {
  if (!state.running) return;
  if ((state.progressionRevives || 0) > 0) {
    state.progressionRevives -= 1;
    state.hunger = Math.max(state.hunger, (state.maxHunger || 100) * 0.55);
    state.safeUntil = performance.now() + 2600;
    if (!state.life) createLife(state.width * 0.5, state.height * 0.56, { silent: true });
    for (const hunter of state.hunters) {
      if (!hunter.boss) placeHunterOnEdge(hunter);
      hunter.grace = Math.max(hunter.grace || 0, 1.5);
    }
    burst(state.life.x, state.life.y, cssVar("--life", "#7affd4"), 30, 6);
    showCoach(window.OttiskI18n?.locale === "en" ? "SECOND PULSE" : "ВТОРОЙ ИМПУЛЬС", 1800, true);
    goalChime();
    return;
  }
  state.running = false;
  state.paused = false;
  state.demo = false;
  state.touchActive = false;
  state.pointerId = null;
  state.touchActive2 = false;
  state.pointerId2 = null;
  state.deathReason = reason;
  hum(false);
  if (inInkDive()) exitInkDive();
  app.classList.remove("ink-dive");
  setDiveMeter(0);
  buzz([20, 40, 36]);
  sfxDeath();
  if (state.life) burst(state.life.x, state.life.y, cssVar("--danger", "#e2556d"), 28, 5.2);
  if (state.life2) burst(state.life2.x, state.life2.y, cssVar("--danger", "#e2556d"), 18, 4.2);
  if (state.echo) burst(state.echo.x, state.echo.y, cssVar("--danger", "#e2556d"), 18, 4.2);
  state.life = null;
  state.life2 = null;
  state.echo = null;
  state.symbiote = null;
  state.shake = 10;
  state.flash = 0.22;
  restoreMathRandom();
  const canContinueDeath =
    reason === DEATH.HUNTER ||
    reason === DEATH.ECHO ||
    reason === DEATH.HUNGER ||
    reason === "твой старый след догнал тебя" ||
    reason === "левиафан сомкнул кольцо" ||
    reason === "кракен сомкнул кольцо";
  if (canOfferContinue() && canContinueDeath) {
    showContinueScreen(reason);
    return;
  }
  finalizeGameOver(reason);
}

function tryCompleteByHunger() {
  if (state.hunger <= 0) finishRun(DEATH.HUNGER);
}

function onCanvasDown(e) {
  if (!state.running) return;
  const coop = state.coopMode || state.meta?.coopEnabled;
  if (state.touchActive && !(coop && !state.touchActive2)) return;
  e.preventDefault();
  unlockAudio();
  const p = pointerPos(e);
  recordReplaySample(1, Math.round(clamp(p.x / Math.max(1, state.width), 0, 1) * 999) * 1000 + Math.round(clamp(p.y / Math.max(1, state.height), 0, 1) * 999));
  try {
    canvas.setPointerCapture(e.pointerId);
  } catch (_) {
    // noop
  }
  state.hasTouchedCanvas = true;
  if (!state.touchActive) {
    state.touchActive = true;
    state.pointerId = e.pointerId;
    if (controlMode() === "joystick") {
      state.stick = { ox: p.x, oy: p.y, x: p.x, y: p.y };
      if (!state.life) createLife(state.width * 0.5, state.height * 0.56);
    } else {
      state.stick = null;
      createLife(p.x, p.y);
    }
    return;
  }
  if (coop && !state.touchActive2) {
    state.touchActive2 = true;
    state.pointerId2 = e.pointerId;
    state.stick2 = null;
    createLife2(p.x, p.y);
    showMechanicCard("coop", "Дуэт", "Второй палец — второй оттиск. Держите оба.");
  }
}

function pushVein(x, y) {
  if (!hasMut("veins")) return;
  state.veins.push({
    x,
    y,
    r: rand(7, 12),
    life: 1,
    decay: 0.32,
  });
  if (state.veins.length > MAX_VEINS) {
    state.veins[0] = state.veins[state.veins.length - 1];
    state.veins.pop();
  }
}

function applyLifeMove(prevX, prevY) {
  if (!state.life) return;
  clampLife();
  const moved = dist(prevX, prevY, state.life.x, state.life.y);
  if (moved > 7 && hasMut("veins")) {
    pushVein((prevX + state.life.x) * 0.5, (prevY + state.life.y) * 0.5);
    state.lastVeinX = state.life.x;
    state.lastVeinY = state.life.y;
  }
  if (moved > 3) spawnTrailParticles(prevX, prevY, state.life.x, state.life.y, moved);
  if (moved > 0.5) tryHeroDash(state.life.x - prevX, state.life.y - prevY, moved);
}

function spawnTrailParticles(x0, y0, x1, y1, moved) {
  const trail = activeTrail();
  if (!trail || trail.id === "plain") return;
  if (particleRoom() < 2) return;
  const n = Math.min(trail.id === "ember" ? 2 : 1, particleRoom());
  for (let i = 0; i < n; i += 1) {
    const t = (i + 1) / (n + 1);
    pushParticle({
      x: x0 + (x1 - x0) * t,
      y: y0 + (y1 - y0) * t,
      vx: rand(-0.4, 0.4),
      vy: rand(-0.4, 0.4),
      size: rand(1.6, trail.id === "foam" ? 3.4 : 2.8),
      color: trail.color || cssVar("--gold", "#ffe898"),
      kind: trail.id === "ember" ? "streak" : "dot",
      decay: rand(0.035, 0.06),
      life: 0.85,
    });
  }
  if (moved > 10 && Math.random() < 0.28) {
    pushVein((x0 + x1) * 0.5, (y0 + y1) * 0.5);
  }
}

function updateAnglerLure(dt) {
  const id = activeHeroId();
  if ((id !== "angler" && id !== "lantern") || !state.life) return;
  const reach = id === "lantern" ? 175 : 210;
  const pullScale = id === "lantern" ? 0.78 : 1;
  let closest = null;
  let closestD = Infinity;
  for (const spark of state.sparks) {
    const d = dist(spark.x, spark.y, state.life.x, state.life.y);
    if (d > reach || d < 8) continue;
    if (d < closestD) {
      closestD = d;
      closest = spark;
    }
    const pull = (1 - d / reach) * 78 * dt * pullScale;
    spark.vx += ((state.life.x - spark.x) / d) * pull * 0.28;
    spark.vy += ((state.life.y - spark.y) / d) * pull * 0.28;
    if (id === "angler" && Math.random() < dt * 0.08 && spark.type !== "rare" && spark.type !== "super" && spark.type !== "deep") {
      spark.type = "rare";
      spark.pulse = Math.random() * Math.PI * 2;
      floatText(spark.x, spark.y - 12, "золото", cssVar("--gold", "#ffe898"), 12);
    }
  }
  if (closest && Math.random() < dt * 2.4) {
    pushParticle({
      x: closest.x,
      y: closest.y,
      vx: (state.life.x - closest.x) * 0.05,
      vy: (state.life.y - closest.y) * 0.05,
      size: rand(1.5, 3),
      color: id === "lantern" ? "rgba(255,240,180,0.9)" : "rgba(255,220,140,0.85)",
      kind: "streak",
      decay: 0.09,
    });
  }
}

function stickVector() {
  if (!state.stick) return { nx: 0, ny: 0, mag: 0, dx: 0, dy: 0 };
  const dx = state.stick.x - state.stick.ox;
  const dy = state.stick.y - state.stick.oy;
  const len = Math.hypot(dx, dy);
  const mag = clamp(len / STICK_RADIUS, 0, 1);
  return {
    dx,
    dy,
    mag,
    nx: len > 0.001 ? dx / len : 0,
    ny: len > 0.001 ? dy / len : 0,
  };
}

function updateJoystickMove(dt) {
  if (controlMode() !== "joystick" || !state.life || !state.stick || !state.touchActive) return;
  const { nx, ny, mag } = stickVector();
  if (mag < 0.04) return;
  const prevX = state.life.x;
  const prevY = state.life.y;
  const speed = STICK_SPEED * mag * (playerDifficulty().dash || 1) * (state.progressionEffects?.speedMultiplier || 1);
  state.life.x += nx * speed * dt;
  state.life.y += ny * speed * dt;
  applyLifeMove(prevX, prevY);
}

function onCanvasMove(e) {
  if (!state.running) return;
  const p = pointerPos(e);
  if (state.touchActive && e.pointerId === state.pointerId && state.life) {
    if (controlMode() === "joystick" && state.stick) {
      state.stick.x = p.x;
      state.stick.y = p.y;
      return;
    }
    const prevX = state.life.x;
    const prevY = state.life.y;
    state.life.x = p.x;
    state.life.y = p.y;
    applyLifeMove(prevX, prevY);
    return;
  }
  if (state.touchActive2 && e.pointerId === state.pointerId2 && state.life2) {
    const prevX = state.life2.x;
    const prevY = state.life2.y;
    state.life2.x = p.x;
    state.life2.y = p.y;
    clampLifeEntity(state.life2);
    const moved = dist(prevX, prevY, state.life2.x, state.life2.y);
    if (moved > 0.6) state.life2.aim = Math.atan2(state.life2.y - prevY, state.life2.x - prevX);
    state.life2.speed = moved;
  }
}

function onCanvasUp(e) {
  if (state.touchActive2 && e.pointerId === state.pointerId2) {
    state.touchActive2 = false;
    state.pointerId2 = null;
    state.stick2 = null;
    if (state.running) releaseLife2();
    return;
  }
  if (!state.touchActive) return;
  if (state.pointerId != null && e.pointerId !== state.pointerId) return;
  state.touchActive = false;
  recordReplaySample(3, replayPositionValue());
  state.pointerId = null;
  state.stick = null;
  if (state.running) releaseLife();
}

function releaseLife2() {
  if (!state.life2) return;
  burst(state.life2.x, state.life2.y, cssVar("--gold", "#ffe898"), 8, 3);
  state.life2 = null;
}

function updateSparkMotion(spark, dt) {
  spark.pulse += dt * (spark.type === "super" ? 7.2 : spark.type === "rare" ? 6.2 : 5.2);
  spark.drift = (spark.drift || 0) + dt;
  if (spark.comet) {
    spark.x += spark.vx * dt * 60;
    spark.y += spark.vy * dt * 60 + Math.sin(spark.pulse * 2) * 8 * dt;
    // Comet particle wake
    if (Math.random() < 0.55) {
      pushParticle({
        x: spark.x - spark.vx * 2,
        y: spark.y - spark.vy * 2,
        vx: -spark.vx * 0.08 + rand(-0.3, 0.3),
        vy: -spark.vy * 0.08 + rand(-0.3, 0.3),
        size: rand(1.2, 2.8),
        color: spark.color,
        kind: "dot",
        grav: 0.01,
        decay: 0.04,
        life: 0.7,
      });
    }
    return;
  }
  if (spark.pinned) {
    // Pulsar circles in place
    const orbit = 10 + Math.sin(spark.pulse) * 6;
    spark.x += Math.cos(spark.pulse * 1.4) * orbit * dt * 2.2;
    spark.y += Math.sin(spark.pulse * 1.1) * orbit * dt * 2.2;
  } else if (spark.type === "rare") {
    spark.vx += Math.cos(spark.pulse * 1.8) * 0.045;
    spark.vy += Math.sin(spark.pulse * 1.5) * 0.045;
  } else if (spark.type === "cool") {
    spark.vx += Math.sin(spark.drift * 2.4) * 0.03;
    spark.vy -= 0.012;
  } else {
    spark.vx += Math.sin(state.time * 1.7 + spark.y * 0.014) * 0.014;
    spark.vy += Math.cos(state.time * 1.4 + spark.x * 0.012) * 0.012;
    // Occasional dart hop
    if (Math.random() < 0.01) {
      const a = Math.random() * Math.PI * 2;
      spark.vx += Math.cos(a) * 0.55;
      spark.vy += Math.sin(a) * 0.55;
    }
  }
  spark.vx *= spark.type === "super" ? 0.97 : 0.988;
  spark.vy *= spark.type === "super" ? 0.97 : 0.988;
  const sparkPace = 0.9 + midgamePace() * 0.1;
  spark.x += spark.vx * dt * 60 * sparkPace;
  spark.y += spark.vy * dt * 60 * sparkPace;
  const margin = spark.r + 8;
  if (spark.x < margin || spark.x > state.width - margin) {
    spark.x = clamp(spark.x, margin, state.width - margin);
    spark.vx *= -0.88;
  }
  if (spark.y < margin || spark.y > state.height - margin) {
    spark.y = clamp(spark.y, margin, state.height - margin);
    spark.vy *= -0.88;
  }
}

function updateSparks(dt) {
  const moveFactor = state.life ? clamp((state.life.speed || 0) / 14, 0, 1) : 0;
  // Magnet/veins only help while moving — standing still can't vacuum the map
  const veinPull = hasMut("veins") ? 0.12 * moveFactor : 0;
  const magnetPull = (hasMut("magnet") ? 0.14 : 0) * moveFactor + (hasMut("current") ? 0.09 : 0) * moveFactor;
  for (let i = state.sparks.length - 1; i >= 0; i -= 1) {
    const spark = state.sparks[i];
    spark.grace = Math.max(0, (spark.grace || 0) - dt);
    if (spark.comet && (spark.x < -80 || spark.x > state.width + 80)) {
      state.sparks.splice(i, 1);
      continue;
    }
    if (state.life && magnetPull > 0 && !spark.comet && spark.type !== "super") {
      const d = dist(spark.x, spark.y, state.life.x, state.life.y);
      if (d < 200) {
        const force = (1 - d / 200) * magnetPull;
        spark.vx += ((state.life.x - spark.x) / (d || 1)) * force;
        spark.vy += ((state.life.y - spark.y) / (d || 1)) * force;
      }
    }
    if (veinPull > 0 && state.veins.length) {
      let target = null;
      let bestD = 130;
      for (const vein of state.veins) {
        const d = dist(spark.x, spark.y, vein.x, vein.y);
        if (d < bestD) {
          bestD = d;
          target = vein;
        }
      }
      if (target) {
        const force = (1 - bestD / 130) * veinPull;
        spark.vx += ((target.x - spark.x) / (bestD || 1)) * force;
        spark.vy += ((target.y - spark.y) / (bestD || 1)) * force;
      }
    }
    updateSparkMotion(spark, dt);
    if (
      state.life &&
      spark.grace <= 0 &&
      dist(spark.x, spark.y, state.life.x, state.life.y) < state.life.r * 0.72 + spark.r
    ) {
      eatSpark(i, spark);
    }
  }
}

function eatSpark(index, spark) {
  state.sparks.splice(index, 1);
  state.stats.sparkEats += 1;
  if (spark.type === "super") state.superStarEaten = true;
  if (spark.type === "rare" || spark.type === "super") state.stats.rareEats += 1;
  const moveFactor = state.life ? clamp((state.life.speed || 0) / 12, 0.2, 1) : 0.2;
  // AFK / standing eats barely refill hunger — must hunt light
  const restore = spark.restore * (0.35 + 0.65 * moveFactor);
  state.hunger = clamp(state.hunger + restore, 0, state.maxHunger || 100);
  updateHungerUi();
  if (spark.type === "bait") {
    if (!inOpening()) spawnHunter(false);
    buzz([10, 20, 10]);
  } else if (spark.type === "comet") {
    buzz([8, 12, 8]);
  } else if (spark.type === "deep") {
    buzz(6);
  } else if (spark.type === "seed") {
    attachSymbiote(spark.x, spark.y);
  } else if (spark.type === "mirror") {
    state.safeUntil = Math.max(state.safeUntil || 0, performance.now() + 1600);
    floatText(spark.x, spark.y - 16, "отражение", "#9be7ff", 12);
    buzz([6, 10, 6]);
  } else if (spark.type === "ember") {
    state.hunger = clamp(state.hunger + 8, 0, state.maxHunger || 100);
    floatText(spark.x, spark.y - 16, "жар", "#ff9a62", 12);
    buzz(7);
  } else if (spark.type !== "super") {
    buzz(5);
  }
  const openingEat = inOpening() && !state.firstEatDone;
  if (openingEat) {
    state.firstEatDone = true;
    goalChime();
    buzz([10, 18, 10]);
    floatText(spark.x, spark.y - 18, "!", cssVar("--gold", "#ffe898"), 18);
    if (state.tutorialRun) {
      state.tutorialStep = 3;
      showCoach("НЕ ОТПУСКАЙ", 2000, true);
    }
  }
  if (state.stats.sparkEats === 1) tipOnce("move", "ЛОВИ СВЕТ", 1200);
  syncWave(true);
  playSparkTone(spark.type);
  eatSparkBlast(spark, openingEat);
  const lightMultiplier = (state.progressionEffects?.lightMultiplier || 1)
    * (activeEventId() === "light-bloom" ? 1.5 : activeEventId() === "ember-rain" ? 1.35 : 1);
  addScore(Math.max(1, Math.round(spark.worth * lightMultiplier)), spark.x, spark.y - 12, { color: spark.color });
  notePremiumEat();
}

function placeHunterOnEdge(hunter) {
  const point = hunterSpawnPointAwayFromPlayer();
  hunter.x = point.x;
  hunter.y = point.y;
  hunter.vx = 0;
  hunter.vy = 0;
}

function hunterReachMul(hunter) {
  const species = hunter.species || "fish";
  if (species === "dart") return 1.25;
  if (species === "jelly") {
    const swell = 1 + Math.max(0, Math.sin(hunter.pulse || 0)) * 0.55;
    return 1.7 * swell;
  }
  if (species === "eel") return 1.9;
  if (species === "shark") return 1.45;
  if (species === "ray") return 1.7;
  if (species === "ghost") return 1.2;
  if (species === "boss" || hunter.boss) {
    if (hunter.bossPhase === "charge") return 1.35;
    if (hunter.bossPhase === "telegraph") return 1.15;
    return 1.05;
  }
  return 1.55;
}

function updateBossHunter(hunter, dt, diff) {
  if (!state.life) {
    hunter.bossPhase = "orbit";
    hunter.bossTimer = 1.5;
    return { tx: state.width * 0.5, ty: state.height * 0.5, speedMul: 0.55 };
  }
  hunter.bossTimer = (hunter.bossTimer || 0) - dt;
  hunter.orbit = (hunter.orbit || 0) + dt * (hunter.orbitSpeed || 0.85);
  const orbitR = hunter.orbitR || 150;
  if (hunter.bossPhase === "suck") {
    const d = dist(hunter.x, hunter.y, state.life.x, state.life.y) || 1;
    const pull = clamp(1 - d / 240, 0.15, 1) * 38 * dt;
    state.life.x += ((hunter.x - state.life.x) / d) * pull;
    state.life.y += ((hunter.y - state.life.y) / d) * pull;
    clampLife();
    if (Math.random() < dt * 10) {
      pushParticle({
        x: state.life.x + rand(-18, 18),
        y: state.life.y + rand(-18, 18),
        vx: (hunter.x - state.life.x) * 0.04,
        vy: (hunter.y - state.life.y) * 0.04,
        size: rand(2, 5),
        color: "#4a78a8",
        decay: 0.04,
      });
    }
    if (hunter.bossTimer <= 0) {
      hunter.bossPhase = "telegraph";
      hunter.bossTimer = 0.7;
      hunter.chargeTx = state.life.x;
      hunter.chargeTy = state.life.y;
      hunter.chainCharges = 0;
      hunter.warn = 1;
    }
    return {
      tx: state.life.x + Math.cos(hunter.orbit * 1.2) * (orbitR * 0.55),
      ty: state.life.y + Math.sin(hunter.orbit) * (orbitR * 0.45),
      speedMul: 0.55,
    };
  }
  if (hunter.bossPhase === "ink_burst") {
    const d = dist(hunter.x, hunter.y, state.life.x, state.life.y);
    if (d < 170) {
      state.hunger = Math.max(0, state.hunger - dt * 7);
      if (Math.random() < dt * 12) {
        pushParticle({
          x: state.life.x + rand(-32, 32),
          y: state.life.y + rand(-32, 32),
          vx: rand(-0.5, 0.5),
          vy: rand(-0.5, 0.5),
          size: rand(3, 7),
          color: "#8f62c8",
          decay: 0.035,
        });
      }
    }
    if (hunter.bossTimer <= 0) {
      hunter.bossPhase = "telegraph";
      hunter.bossTimer = 0.65;
      hunter.chargeTx = state.life.x;
      hunter.chargeTy = state.life.y;
      hunter.chainCharges = 0;
    }
    return {
      tx: state.life.x + Math.cos(hunter.orbit * 1.8) * 125,
      ty: state.life.y + Math.sin(hunter.orbit * 1.5) * 105,
      speedMul: 0.92,
    };
  }
  if (hunter.bossPhase === "orbit") {
    if (hunter.bossTimer <= 0) {
      hunter.attackCount = (hunter.attackCount || 0) + 1;
      const inkAttack = hunter.kraken && hunter.attackCount % 3 === 0;
      const suckAttack = hunter.maw && hunter.attackCount % 2 === 0;
      hunter.bossPhase = suckAttack ? "suck" : inkAttack ? "ink_burst" : "telegraph";
      hunter.bossTimer = suckAttack ? 1.55 : inkAttack ? 1.35 : (hunter.kraken ? 0.65 : hunter.maw ? 0.75 : 0.85);
      hunter.chargeTx = state.life.x;
      hunter.chargeTy = state.life.y;
      hunter.chainCharges = 0;
      hunter.warn = 1;
      playPredatorSfx("boss", "warn");
      if (suckAttack) {
        showCoach("ПАСТЬ · ТЯГА", 1200, true);
        burst(hunter.x, hunter.y, "#4a78a8", 20, 4.4);
      } else if (inkAttack) {
        showCoach("КРАКЕН · ЧЕРНИЛЬНОЕ КОЛЬЦО", 1200, true);
        burst(hunter.x, hunter.y, "#9a68d8", 24, 5);
      }
    }
    return {
      tx: state.life.x + Math.cos(hunter.orbit) * orbitR,
      ty: state.life.y + Math.sin(hunter.orbit * 0.9) * orbitR * 0.78,
      speedMul: 0.72,
    };
  }
  if (hunter.bossPhase === "telegraph") {
    if (hunter.bossTimer <= 0) {
      hunter.bossPhase = "charge";
      hunter.bossTimer = 0.55;
      hunter.dashT = 0.55;
      const ang = Math.atan2(hunter.chargeTy - hunter.y, hunter.chargeTx - hunter.x);
      hunter.vx += Math.cos(ang) * (4.2 * diff.dash);
      hunter.vy += Math.sin(ang) * (4.2 * diff.dash);
      playPredatorSfx("boss", "charge");
      buzz(10);
    }
    return { tx: hunter.chargeTx, ty: hunter.chargeTy, speedMul: 0.2 };
  }
  if (hunter.bossPhase === "charge") {
    if (hunter.bossTimer <= 0) {
      if (hunter.kraken && (hunter.chainCharges || 0) < 1) {
        hunter.chainCharges = (hunter.chainCharges || 0) + 1;
        hunter.bossPhase = "telegraph";
        hunter.bossTimer = 0.45;
        hunter.chargeTx = state.life.x;
        hunter.chargeTy = state.life.y;
        hunter.warn = 1;
      } else {
        hunter.bossPhase = "recover";
        hunter.bossTimer = hunter.kraken ? 0.85 : 1.15;
        hunter.dashT = 0;
      }
    }
    return { tx: hunter.chargeTx, ty: hunter.chargeTy, speedMul: 1.55 * diff.dash };
  }
  // recover
  if (hunter.bossTimer <= 0) {
    hunter.bossPhase = "orbit";
    hunter.bossTimer = rand(1.7, 2.5);
    hunter.orbitR = rand(130, 170);
  }
  return {
    tx: state.life.x + Math.cos(hunter.orbit) * (orbitR + 40),
    ty: state.life.y + Math.sin(hunter.orbit) * (orbitR + 30),
    speedMul: 0.45,
  };
}

function updateHunters(dt) {
  const soft = skillSoftScale();
  const diff = playerDifficulty();
  const wave = syncWave(true);
  // Fish from the start: only one slow hunter early, then ramp with score.
  const early = state.elapsed < OPENING_SEC + 8 || state.score < 18;
  const opening = inOpening();
  let maxHunters = early || opening
    ? 1
    : Math.min(6, Math.max(1, Math.floor((1 + Math.floor(state.score / 55) + wave.maxBonus) * soft * diff.hunters)));
  if (state.runMode === "calm") maxHunters = Math.max(1, Math.ceil(maxHunters * 0.55));
  if (wave.boss) maxHunters = 1;
  state.hunterAcc += dt;
  let interval = (Math.max(1.55, 4.4 - state.score * 0.008) * wave.intervalMul * diff.spawn) / Math.max(0.55, soft);
  interval /= Math.max(0.75, midgamePace());
  // Mid-game: spawn a bit less often so the field stays readable.
  if (state.score >= 40 && state.score < 220) interval *= 1.14;
  if (state.runMode === "calm") interval *= 1.65;
  if (opening) interval = Math.max(interval, 2.8);
  if (!state.slowHunterSeen) interval = Math.max(interval, 1.1);
  const firstHunterAt = 1.05;
  if (wave.boss) {
    const hasBoss = state.hunters.some((h) => h.boss || h.species === "boss");
    if (!hasBoss && state.elapsed > firstHunterAt) {
      state.hunters = state.hunters.filter((h) => h.shadow);
      spawnBoss();
      state.hunterAcc = 0;
    }
  } else if (state.hunters.length < maxHunters && state.hunterAcc >= interval && state.elapsed > firstHunterAt) {
    // Spawn at most one hunter per update to avoid a sudden ambush pack.
    state.hunterAcc = 0;
    if (!state.slowHunterSeen) {
      spawnHunter(true);
      state.slowHunterSeen = true;
    } else {
      spawnHunter(false);
    }
  }

  for (let i = state.hunters.length - 1; i >= 0; i -= 1) {
    const hunter = state.hunters[i];
    const species = hunter.species || wave.species || "fish";
    hunter.phase += dt * (species === "dart" ? 8 : species === "jelly" ? 3.2 : species === "ray" ? 2.6 : species === "boss" ? 2.2 : 5);
    hunter.pulse = (hunter.pulse || 0) + dt * (species === "jelly" ? 2.4 : species === "ghost" ? 3.1 : species === "boss" ? 2.8 : 1.6);
    hunter.weave = (hunter.weave || 0) + dt * (species === "eel" ? 3.6 : species === "ray" ? 1.8 : 1.2);
    if (hunter.shadow) hunter.wobble = (hunter.wobble || 0) + dt * 5.5;
    hunter.warn = Math.max(0, hunter.warn - dt * (species === "boss" && hunter.bossPhase === "telegraph" ? 0.15 : 1.45));
    hunter.grace = Math.max(0, (hunter.grace || 0) - dt);
    hunter.dashCd = Math.max(0, (hunter.dashCd || 0) - dt);
    hunter.dashT = Math.max(0, (hunter.dashT || 0) - dt);
    if (hunter.pendingSpecies && !hunter.boss && hunter.grace <= 0 && Math.random() < dt * 0.9) {
      applySpeciesToHunter(hunter, hunter.pendingSpecies);
      hunter.pendingSpecies = "";
      hunter.warn = Math.max(hunter.warn, 0.55);
      hunter.grace = Math.max(hunter.grace || 0, 0.55);
    }
    if (species === "ghost") {
      // Soft blink: briefly hard to read, but never fully invisible for fairness.
      hunter.phaseAlpha = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(hunter.pulse * 1.4));
    } else {
      hunter.phaseAlpha = 1;
    }
    if (hunter.parade || hunter.demo) {
      // Convert showcase fish safely: always re-enter from a far edge.
      placeHunterOnEdge(hunter);
      hunter.parade = false;
      hunter.demo = false;
      hunter.slow = true;
      hunter.warn = 1;
      hunter.grace = 1.2;
      hunter.anger = Math.min(hunter.anger || 0.7, 0.5);
      hunter.orbit = (i * 2.15) + Math.random();
      hunter.orbitR = rand(36, 64);
      hunter.orbitSpeed = rand(0.7, 1.2) * (i % 2 === 0 ? -1 : 1);
      hunter.nearMissed = false;
      applySpeciesToHunter(hunter, wave.species);
    }
    let tx = state.width * 0.5;
    let ty = state.height * 0.5;
    let bossSpeedMul = 1;
    if ((hunter.boss || species === "boss") && state.life) {
      const plan = updateBossHunter(hunter, dt, diff);
      tx = plan.tx;
      ty = plan.ty;
      bossSpeedMul = plan.speedMul;
    } else if (state.life) {
      const dLife = dist(hunter.x, hunter.y, state.life.x, state.life.y);
      const orbit = hunter.orbit ?? i * 2.1;
      const orbitR = hunter.orbitR ?? 42;
      const orbitSpeed = hunter.orbitSpeed ?? 0.9;
      const angOff = orbit + state.time * orbitSpeed;
      if (species === "jelly") {
        tx = state.life.x + Math.sin(hunter.weave) * 48;
        ty = state.life.y - 20 + Math.cos(hunter.pulse) * 36;
      } else if (species === "eel") {
        const lane = 70 + Math.sin(hunter.weave) * 50;
        tx = state.life.x + Math.cos(angOff) * lane;
        ty = state.life.y + Math.sin(angOff * 1.4) * lane * 0.7;
      } else if (species === "ray") {
        // Broad lateral sweep across the player.
        tx = state.life.x + Math.sin(hunter.weave) * 120;
        ty = state.life.y + Math.cos(hunter.weave * 0.7) * 28;
      } else if (species === "ghost") {
        tx = state.life.x + Math.cos(angOff) * (orbitR * 0.7);
        ty = state.life.y + Math.sin(angOff * 1.2) * (orbitR * 0.7);
      } else if (species === "crab") {
        tx = state.life.x + Math.sin(hunter.weave) * 90;
        ty = state.life.y + 36;
      } else if (species === "urchin") {
        tx = state.life.x + Math.cos(angOff) * 28;
        ty = state.life.y + Math.sin(angOff) * 28;
      } else if (species === "mirror") {
        tx = state.width - state.life.x;
        ty = state.height - state.life.y;
      } else if (dLife > 160) {
        tx = state.life.x;
        ty = state.life.y;
      } else {
        tx = state.life.x + Math.cos(angOff) * orbitR;
        ty = state.life.y + Math.sin(angOff) * orbitR * 0.85;
      }
    } else if (state.echo) {
      tx = state.echo.x;
      ty = state.echo.y;
    }
    const ang = Math.atan2(ty - hunter.y, tx - hunter.x);
    let speed = (0.88 + Math.min(1.55, state.score * 0.0032)) * hunter.anger * wave.speedMul * midgamePace() * diff.speed;
    speed *= state.tuning?.hunterSpeed || 1;
    if (state.runMode === "calm") speed *= 0.68;
    if (hunter.stunT > 0) {
      hunter.stunT = Math.max(0, hunter.stunT - dt);
      speed *= 0.18;
    }
    if (hunter.shadow) speed *= 0.88;
    if (hunter.slow) speed *= 0.68;
    if (hasMut("cool") && state.hunger < 50) speed *= 0.85;
    if (activeEventId() === "calm") speed *= 0.62;
    if (activeEventId() === "raid") speed *= 1.08;
    if (activeEventId() === "sanctuary") speed *= 0.72;
    if (activeEventId() === "blackout") speed *= 1.12;
    if (activeEventId() === "warm-current") speed *= 0.92;
    if (activeEventId() === "tangled-path") speed *= 1.16;
    if (activeEventId() === "mirror-tide") speed *= 1.1;
    if (activeEventId() === "ember-rain") speed *= 0.95;
    if (activeEventId() === "tidepull") speed *= 0.88;
    if (inInkDive()) speed *= 0.35;
    if (species === "dart" && hunter.dashT > 0) speed *= 2.05 * diff.dash;
    if (species === "shark" && hunter.dashT > 0) speed *= 1.75 * diff.dash;
    if (species === "ray") speed *= 0.92;
    if (species === "crab") speed *= 0.72;
    if (species === "urchin") speed *= 0.48;
    if (species === "mirror") speed *= 1.05;
    if (hunter.boss || species === "boss") speed *= bossSpeedMul;
    speed *= heroAuraSlowMul(hunter);

    // Periodic lunges for dart/shark waves.
    if (state.life && hunter.dashCd <= 0 && hunter.dashT <= 0 && (species === "dart" || species === "shark")) {
      const dLife2 = dist(hunter.x, hunter.y, state.life.x, state.life.y);
      if (dLife2 < (species === "shark" ? 160 : 170) && dLife2 > 56) {
        hunter.dashT = (species === "shark" ? 0.24 : 0.22) * (0.85 + diff.dash * 0.15);
        hunter.dashCd = (species === "shark" ? rand(2.8, 4.2) : rand(0.7, 1.3)) / Math.max(0.7, diff.dash);
        const dashAng = Math.atan2(state.life.y - hunter.y, state.life.x - hunter.x);
        const impulse = (species === "shark" ? 2.4 : 3.1) * diff.dash;
        hunter.vx += Math.cos(dashAng) * impulse;
        hunter.vy += Math.sin(dashAng) * impulse;
        playPredatorSfx(species, "dash");
      }
    }
    // Ghosts short-blink closer instead of a hard dash.
    if (state.life && species === "ghost" && hunter.dashCd <= 0) {
      const dLife3 = dist(hunter.x, hunter.y, state.life.x, state.life.y);
      if (dLife3 > 90 && dLife3 < 210) {
        const blinkAng = Math.atan2(state.life.y - hunter.y, state.life.x - hunter.x);
        hunter.x += Math.cos(blinkAng) * (28 * diff.dash);
        hunter.y += Math.sin(blinkAng) * (28 * diff.dash);
        hunter.dashCd = rand(1.8, 2.8) / Math.max(0.75, diff.dash);
        hunter.warn = Math.max(hunter.warn, 0.55);
        playPredatorSfx("ghost", "blink");
      }
    }

    hunter.vx += Math.cos(ang) * speed * dt * 3.1;
    hunter.vy += Math.sin(ang) * speed * dt * 3.1;
    if (species === "eel") {
      hunter.vx += Math.cos(hunter.weave * 2.2) * 0.55;
      hunter.vy += Math.sin(hunter.weave * 1.7) * 0.55;
    }
    if (species === "ray") {
      hunter.vx += Math.cos(hunter.weave) * 0.7;
      hunter.vy += Math.sin(hunter.weave * 0.5) * 0.25;
    }
    // Keep fish apart so they don't pile into one blob.
    for (let j = 0; j < state.hunters.length; j += 1) {
      if (j === i) continue;
      const other = state.hunters[j];
      const gap = dist(hunter.x, hunter.y, other.x, other.y);
      const minGap = hunter.r + other.r + 34;
      if (gap > 0.1 && gap < minGap) {
        const push = ((minGap - gap) / minGap) * 0.55;
        hunter.vx += ((hunter.x - other.x) / gap) * push;
        hunter.vy += ((hunter.y - other.y) / gap) * push;
      }
    }
    const damp = species === "shark" && hunter.dashT > 0 ? 0.94 : 0.955;
    hunter.vx *= damp;
    hunter.vy *= damp;
    hunter.x += hunter.vx * dt * 60;
    hunter.y += hunter.vy * dt * 60;

    if (state.life2) {
      const d2 = dist(hunter.x, hunter.y, state.life2.x, state.life2.y);
      const killR2 = hunter.r * hunterReachMul(hunter) + state.life2.r * 0.7;
      if (d2 < killR2 && hunter.grace <= 0) {
        releaseLife2();
        hunter.warn = 1;
        if (!hunter.boss) placeHunterOnEdge(hunter);
        continue;
      }
    }
    if (state.life) {
      const d = dist(hunter.x, hunter.y, state.life.x, state.life.y);
      const fishReach = hunter.r * hunterReachMul(hunter);
      const killR = fishReach + state.life.r * 0.7;
      const nearR = killR + 22;
      if (d < nearR && d >= killR) {
        registerNearMiss(hunter, state.life.x, state.life.y);
      } else if (d >= nearR + 24) {
        hunter.nearMissed = false;
      }
      if (d < killR) {
        if (hunter.grace > 0) {
          // Brand-new fish: push away instead of instantly eating the player on spawn.
          const pushAng = Math.atan2(hunter.y - state.life.y, hunter.x - state.life.x) || 0;
          hunter.vx += Math.cos(pushAng) * 2.8;
          hunter.vy += Math.sin(pushAng) * 2.8;
          if (!hunter.boss) placeHunterOnEdge(hunter);
          hunter.grace = Math.max(hunter.grace, 0.6);
          hunter.warn = 1;
          continue;
        }
        if (absorbHunterHit(hunter)) continue;
        // First real contact with a fish ends the run.
        finishRun(
          hunter.shadow
            ? "твой старый след догнал тебя"
            : hunter.boss
              ? hunter.kraken
                ? "кракен сомкнул кольцо"
                : "левиафан сомкнул кольцо"
              : DEATH.HUNTER
        );
        return;
      }
    } else if (state.echo && !inInkDive()) {
      const d = dist(hunter.x, hunter.y, state.echo.x, state.echo.y);
      const killR = hunter.r * hunterReachMul(hunter) + state.echo.r * 0.7;
      if (d < killR + 16 && d >= killR) {
        registerNearMiss(hunter, state.echo.x, state.echo.y);
      }
      if (d < killR) {
        if (absorbHunterHit(hunter)) continue;
        finishRun(DEATH.ECHO);
        return;
      }
    }

    if (hunter.x < -120 || hunter.x > state.width + 120 || hunter.y < -120 || hunter.y > state.height + 120) {
      state.hunters.splice(i, 1);
    }
  }
}

function updateVeins(dt) {
  for (let i = state.veins.length - 1; i >= 0; i -= 1) {
    const vein = state.veins[i];
    vein.life -= dt * vein.decay;
    if (vein.life <= 0) state.veins.splice(i, 1);
  }
}

function updateParticles(dt) {
  const step = dt * 60;
  const damp = Math.exp(-0.008032 * step);
  for (let i = state.particles.length - 1; i >= 0; i -= 1) {
    const p = state.particles[i];
    p.x += p.vx * step;
    p.y += p.vy * step;
    p.vy += (p.grav ?? 0.03) * step;
    p.vx *= damp;
    if (p.spin) p.rot = (p.rot || 0) + p.spin * step;
    p.life -= p.decay * step;
    if (p.life <= 0) {
      state.particles[i] = state.particles[state.particles.length - 1];
      state.particles.pop();
    }
  }
  for (let i = state.floaters.length - 1; i >= 0; i -= 1) {
    const f = state.floaters[i];
    f.y += f.vy * step;
    f.life -= dt * 1.18;
    if (f.life <= 0) {
      state.floaters[i] = state.floaters[state.floaters.length - 1];
      state.floaters.pop();
    }
  }
}

function updateRun(dt) {
  if (state.paused) {
    updateParticles(dt);
    state.flash = Math.max(0, state.flash - dt * 1.2);
    return;
  }
  state.time += dt;
  state.elapsed += dt;
  state.replaySampleAcc += dt;
  if (state.replaySampleAcc >= 2.5) {
    state.replaySampleAcc = 0;
    recordReplaySample(state.touchActive ? 2 : 0, replayPositionValue());
  }
  state.spawnAcc += dt;
  state.comboClock = Math.max(0, state.comboClock - dt);
  if (state.comboClock <= 0 && state.combo !== 0) {
    state.combo = 0;
    state.fever = false;
  }
  state.pulseCd = Math.max(0, state.pulseCd - dt);
  if (state.life) {
    state.holdLifeTime += dt;
    updateJoystickMove(dt);
    updateAnglerLure(dt);
    fireShipCannons(dt);
    updateShipShots(dt);
    fireEelZap(dt);
    fireWhaleSonar(dt);
    recordLifeHistory(dt);
    updateInkCloud(dt);
    updateMantaWake(dt);
    sampleGhostPath(dt);
    updateRunGhost(dt);
    const prevX = state.life.px ?? state.life.x;
    const prevY = state.life.py ?? state.life.y;
    const moved = dist(state.life.x, state.life.y, prevX, prevY);
    if (moved > 0.6) state.life.aim = Math.atan2(state.life.y - prevY, state.life.x - prevX);
    state.life.speed = (state.life.speed || 0) * 0.78 + moved * 0.22;
    state.life.px = state.life.x;
    state.life.py = state.life.y;
    state.life.wobble += dt * 7.2;
    state.life.r = 17 + Math.min(4, state.combo * 0.45) + Math.sin(state.life.wobble) * 0.8;
    if (state.fever) state.life.r += 1.4;
    state.life.teeth = hasMut("fang") && state.combo >= 4 ? Math.min(1, state.life.teeth + dt * 3) : Math.max(0, state.life.teeth - dt * 3);
    clampLife();
    if (state.life2) {
      state.life2.wobble = (state.life2.wobble || 0) + dt * 7.2;
      state.life2.r = 15 + Math.sin(state.life2.wobble) * 0.7;
      clampLifeEntity(state.life2);
    }
    updateHum(dt);
  } else if (state.echo) {
    state.echo.wobble += dt * 4.2;
    state.echo.life = Math.max(0, (state.echo.life ?? 1) - dt / ECHO_FADE_SEC);
    state.echo.r = Math.max(8, state.echo.r * (1 - dt * 0.08));
    if (state.echo.life <= 0) {
      maybeAwakenEcho();
      state.echo = null;
    }
  }
  state.guideSpark = state.life ? nearestSpark(state.life.x, state.life.y) : null;
  updateWeirdSystems(dt);
  // Standing still drains hunger faster — except while charging / inside ink dive
  const chargingDive = !!state.life && state.stillAcc > 0.15 && !inInkDive();
  const stillPenalty = state.life && (state.life.speed || 0) < 6 && !chargingDive && !inInkDive() ? 1.55 : 1;
  const calmMul = activeEventId() === "calm" || activeEventId() === "sanctuary" ? 0.55 : 1;
  const modeHungerMul = state.runMode === "calm" ? 0.58 : 1;
  const renewalMul = hasMut("renewal") ? 0.88 : 1;
  const diveMul = inInkDive() ? 0.72 : 1;
  if (state.life) {
    state.heroDashCd = Math.max(0, (state.heroDashCd || 0) - dt);
    if (activeHeroId() === "nautilus" && (state.shellCharges || 0) < 2) {
      state.heroShieldCd = Math.max(0, (state.heroShieldCd || 0) - dt);
      if (state.heroShieldCd <= 0) {
        state.shellCharges = Math.min(2, (state.shellCharges || 0) + 1);
        state.heroShield = true;
        floatText(state.life.x, state.life.y - 24, `раковина · ${state.shellCharges}`, cssVar("--accent-a", "#ff9a62"), 14);
        buzz(6);
        if (state.shellCharges < 2) state.heroShieldCd = 7.2;
      }
    }
    if (activeHeroId() === "squid" && !state.squidInkReady) {
      // passive recharge alongside eats
      state.squidInkCd = (state.squidInkCd || 0) + dt;
      if (state.squidInkCd >= 16) {
        state.squidInkReady = true;
        state.squidInkCd = 0;
        floatText(state.life.x, state.life.y - 28, "чернила готовы", "#c8b8ff", 14);
      }
    }
    if (activeHeroId() === "seahorse" && !state.seahorseReady) {
      state.seahorseCd = (state.seahorseCd || 0) + dt;
      if (state.seahorseCd >= 22) {
        state.seahorseReady = true;
        state.seahorseCd = 0;
        floatText(state.life.x, state.life.y - 28, "откат готов", cssVar("--gold", "#ffe898"), 14);
      }
    }
    state.hunger -= HUNGER_DRAIN_PER_SEC * dt * (hasMut("cool") ? 0.7 : 1) * renewalMul * stillPenalty * calmMul * modeHungerMul * diveMul * (inOpening() ? 0.62 : 1) * playerDifficulty().hunger * heroHungerMul() * (state.tuning?.hungerDrain || 1);
    state.hunger = Math.max(0, state.hunger);
  }
  updateHungerUi();
  if (state.hunger < 18 && state.life) {
    state.hungerWarnClock -= dt;
    if (state.hungerWarnClock <= 0) {
      state.hungerWarnClock = 0.55;
      buzz(6);
      sfxHungerTick(state.hunger);
    }
  } else {
    state.hungerWarnClock = 0;
  }
  updateParticles(dt);
  const opening = inOpening();
  const targetSparkCount = opening ? 3 : 4 + Math.min(2, Math.floor(state.score / 120));
  const spawnInterval = (opening ? 1.6 : 0.95) * (state.tuning?.sparkInterval || 1);
  while (state.spawnAcc >= spawnInterval) {
    state.spawnAcc -= spawnInterval;
    if (state.sparks.length < targetSparkCount) {
      spawnSpark({
        edge: true,
        opening,
        type: !opening && Math.random() < 0.08 ? "rare" : null,
      });
    }
  }
  maybeSpawnSuperStar();
  updateSparks(dt);
  tryCompleteByHunger();
  if (!state.running) return;
  updateRunEvents(dt);
  updateHunters(dt);
  if (!state.running) return;
  updateVeins(dt);
  state.bloomPulse = Math.max(0, state.bloomPulse - dt * 0.85);
  state.flash = Math.max(0, state.flash - dt * 1.9);
  state.shake *= Math.exp(-0.10536 * dt * 60);
}

function updateDemo(dt) {
  state.time += dt;
  state.demoClock += dt;
  if (state.sparks.length < 4 && Math.random() < 0.025) spawnSpark();
  for (const spark of state.sparks) updateSparkMotion(spark, dt * 0.7);
  for (const hunter of state.hunters) {
    hunter.phase += dt * 4;
    hunter.x += (hunter.vx || 40) * dt;
    hunter.y += Math.sin(hunter.phase) * 18 * dt;
    if (hunter.x > state.width + 40) {
      hunter.x = -40;
      hunter.y = state.height * (0.22 + Math.random() * 0.35);
    }
  }
  if (state.life) {
    state.life.wobble += dt * 6;
    state.life.x = state.width * 0.5 + Math.sin(state.demoClock * 1.35) * state.width * 0.17;
    state.life.y = state.height * 0.58 + Math.cos(state.demoClock * 0.92) * state.height * 0.07;
    state.life.r = 16 + Math.sin(state.demoClock * 2.8) * 0.8;
    for (let i = state.sparks.length - 1; i >= 0; i -= 1) {
      const spark = state.sparks[i];
      if (dist(spark.x, spark.y, state.life.x, state.life.y) < state.life.r * 0.72 + spark.r) {
        burst(spark.x, spark.y, spark.color, 8, 3);
        state.sparks.splice(i, 1);
        if (state.sparks.length < 4) spawnSpark();
      }
    }
    state.demoDownClock -= dt;
    if (state.demoDownClock <= 0) {
      state.echo = {
        x: state.life.x,
        y: state.life.y,
        r: state.life.r * 0.9,
        wobble: state.life.wobble,
        aim: state.life.aim ?? -Math.PI / 2,
      };
      state.life = null;
      state.demoDownClock = rand(0.5, 0.9);
    }
  } else {
    if (state.echo) state.echo.wobble += dt * 4;
    state.demoDownClock -= dt;
    if (state.demoDownClock <= 0) {
      createLife(state.width * 0.45, state.height * 0.58, { silent: true });
      state.demoDownClock = rand(1.4, 2.1);
    }
  }
  updateParticles(dt);
  state.flash = Math.max(0, state.flash - dt * 1.6);
}

function updateOver(dt) {
  state.time += dt;
  updateParticles(dt);
  state.flash = Math.max(0, state.flash - dt * 1.4);
  state.shake *= Math.pow(0.9, dt * 60);
}

function lifeInkColor() {
  const base = activeSkin().color;
  if (state.hunger >= 65) return base;
  if (state.hunger >= 30) return mixColor(base, cssVar("--gold", "#e6c07b"), clamp((65 - state.hunger) / 35, 0, 1));
  return mixColor(base, cssVar("--danger", "#e2556d"), clamp((30 - state.hunger) / 30, 0, 1));
}

function drawOceanBackground() {
  const w = state.width;
  const h = state.height;
  const ink = inInkDive();
  const bg0 = cssVar("--bg0", "#062840");
  const bg1 = cssVar("--bg1", "#1a7aa8");
  const bg2 = cssVar("--bg2", "#0e5078");
  const key = `${w}x${h}|${ink ? 1 : 0}|${bg0}|${bg1}|${bg2}`;
  if (bgCache.key !== key || !bgCache.canvas) {
    const layer = document.createElement("canvas");
    layer.width = Math.max(1, Math.floor(w));
    layer.height = Math.max(1, Math.floor(h));
    const g = layer.getContext("2d");
    const deep = mixColor(bg0, "#02060e", ink ? 0.35 : 0.55);
    const mid = mixColor(bg0, bg2, ink ? 0.55 : 0.42);
    const lift = mixColor(bg1, bg2, ink ? 0.35 : 0.22);
    const sky = mixColor(lift, "#ffffff", ink ? 0.04 : 0.08);
    const grad = g.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, sky);
    grad.addColorStop(0.28, mid);
    grad.addColorStop(0.68, mixColor(bg0, deep, 0.35));
    grad.addColorStop(1, deep);
    g.fillStyle = grad;
    g.fillRect(0, 0, w, h);

    // Depth bands — cheap atmospheric layers
    for (let i = 0; i < 4; i += 1) {
      const y = h * (0.18 + i * 0.18);
      const band = g.createLinearGradient(0, y - h * 0.08, 0, y + h * 0.1);
      const tint = mixColor(i % 2 ? bg1 : bg2, deep, 0.55 + i * 0.08);
      band.addColorStop(0, "transparent");
      band.addColorStop(0.5, tint);
      band.addColorStop(1, "transparent");
      g.globalAlpha = ink ? 0.1 : 0.14;
      g.fillStyle = band;
      g.fillRect(0, y - h * 0.08, w, h * 0.18);
    }
    g.globalAlpha = 1;

    // Static mote field (deterministic-ish from size)
    const moteCount = effectsEnabled() ? 28 : 12;
    for (let i = 0; i < moteCount; i += 1) {
      const px = ((i * 97) % 1000) / 1000 * w;
      const py = ((i * 53 + 120) % 1000) / 1000 * h;
      const size = 0.8 + (i % 4) * 0.55;
      g.globalAlpha = ink ? 0.05 + (i % 3) * 0.02 : 0.07 + (i % 3) * 0.03;
      g.fillStyle = i % 5 === 0 ? mixColor(bg1, "#ffffff", 0.55) : mixColor(bg2, "#ffffff", 0.35);
      g.beginPath();
      g.arc(px, py, size, 0, Math.PI * 2);
      g.fill();
    }
    g.globalAlpha = 1;

    // Soft caustic wash near the top third
    const caustic = g.createRadialGradient(w * 0.35, h * 0.12, 8, w * 0.45, h * 0.2, Math.max(w, h) * 0.55);
    caustic.addColorStop(0, mixColor(bg1, "#ffffff", 0.18));
    caustic.addColorStop(0.45, mixColor(bg2, bg1, 0.12));
    caustic.addColorStop(1, "transparent");
    g.globalAlpha = ink ? 0.18 : 0.28;
    g.fillStyle = caustic;
    g.fillRect(0, 0, w, h);
    g.globalAlpha = 1;

    const vignette = g.createRadialGradient(
      w * 0.5, h * 0.48, Math.min(w, h) * 0.22,
      w * 0.5, h * 0.52, Math.max(w, h) * 0.78
    );
    vignette.addColorStop(0, "transparent");
    vignette.addColorStop(0.65, "transparent");
    vignette.addColorStop(1, mixColor(deep, "#000000", 0.55));

    bgCache.w = w;
    bgCache.h = h;
    bgCache.key = key;
    bgCache.canvas = layer;
    bgCache.vignette = vignette;
  }

  ctx.drawImage(bgCache.canvas, 0, 0, w, h);

  // Living center haze (cheap, respects reduceMotion via lower amplitude)
  const hush = state.meta?.reduceMotion ? 0 : Math.sin(state.time * 1.15) * 0.02;
  ctx.save();
  ctx.globalAlpha = (ink ? 0.08 : 0.12) + hush;
  const haze = ctx.createRadialGradient(w * 0.5, h * 0.42, Math.min(w, h) * 0.08, w * 0.5, h * 0.45, Math.max(w, h) * 0.48);
  haze.addColorStop(0, mixColor(bg1, "#ffffff", 0.22));
  haze.addColorStop(0.55, mixColor(bg2, bg0, 0.15));
  haze.addColorStop(1, "transparent");
  ctx.fillStyle = haze;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();

  // Slow drifting highlight motes
  if (effectsEnabled() && !state.meta?.reduceMotion) {
    ctx.save();
    for (let i = 0; i < 7; i += 1) {
      const drift = state.time * (0.08 + i * 0.01);
      const px = ((i * 137.5 + drift * 40) % (w + 40)) - 20;
      const py = ((i * 89.3 + Math.sin(drift + i) * 18) % (h * 0.85)) + h * 0.08;
      ctx.globalAlpha = 0.05 + (i % 3) * 0.025;
      ctx.fillStyle = mixColor(cssVar("--foam", "#fffdf8"), bg1, 0.35);
      ctx.beginPath();
      ctx.arc(px, py, 1.1 + (i % 3) * 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  ctx.fillStyle = bgCache.vignette;
  ctx.fillRect(0, 0, w, h);
}

function drawBackground() {
  drawOceanBackground();
  if (state.bloomPulse > 0) {
    ctx.fillStyle = cssVar("--gold", "#ffe08a");
    ctx.globalAlpha = state.bloomPulse * 0.08;
    ctx.fillRect(0, 0, state.width, state.height);
    ctx.globalAlpha = 1;
  }
  if (state.fever) {
    ctx.fillStyle = cssVar("--ember", "#ff8a52");
    ctx.globalAlpha = 0.08 + Math.sin(state.time * 7) * 0.03;
    ctx.fillRect(0, 0, state.width, state.height);
    ctx.globalAlpha = 1;
  }
  const wave = typeof waveForScore === "function" ? waveForScore() : null;
  if (wave?.boss && state.running) {
    const tint = wave.kraken
      ? cssVar("--accent-a", "#ff9a62")
      : wave.maw
        ? cssVar("--bg2", "#0e5078")
        : cssVar("--danger", "#ff7898");
    ctx.save();
    ctx.globalAlpha = 0.055 + Math.sin(state.time * 2.2) * 0.015;
    ctx.fillStyle = tint;
    ctx.fillRect(0, 0, state.width, state.height);
    ctx.restore();
  }
}

function drawGlyphs() {
  for (const g of state.glyphs) {
    const pulse = 1 + Math.sin(g.pulse) * 0.08;
    ctx.save();
    ctx.globalAlpha = 0.35 + g.life * 0.55;
    ctx.fillStyle = g.index === state.glyphIndex ? cssVar("--gold", "#e6c07b") : cssVar("--sand", "#a89b90");
    ctx.font = `800 ${Math.round(22 * pulse)}px Syne, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(g.ch, g.x, g.y);
    ctx.strokeStyle = "rgba(243,238,232,0.25)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(g.x, g.y, 16 * pulse, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

function drawSymbiote() {
  if (!state.symbiote || !state.life) return;
  const ang = state.symbiote.ang;
  const x = state.life.x + Math.cos(ang) * (state.life.r + 14);
  const y = state.life.y + Math.sin(ang) * (state.life.r + 14);
  const life = cssVar("--life", "#9cf0d0");
  ctx.save();
  ctx.globalAlpha = 0.9;
  if (effectsEnabled()) {
    const glow = ctx.createRadialGradient(x, y, 1, x, y, 10);
    glow.addColorStop(0, mixColor(life, "#ffffff", 0.55));
    glow.addColorStop(1, "transparent");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x, y, 10, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = mixColor(life, "#ffffff", 0.25);
  ctx.beginPath();
  ctx.arc(x, y, 4.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.75)";
  ctx.beginPath();
  ctx.arc(x - 1.2, y - 1.4, 1.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawVeins() {
  if (!state.veins.length) return;
  const trail = activeTrail();
  const color = trail.id !== "plain" && trail.color ? trail.color : cssVar("--life", "#6fd9b0");
  const reduce = !!state.meta?.reduceMotion;
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  const visible = state.veins.filter((vein) => vein.life >= 0.08);
  if (visible.length > 1) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    visible.forEach((vein, index) => {
      if (index === 0) ctx.moveTo(vein.x, vein.y);
      else ctx.lineTo(vein.x, vein.y);
    });
    ctx.globalAlpha = 0.2;
    if (!reduce && effectsEnabled()) {
      ctx.shadowColor = color;
      ctx.shadowBlur = 10;
    }
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 0.1;
    ctx.lineWidth = 5;
    ctx.stroke();
  }

  for (const vein of visible) {
    ctx.globalAlpha = 0.18 * vein.life;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.3;
    ctx.setLineDash([2, 5]);
    ctx.beginPath();
    ctx.arc(vein.x, vein.y, vein.r * (0.85 + vein.life * 0.2), 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 0.28 * vein.life;
    ctx.fillStyle = mixColor(color, "#ffffff", 0.25);
    ctx.beginPath();
    ctx.arc(vein.x, vein.y, Math.max(1.4, vein.r * 0.18), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawHeroFrame(body) {
  const frame = activeFrame();
  if (!frame || frame.id === "none" || !body) return;
  ctx.save();
  ctx.translate(body.x, body.y);
  ctx.globalAlpha = 0.35 + Math.sin(state.time * 3) * 0.08;
  ctx.strokeStyle = cssVar("--gold", "#ffe898");
  ctx.lineWidth = 1.8;
  if (frame.id === "ring") {
    ctx.beginPath();
    ctx.arc(0, 0, body.r * 1.7, 0, Math.PI * 2);
    ctx.stroke();
  } else if (frame.id === "hex") {
    const r = body.r * 1.75;
    ctx.beginPath();
    for (let i = 0; i < 6; i += 1) {
      const a = (Math.PI / 3) * i + state.time * 0.4;
      const x = Math.cos(a) * r;
      const y = Math.sin(a) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.stroke();
  } else if (frame.id === "crown") {
    const r = body.r * 1.85;
    ctx.strokeStyle = mixColor(cssVar("--gold", "#ffe898"), "#fff6d8", 0.35);
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < 5; i += 1) {
      const a = -Math.PI / 2 + (Math.PI * 2 * i) / 5 + state.time * 0.25;
      const spike = i % 2 === 0 ? r : r * 0.72;
      const x = Math.cos(a) * spike;
      const y = Math.sin(a) * spike;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, body.r * 1.35, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

function drawLightOrb(x, y, r, color, pulse, alpha = 1, kind = "normal") {
  if (artDraw("drawLightOrb", x, y, r, color, pulse, alpha, kind)) return;
}

function inkPolypBodyPath(s) {
  ctx.beginPath();
  ctx.ellipse(s * 0.08, 0, s * 0.92, s * 0.78, 0, 0, Math.PI * 2);
}

function drawOctopusTentacle(s, wob, i, ink, accent, alpha) {
  const side = i < 4 ? -1 : 1;
  const rank = i % 4;
  const baseY = side * s * (0.18 + rank * 0.2);
  const curl = Math.sin(wob * 1.35 + i * 0.9) * s * 0.42;
  const wave = Math.cos(wob * 1.1 + i * 0.7) * s * 0.28;
  const len = s * (1.55 + rank * 0.12 + Math.sin(wob + i) * 0.12);
  const midX = -s * (0.55 + rank * 0.08) + wave * 0.35;
  const midY = baseY * 1.45 + curl * 0.55;
  const tipX = -len;
  const tipY = baseY * 1.1 + curl + Math.sin(wob * 1.6 + i) * s * 0.2;
  const width = Math.max(2.4, s * (0.22 - rank * 0.02));
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.globalAlpha = alpha * (0.78 + rank * 0.04);
  ctx.strokeStyle = mixColor(ink, accent, 0.12 + rank * 0.05);
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(-s * 0.05, baseY * 0.55);
  ctx.bezierCurveTo(midX, midY, tipX + s * 0.35, tipY - curl * 0.2, tipX, tipY);
  ctx.stroke();
  ctx.globalAlpha = alpha * 0.55;
  ctx.strokeStyle = mixColor(ink, "#2a1830", 0.35);
  ctx.lineWidth = Math.max(1.2, width * 0.42);
  ctx.beginPath();
  ctx.moveTo(-s * 0.02, baseY * 0.55 + width * 0.18);
  ctx.bezierCurveTo(midX, midY + width * 0.15, tipX + s * 0.32, tipY - curl * 0.15, tipX + s * 0.04, tipY);
  ctx.stroke();
  ctx.fillStyle = mixColor(ink, "#fff0e0", 0.35);
  for (let k = 0; k < 5; k += 1) {
    const t = 0.22 + k * 0.14;
    const sx = -s * 0.05 * (1 - t) + midX * (1 - t) * 0.55 + tipX * t;
    const sy = baseY * 0.55 * (1 - t) + midY * (1 - t) * 0.45 + tipY * t;
    const sr = Math.max(1.1, width * (0.28 - k * 0.03));
    ctx.globalAlpha = alpha * (0.55 - k * 0.06);
    ctx.beginPath();
    ctx.ellipse(sx, sy + width * 0.12, sr, sr * 0.72, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawInkPolyp(body, alpha = 1) {
  if (artDraw("drawInkPolyp", body, alpha)) return;
}

function drawSpark(spark) {
  if (artDraw("drawSpark", spark, state.time || 0)) return;
}

function drawCartoonEye(x, y, r, opts = {}) {
  const pupil = opts.pupil ?? 0.48;
  const lookX = opts.lookX ?? r * 0.18;
  const lookY = opts.lookY ?? r * 0.08;
  const angry = opts.angry !== false;
  ctx.fillStyle = opts.white || "#fff8f0";
  ctx.beginPath();
  ctx.ellipse(x, y, r, r * (opts.tall || 1.05), 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = opts.iris || "#180810";
  ctx.beginPath();
  ctx.arc(x + lookX, y + lookY, r * pupil, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(x + lookX + r * 0.18, y + lookY - r * 0.2, r * 0.18, 0, Math.PI * 2);
  ctx.fill();
  if (angry) {
    ctx.strokeStyle = opts.brow || "#180810";
    ctx.lineWidth = Math.max(1.4, r * 0.35);
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(x - r * 0.85, y - r * 0.85);
    ctx.lineTo(x + r * 0.9, y - r * 0.35);
    ctx.stroke();
  }
}

function drawEvilFish(hunter, alpha = 1, ghost = false) {
  if (artDraw("drawEvilFish", hunter, alpha, ghost)) return;
}

function drawDartHunter(hunter, alpha = 1) {
  if (artDraw("drawDartHunter", hunter, alpha)) return;
}

function drawJellyHunter(hunter, alpha = 1) {
  if (artDraw("drawJellyHunter", hunter, alpha)) return;
}

function drawEelHunter(hunter, alpha = 1) {
  if (artDraw("drawEelHunter", hunter, alpha)) return;
}

function drawSharkHunter(hunter, alpha = 1) {
  if (artDraw("drawSharkHunter", hunter, alpha)) return;
}

function drawRayHunter(hunter, alpha = 1) {
  if (artDraw("drawRayHunter", hunter, alpha)) return;
}

function drawGhostHunter(hunter, alpha = 1) {
  if (artDraw("drawGhostHunter", hunter, alpha)) return;
}

function drawCrabHunter(hunter, alpha = 1) {
  if (artDraw("drawCrabHunter", hunter, alpha)) return;
}

function drawUrchinHunter(hunter, alpha = 1) {
  if (artDraw("drawUrchinHunter", hunter, alpha)) return;
}

function drawMirrorHunter(hunter, alpha = 1) {
  if (artDraw("drawMirrorHunter", hunter, alpha)) return;
}

function drawBossHunter(hunter, alpha = 1) {
  if (artDraw("drawBossHunter", hunter, alpha)) return;
}

function drawHeroAura() {
  if (!state.life || !state.running) return;
  if (heroHasAura()) {
    const heroId = activeHeroId();
    const reach = (heroId === "angler" ? 168 : heroId === "lantern" ? 140 : 118) + Math.sin(state.time * 2.4) * 6;
    const accent = heroId === "lantern" || heroId === "angler"
      ? cssVar("--gold", "#ffe898")
      : cssVar("--accent-b", "#7affd4");
    ctx.save();
    ctx.globalAlpha = 0.18 + Math.sin(state.time * 3) * 0.04;
    ctx.strokeStyle = accent;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.arc(state.life.x, state.life.y, reach, 0, Math.PI * 2);
    ctx.stroke();
    const soft = ctx.createRadialGradient(state.life.x, state.life.y, reach * 0.18, state.life.x, state.life.y, reach);
    soft.addColorStop(0, rgbaFromCss(heroId === "lantern" || heroId === "angler" ? "--gold" : "--accent-b", accent, 0.12));
    soft.addColorStop(0.55, rgbaFromCss(heroId === "lantern" || heroId === "angler" ? "--gold" : "--accent-b", accent, 0.05));
    soft.addColorStop(1, "transparent");
    ctx.fillStyle = soft;
    ctx.beginPath();
    ctx.arc(state.life.x, state.life.y, reach, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  } else if (heroHasShield() && (state.heroShield || (activeHeroId() === "nautilus" && (state.shellCharges || 0) > 0))) {
    const pulse = 1 + Math.sin(state.time * 4) * 0.06;
    const charges = activeHeroId() === "nautilus" ? Math.max(1, state.shellCharges || 0) : 1;
    ctx.save();
    ctx.globalAlpha = 0.45;
    ctx.strokeStyle = cssVar("--accent-a", "#ff9a62");
    ctx.lineWidth = 2.2;
    for (let i = 0; i < charges; i += 1) {
      ctx.beginPath();
      ctx.arc(state.life.x, state.life.y, state.life.r * (1.45 + i * 0.22) * pulse, 0, Math.PI * 2);
      ctx.stroke();
    }
    if (effectsEnabled()) {
      ctx.globalAlpha = 0.12;
      ctx.fillStyle = rgbaFromCss("--accent-a", "#ff9a62", 0.2);
      ctx.beginPath();
      ctx.arc(state.life.x, state.life.y, state.life.r * 1.55 * pulse, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  } else if (heroCanDash() && state.heroDashCd <= 0 && !inOpening()) {
    ctx.save();
    ctx.globalAlpha = 0.22 + Math.sin(state.time * 5) * 0.06;
    ctx.strokeStyle = cssVar("--life", "#7affd4");
    ctx.lineWidth = 1.6;
    ctx.setLineDash([4, 6]);
    ctx.beginPath();
    ctx.arc(state.life.x, state.life.y, state.life.r * 1.7, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }
}

function drawHunter(hunter) {
  const alpha = inInkDive() ? 0.28 : 1;
  if (hunter.shadow) {
    ctx.save();
    drawEvilFish(hunter, inInkDive() ? 0.2 : 0.68, true);
    ctx.restore();
    return;
  }
  const species = hunter.species || "fish";
  if (species === "boss" || hunter.boss) drawBossHunter(hunter, alpha);
  else if (species === "dart") drawDartHunter(hunter, alpha);
  else if (species === "jelly") drawJellyHunter(hunter, alpha);
  else if (species === "eel") drawEelHunter(hunter, alpha);
  else if (species === "shark") drawSharkHunter(hunter, alpha);
  else if (species === "ray") drawRayHunter(hunter, alpha);
  else if (species === "ghost") drawGhostHunter(hunter, alpha);
  else if (species === "crab") drawCrabHunter(hunter, alpha);
  else if (species === "urchin") drawUrchinHunter(hunter, alpha);
  else if (species === "mirror") drawMirrorHunter(hunter, alpha);
  else drawEvilFish(hunter, alpha, false);

  if (hunter.warn > 0 && !inInkDive() && species !== "boss" && !hunter.boss) {
    const warnColor =
      species === "eel" ? "#3cffb0"
      : species === "jelly" ? "#ff7ab8"
      : species === "ray" ? "#7ef0ea"
      : species === "ghost" ? "#c8d8ff"
      : species === "crab" ? "#ff9a62"
      : species === "urchin" ? "#9be7ff"
      : species === "mirror" ? "#c8f0ff"
      : cssVar("--danger", "#ff6888");
    const radius = hunter.r * (hunterReachMul(hunter) + (1 - hunter.warn) * 1.2);
    ctx.save();
    ctx.globalAlpha = hunter.warn * 0.22;
    ctx.fillStyle = warnColor;
    ctx.beginPath();
    ctx.arc(hunter.x, hunter.y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = hunter.warn * 0.55;
    ctx.strokeStyle = warnColor;
    ctx.lineWidth = 2.2;
    ctx.setLineDash([5, 7]);
    ctx.beginPath();
    ctx.arc(hunter.x, hunter.y, radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  if ((hunter.boss || species === "boss") && !inInkDive()) {
    const phase = hunter.bossPhase || "";
    if (phase === "telegraph" || phase === "charge" || phase === "suck" || phase === "ink_burst") {
      const danger = phase === "ink_burst"
        ? cssVar("--accent-a", "#c184ff")
        : phase === "suck"
          ? cssVar("--bg2", "#4a78a8")
          : cssVar("--danger", "#ff6b7a");
      const radius = hunter.r * (phase === "charge" ? 2.55 : phase === "suck" ? 2.9 : 2.15);
      ctx.save();
      ctx.globalAlpha = phase === "charge" ? 0.28 : 0.18;
      ctx.fillStyle = danger;
      ctx.beginPath();
      ctx.arc(hunter.x, hunter.y, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = phase === "charge" ? 0.55 : 0.38;
      ctx.strokeStyle = danger;
      ctx.lineWidth = 2.6;
      ctx.setLineDash(phase === "telegraph" || phase === "suck" ? [7, 9] : []);
      ctx.beginPath();
      ctx.arc(
        hunter.x,
        hunter.y,
        radius + (state.meta?.reduceMotion ? 0 : Math.sin(state.time * 9) * 4),
        0,
        Math.PI * 2
      );
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }
  }
}

function drawHeroEyes(s, wob, alpha, eyeY = 0) {
  const blink = Math.sin(wob * 0.32) > 0.93 ? 0.2 : 1;
  for (const side of [-1, 1]) {
    const ex = s * 0.28;
    const ey = side * s * 0.22 + eyeY;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = "#fffdf8";
    ctx.beginPath();
    ctx.ellipse(ex, ey, s * 0.16, s * 0.2 * blink, side * 0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#120818";
    ctx.beginPath();
    ctx.arc(ex + s * 0.04, ey, s * 0.07 * blink, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(ex + s * 0.07, ey - s * 0.04, s * 0.03, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawJellyfish(body, alpha = 1) {
  if (artDraw("drawJellyfish", body, alpha)) return;
}

function drawTurtle(body, alpha = 1) {
  if (artDraw("drawTurtle", body, alpha)) return;
}

function drawCrab(body, alpha = 1) {
  if (artDraw("drawCrab", body, alpha)) return;
}


function drawManta(body, alpha = 1) {
  if (artDraw("drawManta", body, alpha)) return;
}

function drawAngler(body, alpha = 1) {
  if (artDraw("drawAngler", body, alpha)) return;
}

function drawNautilus(body, alpha = 1) {
  if (artDraw("drawNautilus", body, alpha)) return;
}


function drawSubmarine(body, alpha = 1) {
  if (artDraw("drawSubmarine", body, alpha)) return;
}


function drawShipLivesHud() {
  if (activeHeroId() !== "sub" || !state.life || !state.running) return;
  const life = state.life;
  ctx.save();
  for (let i = 0; i < SUBMARINE_LIVES; i += 1) {
    const on = i < (state.shipLives || 0);
    ctx.fillStyle = on ? "rgba(255,210,130,0.95)" : "rgba(70,95,120,0.35)";
    ctx.strokeStyle = on ? "rgba(255,230,180,0.7)" : "rgba(100,120,140,0.25)";
    ctx.lineWidth = 1;
    const x = life.x + life.r * 1.55;
    const y = life.y - life.r * 1.15 + i * 11;
    ctx.beginPath();
    ctx.arc(x, y, 3.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}

function drawShots() {
  if (!state.shots?.length) return;
  for (const s of state.shots) {
    const a = clamp(s.life * 1.5, 0, 1);
    ctx.save();
    ctx.globalAlpha = a;
    ctx.fillStyle = "rgba(255,220,140,0.95)";
    ctx.shadowColor = "rgba(255,180,80,0.9)";
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = "rgba(255,255,240,0.9)";
    ctx.beginPath();
    ctx.arc(s.x - s.vx * 0.01, s.y - s.vy * 0.01, s.r * 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = `rgba(255,200,120,${0.55 * a})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(s.x, s.y);
    ctx.lineTo(s.x - s.vx * 0.04, s.y - s.vy * 0.04);
    ctx.stroke();
    ctx.restore();
  }
}

function drawEel(body, alpha = 1) {
  if (artDraw("drawEel", body, alpha)) return;
}

function drawSquid(body, alpha = 1) {
  if (artDraw("drawSquid", body, alpha)) return;
}

function drawSeahorse(body, alpha = 1) {
  if (artDraw("drawSeahorse", body, alpha)) return;
}

function drawWhale(body, alpha = 1) {
  if (artDraw("drawWhale", body, alpha)) return;
}

function drawDolphin(body, alpha = 1) {
  if (artDraw("drawDolphin", body, alpha)) return;
}

function drawSeal(body, alpha = 1) {
  if (artDraw("drawSeal", body, alpha)) return;
  drawDolphin(body, alpha);
}

function drawLantern(body, alpha = 1) {
  if (artDraw("drawLantern", body, alpha)) return;
  drawAngler(body, alpha);
}

function drawStarfish(body, alpha = 1) {
  if (artDraw("drawStarfish", body, alpha)) return;
}

function drawInkCloudFx() {
  if (!state.inkCloud || !state.running) return;
  const c = state.inkCloud;
  const a = clamp(c.t / 4.4, 0, 1) * 0.65;
  ctx.save();
  const g = ctx.createRadialGradient(c.x, c.y, c.r * 0.12, c.x, c.y, c.r);
  g.addColorStop(0, `rgba(60,40,100,${0.5 * a})`);
  g.addColorStop(0.45, `rgba(35,22,70,${0.32 * a})`);
  g.addColorStop(1, "transparent");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = `rgba(180,150,255,${0.12 * a})`;
  for (let i = 0; i < 7; i += 1) {
    const ang = state.time * 0.8 + i * 0.9;
    const rr = c.r * (0.25 + (i % 3) * 0.18);
    ctx.beginPath();
    ctx.arc(c.x + Math.cos(ang) * rr, c.y + Math.sin(ang * 1.1) * rr, 6 + (i % 3) * 3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawEelBoltsFx() {
  if (!state.eelBolts?.length) return;
  for (const b of state.eelBolts) {
    const a = clamp(b.t / 0.22, 0, 1);
    ctx.save();
    ctx.globalAlpha = a;
    ctx.strokeStyle = "rgba(180,235,255,0.95)";
    ctx.shadowColor = "rgba(120,200,255,0.9)";
    ctx.shadowBlur = 10;
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(b.x0, b.y0);
    const mx = (b.x0 + b.x1) * 0.5 + (Math.random() - 0.5) * 12;
    const my = (b.y0 + b.y1) * 0.5 + (Math.random() - 0.5) * 12;
    ctx.lineTo(mx, my);
    ctx.lineTo(b.x1, b.y1);
    ctx.stroke();
    ctx.restore();
  }
}

function drawMantaWakeFx() {
  if (!state.mantaWake || !state.running) return;
  const w = state.mantaWake;
  const a = clamp(w.t / 1.05, 0, 1) * 0.45;
  ctx.save();
  ctx.translate(w.x, w.y);
  ctx.rotate(Math.atan2(w.ny, w.nx));
  ctx.globalAlpha = a;
  const g = ctx.createLinearGradient(-w.len * 0.5, 0, w.len * 0.5, 0);
  g.addColorStop(0, "transparent");
  g.addColorStop(0.5, "rgba(122,255,212,0.35)");
  g.addColorStop(1, "transparent");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(0, 0, w.len * 0.5, w.halfW, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawSonarRingsFx() {
  if (!state.sonarRings?.length) return;
  for (const ring of state.sonarRings) {
    const a = clamp(1 - ring.t / 0.55, 0, 1) * 0.55;
    ctx.save();
    ctx.globalAlpha = a;
    ctx.strokeStyle = "rgba(150,210,255,0.9)";
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.arc(ring.x, ring.y, ring.r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = "rgba(200,235,255,0.35)";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(ring.x, ring.y, ring.r * 0.72, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

function drawCustomHero(body, alpha = 1) {
  if (!customHeroImage.ready || !customHeroImage.img) {
    drawInkPolyp(body, alpha);
    return;
  }
  const aim = body.aim ?? -Math.PI / 2;
  const s = body.r;
  const size = s * 2.5;
  ctx.save();
  ctx.translate(body.x, body.y);
  ctx.rotate(aim + Math.PI / 2);
  ctx.globalAlpha = alpha;
  ctx.drawImage(customHeroImage.img, -size * 0.5, -size * 0.5, size, size);
  ctx.restore();
}

function drawLifeBody(body, alpha = 1, heroOverride = null) {
  const hero = heroOverride || activeHeroId();
  if (hero === "jellyfish") drawJellyfish(body, alpha);
  else if (hero === "turtle") drawTurtle(body, alpha);
  else if (hero === "crab") drawCrab(body, alpha);
  else if (hero === "manta") drawManta(body, alpha);
  else if (hero === "angler") drawAngler(body, alpha);
  else if (hero === "lantern") drawLantern(body, alpha);
  else if (hero === "nautilus") drawNautilus(body, alpha);
  else if (hero === "sub") drawSubmarine(body, alpha);
  else if (hero === "eel") drawEel(body, alpha);
  else if (hero === "squid") drawSquid(body, alpha);
  else if (hero === "seahorse") drawSeahorse(body, alpha);
  else if (hero === "whale") drawWhale(body, alpha);
  else if (hero === "dolphin") drawDolphin(body, alpha);
  else if (hero === "seal") drawSeal(body, alpha);
  else if (hero === "starfish") drawStarfish(body, alpha);
  else if (hero === "custom") drawCustomHero(body, alpha);
  else drawInkPolyp(body, alpha);
}

const drawTool = {
  drawing: false,
  dirty: false,
  color: "#fff1e4",
  lastX: 0,
  lastY: 0,
};

function paintDrawGuide() {
  if (!drawCtx || !drawCanvasEl) return;
  const w = drawCanvasEl.width;
  const h = drawCanvasEl.height;
  const cx = w * 0.5;
  const cy = h * 0.48;
  const r = Math.min(w, h) * 0.28;
  drawCtx.save();
  drawCtx.strokeStyle = "rgba(255, 241, 228, 0.22)";
  drawCtx.lineWidth = 2;
  drawCtx.setLineDash([8, 8]);
  drawCtx.beginPath();
  drawCtx.arc(cx, cy, r, 0, Math.PI * 2);
  drawCtx.stroke();
  drawCtx.setLineDash([]);
  drawCtx.fillStyle = "rgba(255, 241, 228, 0.28)";
  drawCtx.font = "600 18px Instrument Sans, sans-serif";
  drawCtx.textAlign = "center";
  drawCtx.fillText("рисуй здесь", cx, cy + r + 28);
  drawCtx.restore();
}

function clearDrawCanvas() {
  if (!drawCtx || !drawCanvasEl) return;
  drawCtx.clearRect(0, 0, drawCanvasEl.width, drawCanvasEl.height);
  // Opaque base so strokes are visible; export keeps solid pixels on transparent via destination-over trim later.
  drawCtx.fillStyle = "rgba(12, 32, 64, 0.01)";
  drawCtx.fillRect(0, 0, drawCanvasEl.width, drawCanvasEl.height);
  paintDrawGuide();
  drawTool.dirty = false;
}

function exportCustomHeroPng() {
  if (!drawCanvasEl || !drawTool.dirty) return "";
  return drawCanvasEl.toDataURL("image/png");
}

function openDrawHero() {
  if (!screenDrawEl || !drawCanvasEl) return;
  hideFlowScreens();
  screenOverEl?.classList.add("hidden");
  screenDrawEl.classList.remove("hidden");
  clearDrawCanvas();
  drawTool.color = "#fff1e4";
  document.querySelectorAll(".draw-color").forEach((btn) => {
    btn.classList.toggle("on", btn.dataset.color === drawTool.color);
    btn.style.setProperty("--swatch", btn.dataset.color);
  });
}

function closeDrawHero(backToHero = true) {
  screenDrawEl?.classList.add("hidden");
  if (backToHero) showHeroPick();
  else showHomeMenu();
}

function drawPointerPos(e) {
  const rect = drawCanvasEl.getBoundingClientRect();
  const scaleX = drawCanvasEl.width / Math.max(1, rect.width);
  const scaleY = drawCanvasEl.height / Math.max(1, rect.height);
  return {
    x: (e.clientX - rect.left) * scaleX,
    y: (e.clientY - rect.top) * scaleY,
  };
}

function strokeDraw(x0, y0, x1, y1) {
  if (!drawCtx) return;
  if (!drawTool.dirty) {
    // Wipe guide text/circle once the player starts drawing.
    drawCtx.clearRect(0, 0, drawCanvasEl.width, drawCanvasEl.height);
    drawTool.dirty = true;
  }
  drawCtx.strokeStyle = drawTool.color;
  drawCtx.fillStyle = drawTool.color;
  drawCtx.lineWidth = 16;
  drawCtx.lineCap = "round";
  drawCtx.lineJoin = "round";
  drawCtx.beginPath();
  drawCtx.moveTo(x0, y0);
  drawCtx.lineTo(x1, y1);
  drawCtx.stroke();
  drawCtx.beginPath();
  drawCtx.arc(x1, y1, 8, 0, Math.PI * 2);
  drawCtx.fill();
}

function bindDrawHeroUi() {
  if (!drawCanvasEl || !drawCtx) return;
  document.querySelectorAll(".draw-color").forEach((btn) => {
    btn.style.setProperty("--swatch", btn.dataset.color);
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      drawTool.color = btn.dataset.color || "#fff1e4";
      document.querySelectorAll(".draw-color").forEach((b) => b.classList.toggle("on", b === btn));
    });
  });
  const startDraw = (e) => {
    e.preventDefault();
    e.stopPropagation();
    drawCanvasEl.setPointerCapture?.(e.pointerId);
    drawTool.drawing = true;
    const p = drawPointerPos(e);
    drawTool.lastX = p.x;
    drawTool.lastY = p.y;
    strokeDraw(p.x, p.y, p.x, p.y);
  };
  const moveDraw = (e) => {
    if (!drawTool.drawing) return;
    e.preventDefault();
    e.stopPropagation();
    const p = drawPointerPos(e);
    strokeDraw(drawTool.lastX, drawTool.lastY, p.x, p.y);
    drawTool.lastX = p.x;
    drawTool.lastY = p.y;
  };
  const endDraw = (e) => {
    if (!drawTool.drawing) return;
    e.preventDefault();
    drawTool.drawing = false;
  };
  drawCanvasEl.addEventListener("pointerdown", startDraw, { passive: false });
  drawCanvasEl.addEventListener("pointermove", moveDraw, { passive: false });
  drawCanvasEl.addEventListener("pointerup", endDraw, { passive: false });
  drawCanvasEl.addEventListener("pointercancel", endDraw, { passive: false });
  btnDrawClear?.addEventListener("click", (e) => {
    e.preventDefault();
    clearDrawCanvas();
  });
  btnDrawCancel?.addEventListener("click", (e) => {
    e.preventDefault();
    closeDrawHero(true);
  });
  btnDrawSave?.addEventListener("click", (e) => {
    e.preventDefault();
    if (!state.meta || !drawCanvasEl) return;
    const data = exportCustomHeroPng();
    if (!data) {
      showToast("сначала нарисуй героя");
      return;
    }
    state.meta.customHero = data;
    state.meta.activeHero = "custom";
    saveMeta();
    loadCustomHeroImage(data);
    closeDrawHero(true);
    renderHeroPicker();
    showToast("свой герой готов");
  });
  btnDrawHero?.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    openDrawHero();
  });
}

function drawEcho() {
  if (!state.echo) return;
  const fade = clamp(state.echo.life ?? 1, 0, 1);
  const ink = lifeInkColor();
  const s = state.echo.r;
  const aim = state.echo.aim ?? -Math.PI / 2;
  ctx.save();
  ctx.translate(state.echo.x, state.echo.y);
  ctx.rotate(aim);
  ctx.globalAlpha = 0.1 + fade * 0.3;
  ctx.strokeStyle = mixColor(ink, cssVar("--foam", "#fffdf8"), 0.45);
  ctx.lineWidth = 2.2;
  ctx.setLineDash([5, 7]);
  inkPolypBodyPath(s);
  ctx.stroke();
  for (let i = 0; i < 3; i += 1) {
    const spread = (i - 1) * 0.42;
    ctx.beginPath();
    ctx.moveTo(-s * 0.1, spread * s * 0.45);
    ctx.quadraticCurveTo(-s * 0.75, spread * s * 0.9, -s * 0.95, spread * s * 0.7);
    ctx.stroke();
  }
  ctx.setLineDash([]);
  ctx.restore();
}

function drawSafeShield() {
  drawHeroAura();
  if (!state.life || !playerIsSafe()) return;
  const left = Math.max(0, state.safeUntil - performance.now()) / 900;
  ctx.save();
  ctx.globalAlpha = 0.18 + clamp(left, 0, 1) * 0.2;
  ctx.strokeStyle = cssVar("--foam", "#f3eee8");
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(state.life.x, state.life.y, state.life.r * 1.85, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawHungerVignette() {
  if (!state.running) return;
  if (state.fever) {
    const e = hexToRgb(cssVar("--ember", "#ff8a52"));
    ctx.fillStyle = `rgba(${e[0]}, ${e[1]}, ${e[2]}, ${0.08 + Math.sin(state.time * 8) * 0.03})`;
    ctx.fillRect(0, 0, state.width, state.height);
  }
  const eventId = activeEventId();
  if (eventId === "calm") {
    const l = hexToRgb(cssVar("--life", "#6ff0c4"));
    ctx.fillStyle = `rgba(${l[0]}, ${l[1]}, ${l[2]}, 0.07)`;
    ctx.fillRect(0, 0, state.width, state.height);
  } else if (eventId === "rain") {
    const g = hexToRgb(cssVar("--gold", "#ffe08a"));
    ctx.fillStyle = `rgba(${g[0]}, ${g[1]}, ${g[2]}, 0.06)`;
    ctx.fillRect(0, 0, state.width, state.height);
  }
  if (state.hunger >= 28 || !state.life) return;
  const strength = clamp((28 - state.hunger) / 28, 0, 1);
  ctx.save();
  ctx.globalAlpha = 0.08 + strength * 0.28;
  ctx.fillStyle = cssVar("--danger", "#e2556d");
  ctx.beginPath();
  ctx.rect(0, 0, state.width, state.height);
  ctx.arc(state.width * 0.5, state.height * 0.5, Math.min(state.width, state.height) * 0.34, 0, Math.PI * 2, true);
  ctx.fill("evenodd");
  ctx.restore();
}

function drawPauseHint() {
  if (!state.paused || !state.running) return;
  ctx.save();
  ctx.fillStyle = "rgba(12,10,14,0.42)";
  ctx.fillRect(0, 0, state.width, state.height);
  ctx.fillStyle = "rgba(243,238,232,0.9)";
  ctx.font = "800 18px Syne, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("пауза", state.width * 0.5, state.height * 0.46);
  ctx.fillStyle = "rgba(243,238,232,0.62)";
  ctx.font = "600 13px Instrument Sans, sans-serif";
  ctx.fillText("коснись экрана, чтобы продолжить", state.width * 0.5, state.height * 0.52);
  ctx.restore();
}

function drawGuide() {
  if (!state.running || !state.life || !state.guideSpark || state.score >= 5) return;
  ctx.save();
  ctx.globalAlpha = 0.34 + Math.sin(state.time * 4) * 0.08;
  ctx.strokeStyle = cssVar("--gold", "#e6c07b");
  ctx.lineWidth = 1.4;
  ctx.setLineDash([6, 8]);
  ctx.beginPath();
  ctx.moveTo(state.life.x, state.life.y);
  ctx.lineTo(state.guideSpark.x, state.guideSpark.y);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(state.guideSpark.x, state.guideSpark.y, state.guideSpark.r * 1.5, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
}

function drawHoldHint() {
  const cx = state.width * 0.5;
  const cy = state.height * 0.56;
  const s = 34;
  const pulse = 0.33 + Math.sin(state.time * 2.9) * 0.11;
  ctx.save();
  ctx.globalAlpha = pulse;
  ctx.strokeStyle = cssVar("--foam", "#f3eee8");
  ctx.lineWidth = 1.5;
  const corners = [
    [cx - s, cy - s, 1, 1],
    [cx + s, cy - s, -1, 1],
    [cx - s, cy + s, 1, -1],
    [cx + s, cy + s, -1, -1],
  ];
  for (const [x, y, dx, dy] of corners) {
    ctx.beginPath();
    ctx.moveTo(x, y + dy * 14);
    ctx.lineTo(x, y);
    ctx.lineTo(x + dx * 14, y);
    ctx.stroke();
  }
  ctx.globalAlpha = 0.58;
  ctx.fillStyle = cssVar("--sand", "#a89b90");
  ctx.font = "600 12px Instrument Sans, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(controlMode() === "joystick" ? "держи стик" : "удерживай", cx, cy + s + 28);
  ctx.restore();
}

function drawJoystick() {
  if (controlMode() !== "joystick" || !state.stick || !state.touchActive) return;
  const { ox, oy } = state.stick;
  const { nx, ny, mag } = stickVector();
  const knobX = ox + nx * STICK_RADIUS * mag;
  const knobY = oy + ny * STICK_RADIUS * mag;
  ctx.save();
  ctx.globalAlpha = 0.22;
  ctx.strokeStyle = cssVar("--foam", "#fffdf8");
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(ox, oy, STICK_RADIUS, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = 0.16;
  ctx.fillStyle = cssVar("--foam", "#fffdf8");
  ctx.beginPath();
  ctx.arc(ox, oy, STICK_RADIUS, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 0.55;
  ctx.beginPath();
  ctx.arc(knobX, knobY, 22, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 0.85;
  ctx.fillStyle = cssVar("--life", "#7affd4");
  ctx.beginPath();
  ctx.arc(knobX, knobY, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawParticles() {
  for (const p of state.particles) {
    const life = Math.max(0, p.life);
    ctx.globalAlpha = life;
    ctx.fillStyle = p.color;
    const kind = p.kind || "dot";
    if (kind === "streak") {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot || Math.atan2(p.vy, p.vx || 0.001));
      const streak = ctx.createLinearGradient(-p.size * 1.8, 0, p.size * 1.8, 0);
      streak.addColorStop(0, "transparent");
      streak.addColorStop(0.45, p.color);
      streak.addColorStop(1, mixColor(p.color, "#ffffff", 0.45));
      ctx.fillStyle = streak;
      ctx.fillRect(-p.size * 1.8, -p.size * 0.3, p.size * 3.6, p.size * 0.6);
      ctx.restore();
    } else if (kind === "shard") {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot || 0);
      ctx.beginPath();
      ctx.moveTo(p.size, 0);
      ctx.lineTo(0, p.size * 0.55);
      ctx.lineTo(-p.size * 0.7, 0);
      ctx.lineTo(0, -p.size * 0.55);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = mixColor(p.color, "#ffffff", 0.35);
      ctx.beginPath();
      ctx.moveTo(p.size * 0.55, 0);
      ctx.lineTo(0, p.size * 0.25);
      ctx.lineTo(-p.size * 0.2, 0);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    } else if (kind === "bloom") {
      ctx.globalAlpha = life * 0.55;
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, p.size * 1.35, p.size * 0.85, p.rot || 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = life;
      ctx.fillStyle = mixColor(p.color, "#ffffff", 0.35);
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, p.size * 0.55, p.size * 0.34, p.rot || 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (kind === "ring") {
      ctx.globalAlpha = life * 0.85;
      ctx.strokeStyle = p.color;
      ctx.lineWidth = Math.max(1.2, p.size * 0.4);
      ctx.beginPath();
      ctx.arc(p.x, p.y, Math.max(1.5, p.size), 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = life * 0.28;
      ctx.beginPath();
      ctx.arc(p.x, p.y, Math.max(2.2, p.size * 1.25), 0, Math.PI * 2);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.arc(p.x, p.y, Math.max(1.2, p.size * 0.85), 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = mixColor(p.color, "#ffffff", 0.4);
      ctx.beginPath();
      ctx.arc(p.x - p.size * 0.18, p.y - p.size * 0.2, Math.max(0.6, p.size * 0.38), 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
  for (const f of state.floaters) {
    const life = Math.max(0, f.life);
    ctx.save();
    ctx.globalAlpha = life;
    ctx.font = `800 ${f.size}px Syne, sans-serif`;
    ctx.textAlign = "center";
    ctx.lineJoin = "round";
    ctx.lineWidth = Math.max(2.5, f.size * 0.12);
    ctx.strokeStyle = "rgba(8, 14, 28, 0.55)";
    ctx.strokeText(f.text, f.x, f.y);
    ctx.fillStyle = f.color;
    ctx.fillText(f.text, f.x, f.y);
    ctx.fillStyle = mixColor(f.color, "#ffffff", 0.35);
    ctx.globalAlpha = life * 0.45;
    ctx.fillText(f.text, f.x, f.y - 0.8);
    ctx.restore();
  }
  ctx.globalAlpha = 1;
}

function drawOpeningPulse() {
  if (!state.life || !inOpening() || state.meta?.reduceMotion) return;
  const life = state.life;
  const t = state.elapsed / OPENING_SEC;
  const glow = (1 - t) * 0.24;
  if (glow <= 0.02) return;
  ctx.save();
  ctx.globalAlpha = glow;
  const g = ctx.createRadialGradient(life.x, life.y, life.r * 0.35, life.x, life.y, life.r * 2.6);
  g.addColorStop(0, rgbaFromCss("--life", "#7affd4", 0.42));
  g.addColorStop(0.45, rgbaFromCss("--accent-b", "#7affd4", 0.16));
  g.addColorStop(1, "transparent");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(life.x, life.y, life.r * 2.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function draw() {
  ctx.save();
  if (!state.meta?.reduceMotion && state.shake > 0.08) {
    ctx.translate((Math.random() - 0.5) * state.shake, (Math.random() - 0.5) * state.shake);
  }
  drawBackground();
  drawVeins();
  drawGlyphs();
  for (const spark of state.sparks) drawSpark(spark);
  for (const hunter of state.hunters) drawHunter(hunter);
  drawEcho();
  drawGuide();
  drawInkCloudFx();
  drawMantaWakeFx();
  drawSonarRingsFx();
  drawEelBoltsFx();
  drawRunGhost();
  if (state.life2) {
    drawLifeBody(state.life2, 0.82);
  }
  if (state.life) {
    drawSafeShield();
    drawHeroFrame(state.life);
    drawLifeBody(state.life);
    drawShipLivesHud();
    drawSymbiote();
  } else if (state.running && !state.hasTouchedCanvas) {
    drawHoldHint();
  } else if (!state.running && state.demo && state.life) {
    drawLifeBody(state.life, 0.86);
  }
  drawShots();
  drawParticles();
  drawOpeningPulse();
  drawJoystick();
  drawHungerVignette();
  if (state.flash > 0) {
    const flashRgb = hexToRgb(cssVar("--gold", "#ffe08a"));
    const strength = Math.min(0.72, state.flash * (state.flash > 0.7 ? 0.55 : 0.22));
    ctx.fillStyle = `rgba(${flashRgb[0]},${flashRgb[1]},${flashRgb[2]},${strength})`;
    ctx.fillRect(0, 0, state.width, state.height);
    if (state.flash > 0.7) {
      ctx.fillStyle = `rgba(255,255,255,${Math.min(0.35, (state.flash - 0.7) * 0.5)})`;
      ctx.fillRect(0, 0, state.width, state.height);
    }
  }
  drawPauseHint();
  ctx.restore();
}

function frame(ts) {
  if (document.hidden) {
    state.lastTs = ts;
    requestAnimationFrame(frame);
    return;
  }
  const measuredMs = ts - (state.lastTs || ts);
  if (measuredMs > 0) perfMonitor?.sample(measuredMs);
  const rawDt = Math.min(0.033, measuredMs / 1000 || 0.016);
  state.lastTs = ts;
  if (state.slowmoUntil && ts >= state.slowmoUntil) {
    state.timeScale = 1;
    state.slowmoUntil = 0;
  }
  const dt = rawDt * (state.running ? state.timeScale || 1 : 1);
  if (state.hold && !state.running) {
    state.hold.progress = clamp(state.hold.progress + rawDt / HOLD_SECONDS, 0, 1);
    const width = `${Math.round(state.hold.progress * 100)}%`;
    setHoldVisual(width, state.hold.target);
    if (state.hold.progress >= 1) {
      clearHold();
      startGame();
    }
  }
  const inMenuFlow =
    screenOnboardEl?.classList.contains("hidden") !== false &&
    (screenVisible(screenStartEl)
      || screenVisible(screenHeroEl)
      || screenVisible(screenDiffEl)
      || screenVisible(document.getElementById("screen-more"))
      || screenVisible(document.getElementById("screen-auth")));
  if (state.running) {
    updateRun(dt);
  } else if (inMenuFlow) {
    updateDemo(dt);
    if (screenVisible(screenHeroEl)) {
      portraitSkip = (portraitSkip + 1) % 3;
      if (portraitSkip === 0) paintHeroPortrait();
    }
  } else {
    updateOver(dt);
  }
  // Soft throttle when an overlay covers the canvas and nothing animated needs 60fps.
  const overlayHeavy =
    !state.running &&
    !inMenuFlow &&
    (screenVisible(document.getElementById("screen-donate")) ||
      screenVisible(document.getElementById("screen-draw")) ||
      screenVisible(screenOnboardEl));
  if (overlayHeavy && measuredMs < 48) {
    requestAnimationFrame(frame);
    return;
  }
  draw();
  requestAnimationFrame(frame);
}

function cloudConfig() {
  try {
    return JSON.parse(localStorage.getItem("ottisk-cloud-config-v1") || "{}");
  } catch (_) {
    return {};
  }
}

function loadLocalBoard() {
  try {
    const raw = JSON.parse(localStorage.getItem(LOCAL_BOARD_KEY) || "[]");
    if (!Array.isArray(raw)) return [];
    return raw
      .filter((row) => row && Number.isFinite(Number(row.score)) && Number(row.score) > 0)
      .map((row) => ({
        score: Math.floor(Number(row.score)),
        name: String(row.name || "оттиск").slice(0, 24),
        day: typeof row.day === "string" ? row.day : "",
        at: Number(row.at) || 0,
      }));
  } catch (_) {
    return [];
  }
}

function recordLocalDayScore(score) {
  const value = Math.floor(Number(score) || 0);
  if (value < 1) return;
  const name = String(state.meta?.cloudName || window.OttiskAccount?.displayName?.() || "оттиск").slice(0, 24);
  const entries = loadLocalBoard();
  entries.push({ score: value, name, day: localDayKey(), at: Date.now() });
  entries.sort((a, b) => b.score - a.score || a.at - b.at);
  localStorage.setItem(LOCAL_BOARD_KEY, JSON.stringify(entries.slice(0, LOCAL_BOARD_MAX)));
  renderLocalLeaderboard();
}

function renderLocalLeaderboard() {
  const list = document.getElementById("local-leaderboard");
  if (!list) return;
  list.textContent = "";
  const entries = loadLocalBoard();
  if (!entries.length) {
    const empty = document.createElement("li");
    empty.textContent = "пока пусто · сыграй забег";
    list.appendChild(empty);
    return;
  }
  entries.forEach((entry, index) => {
    const item = document.createElement("li");
    item.textContent = `#${index + 1} · ${entry.name} · ${entry.score}`;
    list.appendChild(item);
  });
}

function renderCloudStatus(text = "") {
  const status = document.getElementById("cloud-status");
  const account = document.getElementById("btn-cloud-account");
  if (!status) return;
  const configured = !!cloudConfig().apiUrl;
  const linked = !!window.OttiskCloud?.isLinked?.();
  status.textContent = text || (linked
    ? "подключено · синхронизация активна"
    : configured ? "сервер настроен · нужен аккаунт" : "не подключено · игра работает офлайн");
  if (account) account.textContent = linked ? "Отключить" : tr("cloud_setup", "Подключить");
}

async function renderSocial() {
  const profileEl = document.getElementById("social-profile");
  const listEl = document.getElementById("social-list");
  if (!profileEl || !listEl) return;
  if (!window.OttiskSocial?.isAvailable?.()) {
    profileEl.textContent = window.OttiskI18n?.locale === "en"
      ? "Link cloud account to use friends"
      : "подключи облако для друзей";
    listEl.textContent = "";
    return;
  }
  profileEl.textContent = tr("loading", "Загрузка…");
  try {
    const [profile, friends, league, duels] = await Promise.all([
      window.OttiskSocial.profile(),
      window.OttiskSocial.friends(),
      window.OttiskSocial.seasonLeague(),
      window.OttiskSocial.duels(),
    ]);
    profileEl.textContent = profile
      ? `${profile.displayName || state.meta.cloudName || "ОТТИСК"} · ${profile.friendCode} · ${league?.league || "bronze"}${league?.rank ? ` #${league.rank}` : ""}${league?.leagueSize ? ` / ${league.leagueSize}` : ""}`
      : tr("error", "Ошибка");
    listEl.textContent = "";
    for (const friend of friends?.friends || []) {
      const entry = document.createElement("div");
      entry.className = "social-entry";
      entry.textContent = `${friend.displayName} · ${friend.friendCode}`;
      listEl.appendChild(entry);
    }
    for (const duel of (duels?.duels || []).slice(0, 4)) {
      const entry = document.createElement("div");
      entry.className = "social-entry";
      const result = duel.status === "completed"
        ? `${duel.outcome} · ${duel.challengerScore}:${duel.targetScore}`
        : window.OttiskI18n?.locale === "en" ? "awaiting run" : "ждёт забега";
      entry.textContent = `${window.OttiskI18n?.locale === "en" ? "duel" : "дуэль"} · ${duel.opponent.displayName} · ${result}`;
      if (duel.status === "pending" && duel.role === "target" && state.meta.lastReplay) {
        const accept = document.createElement("button");
        accept.type = "button";
        accept.className = "menu-link";
        accept.textContent = window.OttiskI18n?.locale === "en" ? "Use last run" : "Принять последним забегом";
        accept.addEventListener("click", async () => {
          const replay = state.meta.lastReplay;
          await window.OttiskSocial.completeDuel(duel.id, replay.score, replay.durationMs, replay.samples);
          await renderSocial();
        });
        entry.append(" ", accept);
      }
      listEl.appendChild(entry);
    }
  } catch (error) {
    profileEl.textContent = `${tr("error", "Ошибка")} · ${error.code || error.message}`;
  }
}

async function renderLeagueBoard() {
  const board = document.getElementById("league-board");
  if (!board) return;
  if (!window.OttiskSocial?.isAvailable?.()) {
    board.classList.remove("hidden");
    board.innerHTML = "<li>подключи облако</li>";
    return;
  }
  board.classList.remove("hidden");
  board.innerHTML = `<li>${tr("loading", "Загрузка…")}</li>`;
  try {
    const league = await window.OttiskSocial.seasonLeague();
    const entries = league?.entries || league?.board || [];
    board.textContent = "";
    if (!entries.length) {
      const li = document.createElement("li");
      li.textContent = `${league?.league || "bronze"}${league?.rank ? ` · #${league.rank}` : ""} · пока пусто`;
      board.appendChild(li);
      return;
    }
    entries.slice(0, 10).forEach((row, index) => {
      const li = document.createElement("li");
      li.textContent = `#${row.rank || index + 1} · ${row.displayName || "—"} · ${row.score || 0}`;
      board.appendChild(li);
    });
  } catch (error) {
    board.innerHTML = `<li>${tr("error", "Ошибка")} · ${error.code || error.message}</li>`;
  }
}

function mergeCloudMeta(local, remote) {
  if (!remote || typeof remote !== "object") return local;
  const unionKeys = [
    "unlockedSkins", "premiumUnlocked", "unlockedHeroes", "unlockedTrails",
    "unlockedFrames", "seasonalUnlocks", "trophies", "seenRunTips",
    "seenAbilityTips", "seenMechanicCards", "seenChapters",
  ];
  const merged = { ...remote, ...local };
  for (const key of unionKeys) {
    merged[key] = [...new Set([...(remote[key] || []), ...(local[key] || [])])];
  }
  for (const key of ["best", "marks", "streak", "dailyBest", "weekBest", "weekProgress", "runs"]) {
    merged[key] = Math.max(Number(local[key] || 0), Number(remote[key] || 0));
  }
  merged.iapHeroes = local.iapHeroes || [];
  merged.starterPackBought = !!local.starterPackBought;
  const api = window.OttiskProgression;
  if (api) {
    const localProgress = api.validateState(local.progression).valid ? local.progression : api.createState();
    const remoteProgress = api.validateState(remote.progression).valid ? remote.progression : api.createState();
    const spent = {};
    for (const skill of api.SKILL_TREE) {
      const rank = Math.max(localProgress.spent[skill.id] || 0, remoteProgress.spent[skill.id] || 0);
      if (rank) spent[skill.id] = rank;
    }
    const used = api.SKILL_TREE.reduce((sum, skill) => sum + (spent[skill.id] || 0) * skill.cost, 0);
    const totalEarned = Math.max(used, localProgress.totalEarned, remoteProgress.totalEarned);
    merged.progression = { version: api.STATE_VERSION, available: totalEarned - used, totalEarned, spent };
  }
  return merged;
}

function boot() {
  loadPhotos();
  state.meta = loadMeta();
  window.OttiskI18n?.apply?.();
  state.tuning = window.OttiskBalanceTuner?.fromAnalytics?.().adjustments || state.tuning;
  setupPerformanceMonitor();
  const storedApi = (() => {
    try { return localStorage.getItem("ottisk_cloud_api") || ""; } catch (_) { return ""; }
  })();
  const declaredApi = document.querySelector('meta[name="ottisk-cloud-api"]')?.content?.trim();
  const apiUrl = storedApi || declaredApi;
  if (apiUrl && !cloudConfig().apiUrl) {
    window.OttiskCloud?.configure?.({
      apiUrl,
      release: "1.2.0",
      platform: window.OttiskNative?.platform || "web",
    });
  }
  const apiInput = document.getElementById("cloud-api-input");
  if (apiInput) apiInput.value = cloudConfig().apiUrl || storedApi || declaredApi || "";
  window.OttiskPwa?.setup?.(document.querySelector(".menu-foot") || document.getElementById("app"));
  applyAccessibilityPrefs();
  refreshCssCache();
  ensureSeasonalUnlock();
  saveMeta();
  loadCustomHeroImage(state.meta.customHero || "");
  touchPlayDay();
  touchVisitClock();
  refreshDaily();
  state.best = state.meta.best;
  updateBestLabels();
  renderDaily();
  renderWeekly();
  renderSettings();
  renderProgression();
  renderStory();
  renderSkinMeta();
  renderHeroPicker();
  renderGifts();
  updateEconomyLabels();
  updateDonateThanks();
  updateModeToggles();
  renderTrophyList();
  evaluateTrophies();
  resize();
  applyThemeFromScore(false);
  updateScoreUi(false);
  updateHungerUi();
  updateMutationUi();
  updateWaveUi(false);
  resetDemo();
  bindDrawHeroUi();
  window.OttiskAnalytics?.track("app_open");
  renderCloudStatus();
  renderSocial();
  document.getElementById("btn-mode-daily")?.addEventListener("click", () => {
    if (!state.meta) return;
    state.meta.dailyModeEnabled = !state.meta.dailyModeEnabled;
    saveMeta();
    updateModeToggles();
    sfxUiTap(1);
    showToast(state.meta.dailyModeEnabled ? "забег дня · вкл" : "забег дня · выкл");
  });
  document.getElementById("btn-mode-coop")?.addEventListener("click", () => {
    if (!state.meta) return;
    state.meta.coopEnabled = !state.meta.coopEnabled;
    saveMeta();
    updateModeToggles();
    sfxUiTap(1);
    showToast(state.meta.coopEnabled ? "дуэт · два пальца" : "дуэт · выкл");
  });
  document.getElementById("btn-mode-ghost")?.addEventListener("click", () => {
    if (!state.meta) return;
    state.meta.ghostRaceEnabled = state.meta.ghostRaceEnabled === false;
    saveMeta();
    updateModeToggles();
    sfxUiTap(1);
    showToast(state.meta.ghostRaceEnabled !== false ? "призрак · вкл" : "призрак · выкл");
  });
  document.getElementById("btn-cloud-api-save")?.addEventListener("click", () => {
    const input = document.getElementById("cloud-api-input");
    const apiUrl = (input?.value || "").trim();
    if (!apiUrl) {
      try { localStorage.removeItem("ottisk_cloud_api"); } catch (_) {}
      showToast("URL очищен · офлайн");
      renderCloudStatus();
      return;
    }
    try {
      window.OttiskCloud?.configure?.({
        apiUrl,
        release: "1.2.0",
        platform: window.OttiskNative?.platform || "web",
      });
      localStorage.setItem("ottisk_cloud_api", apiUrl);
      renderCloudStatus();
      showToast("облако · URL сохранён");
    } catch (_) {
      showToast("неверный URL");
    }
  });
  document.getElementById("btn-league-board")?.addEventListener("click", () => {
    renderLeagueBoard().catch(() => showToast("лига недоступна"));
  });
  document.querySelectorAll(".run-mode-btn").forEach((button) => {
    button.addEventListener("click", () => {
      if (!state.meta) return;
      const requested = button.dataset.runMode || "normal";
      state.meta.runMode = state.meta.runMode === requested ? "normal" : requested;
      saveMeta();
      updateModeToggles();
      sfxUiTap(1);
    });
  });
  document.getElementById("btn-lang")?.addEventListener("click", () => {
    window.OttiskI18n?.toggle?.();
    updateControlCopy();
    updateModeToggles();
    renderSettings();
  });
  window.addEventListener("ottisk-language", () => {
    updateControlCopy();
    updateModeToggles();
    renderSettings();
    updateDonateThanks();
    renderProgression();
    renderStory();
    renderAccountUi();
    setAuthMode(authMode);
  });
  document.getElementById("btn-shop-starter")?.addEventListener("click", () => {
    purchaseStarterPack().catch(() => showToast("покупка недоступна"));
  });
  document.getElementById("btn-restore")?.addEventListener("click", () => {
    restorePurchases().catch(() => showToast("восстановление недоступно"));
  });
  document.getElementById("mechanic-card")?.addEventListener("click", () => {
    document.getElementById("mechanic-card")?.classList.add("hidden");
  });
  btnRetry?.addEventListener("click", (e) => {
    e.preventDefault();
    if (state.running) return;
    unlockAudio();
    sfxUiTap(1);
    startGame();
  });
  btnStart?.addEventListener("click", (e) => {
    e.preventDefault();
    beginPlayFlow();
  });
  btnHeroBack?.addEventListener("click", (e) => {
    e.preventDefault();
    sfxUiTap(0);
    showHomeMenu();
  });
  btnHeroNext?.addEventListener("click", (e) => {
    e.preventDefault();
    const selected = state.meta?.activeHero || "octopus";
    if (selected === "custom" && !state.meta?.customHero) {
      openDrawHero();
      return;
    }
    if (!isHeroOwned(selected)) {
      const hero = HEROES.find((h) => h.id === selected);
      if (hero?.iap) {
        purchaseIapHero(hero.id).catch(() => showToast("покупка недоступна"));
        return;
      }
      if (!tryUnlockHero(selected)) return;
    }
    // Ensure active hero is owned selection.
    if (!isHeroOwned(state.meta?.activeHero || "")) {
      showToast("выбери героя");
      return;
    }
    sfxUiTap(1);
    showDiffPick();
  });
  btnDiffBack?.addEventListener("click", (e) => {
    e.preventDefault();
    sfxUiTap(0);
    showHeroPick();
  });
  const unlockMenuAudio = () => {
    if (!inMainMenu() || !soundEnabled()) return;
    unlockAudio();
    syncMenuMusic();
  };
  screenStartEl?.addEventListener("pointerdown", unlockMenuAudio, { passive: true });
  screenHeroEl?.addEventListener("pointerdown", unlockMenuAudio, { passive: true });
  screenDiffEl?.addEventListener("pointerdown", unlockMenuAudio, { passive: true });
  document.getElementById("btn-menu")?.addEventListener("click", (e) => {
    e.preventDefault();
    goToMenu();
  });
  setInterval(() => {
    if (!screenStartEl || screenStartEl.classList.contains("hidden")) return;
    renderGifts();
  }, 15000);
  canvas.addEventListener("pointerdown", onCanvasDown, { passive: false });
  canvas.addEventListener("pointermove", onCanvasMove, { passive: false });
  canvas.addEventListener("pointerup", onCanvasUp, { passive: false });
  canvas.addEventListener("pointercancel", onCanvasUp, { passive: false });
  btnContinue?.addEventListener("click", (e) => {
    e.preventDefault();
    requestContinue();
  });
  btnSkipContinue?.addEventListener("click", () => {
    if (!state.pendingDeathReason) return;
    finalizeGameOver(state.pendingDeathReason);
  });
  btnShare?.addEventListener("click", () => {
    shareRun().catch(() => showToast("не удалось поделиться"));
  });
  btnRate?.addEventListener("click", () => {
    requestReview().catch(() => {});
  });
  btnOnboard?.addEventListener("click", () => advanceOnboard());
  document.getElementById("btn-how-to-play")?.addEventListener("click", () => {
    if (!screenOnboardEl) return;
    state.onboardStep = 0;
    refreshOnboardUi();
    hideFlowScreens();
    screenOnboardEl.classList.remove("hidden");
    stopMenuMusic();
  });
  btnSound?.addEventListener("click", () => {
    if (!state.meta) return;
    state.meta.sound = !(state.meta.sound !== false);
    if (!state.meta.sound) {
      hum(false);
      stopMenuMusic(0.15);
      state.audioUnlocked = false;
    } else {
      unlockAudio();
      sfxUiTap(2);
      syncMenuMusic();
    }
    saveMeta();
    renderSettings();
    showToast(state.meta.sound ? "звук вкл" : "звук выкл");
  });
  btnHaptics?.addEventListener("click", () => {
    if (!state.meta) return;
    state.meta.haptics = !(state.meta.haptics !== false);
    saveMeta();
    renderSettings();
    if (state.meta.haptics) buzz(8);
    showToast(state.meta.haptics ? "вибро вкл" : "вибро выкл");
  });
  document.getElementById("btn-haptics-more")?.addEventListener("click", () => {
    btnHaptics?.click();
  });
  document.getElementById("btn-more")?.addEventListener("click", () => {
    sfxUiTap(0);
    showMoreMenu();
  });
  document.getElementById("btn-more-back")?.addEventListener("click", () => {
    sfxUiTap(0);
    showHomeMenu();
  });
  document.getElementById("btn-account")?.addEventListener("click", () => {
    sfxUiTap(0);
    const session = window.OttiskAccount?.session?.();
    if (session?.mode === "user") showMoreMenu();
    else showAuthScreen("register");
  });
  document.getElementById("btn-account-manage")?.addEventListener("click", () => {
    sfxUiTap(0);
    showAuthScreen(window.OttiskAccount?.isUser?.() ? "login" : "register");
  });
  document.getElementById("btn-account-logout")?.addEventListener("click", () => {
    if (!window.OttiskAccount?.isUser?.()) return;
    if (!window.confirm(trAuth("auth_logout", "Выйти") + "?")) return;
    window.OttiskAccount.logout();
    showAuthScreen("login");
    renderAccountUi();
  });
  document.getElementById("auth-tab-register")?.addEventListener("click", () => setAuthMode("register"));
  document.getElementById("auth-tab-login")?.addEventListener("click", () => setAuthMode("login"));
  document.getElementById("auth-form")?.addEventListener("submit", (event) => {
    submitAuthForm(event);
  });
  document.getElementById("auth-guest")?.addEventListener("click", () => {
    sfxUiTap(0);
    finishGuestEntry();
  });
  document.getElementById("auth-lang")?.addEventListener("click", () => {
    document.getElementById("btn-lang")?.click();
  });
  document.getElementById("btn-reduce-motion")?.addEventListener("click", () => {
    if (!state.meta) return;
    state.meta.reduceMotion = !state.meta.reduceMotion;
    saveMeta();
    applyAccessibilityPrefs();
    renderSettings();
    showToast(state.meta.reduceMotion ? "движение уменьшено" : "движение обычно");
  });
  document.getElementById("btn-high-contrast")?.addEventListener("click", () => {
    if (!state.meta) return;
    state.meta.highContrast = !state.meta.highContrast;
    saveMeta();
    applyAccessibilityPrefs();
    renderSettings();
    showToast(state.meta.highContrast ? "контраст вкл" : "контраст выкл");
  });
  document.getElementById("btn-quality")?.addEventListener("click", () => {
    if (!state.meta) return;
    const modes = ["auto", "low", "medium", "high"];
    state.meta.qualityMode = modes[(modes.indexOf(state.meta.qualityMode || "auto") + 1) % modes.length];
    saveMeta();
    applyQualityMode();
    renderSettings();
    showToast(document.getElementById("btn-quality")?.textContent || "качество");
  });
  document.getElementById("btn-large-ui")?.addEventListener("click", () => {
    state.meta.largeUi = !state.meta.largeUi;
    saveMeta();
    applyAccessibilityPrefs();
    renderSettings();
  });
  document.getElementById("btn-one-hand")?.addEventListener("click", () => {
    const values = ["off", "right", "left"];
    state.meta.oneHand = values[(values.indexOf(state.meta.oneHand || "off") + 1) % values.length];
    saveMeta();
    applyAccessibilityPrefs();
    renderSettings();
  });
  document.getElementById("btn-colorblind")?.addEventListener("click", () => {
    const values = ["off", "protanopia", "deuteranopia", "tritanopia"];
    state.meta.colorblind = values[(values.indexOf(state.meta.colorblind || "off") + 1) % values.length];
    saveMeta();
    applyAccessibilityPrefs();
    applyThemeFromScore(false);
    renderSettings();
  });
  const installBackup = (imported) => {
    if (!state.meta || !imported) return false;
    const next = {
      ...imported,
      iapHeroes: state.meta.iapHeroes || [],
      starterPackBought: !!state.meta.starterPackBought,
    };
    localStorage.setItem(META_KEY, JSON.stringify(next));
    localStorage.setItem(BEST_KEY, String(Math.max(0, Number(next.best || 0))));
    window.OttiskAnalytics?.track("backup_import");
    location.reload();
    return true;
  };
  document.getElementById("btn-backup-export")?.addEventListener("click", () => {
    if (!state.meta || !window.OttiskBackup) return;
    window.OttiskBackup.download(state.meta);
    window.OttiskAnalytics?.track("backup_export");
    showToast("резервная копия сохранена");
  });
  document.getElementById("btn-backup-code")?.addEventListener("click", () => {
    if (!state.meta || !window.OttiskBackup) return;
    const code = window.OttiskBackup.create(state.meta).code;
    const entered = window.prompt("Скопируй код. Для импорта вставь другой код и нажми OK.", code);
    if (entered && entered !== code && window.confirm("Заменить текущий прогресс?")) {
      try {
        installBackup(window.OttiskBackup.parse(entered));
      } catch (error) {
        showToast(error.message || "код не прочитан");
      }
    }
  });
  const backupFile = document.getElementById("backup-file");
  document.getElementById("btn-backup-import")?.addEventListener("click", () => backupFile?.click());
  backupFile?.addEventListener("change", async () => {
    const file = backupFile.files?.[0];
    if (!file || !window.OttiskBackup) return;
    try {
      const imported = window.OttiskBackup.parse(await file.text());
      if (window.confirm("Заменить текущий прогресс данными из файла?")) installBackup(imported);
    } catch (error) {
      showToast(error.message || "файл не прочитан");
    } finally {
      backupFile.value = "";
    }
  });
  const ensureCloudEndpoint = () => {
    if (cloudConfig().apiUrl) return true;
    const apiUrl = window.prompt("URL сервера ОТТИСК Cloud (Cloudflare Worker):", "");
    if (!apiUrl) return false;
    try {
      window.OttiskCloud?.configure?.({
        apiUrl,
        release: "1.2.0",
        platform: window.OttiskNative?.platform || "web",
      });
      renderCloudStatus();
      return true;
    } catch (_) {
      showToast("неверный адрес сервера");
      return false;
    }
  };
  document.getElementById("btn-cloud-account")?.addEventListener("click", async () => {
    if (!window.OttiskCloud) return;
    if (window.OttiskCloud.isLinked()) {
      if (!window.confirm("Отключить облачный аккаунт на этом устройстве?")) return;
      await window.OttiskCloud.logout();
      renderCloudStatus("аккаунт отключён · локальный прогресс сохранён");
      renderSocial();
      return;
    }
    if (!ensureCloudEndpoint()) return;
    try {
      const create = window.confirm("Создать новый анонимный аккаунт?\n\nOK — создать новый\nОтмена — восстановить по коду");
      if (create) {
        const name = window.prompt("Имя в таблице рекордов (необязательно):", state.meta.cloudName || "") || "";
        state.meta.cloudName = name.slice(0, 24);
        saveMeta();
        const result = await window.OttiskCloud.register();
        window.prompt("Сохраните код восстановления. Он показывается только один раз:", result.recoveryCode);
        await window.OttiskCloud.pushSave(state.meta);
        renderCloudStatus("аккаунт создан · код восстановления сохраните отдельно");
        renderSocial();
      } else {
        const code = window.prompt("Введите код восстановления:", "");
        if (!code) return;
        await window.OttiskCloud.recover(code);
        renderCloudStatus("аккаунт восстановлен · нажмите «Синхронизировать»");
        renderSocial();
      }
    } catch (error) {
      renderCloudStatus(`ошибка облака · ${error.code || error.message || "повторите позже"}`);
    }
  });
  document.getElementById("btn-cloud-sync")?.addEventListener("click", async () => {
    if (!ensureCloudEndpoint()) return;
    if (!window.OttiskCloud?.isLinked?.()) {
      showToast("сначала подключи аккаунт");
      return;
    }
    renderCloudStatus("синхронизация…");
    try {
      const remote = await window.OttiskCloud.pullSave();
      if (remote?.save) {
        state.meta = loadMeta.call(null);
        const merged = mergeCloudMeta(state.meta, remote.save);
        localStorage.setItem(META_KEY, JSON.stringify(merged));
        localStorage.setItem(BEST_KEY, String(merged.best || 0));
        await window.OttiskCloud.pushSave(merged);
        renderCloudStatus("прогресс объединён · перезапуск");
        location.reload();
        return;
      }
      await window.OttiskCloud.pushSave(state.meta);
      await window.OttiskCloud.sync();
      renderCloudStatus("прогресс синхронизирован");
    } catch (error) {
      renderCloudStatus(`синхронизация отложена · ${error.code || "офлайн"}`);
    }
  });
  document.getElementById("btn-cloud-board")?.addEventListener("click", async () => {
    if (!ensureCloudEndpoint()) return;
    const list = document.getElementById("cloud-leaderboard");
    if (!list) return;
    list.classList.remove("hidden");
    list.textContent = "";
    const wait = document.createElement("li");
    wait.textContent = "загрузка…";
    list.appendChild(wait);
    try {
      const board = await window.OttiskCloud.fetchDailyBoard(localDayKey());
      list.textContent = "";
      for (const entry of board?.entries?.slice(0, 10) || []) {
        const item = document.createElement("li");
        item.textContent = `${entry.displayName} · ${entry.score}`;
        list.appendChild(item);
      }
      if (!list.childElementCount) {
        const empty = document.createElement("li");
        empty.textContent = "пока нет результатов";
        list.appendChild(empty);
      }
    } catch (_) {
      list.textContent = "";
      const failed = document.createElement("li");
      failed.textContent = "рейтинг временно недоступен";
      list.appendChild(failed);
    }
  });
  document.getElementById("btn-social-refresh")?.addEventListener("click", () => renderSocial());
  document.getElementById("btn-social-add")?.addEventListener("click", async () => {
    if (!window.OttiskSocial?.isAvailable?.()) {
      showToast(window.OttiskI18n?.locale === "en" ? "link cloud first" : "сначала подключи облако");
      return;
    }
    const code = window.prompt(window.OttiskI18n?.locale === "en" ? "Friend code:" : "Код друга:", "");
    if (!code) return;
    try {
      await window.OttiskSocial.addFriend(code, state.meta.cloudName || "");
      await renderSocial();
    } catch (error) {
      showToast(`${tr("error", "ошибка")} · ${error.code || error.message}`);
    }
  });
  document.getElementById("btn-social-duel")?.addEventListener("click", async () => {
    const replay = state.meta?.lastReplay;
    if (!window.OttiskSocial?.isAvailable?.() || !replay) {
      showToast(window.OttiskI18n?.locale === "en" ? "link cloud and finish a run first" : "подключи облако и заверши забег");
      return;
    }
    const code = window.prompt(window.OttiskI18n?.locale === "en" ? "Friend code for duel:" : "Код друга для дуэли:", "");
    if (!code) return;
    try {
      await window.OttiskSocial.createDuel(
        code,
        replay.score,
        state.meta.cloudName || "",
        replay.durationMs,
        replay.samples,
      );
      await renderSocial();
      showToast(window.OttiskI18n?.locale === "en" ? "duel sent" : "дуэль отправлена");
    } catch (error) {
      showToast(`${tr("error", "ошибка")} · ${error.code || error.message}`);
    }
  });
  const crashKey = "ottisk-crash-opt-in-v1";
  const crashButton = document.getElementById("btn-crash-reports");
  const renderCrashOptIn = () => {
    const enabled = localStorage.getItem(crashKey) === "1";
    crashButton?.classList.toggle("on", enabled);
    crashButton?.setAttribute("aria-pressed", enabled ? "true" : "false");
  };
  renderCrashOptIn();
  crashButton?.addEventListener("click", () => {
    const enabled = localStorage.getItem(crashKey) !== "1";
    localStorage.setItem(crashKey, enabled ? "1" : "0");
    renderCrashOptIn();
    showToast(enabled ? "анонимные отчёты включены" : "отчёты выключены");
  });
  const reportCrash = (error, category) => {
    if (localStorage.getItem(crashKey) !== "1") return;
    window.OttiskCloud?.reportCrash?.(error, { category }).catch(() => {});
  };
  window.addEventListener("error", (event) => reportCrash(event.error || event.message, "runtime"));
  window.addEventListener("unhandledrejection", (event) => reportCrash(event.reason, "promise"));
  btnMarksPack?.addEventListener("click", () => {
    purchaseMarksPack().catch(() => showToast("покупка недоступна"));
  });
  document.getElementById("btn-shop")?.addEventListener("click", () => openShop("home"));
  document.getElementById("btn-donate")?.addEventListener("click", () => openShop("home"));
  document.getElementById("btn-donate-close")?.addEventListener("click", () => closeDonate());
  document.getElementById("btn-shop-pack")?.addEventListener("click", () => {
    purchaseMarksPack().catch(() => showToast("покупка недоступна"));
  });
  document.getElementById("btn-buy-marks")?.addEventListener("click", () => openShop("over"));
  document.getElementById("btn-buy-marks-hero")?.addEventListener("click", () => {
    const hero = HEROES.find((h) => h.id === (state.meta?.activeHero || ""));
    if (hero?.iap && !isHeroOwned(hero.id)) {
      purchaseIapHero(hero.id).catch(() => showToast("покупка недоступна"));
      return;
    }
    openShop("hero");
  });
  document.getElementById("btn-continue-iap")?.addEventListener("click", (e) => {
    e.preventDefault();
    purchaseContinueIap().catch(() => showToast("покупка недоступна"));
  });
  document.getElementById("btn-continue-rewarded")?.addEventListener("click", (e) => {
    e.preventDefault();
    requestRewardedContinue().catch(() => showToast("реклама недоступна"));
  });
  document.getElementById("btn-continue-shop")?.addEventListener("click", () => openShop("continue"));
  window.addEventListener("resize", resize);
  const pauseForBackground = () => {
    if (state.touchActive) {
      state.touchActive = false;
      state.pointerId = null;
    }
    stopMenuMusic(0.12);
    if (state.running && !state.pendingDeathReason) {
      state.life = null;
      state.echo = null;
      state.paused = true;
      hum(false);
    }
  };
  const resumeFromBackground = () => {
    state.lastTs = performance.now();
    if (soundEnabled()) unlockAudio();
    touchVisitClock();
    if (!screenStartEl?.classList.contains("hidden")) renderGifts();
    if (state.paused && state.running) {
      state.paused = false;
      state.safeUntil = performance.now() + 1400;
      showToast("коснись экрана");
      showCoach("Удерживай палец, чтобы снова ожить", 2000, true);
    } else {
      syncMenuMusic();
    }
  };
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) pauseForBackground();
    else resumeFromBackground();
  });
  window.addEventListener("pagehide", pauseForBackground);
  window.addEventListener("pageshow", resumeFromBackground);
  document.addEventListener("ottisk-app-state", (event) => {
    if (event.detail?.isActive) resumeFromBackground();
    else pauseForBackground();
  });
  updateStartButtonCopy();
  renderAccountUi();
  window.OttiskPlayOps?.wireUpdateBanner?.();
  window.OttiskPlayOps?.checkSoftUpdate?.();
  window.OttiskPlayOps?.syncReminderToggle?.();
  window.OttiskPlayOps?.ensureReminderScheduled?.();
  document.getElementById("btn-daily-reminder")?.addEventListener("click", async () => {
    const result = await window.OttiskPlayOps?.toggleReminder?.();
    if (result?.message) showToast(result.message);
  });
  document.addEventListener("ottisk-native-ready", () => {
    renderShop();
    window.OttiskPlayOps?.checkSoftUpdate?.();
    window.OttiskPlayOps?.ensureReminderScheduled?.();
  });
  // First death returns to tips + starter gift; the live tutorial teaches the hook.
  if (window.OttiskAccount?.isReady?.()) {
    showHomeMenu();
    if (!maybeShowOnboardTips() && state.meta?.streak > 1) {
      setTimeout(() => showToast(`серия · ${state.meta.streak} дн`), 650);
    }
  } else {
    showAuthScreen("register");
  }
  requestAnimationFrame(frame);
  const nativeShell = !!window.OttiskNative?.isNative;
  if ("serviceWorker" in navigator && !nativeShell) {
    navigator.serviceWorker
      .register("./sw.js?v=89")
      .then((reg) => reg.update())
      .catch(() => {});
  }
}

async function restorePurchases() {
  const native = window.OttiskNative;
  if (!native?.isNative || !native.billingAvailable) {
    showToast(window.OttiskI18n?.locale === "en"
      ? "restore · only in the store app"
      : "восстановление · только в приложении магазина");
    return false;
  }
  showToast("восстанавливаем покупки…");
  const result = await native.restorePurchases?.().catch(() => null);
  if (!result?.ok) {
    showToast(result?.message || "покупок не найдено");
    return false;
  }
  const ids = Array.isArray(result.productIds) ? result.productIds : [];
  let unlocked = 0;
  for (const id of ids) {
    const hero = HEROES.find((h) => h.iap && h.productId === id);
    if (hero && !isHeroOwned(hero.id)) {
      state.meta.iapHeroes = [...new Set([...(state.meta.iapHeroes || []), hero.id])];
      unlocked += 1;
    }
    if (id === STARTER_PACK_PRODUCT_ID && !state.meta.starterPackBought) {
      grantStarterPack(true);
      unlocked += 1;
    }
  }
  saveMeta();
  renderHeroPicker();
  renderShop();
  renderDeathOffers();
  showToast(unlocked ? `восстановлено · ${unlocked}` : "покупок не найдено");
  return unlocked > 0;
}

boot();
