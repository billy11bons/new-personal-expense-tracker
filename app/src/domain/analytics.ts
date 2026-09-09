import type { Ledger, Period } from "./types";
import { assertLedger } from "./validation";
import { dateRange, isInPeriod, monthPeriod, weekPeriod } from "./periods";
import { sumMinor } from "./money";
export interface CategoryTotal { categoryId: string; name: string; archived: boolean; amountMinor: number }
export interface AnalyticsSnapshot { period: Period; incomeMinor: number; expenseMinor: number; balanceMinor: number; budgetMinor: number | null; remainingBudgetMinor: number | null; categoryTotals: CategoryTotal[] }
export function filterExpenses(ledger: Ledger, period: Period, categoryId = "all") { assertLedger(ledger); dateRange(period.start, period.end); return ledger.expenses.filter(row => isInPeriod(row.date, period) && (categoryId === "all" || row.categoryId === categoryId)); }
export function groupExpensesByCategory(ledger: Ledger, period: Period, categoryId = "all"): CategoryTotal[] {
  const groups = new Map<string, CategoryTotal>();
  for (const expense of filterExpenses(ledger, period, categoryId)) { const category = ledger.categories.find(row => row.id === expense.categoryId); const current = groups.get(expense.categoryId) ?? { categoryId: expense.categoryId, name: category?.name ?? "Архивная категория", archived: category?.archived ?? true, amountMinor: 0 }; current.amountMinor += expense.amountMinor; groups.set(expense.categoryId, current); }
  return [...groups.values()].sort((a, b) => b.amountMinor - a.amountMinor || a.name.localeCompare(b.name, "ru"));
}
export function analyticsSnapshot(ledger: Ledger, period: Period, categoryId = "all"): AnalyticsSnapshot {
  assertLedger(ledger); dateRange(period.start, period.end); const incomeMinor = sumMinor(ledger.incomes.filter(row => isInPeriod(row.date, period)).map(row => row.amountMinor)); const expenses = filterExpenses(ledger, period, categoryId); const expenseMinor = sumMinor(expenses.map(row => row.amountMinor)); const budgetMinor = period.start.slice(0, 7) === period.end.slice(0, 7) ? ledger.budgets.find(row => row.month === period.start.slice(0, 7))?.amountMinor ?? null : null; return { period, incomeMinor, expenseMinor, balanceMinor: incomeMinor - expenseMinor, budgetMinor, remainingBudgetMinor: budgetMinor === null ? null : budgetMinor - expenseMinor, categoryTotals: groupExpensesByCategory(ledger, period, categoryId) };
}
export function monthAnalytics(ledger: Ledger, month: string, categoryId = "all") { return analyticsSnapshot(ledger, monthPeriod(month), categoryId); }
export function weekAnalytics(ledger: Ledger, date: string, categoryId = "all") { return analyticsSnapshot(ledger, weekPeriod(date), categoryId); }
