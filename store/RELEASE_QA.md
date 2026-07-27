# Release и device QA

## Автоматические проверки

```bash
npm ci
npm run test:release
npm run release:validate
npm run qa:devices
```

`release:validate` проверяет идентификаторы и версии нативных приложений, обязательные поля и HTTPS-ссылки метаданных, web/iOS/Android-иконки, store screenshots и безопасную конфигурацию Codemagic. Ошибки блокируют release; предупреждения требуют ручной проверки.

`qa:devices` запускает Chromium с профилями Playwright для iPhone SE, iPhone 13, Pixel 5 и Galaxy S9+. Проверяются загрузка без JavaScript-ошибок, видимость основной кнопки и отсутствие горизонтального overflow. Для уже развёрнутого стенда:

```bash
npm run qa:devices -- --base-url=https://example.test
```

Эмуляция браузера не проверяет нативные WebView, вырезы, частоту экрана, нагрев, память и haptics, поэтому она не заменяет реальные устройства.

## Матрица реальных устройств

Перед отправкой в store выполнить smoke test минимум на следующих классах устройств:

| Класс | Пример | ОС | Что проверить |
| --- | --- | --- | --- |
| Маленький iPhone | iPhone SE | последняя поддерживаемая iOS | тесный viewport, клавиши, пауза |
| iPhone с Dynamic Island | iPhone 15/16 | текущая iOS | safe areas, портрет, resume |
| Компактный Android | Pixel 5/8 | Android 13+ | back/resume, WebView, haptics |
| Samsung | Galaxy S/А | Android 12+ | вырез, One UI, 60/120 Гц |
| Слабое устройство | Android с 4 ГБ RAM | минимальная поддерживаемая ОС | FPS, память, холодный старт |

На каждом устройстве проверить: установку release-сборки; холодный и повторный старт; onboarding; старт/паузу/continue/game over; магазин без фиктивной покупки; смену языка и accessibility-настроек; звук/haptics; background/foreground; offline-старт; поворот экрана (приложение должно остаться портретным); отсутствие обрезки на всех safe areas. Записать модель, версию ОС, частоту экрана, номер сборки и результат.

## Android signing в Codemagic

Workflow `android-signed-release` создаёт AAB и подписывает его через `jarsigner`. Никакие ключи или пароли не должны попадать в Git.

В Codemagic:

1. Создать или импортировать upload keystore в **Teams → Code signing identities → Android keystores** под reference `ottisk_release`.
2. Хранить keystore, `CM_KEYSTORE_PASSWORD`, `CM_KEY_ALIAS` и `CM_KEY_PASSWORD` только в защищённом хранилище Codemagic. Не вставлять значения в YAML и логи.
3. Запустить workflow после успешного `release:validate`, скачать `ottisk-release.aab` и загрузить его сначала в Google Play Internal testing.
4. Сохранить резервную копию upload key в отдельном защищённом хранилище. Никогда не создавать и не экспортировать Play App Signing key в CI.

Для автоматической публикации дополнительно нужен Google Play service account JSON с минимальными правами. Текущий workflow намеренно только создаёт artifact: service account не требуется и не хранится в репозитории.

## Внешние аккаунты и данные

- Google Play Console: приложение `com.amelin.ottisk`, Play App Signing и заполненные Data Safety/content rating.
- Apple Developer Program и App Store Connect API key для существующего integration `Ottisk`.
- Числовой Apple app ID вместо `REPLACE_WITH_NUMERIC_APP_ID` в защищённой конфигурации release до публикации.
- Публично доступные Privacy Policy и Support URL.
- Минимум два финальных скриншота в `store/` и Google Play feature graphic с `feature` в имени; требования перечислены в `SCREENSHOTS.md`.

Секреты, `.jks`, `.keystore`, `.p8`, provisioning profiles и service-account JSON нельзя коммитить.
