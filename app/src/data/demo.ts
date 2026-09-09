import type { Ledger } from "../domain/types";

/** Fixed IDs, dates and cents: identical data on every fresh initialization. */
export function createDemoLedger(): Ledger {
  const userId = "local-user";
  return {
    user: { id: userId, currency: "USD" },
    categories: [
      { id: "food", userId, name: "Продукты", archived: false },
      { id: "transport", userId, name: "Транспорт", archived: false },
      { id: "home", userId, name: "Дом", archived: false },
    ],
    incomes: [
      { id: "income-aug", userId, date: "2026-08-31", amountMinor: 10000, note: "Демо: дополнительный доход" },
      { id: "income-sep", userId, date: "2026-09-01", amountMinor: 300000, note: "Демо: месячный доход" },
      { id: "income-extra", userId, date: "2026-09-15", amountMinor: 25000, note: "Демо: подработка" },
      { id: "income-oct", userId, date: "2026-10-01", amountMinor: 300000, note: "Демо: следующий месяц" },
    ],
    expenses: [
      { id: "expense-aug", userId, date: "2026-08-31", amountMinor: 1000, categoryId: "food", note: "Демо" },
      { id: "expense-home", userId, date: "2026-09-01", amountMinor: 100000, categoryId: "home", note: "Демо: аренда" },
      { id: "expense-food", userId, date: "2026-09-06", amountMinor: 4550, categoryId: "food", note: "Демо" },
      { id: "expense-transport", userId, date: "2026-09-07", amountMinor: 250, categoryId: "transport", note: "Демо" },
      { id: "expense-month-end", userId, date: "2026-09-30", amountMinor: 2020, categoryId: "food", note: "Демо" },
      { id: "expense-oct", userId, date: "2026-10-01", amountMinor: 500, categoryId: "food", note: "Демо" },
    ],
    budgets: [{ id: "budget-sep", userId, month: "2026-09", amountMinor: 150000 }],
  };
}
