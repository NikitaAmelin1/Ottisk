# Google Play — чеклист выпуска ОТТИСК

Пакет: `com.amelin.ottisk` · Версия: см. `package.json` / `android/app/build.gradle`  
Код-агент и магазинные материалы: этот репозиторий.

## 1. Карточка магазина
- [ ] RU listing из `store/metadata.android.txt`
- [ ] EN listing из `store/metadata.en.txt`
- [ ] Иконка 512 (`icons/icon-512.png`)
- [ ] Feature graphic `store/ottisk-feature-graphic.png` (1024×500)
- [ ] ≥4 phone screenshots из `store/screenshots/` (1080×1920)
- [ ] Privacy: https://nikitaamelin1.github.io/Ottisk/privacy.html
- [ ] Support: https://nikitaamelin1.github.io/Ottisk/support.html

## 2. App content
- [ ] Data Safety по `store/DATA_SAFETY.md`
- [ ] Content rating по `store/CONTENT_RATING.md`
- [ ] Target audience / News apps / COVID — отметить «не применяется»
- [ ] Ads: **No**

## 3. Монетизация (Play Billing)
Создать managed products (in-app, one-time) с ID:

| Product ID | Назначение |
| --- | --- |
| `ottisk_marks_60` | +60 следов |
| `ottisk_starter_pack` | стартовый пак |
| `ottisk_continue_10rub` | продолжение забега |
| `ottisk_submarine` | герой |
| `ottisk_hero_eel` | герой |
| `ottisk_hero_squid` | герой |
| `ottisk_hero_seahorse` | герой |
| `ottisk_hero_whale` | герой |
| `ottisk_tip_small` / `mid` / `big` | донат-tips |

- [ ] Активировать лицензию / license testers
- [ ] Проверить покупку и restore на Internal testing track
- [ ] Если продукт ещё не создан — UI не должен предлагать «ломаную» оплату (код скрывает покупки без Billing)

## 4. Подпись и AAB
- [ ] Upload keystore в Codemagic (`ottisk_release`) — см. `store/RELEASE_QA.md`
- [ ] `npm run release:validate`
- [ ] Workflow `android-signed-release` → скачать `ottisk-release.aab`
- [ ] Play App Signing включён в Console
- [ ] Загрузить AAB в **Internal testing**

## 5. Internal / closed testing
- [ ] Добавить 5–20 тестеров
- [ ] Smoke: холодный старт, play, shop, billing, back, background, офлайн, напоминание
- [ ] Смотреть Play Vitals (crashes/ANR) 48–72 часа
- [ ] Затем Production / staged rollout 20% → 100%

## 6. Качество на устройствах
См. `store/RELEASE_QA.md` (Pixel, Samsung, слабый Android).

## 7. После релиза (уже в коде)
- Soft update banner читает `version.json`
- In-app review после хорошего забега
- Opt-in ежедневное локальное напоминание
- Opt-in crash reports (нужен cloud Worker URL в meta / настройках)
- Аккаунт для сохранения прогресса

## 8. Облако (опционально)
- [ ] Задеплоить Worker из `cloud/`
- [ ] Прописать URL в `<meta name="ottisk-cloud-api">` или в игре
- [ ] Обновить Data Safety, если cloud станет default

Секреты (`.jks`, service account JSON) **не** коммитить.
