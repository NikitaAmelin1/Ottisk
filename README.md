# ОТТИСК

Игра: существо живёт только под пальцем.

- Веб (GitHub Pages): https://nikitaamelin1.github.io/Ottisk/
- Источник: https://github.com/gqfc925dtm-max/Fagsikasdr
- Политика: [privacy.html](./privacy.html)
- Поддержка: [support.html](./support.html)
- **Windows → App Store:** [store/WINDOWS.md](./store/WINDOWS.md)
- Полный гайд стора: [store/APP_STORE.md](./store/APP_STORE.md)

## На Windows

```bash
npm install
npm start
# http://localhost:8765
```

В App Store с Windows — только через облачный Mac (Codemagic).  
Смотри `store/WINDOWS.md` и `codemagic.yaml`.

## iOS (если есть Mac)

```bash
npm install
npm run build:www
npx cap sync ios
npx cap open ios
```
