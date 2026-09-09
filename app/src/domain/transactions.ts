import type { Ledger } from "./types";
import type { TransactionRef } from "./commands";
export interface TransactionItem extends TransactionRef { date: string; amountMinor: number; note: string; categoryId: string | null }
export function listTransactions(ledger: Ledger): TransactionItem[] {
  return [
    ...ledger.incomes.map(row => ({ ...row, type: "income" as const, categoryId: null })),
    ...ledger.expenses.map(row => ({ ...row, type: "expense" as const })),
  ].sort((a, b) => b.date.localeCompare(a.date) || a.type.localeCompare(b.type) || a.id.localeCompare(b.id));
}
