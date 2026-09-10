# Stage 6 report — Netlify deployment

Дата: 2026-09-09. Статус: **Stage 6 not completed** (deployment создан, публичная acceptance-проверка заблокирована account-level SSO).

## Deployment

- Платформа: Netlify CLI 27.5.2, ручной production deploy.
- Site: `case02-personal-expense-tracker`.
- Production URL: https://case02-personal-expense-tracker.netlify.app
- Deploy URL: https://6aa1daefd7ecd9e6a72c1999--case02-personal-expense-tracker.netlify.app
- Deploy ID: `6aa1daefd7ecd9e6a72c1999`.
- Commit для исходного deployment: отсутствует, поскольку manual deploy был выполнен до инициализации Git.
- GitHub repository: https://github.com/billy11bons/new-personal-expense-tracker
- Текущий commit после подготовки workflow: `c24fdc6e20e2620d847dc3f35225ac5e75d81890` (`Case 02 Personal Expense Tracker - completed MVP and deployment config`). Ветка `main` запушена и отслеживает `origin/main`.

## Netlify configuration

Создан минимальный `netlify.toml`:

```toml
[build]
  base = "app"
  command = "npm run build"
```

`base` нужен из-за размещения Next.js приложения в подпапке `app`; `command` запускает production build. `publish` и legacy `@netlify/plugin-nextjs` не добавлялись: Netlify использует актуальную автоматическую интеграцию Next.js.

`.netlify` добавлен в `.gitignore` как локальная служебная папка CLI. Секреты и `.env` в deployment не передавались; приложение работает без environment variables.

GitHub workflow подготовлен отдельно от Netlify: repository создан и push выполнен, но Netlify site к GitHub не подключался.

## Pre-deploy verification

- `npm.cmd ci` — успешно.
- `npm.cmd run check` — успешно: lint, TypeScript, 37/37 unit tests.
- `npm.cmd run build` — успешно на Next.js 16.3.4.
- `npm.cmd run test:browser` — успешно: 14/14 production browser tests.

Netlify Build также успешно выполнил `npm run build` и опубликовал 117 assets; deploy state — `ready`.

## Production verification

Проверка публичных маршрутов `/`, `/transactions`, `/categories`, `/budget` выполнена после deployment. Все запросы перенаправляются на Netlify Edge Access login, поэтому подтвердить Dashboard, CRUD, категории, бюджет, фильтры, графики, reload и mobile layout без авторизации невозможно. Это не 404 и не ошибка сборки.

Причина: Netlify site унаследовал account-level настройки `account_sso_login: true`, `account_sso_login_context: all`. API `updateSite` не предоставляет site-only override для этих полей; попытка изменить только этот сайт не изменила настройки. Настройки аккаунта и других сайтов не затрагивались.

## Ограничения localStorage

Deployment не превращает приложение в облачное: данные остаются только в localStorage браузера пользователя, привязаны к origin и не синхронизируются между устройствами или профилями. Netlify не получает и не хранит пользовательские операции. При очистке site data записи удаляются.

## Итог

Артефакт production успешно создан и собран, GitHub repository подготовлен и синхронизирован. CI/CD connection настроен, но первый Git-based deploy остановился на `preparing repo` с `Permission denied (publickey)`: Netlify deploy key ещё не добавлен в GitHub repository. Stage 6 остаётся **not completed** до добавления ключа и успешной публичной проверки. Функциональность приложения не изменялась; следующие этапы и новые функции не начинались.
