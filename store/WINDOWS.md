# ОТТИСК с Windows → App Store

Коротко: **на Windows нельзя поставить Xcode**.  
Собрать `.ipa` для App Store можно только на **macOS** — своём, чужом или в облаке.

## Что можно делать прямо сейчас на Windows

1. Играть и тестировать веб-версию:  
   https://nikitaamelin1.github.io/Ottisk/
2. Добавить на iPhone: Safari → Поделиться → На экран «Домой»
3. Править код в Cursor / VS Code
4. Пушить в GitHub
5. Оформить [Apple Developer](https://developer.apple.com/programs/) ($99/год) — это делается с любого ПК
6. Заполнить App Store Connect (название, описание, privacy/support URL) с браузера

## Лучший путь без Mac: Codemagic

Codemagic даёт облачный Mac и может сам залить билд в TestFlight.

1. Зарегистрируйся на [codemagic.io](https://codemagic.io) через GitHub
2. Подключи репозиторий `Ottisk`
3. В репо уже есть `codemagic.yaml`
4. В Codemagic Teams → Code signing identities загрузи:
   - Distribution Certificate
   - App Store Provisioning Profile  
   (их можно создать на [developer.apple.com](https://developer.apple.com) с Windows)
5. Добавь App Store Connect API key (Issuer ID, Key ID, `.p8`)
6. Запусти workflow **ios-app-store**

После успеха билд появится в TestFlight.

### Сертификаты с Windows

На developer.apple.com:

1. Certificates → создать **Apple Distribution**
2. Profiles → **App Store** profile для `com.amelin.ottisk`
3. Скачать `.cer` / `.mobileprovision` и загрузить в Codemagic

Если просится CSR: Codemagic умеет сгенерировать сертификат сам (automatic code signing) — включи это в UI, если не хочешь возиться вручную.

## Альтернативы

| Способ | Нужен Mac? | Сложность |
|---|---|---|
| Codemagic / Bitrise | Нет (облако) | Средняя |
| Аренда MacInCloud / MacStadium | Нет (удалённый Mac) | Средняя |
| Знакомый с Mac + твой Apple ID | Да, чужой | Низкая |
| Купить/взять Mac mini | Да | Низкая потом |
| Только PWA на экран Домой | Нет | Уже работает |

## Чего Windows не заменит

- Локальный `npx cap open ios`
- Локальный Xcode Archive
- Симулятор iPhone на Windows

Всё остальное (код игры, Pages, Connect, сертификаты, облачная сборка) — можно вести с Windows.

## Порядок действий именно тебе

1. Оплати Apple Developer
2. Создай приложение в App Store Connect с Bundle ID `com.amelin.ottisk`
3. Вставь ссылки:
   - Privacy: `https://nikitaamelin1.github.io/Ottisk/privacy.html`
   - Support: `https://nikitaamelin1.github.io/Ottisk/support.html`
4. Подключи Codemagic к GitHub-репо
5. Собери TestFlight
6. Проверь на своём iPhone
7. Submit for Review

Пока облачная сборка не настроена, игра уже живёт как PWA — это нормальный способ раздавать друзьям.
