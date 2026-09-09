import test from "node:test";
import assert from "node:assert/strict";
import { createDemoLedger } from "../src/data/demo";
import { analyticsSnapshot, filterExpenses, groupExpensesByCategory, monthAnalytics, weekAnalytics } from "../src/domain/analytics";
import { dateRange, monthPeriod } from "../src/domain/periods";

test("date and category filters include both dates and only selected expenses", () => {
  const data = createDemoLedger();
  const period = dateRange("2026-09-01", "2026-09-30");
  assert.equal(filterExpenses(data, period).length, 4);
  assert.deepEqual(filterExpenses(data, period, "food").map(row => row.id), ["expense-food", "expense-month-end"]);
  assert.deepEqual(filterExpenses(data, dateRange("2026-09-01", "2026-09-01")).map(row => row.id), ["expense-home"]);
  assert.equal(filterExpenses(data, period, "missing").length, 0);
});

test("category grouping reconciles to filtered expense total and includes archived history", () => {
  const data = createDemoLedger(); data.categories[0].archived = true;
  const period = monthPeriod("2026-09"); const groups = groupExpensesByCategory(data, period);
  assert.deepEqual(groups.map(row => [row.categoryId, row.amountMinor, row.archived]), [["home", 100000, false], ["food", 6570, true], ["transport", 250, false]]);
  assert.equal(groups.reduce((sum, row) => sum + row.amountMinor, 0), analyticsSnapshot(data, period).expenseMinor);
});

test("month and Monday-based week boundaries share one source of truth", () => {
  const data = createDemoLedger();
  assert.deepEqual(monthAnalytics(data, "2026-09"), { ...analyticsSnapshot(data, monthPeriod("2026-09")) });
  assert.equal(weekAnalytics(data, "2026-09-06").expenseMinor, 105550);
  assert.equal(weekAnalytics(data, "2026-09-06").period.start, "2026-08-31");
  assert.equal(weekAnalytics(data, "2026-09-06").period.end, "2026-09-06");
  assert.equal(weekAnalytics(data, "2026-09-07").expenseMinor, 250);
});

test("empty data, zero budget and overspend remain explicit", () => {
  const data = createDemoLedger(); data.incomes = []; data.expenses = []; data.categories = []; data.budgets = [{ ...data.budgets[0], amountMinor: 0 }];
  const empty = analyticsSnapshot(data, monthPeriod("2026-09"));
  assert.equal(empty.incomeMinor, 0); assert.equal(empty.expenseMinor, 0); assert.equal(empty.budgetMinor, 0); assert.equal(empty.remainingBudgetMinor, 0); assert.deepEqual(empty.categoryTotals, []);
  data.expenses = [{ id: "overspend", userId: data.user.id, date: "2026-09-15", amountMinor: 1, categoryId: "food", note: "" }]; data.categories = [{ id: "food", userId: data.user.id, name: "Продукты", archived: false }];
  const overspend = analyticsSnapshot(data, monthPeriod("2026-09")); assert.equal(overspend.remainingBudgetMinor, -1);
  assert.equal(analyticsSnapshot(createDemoLedger(), monthPeriod("2027-01")).budgetMinor, null);
});

test("dashboard, report and chart totals use identical filtered aggregates", () => {
  const data = createDemoLedger(); const period = dateRange("2026-09-01", "2026-09-30"); const dashboard = analyticsSnapshot(data, period, "food"); const report = groupExpensesByCategory(data, period, "food"); const chartTotal = report.reduce((sum, row) => sum + row.amountMinor, 0);
  assert.equal(dashboard.expenseMinor, chartTotal); assert.equal(dashboard.expenseMinor, 6570); assert.equal(dashboard.balanceMinor, 325000 - 6570);
});
