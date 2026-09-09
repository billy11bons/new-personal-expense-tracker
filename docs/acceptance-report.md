# Acceptance report — Case 02 Personal Expense Tracker

Дата: 2026-09-09. Статус: Stage 5 completed.

## MVP

Локальный personal expense tracker с доходами, расходами, категориями, месячным бюджетом, Dashboard, недельными/месячными периодами, фильтрами даты и категории, KPI и простыми графиками. Данные сохраняются в localStorage через repository; суммы хранятся в целых центах.

## Проверенные сценарии

- CRUD доходов и расходов, смена типа, валидация, подтверждение удаления и persistence после reload.
- Создание, переименование, архивирование и восстановление категорий, включая архивную историю.
- Создание и обновление бюджета, нулевой и отсутствующий бюджет, перерасход.
- Dashboard, включительные границы дат, неделя с понедельника, месячные итоги, фильтры категории и диапазона.
- Совпадение KPI, отчётных агрегатов и графиков; пустые выборки.
- Повреждённое хранилище, отказ чтения/записи, повтор сохранения и conflict revision.
- Persistence после закрытия/открытия persistent browser profile и перезапуска production-сервера.

## Результаты проверок

- `npm.cmd run check` — успешно: ESLint без warnings, TypeScript успешно, **37/37 unit tests**.
- `npm.cmd run build` — успешно: production build Next.js 16.3.4.
- `npm.cmd run test:browser` — успешно: **14/14 browser tests** в production-режиме, headless Microsoft Edge.
- Финальное количество: **37 unit + 14 browser tests**.

## Responsive и accessibility

Проверены ширины 320, 375, 390 и 768 px, а также desktop 1280 px. Автоматические production-сценарии подтвердили отсутствие горизонтального overflow на 320/375/390/768/1280 px; Dashboard отдельно проверен на 320/375/390/768 px.

Формы используют связанные `label`/`htmlFor`, semantic headings, landmarks (`main`, `nav`, `region`), доступные имена кнопок и полей, `aria-invalid`/`aria-describedby` для ошибок, `aria-pressed` для переключателей и видимый `:focus-visible`. Проверены keyboard-сценарии, включая Tab, Escape и фокус подтверждения удаления.

## Ограничения и риски

Приложение рассчитано на одного локального пользователя и один browser origin. localStorage не шифруется, не синхронизируется между устройствами и не обеспечивает атомарность между несколькими вкладками. Нет Supabase, авторизации, экспорта, банковских интеграций, AI и категорийных бюджетов. Графики остаются простыми полосами; расширенная визуальная и кроссбраузерная полировка не входит в MVP.

## Локальный запуск

```powershell
Set-Location 'E:\Prompt\Freelance\Trecker\Case_02_Personal_Expense_Tracker\app'
npm.cmd ci
npm.cmd run dev -- --hostname 127.0.0.1
```

Для production:

```powershell
npm.cmd run build
npm.cmd run start -- --hostname 127.0.0.1
```

Переменные окружения не требуются; это отражено в `app/.env.example`. Для чистой демонстрации используйте новый профиль браузера или очистите site data.

## Сознательно не входит в MVP

Supabase/Auth, deployment, экспорт, AI-рекомендации, банковские интеграции, синхронизация между устройствами, дополнительные роли и финальная visual polish.
