import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import { DEVICE_MATRIX, assertDeviceProfiles } from "../scripts/device-matrix.mjs";
import { validateRelease } from "../scripts/validate-release.mjs";

function fixture() {
  const root = mkdtempSync(join(tmpdir(), "ottisk-release-"));
  const write = (path, contents = "") => {
    const target = join(root, path);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, contents);
  };
  write("package.json", JSON.stringify({ version: "1.2.0" }));
  write("capacitor.config.json", JSON.stringify({
    appId: "com.amelin.ottisk",
    webDir: "www",
  }));
  write("manifest.json", JSON.stringify({
    orientation: "portrait",
    icons: [{ src: "icons/icon-512.png" }],
  }));
  write("privacy.html");
  write("support.html");
  write("icons/icon.svg", '<svg viewBox="0 0 512 512"></svg>');
  write("icons/icon-512.png");
  write("android/app/build.gradle", `
    applicationId "com.amelin.ottisk"
    versionName "1.2.0"
  `);
  write("android/app/src/main/res/mipmap-hdpi/ic_launcher.png");
  write("ios/App/App.xcodeproj/project.pbxproj", `
    MARKETING_VERSION = 1.2.0;
    PRODUCT_BUNDLE_IDENTIFIER = com.amelin.ottisk;
  `);
  write("ios/App/App/Assets.xcassets/AppIcon.appiconset/Contents.json", JSON.stringify({
    images: [{ filename: "AppIcon.png" }],
  }));
  write("ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon.png");
  write("store/01.png");
  write("store/02.png");
  write("store/feature.png");
  write("store/metadata.android.txt", `Название (20/30):
ОТТИСК

Краткое описание (20/80):
Живая бездна.

Политика конфиденциальности:
https://example.test/privacy

Сайт:
https://example.test

Поддержка:
https://example.test/support
`);
  write("store/metadata.ru.txt", `Name:
ОТТИСК

Subtitle:
Живая бездна

Description:
Описание

Keywords:
аркада

Support URL:
https://example.test/support

Privacy Policy URL:
https://example.test/privacy

Bundle ID:
com.amelin.ottisk
`);
  write("codemagic.yaml", `workflows:
  android-signed-release:
    environment:
      android_signing:
        - ottisk_release
`);
  return { root, write };
}

test("browser QA matrix uses available mobile profiles", () => {
  assert.equal(DEVICE_MATRIX.length, 4);
  assert.doesNotThrow(() => assertDeviceProfiles());
});

test("release validator accepts a complete fixture", (t) => {
  const { root } = fixture();
  t.after(() => rmSync(root, { recursive: true, force: true }));
  assert.deepEqual(validateRelease(root), { errors: [], warnings: [] });
});

test("release validator reports asset and signing safety failures", (t) => {
  const { root, write } = fixture();
  t.after(() => rmSync(root, { recursive: true, force: true }));
  rmSync(join(root, "store/01.png"));
  rmSync(join(root, "store/02.png"));
  write("codemagic.yaml", `workflows:
  android-signed-release:
    signing: |
      -----BEGIN PRIVATE KEY-----
`);

  const report = validateRelease(root);
  assert.ok(report.errors.some((message) => message.includes("two store screenshots")));
  assert.ok(report.errors.some((message) => message.includes("signing reference")));
  assert.ok(report.errors.some((message) => message.includes("signing material")));
});
