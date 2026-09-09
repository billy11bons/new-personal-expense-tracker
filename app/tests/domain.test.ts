import test from "node:test";
import assert from "node:assert/strict";
import { createDemoLedger } from "../src/data/demo";
import { monthlyBudget, periodTotals } from "../src/domain/calculations";
import { ValidationError } from "../src/domain/errors";
import { assertAmountMinor, parseAmount, sumMinor } from "../src/domain/money";
import { assertDate, dateRange, isInPeriod, monthPeriod, weekPeriod } from "../src/domain/periods";
import { assertLedger, validateNewExpense } from "../src/domain/validation";

test("decimal input is exact, including comma and one decimal digit", () => {
  assert.equal(parseAmount("0.10") + parseAmount("0.20"), 30);
  assert.equal(parseAmount(" 12,3 "), 1230);
  assert.equal(parseAmount("001.01"), 101);
  assert.equal(parseAmount("0", true), 0);
});

test("invalid money and unsafe integers are rejected", () => {
  for (const amount of ["", "-1", "0", "1.001", "1e3", "NaN", "Infinity", "1 000", ".5", "1.", "90071992547409.92"]) {
    assert.throws(() => parseAmount(amount), ValidationError, amount);
  }
  for (const amount of [NaN, Infinity, -1, 0, 1.1, "100", Number.MAX_SAFE_INTEGER + 1]) {
    assert.throws(() => assertAmountMinor(amount), ValidationError);
  }
  assert.throws(() => sumMinor([Number.MAX_SAFE_INTEGER, 1]), ValidationError);
});

test("calendar validation rejects rollover dates and accepts leap days", () => {
  for (const date of ["2024-02-29", "2000-02-29", "0001-01-01", "9999-12-31"]) assert.doesNotThrow(() => assertDate(date));
  for (const date of ["1900-02-29", "2026-02-29", "2026-04-31", "2026-00-01", "2026-13-01", "2026-09-00", "0000-01-01", "2026-9-1", "2026-09-01T00:00:00Z"]) {
    assert.throws(() => assertDate(date), ValidationError, date);
  }
});

test("month boundaries cover leap years and short and long months", () => {
  assert.deepEqual(monthPeriod("2024-02"), { start: "2024-02-01", end: "2024-02-29" });
  assert.equal(monthPeriod("1900-02").end, "1900-02-28");
  assert.equal(monthPeriod("2026-04").end, "2026-04-30");
  assert.equal(monthPeriod("2026-12").end, "2026-12-31");
  assert.throws(() => monthPeriod("2026-13"), ValidationError);
});

test("weeks run Monday to Sunday across month and year boundaries", () => {
  assert.deepEqual(weekPeriod("2026-09-06"), { start: "2026-08-31", end: "2026-09-06" });
  assert.deepEqual(weekPeriod("2026-09-07"), { start: "2026-09-07", end: "2026-09-13" });
  assert.deepEqual(weekPeriod("2026-01-01"), { start: "2025-12-29", end: "2026-01-04" });
  assert.deepEqual(weekPeriod("2024-02-29"), { start: "2024-02-26", end: "2024-03-03" });
  assert.throws(() => weekPeriod("9999-12-31"), ValidationError);
});

test("calendar periods are unchanged by timezone and daylight saving", () => {
  const original = process.env.TZ;
  try {
    for (const zone of ["UTC", "America/New_York", "Pacific/Kiritimati", "Pacific/Honolulu"]) {
      process.env.TZ = zone;
      assert.deepEqual(weekPeriod("2026-03-08"), { start: "2026-03-02", end: "2026-03-08" });
      assert.deepEqual(weekPeriod("2026-11-01"), { start: "2026-10-26", end: "2026-11-01" });
    }
  } finally { if (original === undefined) delete process.env.TZ; else process.env.TZ = original; }
});

test("date ranges include both endpoints and allow a single day", () => {
  const range = dateRange("2026-09-01", "2026-09-30");
  for (const date of [range.start, range.end]) assert.equal(isInPeriod(date, range), true);
  for (const date of ["2026-08-31", "2026-10-01"]) assert.equal(isInPeriod(date, range), false);
  assert.equal(isInPeriod("2026-09-01", dateRange("2026-09-01", "2026-09-01")), true);
  assert.throws(() => dateRange(range.end, range.start), ValidationError);
});

