# ОТТИСК → App Store

## Если у тебя Windows

Читай сначала: **[WINDOWS.md](./WINDOWS.md)**

На Windows нет Xcode. Собираем iOS через облачный Mac (Codemagic) или чужой/арендованный Mac.

## Что уже готово в репозитории

- Capacitor + папка `ios/`
- `codemagic.yaml` для облачной сборки
- Честный continue без фейковой рекламы
- `privacy.html` и `support.html`
- Метаданные: `store/metadata.ru.txt`

## Обязательно у любого разработчика

1. [Apple Developer Program](https://developer.apple.com/programs/) — $99/год  
2. Приложение в App Store Connect  
3. Bundle ID: `com.amelin.ottisk`

## Путь A — Windows + Codemagic (рекомендуется)

1. Зайди на [codemagic.io](https://codemagic.io) через GitHub  
2. Подключи `Ottisk`  
3. Настрой code signing и App Store Connect API key  
4. Запусти workflow **ios-app-store**  
5. Проверь TestFlight на iPhone  

Подробности: [WINDOWS.md](./WINDOWS.md)

## Путь B — есть Mac

```bash
npm install
npm run build:www
npx cap sync ios
npx cap open ios
```

В Xcode: Signing → Archive → Distribute → App Store Connect.

## App Store Connect

Обязательные ссылки:

- Privacy Policy: `https://nikitaamelin1.github.io/Ottisk/privacy.html`
- Support URL: `https://nikitaamelin1.github.io/Ottisk/support.html`

Заполни:

- Название: ОТТИСК
- Подзаголовок: Живёт только под пальцем
- Категория: Games → Casual
- Возраст: 4+
- Скриншоты iPhone 6.7" и 6.1"
- App Privacy: Data Not Collected (пока нет аналитики/рекламы)

Текст для карточки: `store/metadata.ru.txt`

## Монетизация

- 1 бесплатный continue за забег
- Доп. continue за следы **или 10 ₽** (`ottisk_continue_10rub`, до 3 продолжений за забег)
- Косметика за следы / рекорд
- Кнопка `Донат` / `Магазин` → tip packs + пак следов + IAP-герои
- `OttiskNative.purchase('ottisk_marks_60')` — пак следов
- `OttiskNative.purchase('ottisk_continue_10rub')` — продолжение · 10 ₽
- `OttiskNative.purchase('ottisk_starter_pack')` — стартовый пак · 199 ₽ (скат + удильщик + наутилус + 60 следов)
- `OttiskNative.restorePurchases()` — восстановление Non-Consumable
- IAP-герои (Non-Consumable):
  - `ottisk_submarine` — корабль · 99 ₽ (пушки · 3 жизни)
  - `ottisk_hero_eel` — угорь · 99 ₽ (разряд)
  - `ottisk_hero_squid` — кальмар · 99 ₽ (чернила)
  - `ottisk_hero_seahorse` — конёк · 129 ₽ (откат)
  - `ottisk_hero_whale` — кит · 149 ₽ (сонар)
- `ottisk_tip_small` / `ottisk_tip_mid` / `ottisk_tip_big` — донаты с благодарностью в следах
- После левиафана: волны «кракен» (босс @780) и «титаны» (@900)

### StoreKit позже

1. App Store Connect → Consumable / Non-Consumable:
   - `ottisk_marks_60` (Consumable)
   - `ottisk_continue_10rub` (Consumable · 10 ₽)
   - `ottisk_starter_pack` (Non-Consumable · 199 ₽)
   - `ottisk_submarine` (Non-Consumable · 99 ₽)
   - `ottisk_hero_eel` (Non-Consumable · 99 ₽)
   - `ottisk_hero_squid` (Non-Consumable · 99 ₽)
   - `ottisk_hero_seahorse` (Non-Consumable · 129 ₽)
   - `ottisk_hero_whale` (Non-Consumable · 149 ₽)
   - `ottisk_tip_small`
   - `ottisk_tip_mid`
   - `ottisk_tip_big`
2. Подключи плагин покупок в iOS-оболочке (`purchase` + `restore` / `restorePurchases`)
3. Проброс в `Capacitor.Plugins.OttiskIAP`

## TestFlight

1. Залей билд (Codemagic или Xcode)
2. Добавь себя тестером
3. Проверь: старт, пауза, continue, shop, share
4. Submit for Review

## Частые отказы

- Фейковая реклама / фейковые IAP
- Битые Privacy/Support URL
- Крэш на запуске
- Неверные App Privacy labels
