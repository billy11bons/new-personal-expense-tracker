export interface User { id: string; currency: "USD" }
export interface Income { id: string; userId: string; date: string; amountMinor: number; note: string }
export interface Expense extends Income { categoryId: string }
export interface Category { id: string; userId: string; name: string; archived: boolean }
export interface Budget { id: string; userId: string; month: string; amountMinor: number }
export interface Ledger {
  user: User;
  incomes: Income[];
  expenses: Expense[];
  categories: Category[];
  budgets: Budget[];
}
export interface Period { start: string; end: string }
