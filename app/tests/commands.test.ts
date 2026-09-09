import test from "node:test";
import assert from "node:assert/strict";
import { createDemoLedger } from "../src/data/demo";
import { LocalStorageRepository } from "../src/data/local-storage-repository";
import { saveTransaction, deleteTransaction, saveCategory, setCategoryArchived, saveBudget, FormValidationError, type TransactionDraft } from "../src/domain/commands";
import { listTransactions } from "../src/domain/transactions";
import { amountToInput, parseAmount } from "../src/domain/money";
import { periodTotals } from "../src/domain/calculations";
import { monthPeriod } from "../src/domain/periods";

const draft: TransactionDraft = { type: "expense", amount: "12,34", date: "2026-09-08", categoryId: "food", note: "  Покупка  " };
const hasField = (field: string) => (error: unknown) => error instanceof FormValidationError && !!error.fields[field];

test("commands create income/expense in cents and do not mutate input", () => {
  const data = createDemoLedger(); const before = structuredClone(data);
  const expense = saveTransaction(data, draft, "new-expense");
  assert.deepEqual(data, before);
  assert.equal(expense.expenses.at(-1)!.amountMinor, 1234);
  assert.equal(expense.expenses.at(-1)!.note, "Покупка");
  const income = saveTransaction(expense, { ...draft, type: "income", categoryId: "missing" }, "new-income");
  assert.equal(income.incomes.at(-1)!.amountMinor, 1234);
  assert.equal("categoryId" in income.incomes.at(-1)!, false);
  assert.equal(periodTotals(income, monthPeriod("2026-09")).expenseMinor, 108054);
});
test("transaction validation identifies type, amount, date and category fields", () => {
  const data = createDemoLedger();
  for (const type of ["", "refund", "INCOME"]) assert.throws(() => saveTransaction(data, { ...draft, type }, "x"), hasField("type"));
  for (const amount of ["", "0", "-1", "1.234", "1e3"]) assert.throws(() => saveTransaction(data, { ...draft, amount }, "x"), hasField("amount"));
  for (const date of ["", "2026-02-29", "2026-04-31"]) assert.throws(() => saveTransaction(data, { ...draft, date }, "x"), hasField("date"));
  for (const categoryId of ["", "missing"]) assert.throws(() => saveTransaction(data, { ...draft, categoryId }, "x"), hasField("categoryId"));
  assert.throws(() => saveTransaction(data, { ...draft, note: "x".repeat(501) }, "x"), hasField("note"));
});
test("editing a demo operation preserves ID and changing type moves it exactly once", () => {
  const data = createDemoLedger();
  const changed = saveTransaction(data, { ...draft, type: "income", amount: "100.01" }, "expense-home", { id: "expense-home", type: "expense" });
  assert.equal(changed.expenses.some(row => row.id === "expense-home"), false);
  assert.equal(changed.incomes.find(row => row.id === "expense-home")!.amountMinor, 10001);
  const reversed = saveTransaction(changed, draft, "expense-home", { id: "expense-home", type: "income" });
  assert.equal(reversed.incomes.some(row => row.id === "expense-home"), false);
  assert.equal(reversed.expenses.filter(row => row.id === "expense-home").length, 1);
  assert.equal(data.expenses.find(row => row.id === "expense-home")!.amountMinor, 100000);
});
test("missing operations and duplicate destination IDs reject instead of overwriting", () => {
  const data = createDemoLedger();
  assert.throws(() => saveTransaction(data, draft, "expense-home"));
  assert.throws(() => saveTransaction(data, draft, "missing", { id: "missing", type: "expense" }));
  assert.throws(() => deleteTransaction(data, { id: "missing", type: "expense" }));
  const sameId = saveTransaction(data, { ...draft, type: "income" }, "expense-home");
  assert.throws(() => saveTransaction(sameId, { ...draft, type: "income" }, "expense-home", { id: "expense-home", type: "expense" }));
  assert.equal(deleteTransaction(sameId, { id: "expense-home", type: "income" }).expenses.length, data.expenses.length);
});
test("deleting incomes and expenses removes only the requested record", () => {
  const data = createDemoLedger();
  const noExpense = deleteTransaction(data, { id: "expense-home", type: "expense" });
  const noIncome = deleteTransaction(noExpense, { id: "income-sep", type: "income" });
  assert.equal(noIncome.expenses.length, data.expenses.length - 1);
  assert.equal(noIncome.incomes.length, data.incomes.length - 1);
  assert.equal(periodTotals(noIncome, monthPeriod("2026-09")).incomeMinor, 25000);
});
test("categories add/rename/archive/restore without breaking history", () => {
  const data = createDemoLedger();
  const added = saveCategory(data, "  Здоровье  ", "health");
  assert.equal(added.categories.at(-1)!.name, "Здоровье");
  const renamed = saveCategory(added, "Питание", "food", true);
  const archived = setCategoryArchived(renamed, "food", true);
  assert.equal(archived.expenses[0].categoryId, "food");
  assert.throws(() => saveTransaction(archived, draft, "new"), hasField("categoryId"));
  const editedHistory = saveTransaction(archived, draft, "expense-aug", { id: "expense-aug", type: "expense" });
  assert.equal(editedHistory.expenses.find(row => row.id === "expense-aug")!.amountMinor, 1234);
  assert.doesNotThrow(() => saveTransaction(setCategoryArchived(archived, "food", false), draft, "new"));
  assert.equal(data.categories[0].archived, false);
});
test("category names reject blanks, long names and case-insensitive duplicates including archive", () => {
  const data = setCategoryArchived(createDemoLedger(), "food", true);
  for (const name of [" ", "x".repeat(81), " продукты "]) assert.throws(() => saveCategory(data, name, "new"), hasField("name"));
  assert.throws(() => saveCategory(data, "Новое", "unknown", true));
});
test("budgets upsert by month, preserve existing ID, accept zero and reject invalid input", () => {
  const data = createDemoLedger();
  const updated = saveBudget(data, "2026-09", "2000,25", "ignored");
  assert.equal(updated.budgets.length, 1); assert.equal(updated.budgets[0].id, "budget-sep");
  assert.equal(updated.budgets[0].amountMinor, 200025);
  const added = saveBudget(updated, "2026-10", "0", "oct");
  assert.equal(added.budgets.length, 2); assert.equal(added.budgets[1].amountMinor, 0);
  assert.throws(() => saveBudget(data, "2026-13", "10", "x"), hasField("month"));
  assert.throws(() => saveBudget(data, "2026-09", "-1", "x"), hasField("amount"));
});
test("all CRUD commands persist through unchanged repository and reload", async () => {
  let raw: string | null = null;
  const storage = { getItem: () => raw, setItem: (_key: string, value: string) => { raw = value; } };
  const repo = new LocalStorageRepository(storage);
  let saved = await repo.save(createDemoLedger(), null);
  const changes = [
    (data: ReturnType<typeof createDemoLedger>) => saveCategory(data, "Подарки", "gifts"),
    (data: ReturnType<typeof createDemoLedger>) => saveTransaction(data, { ...draft, categoryId: "gifts" }, "gift"),
    (data: ReturnType<typeof createDemoLedger>) => saveTransaction(data, { ...draft, amount: "25.00", categoryId: "gifts" }, "gift", { id: "gift", type: "expense" }),
    (data: ReturnType<typeof createDemoLedger>) => saveBudget(data, "2026-11", "999.99", "nov"),
    (data: ReturnType<typeof createDemoLedger>) => deleteTransaction(data, { id: "income-aug", type: "income" }),
  ];
  for (const change of changes) saved = await repo.save(change(saved.ledger), saved.revision);
  assert.deepEqual(await new LocalStorageRepository(storage).load(), saved);
  assert.equal(saved.revision, 6);
});
test("list sorting and exact dollar formatting round-trip", () => {
  const data = createDemoLedger(); const before = structuredClone(data);
  const list = listTransactions(data);
  assert.equal(list.length, data.incomes.length + data.expenses.length);
  assert.equal(list[0].date, "2026-10-01");
  assert.deepEqual(data, before);
  for (const cents of [0, 1, 10, 1234, Number.MAX_SAFE_INTEGER]) assert.equal(parseAmount(amountToInput(cents), true), cents);
});
