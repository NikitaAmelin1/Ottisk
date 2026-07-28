# Android / Google Play

Проект Android создан через Capacitor 7 в каталоге `android/`.
Полный чеклист выпуска: [PLAY_CHECKLIST.md](./PLAY_CHECKLIST.md).

## Локальная сборка

Требуются Android Studio, JDK 21 и Android SDK.

```bash
npm ci
npm run build:www
npx cap sync android
npm run cap:android
```

Для проверочного APK без Android Studio:

```bash
cd android
./gradlew assembleDebug
```

APK появится в `android/app/build/outputs/apk/debug/`.

## Play Billing

В приложении есть нативный плагин `OttiskIAP` (`OttiskIAPPlugin.java`):
- Google Play Billing Library 7
- In-App Review
- product ID из `js/game.js`

Пока продукты не созданы в Play Console, платные кнопки скрываются (`billingAvailable` / `canOfferRealMoney`).
Косметика и герои за следы работают всегда.

Создайте in-app products по списку в `PLAY_CHECKLIST.md`, добавьте license testers, проверьте Internal testing.

## Перед публикацией

1. Upload key в Codemagic (`ottisk_release`) — не в Git.
2. `npm run release:validate`
3. Workflow `android-signed-release` → `ottisk-release.aab`
4. Карточка: `metadata.android.txt` + `metadata.en.txt`, скриншоты, feature graphic
5. Data Safety: `DATA_SAFETY.md`
6. Content rating: `CONTENT_RATING.md`
7. Internal testing → Play Vitals → Production

Идентификатор: `com.amelin.ottisk` · versionCode в `android/app/build.gradle`.

Device QA: [RELEASE_QA.md](./RELEASE_QA.md).
