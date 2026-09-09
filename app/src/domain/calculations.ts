import type { Ledger, Period } from "./types";
import { assertLedger } from "./validation";
import { dateRange, isInPeriod, monthPeriod } from "./periods";
import { sumMinor } from "./money";

export function periodTotals(ledger: Ledger, period: Period) {
  assertLedger(ledger); dateRange(period.start, period.end);
  const incomeMinor = sumMinor(ledger.incomes.filter(row => isInPeriod(row.date, period)).map(row => row.amountMinor));
  const expenseMinor = sumMinor(ledger.expenses.filter(row => isInPeriod(row.date, period)).map(row => row.amountMinor));
  return { incomeMinor, expenseMinor, balanceMinor: incomeMinor - expenseMinor };
}

export function monthlyBudget(ledger: Ledger, month: string) {
  const totals = periodTotals(ledger, monthPeriod(month));
  const budgetMinor = ledger.budgets.find(row => row.month === month)?.amountMinor ?? null;
  return { budgetMinor, expenseMinor: totals.expenseMinor, remainingMinor: budgetMinor === null ? null : budgetMinor - totals.expenseMinor };
}
