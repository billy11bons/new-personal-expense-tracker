# Stage 6 report — Netlify deployment

Дата: 2026-09-09. Статус: **Stage 6 not completed** (deployment создан, публичная acceptance-проверка заблокирована account-level SSO).

## Deployment

- Платформа: Netlify CLI 27.5.2, ручной production deploy.
- Site: `case02-personal-expense-tracker`.
- Production URL: https://case02-personal-expense-tracker.netlify.app
- Deploy URL: https://6aa1daefd7ecd9e6a72c1999--case02-personal-expense-tracker.netlify.app
- Deploy ID: `6aa1daefd7ecd9e6a72c1999`.
- Commit: отсутствует. В рабочей папке нет доступного Git-репозитория; deployment выполнен как manual deploy из текущего проверенного состояния.

## Netlify configuration

Создан минимальный `netlify.toml`:

```toml
[build]
  base = "app"
  command = "npm run build"
```

`base` нужен из-за размещения Next.js приложения в подпапке `app`; `command` запускает production build. `publish` и legacy `@netlify/plugin-nextjs` не добавлялись: Netlify использует актуальную автоматическую интеграцию Next.js.

`.netlify` добавлен в `.gitignore` как локальная служебная папка CLI. Секреты и `.env` в deployment не передавались; приложение работает без environment variables.

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

Артефакт production успешно создан и собран. Stage 6 остаётся **not completed**, пока сайт не будет доступен без account-level SSO для требуемой публичной проверки. Функциональность приложения не изменялась; Stage 7 и новые функции не начинались.