test("demo data are valid, deterministic and independently allocated", () => {
  const first = createDemoLedger();
  const second = createDemoLedger();
  assertLedger(first); assert.deepEqual(first, second);
  first.expenses[0].amountMinor = 7;
  assert.equal(second.expenses[0].amountMinor, 1000);
});

test("September income, expenses, cash balance and budget reconcile independently", () => {
  const data = createDemoLedger();
  assert.deepEqual(periodTotals(data, monthPeriod("2026-09")), { incomeMinor: 325000, expenseMinor: 106820, balanceMinor: 218180 });
  assert.deepEqual(monthlyBudget(data, "2026-09"), { budgetMinor: 150000, expenseMinor: 106820, remainingMinor: 43180 });
});

test("weekly totals include previous month and exclude the next Monday", () => {
  assert.deepEqual(periodTotals(createDemoLedger(), weekPeriod("2026-09-06")), { incomeMinor: 310000, expenseMinor: 105550, balanceMinor: 204450 });
});

test("empty periods, missing budget, zero budget and overspend remain distinct", () => {
  const data = createDemoLedger();
  assert.deepEqual(periodTotals(data, monthPeriod("2027-01")), { incomeMinor: 0, expenseMinor: 0, balanceMinor: 0 });
  assert.deepEqual(monthlyBudget(data, "2026-10"), { budgetMinor: null, expenseMinor: 500, remainingMinor: null });
  data.budgets[0].amountMinor = 0;
  assert.equal(monthlyBudget(data, "2026-09").remainingMinor, -106820);
  data.budgets[0].amountMinor = 100000;
  assert.equal(monthlyBudget(data, "2026-09").remainingMinor, -6820);
});

test("editing and deleting source records recomputes totals without cached values", () => {
  const data = createDemoLedger();
  data.expenses.find(row => row.id === "expense-food")!.amountMinor = 5550;
  assert.equal(monthlyBudget(data, "2026-09").remainingMinor, 42180);
  data.expenses = data.expenses.filter(row => row.id !== "expense-home");
  assert.equal(periodTotals(data, monthPeriod("2026-09")).expenseMinor, 7820);
  data.incomes = [];
  assert.equal(periodTotals(data, monthPeriod("2026-09")).balanceMinor, -7820);
});

test("invalid persisted shapes, owners, categories, duplicates and budgets are rejected", () => {
  for (const invalid of [null, [], {}, { ...createDemoLedger(), incomes: null }]) assert.throws(() => assertLedger(invalid), ValidationError);
  const mutations = [
    (data: ReturnType<typeof createDemoLedger>) => { data.expenses[0].categoryId = "missing"; },
    (data: ReturnType<typeof createDemoLedger>) => { data.incomes[0].userId = "other-user"; },
    (data: ReturnType<typeof createDemoLedger>) => { data.expenses[0].amountMinor = -100; },
    (data: ReturnType<typeof createDemoLedger>) => { data.expenses[0].date = "2026-02-30"; },
    (data: ReturnType<typeof createDemoLedger>) => { data.categories[0].name = " "; },
    (data: ReturnType<typeof createDemoLedger>) => { data.incomes.push({ ...data.incomes[0] }); },
    (data: ReturnType<typeof createDemoLedger>) => { data.budgets.push({ ...data.budgets[0], id: "duplicate-month" }); },
  ];
  for (const mutate of mutations) { const data = createDemoLedger(); mutate(data); assert.throws(() => assertLedger(data), ValidationError); }
});

test("archived categories preserve history but reject new expenses", () => {
  const data = createDemoLedger();
  assert.doesNotThrow(() => validateNewExpense(data.expenses[0], data.categories));
  data.categories[0].archived = true;
  assert.doesNotThrow(() => assertLedger(data));
  assert.throws(() => validateNewExpense(data.expenses[0], data.categories), ValidationError);
  assert.throws(() => validateNewExpense({ ...data.expenses[0], categoryId: "missing" }, data.categories), ValidationError);
});
