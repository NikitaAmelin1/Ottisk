import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, devices } from "playwright";

export const DEVICE_MATRIX = [
  { name: "small-ios", profile: "iPhone SE" },
  { name: "modern-ios", profile: "iPhone 13" },
  { name: "compact-android", profile: "Pixel 5" },
  { name: "wide-android", profile: "Galaxy S9+" },
];

const MIME_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".mp3": "audio/mpeg",
  ".png": "image/png",
  ".svg": "image/svg+xml",
};

export function assertDeviceProfiles(matrix = DEVICE_MATRIX) {
  for (const entry of matrix) {
    if (!devices[entry.profile]) throw new Error(`Unknown Playwright device profile: ${entry.profile}`);
  }
}

function startStaticServer(root) {
  const server = createServer((request, response) => {
    const pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
    const relative = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
    const path = resolve(root, relative);
    if (!path.startsWith(`${resolve(root)}${sep}`) || !existsSync(path) || !statSync(path).isFile()) {
      response.writeHead(404).end("Not found");
      return;
    }
    response.writeHead(200, {
      "Content-Type": MIME_TYPES[extname(path)] || "application/octet-stream",
      "Cache-Control": "no-store",
    });
    createReadStream(path).pipe(response);
  });
  return new Promise((resolveServer, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      resolveServer({ server, url: `http://127.0.0.1:${address.port}` });
    });
  });
}

async function checkDevice(browser, baseURL, entry) {
  const context = await browser.newContext({
    ...devices[entry.profile],
    locale: "ru-RU",
  });
  const page = await context.newPage();
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await page.addInitScript(() => {
    localStorage.setItem("ottisk-force-v76", "1");
    localStorage.setItem("ottisk-meta-v1", JSON.stringify({
      onboarded: true,
      starterGift: true,
      sound: false,
      haptics: false,
    }));
  });

  try {
    const response = await page.goto(`${baseURL}/index.html`, { waitUntil: "domcontentloaded" });
    if (!response?.ok()) throw new Error(`navigation returned HTTP ${response?.status() ?? "unknown"}`);
    await page.locator("#btn-start").waitFor({ state: "visible" });
    const result = await page.evaluate(() => {
      const button = document.querySelector("#btn-start")?.getBoundingClientRect();
      return {
        title: document.title,
        horizontalOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        buttonInsideViewport: Boolean(button)
          && button.left >= 0
          && button.right <= innerWidth
          && button.top >= 0
          && button.bottom <= innerHeight,
      };
    });
    if (!/ОТТИСК/.test(result.title)) throw new Error("game title is missing");
    if (result.horizontalOverflow > 2) throw new Error(`horizontal overflow is ${result.horizontalOverflow}px`);
    if (!result.buttonInsideViewport) throw new Error("primary start button is outside the initial viewport");
    if (pageErrors.length) throw new Error(`page error: ${pageErrors.join("; ")}`);
  } finally {
    await context.close();
  }
}

export async function runDeviceMatrix({ baseURL, headed = false } = {}) {
  assertDeviceProfiles();
  const root = resolve(new URL("..", import.meta.url).pathname);
  const local = baseURL ? null : await startStaticServer(root);
  const target = baseURL || local.url;
  const browser = await chromium.launch({ headless: !headed });
  const failures = [];

  try {
    for (const entry of DEVICE_MATRIX) {
      try {
        await checkDevice(browser, target, entry);
        console.log(`PASS ${entry.name} (${entry.profile})`);
      } catch (error) {
        failures.push(`${entry.name}: ${error.message}`);
        console.error(`FAIL ${entry.name} (${entry.profile}): ${error.message}`);
      }
    }
  } finally {
    await browser.close();
    if (local) await new Promise((resolveClose) => local.server.close(resolveClose));
  }
  if (failures.length) throw new Error(`${failures.length} device check(s) failed`);
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : "";
if (invokedPath === fileURLToPath(import.meta.url)) {
  if (process.argv.includes("--list")) {
    assertDeviceProfiles();
    for (const entry of DEVICE_MATRIX) console.log(`${entry.name}: ${entry.profile}`);
  } else {
    const baseArg = process.argv.find((arg) => arg.startsWith("--base-url="));
    runDeviceMatrix({
      baseURL: baseArg?.slice("--base-url=".length),
      headed: process.argv.includes("--headed"),
    }).catch((error) => {
      console.error(error.message);
      process.exitCode = 1;
    });
  }
}
