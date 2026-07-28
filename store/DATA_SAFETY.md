# Google Play Data Safety — ответы для Console

Заполняйте форму **App content → Data safety** по этой таблице.
Пакет: `com.amelin.ottisk`. Политика: https://nikitaamelin1.github.io/Ottisk/privacy.html

## Обзор

| Вопрос | Ответ |
| --- | --- |
| Собирает ли приложение данные пользователей? | **Да** (только если пользователь создаёт аккаунт / включает облако / включает отчёты об ошибках) |
| Все ли данные зашифрованы при передаче? | **Да** (HTTPS) |
| Можно ли запросить удаление? | **Да** (через support + отключение аккаунта/облака) |

## Данные, которые могут собираться

### Account info / Personal info
| Тип | Собирается? | Когда | Связано с аккаунтом | Цель | Передаётся третьим лицам |
| --- | --- | --- | --- | --- | --- |
| Email | Да (опционально) | Регистрация аккаунта | Да | Account management, App functionality | Нет (локально; в облако — только если пользователь указал Worker URL) |
| User IDs | Да (опционально) | Облачный аккаунт | Да | App functionality | Нет (кроме выбранного оператора Worker) |
| Name / display name | Да (опционально) | Рейтинг / профиль | Да | App functionality | Публично в игровом рейтинге |

### App activity / App info and performance
| Тип | Собирается? | Когда | Цель |
| --- | --- | --- | --- |
| Game progress / saves | Да | Локально всегда; в облако — по желанию | App functionality |
| Crash logs (hashed) | Да (opt-in) | Если включены «отчёты об ошибках» и настроен cloud API | Analytics / Stability |
| Local analytics aggregates | Нет на сервер | Только на устройстве | — |

### Purchases
| Тип | Собирается? | Когда | Цель |
| --- | --- | --- | --- |
| Purchase history | Да (через Google Play) | In-app purchases | App functionality, Account management |

Google Play обрабатывает платежи. Приложение получает product ID / факт покупки для разблокировки контента.

## Что отметить как «не собираем»
- Approximate/precise location
- Photos/videos/audio
- Contacts / calendar / SMS
- Device IDs for advertising
- Advertising / marketing data sharing
- Web browsing history

## Обязательные формулировки
- Нет рекламы сторонних сетей в текущей версии.
- Нет продажи данных.
- Локальная игровая аналитика не уходит на сервер.
- Cloud / email / crash reports — только после явного действия пользователя.

## После изменений кода
Обновляйте эту форму при добавлении Firebase Crashlytics, FCM push или аналитики третьих сторон.
