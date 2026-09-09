import { ValidationError } from "./errors";
import { assertAmountMinor } from "./money";
import { assertDate, assertMonth } from "./periods";
import type { Category, Expense, Ledger } from "./types";

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new ValidationError("Ожидался объект данных.");
  return value as Record<string, unknown>;
}
function text(value: unknown, field: string, max = 200, allowEmpty = false): asserts value is string {
  if (typeof value !== "string" || (!allowEmpty && !value.trim()) || value.length > max) {
    throw new ValidationError(`Некорректное поле: ${field}.`);
  }
}
function rows(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) throw new ValidationError("Ожидался список данных.");
  const result = value.map(record);
  const ids = new Set<string>();
  for (const row of result) {
    text(row.id, "id");
    if (ids.has(row.id)) throw new ValidationError("Повторяющийся идентификатор.");
    ids.add(row.id);
  }
  return result;
}

/** Runtime validation at the trust boundary, shared by every persistence adapter. */
export function assertLedger(value: unknown): asserts value is Ledger {
  const ledger = record(value);
  const user = record(ledger.user);
  text(user.id, "user.id");
  if (user.currency !== "USD") throw new ValidationError("На этом этапе поддерживается валюта USD.");
  const categories = rows(ledger.categories);
  const incomes = rows(ledger.incomes);
  const expenses = rows(ledger.expenses);
  const budgets = rows(ledger.budgets);
  for (const row of [...categories, ...incomes, ...expenses, ...budgets]) {
    if (row.userId !== user.id) throw new ValidationError("Данные принадлежат другому пользователю.");
  }
  for (const category of categories) {
    text(category.name, "category.name", 80);
    if (typeof category.archived !== "boolean") throw new ValidationError("Некорректное состояние категории.");
  }
  for (const transaction of [...incomes, ...expenses]) {
    assertDate(transaction.date);
    assertAmountMinor(transaction.amountMinor);
    text(transaction.note, "note", 500, true);
  }
  for (const expense of expenses) {
    if (!categories.some(category => category.id === expense.categoryId)) throw new ValidationError("Категория расхода не найдена.");
  }
  const months = new Set<string>();
  for (const budget of budgets) {
    assertMonth(budget.month); assertAmountMinor(budget.amountMinor, true);
    if (months.has(budget.month)) throw new ValidationError("На месяц допускается один общий бюджет.");
    months.add(budget.month);
  }
}

/** Archived categories remain valid in history, but cannot receive new expenses. */
export function validateNewExpense(expense: Expense, categories: readonly Category[]): void {
  text(expense.id, "id"); text(expense.userId, "userId");
  assertDate(expense.date); assertAmountMinor(expense.amountMinor);
  text(expense.note, "note", 500, true);
  if (!categories.some(c => c.id === expense.categoryId && c.userId === expense.userId && !c.archived)) {
    throw new ValidationError("Выберите существующую активную категорию.");
  }
}
