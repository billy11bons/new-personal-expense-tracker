# Stage 6 report — Netlify deployment

Дата: 2026-09-09. Статус: **Completed**.

## Deployment

- Платформа: Netlify continuous deployment из GitHub.
- GitHub: https://github.com/billy11bons/new-personal-expense-tracker
- Branch: `main`.
- Deployed commit: `b496918930b7fa6fa7695a04cd03aeb089e2488d`.
- Production URL: https://new-personal-expense-tracker.netlify.app
- Site: `new-personal-expense-tracker`.

## Конфигурация

Репозиторий подключён к существующему Netlify site. Runtime установлен в **Next.js**. Приложение находится в `app/`; `netlify.toml` задаёт `base = "app"` и `command = "npm run build"`. Publish directory в настройках Netlify установлен в `.next`. Legacy `@netlify/plugin-nextjs` не используется.

Предыдущие manual deployments возвращали Page Not Found: они публиковали файлы без корректного Git-based Next.js pipeline и не соответствовали tree репозитория. Исправление состояло в переподключении source connection к `billy11bons/new-personal-expense-tracker`, выборе `main`, установке Runtime Next.js и Publish directory `.next`. Account-level SSO не является блокером; production site публичен.

## Проверки

- Публичные маршруты `/`, `/transactions`, `/categories`, `/budget`: HTTP 200, без login redirect и 404.
- Production smoke: Dashboard и demo data загружаются; разделы операций, категорий и бюджета доступны; фильтры и графики отображаются; reload сохраняет данные через localStorage.
- Локально: `npm.cmd run check` успешно (lint, TypeScript, 37/37 unit tests); `npm.cmd run build` успешно; `npm.cmd run test:browser` — 14/14.

## Ограничения

Данные production хранятся только в localStorage браузера, привязаны к origin и не синхронизируются между устройствами или пользователями. Netlify не хранит операции. Очистка site data удаляет записи.
