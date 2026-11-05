import type { Ledger } from "../domain/types";

/** Fixed IDs, dates and cents: identical data on every fresh initialization. */
export function createDemoLedger(): Ledger {
  const userId = "local-user";
  return {
    user: { id: userId, currency: "USD" },
    categories: [
      { id: "food", userId, name: "Groceries", archived: false },
      { id: "transport", userId, name: "Transportation", archived: false },
      { id: "home", userId, name: "Home", archived: false },
    ],
    incomes: [
      { id: "income-aug", userId, date: "2026-08-31", amountMinor: 10000, note: "Sample: additional income" },
      { id: "income-sep", userId, date: "2026-09-01", amountMinor: 300000, note: "Sample: monthly income" },
      { id: "income-extra", userId, date: "2026-09-15", amountMinor: 25000, note: "Sample: freelance work" },
      { id: "income-oct", userId, date: "2026-10-01", amountMinor: 300000, note: "Sample: next month income" },
    ],
    expenses: [
      { id: "expense-aug", userId, date: "2026-08-31", amountMinor: 1000, categoryId: "food", note: "Sample" },
      { id: "expense-home", userId, date: "2026-09-01", amountMinor: 100000, categoryId: "home", note: "Sample: rent" },
      { id: "expense-food", userId, date: "2026-09-06", amountMinor: 4550, categoryId: "food", note: "Sample" },
      { id: "expense-transport", userId, date: "2026-09-07", amountMinor: 250, categoryId: "transport", note: "Sample" },
      { id: "expense-month-end", userId, date: "2026-09-30", amountMinor: 2020, categoryId: "food", note: "Sample" },
      { id: "expense-oct", userId, date: "2026-10-01", amountMinor: 500, categoryId: "food", note: "Sample" },
    ],
    budgets: [{ id: "budget-sep", userId, month: "2026-09", amountMinor: 150000 }],
  };
}
