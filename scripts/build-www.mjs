import { cpSync, mkdirSync, rmSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const root = new URL("..", import.meta.url).pathname;
const www = join(root, "www");
const assets = [
  "index.html",
  "privacy.html",
  "support.html",
  "donate.html",
  "landing.html",
  "editor.html",
  "content",
  "ottisk-ad-ru-15s.mp4",
  "robots.txt",
  "sitemap.xml",
  "manifest.json",
  "sw.js",
  "css",
  "js",
  "icons",
  "assets",
];

rmSync(www, { recursive: true, force: true });
mkdirSync(www, { recursive: true });

for (const name of assets) {
  const from = join(root, name);
  if (!existsSync(from)) continue;
  cpSync(from, join(www, name), { recursive: true });
}

// Native shell should not fight the web service worker cache.
if (existsSync(join(www, "sw.js"))) {
  writeFileSync(
    join(www, "sw.js"),
    `/* Disabled inside Capacitor native shell */\nself.addEventListener('install', (e) => self.skipWaiting());\n`
  );
}

const indexPath = join(www, "index.html");
if (existsSync(indexPath)) {
  let html = readFileSync(indexPath, "utf8");
  html = html.replace(
    /<script src="js\/game\.js\?v=[^"]+" type="module"><\/script>/,
    `<script src="js/game.js?v=78" type="module"></script>`
  );
  writeFileSync(indexPath, html);
}

console.log("www/ ready for Capacitor");
