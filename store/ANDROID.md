# Android / Google Play

Проект Android создан через Capacitor 7 в каталоге `android/`.

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

## Перед публикацией

1. Создать signing key и release-конфигурацию в Android Studio.
2. Собрать Android App Bundle (`.aab`).
3. Заполнить карточку Google Play, Data Safety и ссылку на `privacy.html`.
4. Проверить игру на телефонах 60/90/120 Гц и с разными вырезами экрана.
5. Цифровые покупки в Google Play должны использовать Play Billing. В текущей версии они остаются недоступными в Android-сборке; StoreKit не переносится на Android автоматически.

Идентификатор приложения: `com.amelin.ottisk`.
