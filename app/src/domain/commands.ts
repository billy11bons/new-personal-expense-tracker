import type { Ledger, Income, Expense } from "./types";
import { ValidationError } from "./errors";
import { assertLedger } from "./validation";
import { parseAmount } from "./money";
import { assertDate, assertMonth } from "./periods";

export type TransactionType = "income" | "expense";
export interface TransactionRef { id: string; type: TransactionType }
export interface TransactionDraft { type: string; date: string; amount: string; categoryId: string; note: string }
export class FormValidationError extends ValidationError {
  constructor(public readonly fields: Record<string, string>) {
    super(Object.values(fields)[0]); this.name = "FormValidationError";
  }
}
function validateField(errors: Record<string, string>, field: string, check: () => void) {
  try { check(); } catch (error) {
    if (!(error instanceof ValidationError)) throw error;
    errors[field] = error.message;
  }
}
function finish(ledger: Ledger): Ledger { assertLedger(ledger); return ledger; }
function assertType(type: string): asserts type is TransactionType {
  if (type !== "income" && type !== "expense") throw new FormValidationError({ type: "Выберите доход или расход." });
}
function assertId(id: string) {
  if (!id.trim() || id.length > 200) throw new ValidationError("Не удалось создать идентификатор записи.");
}
export function getTransaction(ledger: Ledger, ref: TransactionRef): Income | Expense {
  assertType(ref.type);
  const row = (ref.type === "income" ? ledger.incomes : ledger.expenses).find(row => row.id === ref.id);
  if (!row) throw new ValidationError("Операция уже удалена. Обновите список.");
  return row;
}

/** Pure immutable commands: IDs and user-entered values come from the caller. */
export function saveTransaction(ledger: Ledger, draft: TransactionDraft, id: string, original?: TransactionRef): Ledger {
  assertLedger(ledger); assertId(id);
  const previous = original ? getTransaction(ledger, original) : undefined;
  if (original && id !== original.id) throw new ValidationError("Идентификатор операции нельзя менять.");
  const fields: Record<string, string> = {};
  validateField(fields, "type", () => assertType(draft.type));
  validateField(fields, "date", () => assertDate(draft.date));
  let amountMinor = 0;
  validateField(fields, "amount", () => { amountMinor = parseAmount(draft.amount); });
  if (draft.note.trim().length > 500) fields.note = "Описание должно быть не длиннее 500 символов.";
  if (draft.type === "expense") {
    const category = ledger.categories.find(row => row.id === draft.categoryId);
    const retained = original?.type === "expense" && previous && "categoryId" in previous && previous.categoryId === draft.categoryId;
    if (!category || (category.archived && !retained)) fields.categoryId = "Выберите активную категорию расхода.";
  }
  if (Object.keys(fields).length) throw new FormValidationError(fields);
  assertType(draft.type);
  const incomes = ledger.incomes.filter(row => !(original?.type === "income" && row.id === original.id));
  const expenses = ledger.expenses.filter(row => !(original?.type === "expense" && row.id === original.id));
  if ((draft.type === "income" ? incomes : expenses).some(row => row.id === id)) throw new ValidationError("Операция с таким идентификатором уже существует.");
  const transaction: Income = { id, userId: ledger.user.id, date: draft.date, amountMinor, note: draft.note.trim() };
  if (draft.type === "income") incomes.push(transaction);
  else expenses.push({ ...transaction, categoryId: draft.categoryId });
  return finish({ ...ledger, incomes, expenses });
}
export function deleteTransaction(ledger: Ledger, ref: TransactionRef): Ledger {
  assertLedger(ledger); getTransaction(ledger, ref);
  return finish({ ...ledger,
    incomes: ledger.incomes.filter(row => !(ref.type === "income" && row.id === ref.id)),
    expenses: ledger.expenses.filter(row => !(ref.type === "expense" && row.id === ref.id)),
  });
}
export function saveCategory(ledger: Ledger, nameInput: string, id: string, editing = false): Ledger {
  assertLedger(ledger); assertId(id);
  const name = nameInput.trim();
  if (!name || name.length > 80) throw new FormValidationError({ name: "Название категории: от 1 до 80 символов." });
  const existing = ledger.categories.find(row => row.id === id);
  if (editing && !existing) throw new ValidationError("Категория не найдена. Обновите данные.");
  if (!editing && existing) throw new ValidationError("Идентификатор категории уже существует.");
  if (ledger.categories.some(row => row.id !== id && row.name.trim().toLocaleLowerCase("ru") === name.toLocaleLowerCase("ru"))) {
    throw new FormValidationError({ name: "Категория с таким названием уже есть, в том числе в архиве." });
  }
  const category = { id, userId: ledger.user.id, name, archived: existing?.archived ?? false };
  return finish({ ...ledger, categories: existing ? ledger.categories.map(row => row.id === id ? category : row) : [...ledger.categories, category] });
}
export function setCategoryArchived(ledger: Ledger, id: string, archived: boolean): Ledger {
  assertLedger(ledger);
  if (!ledger.categories.some(row => row.id === id)) throw new ValidationError("Категория не найдена.");
  return finish({ ...ledger, categories: ledger.categories.map(row => row.id === id ? { ...row, archived } : row) });
}
export function saveBudget(ledger: Ledger, month: string, amount: string, newId: string): Ledger {
  assertLedger(ledger);
  const fields: Record<string, string> = {};
  validateField(fields, "month", () => assertMonth(month));
  let amountMinor = 0;
  validateField(fields, "amount", () => { amountMinor = parseAmount(amount, true); });
  if (Object.keys(fields).length) throw new FormValidationError(fields);
  const existing = ledger.budgets.find(row => row.month === month);
  const id = existing?.id ?? newId;
  assertId(id);
  if (!existing && ledger.budgets.some(row => row.id === id)) throw new ValidationError("Идентификатор бюджета уже существует.");
  return finish({ ...ledger, budgets: [...ledger.budgets.filter(row => row.month !== month), { id, userId: ledger.user.id, month, amountMinor }] });
}
