import { test, expect } from "@playwright/test";

const META_KEY = "ottisk-meta-v1";
const FORCE_KEY = "ottisk-force-v87";

async function openGame(page, overrides = {}) {
  const meta = {
    best: 87,
    marks: 42,
    streak: 3,
    runs: 5,
    onboarded: true,
    starterGift: true,
    activeHero: "octopus",
    difficulty: "easy",
    controlMode: "hand",
    sound: false,
    haptics: false,
    ...overrides,
  };
  await page.addInitScript(({ meta, forceKey }) => {
    if (!localStorage.getItem("ottisk-meta-v1")) {
      localStorage.setItem("ottisk-meta-v1", JSON.stringify(meta));
      localStorage.setItem("ottisk-best-v2", String(meta.best || 0));
    }
    localStorage.setItem(forceKey, "1");
  }, { meta, forceKey: FORCE_KEY });
  await page.goto("/index.html", { waitUntil: "domcontentloaded" });
  await expect(page.locator("#btn-start")).toBeVisible();
}

test("loads menu and opens a clear shop", async ({ page }) => {
  await openGame(page, { marks: 120 });
  await expect(page).toHaveTitle(/ОТТИСК/);
  await expect(page.locator("#marks-start")).toHaveText("120 следов");
  await page.locator("#btn-shop").click();
  await expect(page.locator("#screen-donate")).toBeVisible();
  await expect(page.locator("#shop-balance")).toHaveText("120 следов");
  await expect(page.locator("#shop-packs-label")).toHaveText("Следы и наборы");
  await page.locator("#btn-donate-close").click();
  await expect(page.locator("#screen-start")).toBeVisible();
});

test("settings persist after reload", async ({ page }) => {
  await openGame(page);
  await page.locator(".access-details > summary").click();
  await page.locator("#btn-reduce-motion").click();
  await page.locator("#btn-high-contrast").click();
  await expect(page.locator("#app")).toHaveClass(/reduce-motion/);
  await expect(page.locator("#app")).toHaveClass(/high-contrast/);
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.locator(".access-details > summary").click();
  await expect(page.locator("#btn-reduce-motion")).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("#btn-high-contrast")).toHaveAttribute("aria-pressed", "true");
});

test("backup code restores portable progress", async ({ page }) => {
  await openGame(page, { marks: 73, best: 144 });
  const code = await page.evaluate(() => window.OttiskBackup.create(
    JSON.parse(localStorage.getItem("ottisk-meta-v1") || "{}")
  ).code);
  await page.evaluate((value) => {
    const parsed = window.OttiskBackup.parse(value);
    localStorage.setItem("ottisk-meta-v1", JSON.stringify(parsed));
  }, code);
  const restored = await page.evaluate((key) => JSON.parse(localStorage.getItem(key) || "{}"), META_KEY);
  expect(restored.marks).toBe(73);
  expect(restored.best).toBe(144);
});

test("returning player reaches a live run", async ({ page }) => {
  await openGame(page);
  await page.locator("#btn-start").click();
  await expect(page.locator("#screen-hero")).toBeVisible();
  await page.locator("#btn-hero-next").click();
  await page.locator(".diff-pick-btn", { hasText: "лёгкий" }).click();
  await expect(page.locator("#app")).toHaveClass(/in-run/);
  await expect(page.locator("#status")).toBeVisible();
});

test("new run modes persist and boss rush starts with a boss", async ({ page }) => {
  await openGame(page);
  await page.locator('[data-run-mode="boss"]').click();
  await expect(page.locator('[data-run-mode="boss"]')).toHaveAttribute("aria-pressed", "true");
  await page.locator("#btn-start").click();
  await page.locator("#btn-hero-next").click();
  await page.locator(".diff-pick-btn", { hasText: "лёгкий" }).click();
  await expect(page.locator("#wave-label")).toContainText("левиафан");
});

test("English menu persists across reload", async ({ page }) => {
  await openGame(page);
  await page.locator("#btn-lang").click();
  await expect(page.locator(".btn-shop-top-main")).toHaveText("Shop");
  await expect(page.locator("#btn-start .btn-main")).toHaveText("Play");
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.locator(".btn-shop-top-main")).toHaveText("Shop");
});

test("promotional page exposes SEO metadata and play link", async ({ page }) => {
  await page.goto("/landing.html", { waitUntil: "domcontentloaded" });
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /Ottisk/);
  await expect(page.locator('script[type="application/ld\\+json"]')).toHaveCount(1);
  await expect(page.getByRole("link", { name: /Играть|Play/i }).first()).toHaveAttribute("href", "./index.html");
});
