# Smart Expense Tracker

A mobile-friendly personal finance tracker for recording income and expenses, organizing expense categories, setting monthly budgets, and reviewing a period dashboard. The app is configured for US English and USD.

## Run locally

From the `app/` directory:

```powershell
npm install
npm run dev
```

Open <http://localhost:3000>. The Dashboard is the home page; Transactions, Categories, and Budget are available from the main navigation.

## Data and privacy

The MVP uses browser localStorage only. It has no authentication, server database, sync, bank connections, or analytics service. The storage key (`case02.personal-expense-tracker`) and schema version are preserved across this localization, so existing user data remains readable.

Fresh browser storage receives reproducible English sample data. Existing saved records are never migrated, renamed, or overwritten merely because the interface language changed.

## Available commands

Run these from `app/`:

```powershell
npm run lint
npm run typecheck
npm test
npm run check
npm run build
npm run test:browser
```

- `check` runs ESLint, Next.js type generation, TypeScript, and unit tests.
- `build` creates the production build.
- `test:browser` runs Playwright against a production server on `127.0.0.1:3212`. Microsoft Edge is the default headless browser; set `PLAYWRIGHT_CHANNEL=chrome` if needed.

## Main workflows

- **Transactions:** add, edit, convert, and delete income or expense entries. Amounts are stored as whole cents to avoid floating-point rounding.
- **Categories:** add, rename, archive, and restore expense categories. Archived categories stay attached to historical records but cannot be assigned to new expenses.
- **Budget:** set one overall USD budget per calendar month. A budget of `$0.00` is valid and distinct from no budget.
- **Dashboard:** review income, expenses, balance, budget, remaining budget, and category totals for a month, week, or custom date range.

## Technical stack

Next.js 16, React 19, TypeScript, Tailwind CSS, browser localStorage, Node.js tests, and Playwright.
