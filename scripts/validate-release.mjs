import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const APP_ID = "com.amelin.ottisk";
const HTTPS_URL = /^https:\/\/\S+$/;

function text(root, path) {
  return readFileSync(join(root, path), "utf8");
}

function field(contents, label) {
  const match = contents.match(new RegExp(`(?:^|\\n)${label}:\\s*\\n([^\\n]+)`, "i"));
  return match?.[1]?.trim() || "";
}

function walkFiles(directory) {
  if (!existsSync(directory)) return [];
  return readdirSync(directory).flatMap((name) => {
    const path = join(directory, name);
    return statSync(path).isDirectory() ? walkFiles(path) : [path];
  });
}

export function validateRelease(rootDirectory) {
  const root = resolve(rootDirectory);
  const errors = [];
  const warnings = [];
  const required = [
    "package.json",
    "capacitor.config.json",
    "manifest.json",
    "privacy.html",
    "support.html",
    "codemagic.yaml",
    "store/metadata.android.txt",
    "store/metadata.ru.txt",
    "icons/icon.svg",
    "android/app/build.gradle",
    "ios/App/App.xcodeproj/project.pbxproj",
  ];

  for (const path of required) {
    if (!existsSync(join(root, path))) errors.push(`Missing required file: ${path}`);
  }
  if (errors.length) return { errors, warnings };

  let pkg;
  let capacitor;
  let manifest;
  try {
    pkg = JSON.parse(text(root, "package.json"));
    capacitor = JSON.parse(text(root, "capacitor.config.json"));
    manifest = JSON.parse(text(root, "manifest.json"));
  } catch (error) {
    errors.push(`Invalid JSON configuration: ${error.message}`);
    return { errors, warnings };
  }

  if (!/^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(pkg.version || "")) {
    errors.push("package.json version must be a semantic version");
  }
  if (capacitor.appId !== APP_ID) errors.push(`Capacitor appId must be ${APP_ID}`);
  if (capacitor.webDir !== "www") errors.push('Capacitor webDir must be "www"');
  if (manifest.orientation !== "portrait") errors.push('Web manifest orientation must be "portrait"');

  const androidGradle = text(root, "android/app/build.gradle");
  const androidId = androidGradle.match(/applicationId\s+["']([^"']+)/)?.[1];
  const androidVersion = androidGradle.match(/versionName\s+["']([^"']+)/)?.[1];
  if (androidId !== APP_ID) errors.push(`Android applicationId must be ${APP_ID}`);
  if (androidVersion && androidVersion !== pkg.version) {
    warnings.push(`Android versionName ${androidVersion} differs from package version ${pkg.version}`);
  }

  const iosProject = text(root, "ios/App/App.xcodeproj/project.pbxproj");
  const iosIds = [...iosProject.matchAll(/PRODUCT_BUNDLE_IDENTIFIER = ([^;]+);/g)].map((match) => match[1]);
  if (!iosIds.length || iosIds.some((id) => id !== APP_ID)) {
    errors.push(`Every iOS product bundle identifier must be ${APP_ID}`);
  }
  const iosVersion = iosProject.match(/MARKETING_VERSION = ([^;]+);/)?.[1];
  if (iosVersion && iosVersion !== pkg.version) {
    warnings.push(`iOS marketing version ${iosVersion} differs from package version ${pkg.version}`);
  }

  const androidMetadata = text(root, "store/metadata.android.txt");
  const androidName = field(androidMetadata, "Название \\(\\d+\\/30\\)");
  const shortDescription = field(androidMetadata, "Краткое описание \\(\\d+\\/80\\)");
  if (!androidName || androidName.length > 30) errors.push("Android title must contain 1–30 characters");
  if (!shortDescription || shortDescription.length > 80) {
    errors.push("Android short description must contain 1–80 characters");
  }
  for (const label of ["Политика конфиденциальности", "Сайт", "Поддержка"]) {
    const value = field(androidMetadata, label);
    if (!HTTPS_URL.test(value)) errors.push(`Android metadata ${label} must be an HTTPS URL`);
  }

  const iosMetadata = text(root, "store/metadata.ru.txt");
  for (const label of ["Name", "Subtitle", "Description", "Keywords", "Support URL", "Privacy Policy URL"]) {
    if (!field(iosMetadata, label)) errors.push(`iOS metadata field is empty: ${label}`);
  }
  for (const label of ["Support URL", "Privacy Policy URL"]) {
    if (!HTTPS_URL.test(field(iosMetadata, label))) errors.push(`iOS ${label} must be an HTTPS URL`);
  }
  if (field(iosMetadata, "Bundle ID") !== APP_ID) errors.push(`iOS metadata Bundle ID must be ${APP_ID}`);

  const iconSvg = text(root, "icons/icon.svg");
  if (!/viewBox=["']0 0 512 512["']/.test(iconSvg)) {
    errors.push("Source icon must have a 512 × 512 SVG viewBox");
  }
  for (const icon of manifest.icons || []) {
    if (!existsSync(join(root, icon.src || ""))) errors.push(`Web manifest icon is missing: ${icon.src}`);
  }

  const iosIconContentsPath = "ios/App/App/Assets.xcassets/AppIcon.appiconset/Contents.json";
  const iosIconContents = JSON.parse(text(root, iosIconContentsPath));
  for (const image of iosIconContents.images || []) {
    if (image.filename && !existsSync(join(root, "ios/App/App/Assets.xcassets/AppIcon.appiconset", image.filename))) {
      errors.push(`iOS app icon is missing: ${image.filename}`);
    }
  }
  const androidIcons = walkFiles(join(root, "android/app/src/main/res"))
    .filter((path) => /mipmap-(?!anydpi)[^/]+/.test(path) && ["png", "webp"].includes(extname(path).slice(1)));
  if (!androidIcons.length) errors.push("Android raster launcher icons are missing from mipmap density folders");

  const screenshots = walkFiles(join(root, "store"))
    .filter((path) => /\.(?:png|jpe?g)$/i.test(path));
  if (screenshots.length < 2) errors.push("At least two store screenshots are required");
  if (!screenshots.some((path) => /feature/i.test(path))) {
    warnings.push("Google Play feature graphic is not present under store/");
  }

  const codemagic = text(root, "codemagic.yaml");
  if (!/android-signed-release:/.test(codemagic)) errors.push("Codemagic Android signed-release workflow is missing");
  if (!/android_signing:[\s\S]*ottisk_release/.test(codemagic)) {
    errors.push("Codemagic Android signing reference ottisk_release is missing");
  }
  if (/BEGIN (?:RSA |EC )?PRIVATE KEY|storePassword\s*[:=]\s*["'][^$]/.test(codemagic)) {
    errors.push("codemagic.yaml appears to contain signing material or a literal signing password");
  }

  return { errors, warnings };
}

function printReport(report) {
  for (const warning of report.warnings) console.warn(`WARN: ${warning}`);
  for (const error of report.errors) console.error(`ERROR: ${error}`);
  console.log(`Release validation: ${report.errors.length} error(s), ${report.warnings.length} warning(s)`);
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : "";
if (invokedPath === fileURLToPath(import.meta.url)) {
  const root = process.env.RELEASE_ROOT || new URL("..", import.meta.url).pathname;
  const report = validateRelease(root);
  printReport(report);
  process.exitCode = report.errors.length ? 1 : 0;
}
