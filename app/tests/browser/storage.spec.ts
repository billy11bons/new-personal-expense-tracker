import { test, expect, chromium, type BrowserContext, type Page } from "@playwright/test";
import { spawn, type ChildProcess } from "node:child_process";
import { once } from "node:events";
import { mkdir, mkdtemp } from "node:fs/promises";
import path from "node:path";
import { createDemoLedger } from "../../src/data/demo";
import { STORAGE_KEY, SCHEMA_VERSION } from "../../src/data/local-storage-repository";

const port = 3212;
const url = `http://127.0.0.1:${port}`;
let server: ChildProcess | undefined;
let serverLog = "";

async function startServer() {
  // Own the server so the persistence test can perform a real process restart.
  server = spawn(process.execPath, [path.resolve("node_modules/next/dist/bin/next"), "start", "--hostname", "127.0.0.1", "--port", String(port)], {
    cwd: process.cwd(), windowsHide: true, stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" },
  });
  serverLog = "";
  server.stdout!.on("data", chunk => { serverLog += String(chunk); });
  server.stderr!.on("data", chunk => { serverLog += String(chunk); });
  server.on("error", error => { serverLog += error.message; });
  await expect.poll(async () => {
    if (server!.exitCode !== null) throw new Error(`Server stopped: ${serverLog}`);
    try { return (await fetch(url)).status; } catch { return 0; }
  }, { timeout: 30000, message: "Production server must start on dedicated port 3212" }).toBe(200);
}

async function stopServer() {
  if (server && server.exitCode === null) {
    const exited = once(server, "exit");
    server.kill();
    await exited;
  }
  server = undefined;
}

async function openProfile(profile: string): Promise<BrowserContext> {
  return chromium.launchPersistentContext(profile, {
    channel: process.env.PLAYWRIGHT_CHANNEL || "msedge", headless: true,
    viewport: { width: 390, height: 844 },
  });
}

test.beforeAll(startServer);
test.afterAll(stopServer);

async function persistenceStep<T>(name: string, action: () => Promise<T>): Promise<T> {
  return test.step(name, async () => {
    const started = Date.now();
    console.info(`[persistence] START ${name}`);
    try { return await action(); }
    finally { console.info(`[persistence] END ${name}: ${Date.now() - started} ms`); }
  });
}

test("data survive reload, browser close/reopen and production server restart", async () => {
  const root = path.resolve("test-results");
  await mkdir(root, { recursive: true });
  const profile = await mkdtemp(path.join(root, "persistent-profile-"));
  let context = await persistenceStep("open browser profile", () => openProfile(profile));
  try {
    let page = context.pages()[0];
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    await persistenceStep("initial navigation", () => page.goto(url));
    await expect(page.getByRole("heading", { name: "Smart Expense Tracker" })).toBeVisible();
    await persistenceStep("initial storage readiness", () => expect(page.getByRole("status")).toHaveText("Local data is ready."));
    const initial = await persistenceStep("read initial localStorage", () => page.evaluate(key => localStorage.getItem(key), STORAGE_KEY));
    expect(JSON.parse(initial!)).toEqual({ schemaVersion: SCHEMA_VERSION, revision: 1, ledger: createDemoLedger() });
    // Keep the Stage 2 regression probe; additional tests below exercise actual forms.
    const changed = JSON.parse(initial!);
    changed.ledger.incomes[0].note = "Persistence probe: preserve this record";
    changed.revision = 2;
    const saved = JSON.stringify(changed);
    await page.evaluate(({ key, raw }) => localStorage.setItem(key, raw), { key: STORAGE_KEY, raw: saved });
    await persistenceStep("reload", () => page.reload());
    await persistenceStep("storage readiness after reload", () => expect(page.getByRole("status")).toHaveText("Local data is ready."));
    expect(await page.evaluate(key => localStorage.getItem(key), STORAGE_KEY)).toBe(saved);
    expect(errors).toEqual([]);
    await persistenceStep("close browser context", () => context.close());
    await persistenceStep("stop production server", stopServer);
    await persistenceStep("restart production server and HTTP readiness", startServer);
    context = await persistenceStep("reopen browser profile", () => openProfile(profile));
    page = context.pages()[0];
    page.on("pageerror", error => errors.push(error.message));
    await persistenceStep("navigation after restart", () => page.goto(url));
    await persistenceStep("storage readiness after restart", () => expect(page.getByRole("status")).toHaveText("Local data is ready."));
    expect(await persistenceStep("read localStorage after restart", () => page.evaluate(key => localStorage.getItem(key), STORAGE_KEY))).toBe(saved);
    expect(errors).toEqual([]);
  } finally { await persistenceStep("final browser cleanup", () => context.close()); }
});

for (const [label, raw] of [
  ["corrupt JSON", "{broken"],
  ["unsupported version", JSON.stringify({ schemaVersion: 999, revision: 1, ledger: createDemoLedger() })],
] as const) {
  test(`${label} produces an error and preserves the original record`, async () => {
    const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || "msedge" });
    try {
      const page = await browser.newPage();
      await page.addInitScript(({ key, value }) => localStorage.setItem(key, value), { key: STORAGE_KEY, value: raw });
      await page.goto(url);
      await expect(page.getByRole("main").getByRole("alert")).toBeVisible();
      expect(await page.evaluate(key => localStorage.getItem(key), STORAGE_KEY)).toBe(raw);
    } finally { await browser.close(); }
  });
}

async function withPage(scenario: (page: Page) => Promise<void>, empty = false, route = "/transactions") {
  const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || "msedge" });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  try {
    if (empty) {
      const ledger = createDemoLedger(); ledger.incomes = []; ledger.expenses = []; ledger.categories = []; ledger.budgets = [];
      await page.addInitScript(({ key, ledger }) => {
        if (localStorage.getItem(key) === null) localStorage.setItem(key, JSON.stringify({ schemaVersion: 1, revision: 1, ledger }));
      }, { key: STORAGE_KEY, ledger });
    }
    await page.goto(`${url}${route}`);
    if (route === "/") {
      await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
    } else if (route === "/transactions") {
      await expect(page.getByRole("button", { name: "Add transaction" })).toBeVisible();
    } else if (route === "/categories") {
      await expect(page.getByRole("heading", { name: "Categories" })).toBeVisible();
    } else if (route === "/budget") {
      await expect(page.getByRole("heading", { name: "Monthly Budget" })).toBeVisible();
    }
    await scenario(page);
    expect(errors).toEqual([]);
  } catch (error) {
    await page.screenshot({ path: test.info().outputPath("failure.png"), fullPage: true });
    throw error;
  } finally { await browser.close(); }
}
async function readLedger(page: Page) {
  return page.evaluate(key => JSON.parse(localStorage.getItem(key)!), STORAGE_KEY) as Promise<{ revision: number; ledger: ReturnType<typeof createDemoLedger> }>;
}
async function fillTransaction(page: Page, type: string, amount: string, note: string) {
  await page.getByRole("button", { name: "Add transaction" }).click();
  await page.locator("#transaction-type").selectOption(type);
  await page.locator("#transaction-amount").fill(amount);
  await page.locator("#transaction-date").fill("2026-09-08");
  if (type === "expense") await page.locator("#transaction-category").selectOption("food");
  await page.locator("#transaction-note").fill(note);
}
const operationRow = (page: Page, note: string) => page.getByRole("list", { name: "Transaction list" }).getByRole("listitem").filter({ hasText: note });

test("forms add both types, edit demo and convert types, cancel and confirm deletion; reload preserves changes", async () => {
  await withPage(async page => {
    await fillTransaction(page, "income", "1234,56", "Test: paycheck");
    await expect(page.locator("#transaction-category")).toHaveCount(0);
    await page.getByRole("button", { name: "Save transaction" }).click();
    await expect(operationRow(page, "Test: paycheck")).toContainText("+$1,234.56");
    expect((await readLedger(page)).ledger.incomes.find(row => row.note === "Test: paycheck")?.amountMinor).toBe(123456);
    await fillTransaction(page, "expense", "12.34", "Test: lunch");
    await page.getByRole("button", { name: "Save transaction" }).click();
    await expect(operationRow(page, "Test: lunch")).toContainText("−$12.34");
    await operationRow(page, "Sample: rent").getByRole("button", { name: "Edit" }).click();
    await expect(page.locator("#transaction-amount")).toHaveValue("1000.00");
    await page.locator("#transaction-amount").fill("950.25");
    await page.getByRole("button", { name: "Save transaction" }).click();
    await expect(operationRow(page, "Sample: rent")).toContainText("$950.25");
    await operationRow(page, "Test: lunch").getByRole("button", { name: "Edit" }).click();
    await page.locator("#transaction-type").selectOption("income");
    await page.getByRole("button", { name: "Save transaction" }).click();
    await expect(operationRow(page, "Test: lunch")).toContainText("+$12.34");
    expect((await readLedger(page)).ledger.expenses.some(row => row.note === "Test: lunch")).toBe(false);
    await operationRow(page, "Test: lunch").getByRole("button", { name: "Delete", exact: true }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toContainText("$12.34");
    await expect(dialog.getByRole("button", { name: "Cancel" })).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(operationRow(page, "Test: lunch")).toBeVisible();
    await operationRow(page, "Test: lunch").getByRole("button", { name: "Delete", exact: true }).click();
    await dialog.getByRole("button", { name: "Confirm deletion" }).click();
    await expect(operationRow(page, "Test: lunch")).toHaveCount(0);
    const saved = await readLedger(page);
    await page.reload();
    await expect(operationRow(page, "Test: paycheck")).toBeVisible();
    await expect(operationRow(page, "Sample: rent")).toContainText("$950.25");
    expect(await readLedger(page)).toEqual(saved);
  });
});

test("form validation rejects amount/date/type/category and keeps draft without writing", async () => {
  await withPage(async page => {
    const initial = await readLedger(page);
    await page.getByRole("button", { name: "Add transaction" }).click();
    await page.locator("#transaction-date").fill("");
    await page.locator("#transaction-amount").fill("-10");
    await page.getByRole("button", { name: "Save transaction" }).click();
    for (const id of ["transaction-amount", "transaction-date", "transaction-category"]) await expect(page.locator(`#${id}`)).toHaveAttribute("aria-invalid", "true");
    await expect(page.locator("#transaction-amount")).toHaveValue("-10");
    await page.locator("#transaction-type").evaluate(select => { select.appendChild(new Option("Invalid", "unknown")); });
    await page.locator("#transaction-type").selectOption("unknown");
    await page.getByRole("button", { name: "Save transaction" }).click();
    await expect(page.locator("#type-error")).toHaveText("Select income or expense.");
    expect(await readLedger(page)).toEqual(initial);
  });
});

test("category add/rename/archive/restore preserves expenses and blocks duplicates", async () => {
  await withPage(async page => {
    await page.getByRole("link", { name: "Categories", exact: true }).click();
    await page.getByRole("button", { name: "Add category" }).click();
    await page.locator("#category-name").fill("Health");
    await page.getByRole("button", { name: "Save category" }).click();
    const categories = page.getByRole("list", { name: "Category list" });
    await expect(categories).toContainText("Health");
    await page.getByRole("button", { name: "Add category" }).click();
    await page.locator("#category-name").fill(" health ");
    await page.getByRole("button", { name: "Save category" }).click();
    await expect(page.locator("#name-error")).toContainText("already exists");
    await page.getByRole("button", { name: "Cancel", exact: true }).click();
    await categories.getByRole("listitem").filter({ hasText: "Groceries" }).getByRole("button", { name: "Rename" }).click();
    await page.locator("#category-name").fill("Food");
    await page.getByRole("button", { name: "Save category" }).click();
    const food = categories.getByRole("listitem").filter({ hasText: "Food" });
    await food.getByRole("button", { name: "Archive", exact: true }).click();
    await expect(food).toContainText("Archived");
    await page.getByRole("link", { name: "Transactions", exact: true }).click();
    await expect(page.getByRole("list", { name: "Transaction list" })).toContainText("Food");
    await page.getByRole("button", { name: "Add transaction" }).click();
    await expect(page.locator('#transaction-category option[value="food"]')).toHaveCount(0);
    await page.getByRole("button", { name: "Cancel", exact: true }).click();
    await page.getByRole("link", { name: "Categories", exact: true }).click();
    await food.getByRole("button", { name: "Restore" }).click();
    await page.reload();
    await expect(food).toContainText("Active");
    expect((await readLedger(page)).ledger.categories.find(row => row.id === "food")?.name).toBe("Food");
    expect((await readLedger(page)).ledger.expenses.length).toBe(6);
  });
});

test("monthly budgets create/update/zero and invalid values persist correctly", async () => {
  await withPage(async page => {
    await page.getByRole("link", { name: "Budget", exact: true }).click();
    await page.getByRole("button", { name: "Open 2026-09" }).click();
    await expect(page.locator("#budget-amount")).toHaveValue("1500.00");
    await page.locator("#budget-amount").fill("2000,50");
    await page.getByRole("button", { name: "Save budget" }).click();
    await expect(page.getByText("Saved budget: $2,000.50", { exact: true })).toBeVisible();
    await page.locator("#budget-month").fill("2026-11");
    await expect(page.getByText("No budget has been set for this month.")).toBeVisible();
    await page.locator("#budget-amount").fill("-1");
    await page.getByRole("button", { name: "Save budget" }).click();
    await expect(page.locator("#budget-amount")).toHaveAttribute("aria-invalid", "true");
    await page.locator("#budget-month").fill("");
    await page.getByRole("button", { name: "Save budget" }).click();
    await expect(page.locator("#budget-month")).toHaveAttribute("aria-invalid", "true");
    await page.locator("#budget-month").fill("2026-11");
    await page.locator("#budget-amount").fill("0");
    await page.getByRole("button", { name: "Save budget" }).click();
    await expect(page.getByText("Saved budget: $0.00", { exact: true })).toBeVisible();
    await page.reload();
    await page.getByRole("button", { name: "Open 2026-11" }).click();
    await expect(page.locator("#budget-amount")).toHaveValue("0.00");
    const budgets = (await readLedger(page)).ledger.budgets;
    expect(budgets).toHaveLength(2); expect(budgets.find(row => row.month === "2026-09")?.amountMinor).toBe(200050);
  });
});

test("empty states stay empty on reload and income needs no category", async () => {
  await withPage(async page => {
    await expect(page.getByText("No transactions yet.", { exact: false })).toBeVisible();
    await page.getByRole("button", { name: "Add transaction" }).click();
    await expect(page.getByText("No active categories.", { exact: false })).toBeVisible();
    await page.getByRole("button", { name: "Cancel", exact: true }).click();
    await page.getByRole("link", { name: "Categories", exact: true }).click();
    await expect(page.getByText("No categories yet.", { exact: false })).toBeVisible();
    await page.getByRole("link", { name: "Budget", exact: true }).click();
    await expect(page.getByText("No budgets yet.")).toBeVisible();
    await page.getByRole("link", { name: "Transactions", exact: true }).click();
    await fillTransaction(page, "income", "1.01", "First income");
    await page.getByRole("button", { name: "Save transaction" }).click();
    await page.reload();
    await expect(operationRow(page, "First income")).toBeVisible();
    const data = (await readLedger(page)).ledger;
    expect(data.incomes).toHaveLength(1); expect(data.expenses).toHaveLength(0); expect(data.categories).toHaveLength(0);
  }, true);
});

test("failed write keeps the draft and saved data; retry succeeds once", async () => {
  await withPage(async page => {
    await fillTransaction(page, "expense", "21.50", "Retry save");
    const before = await readLedger(page);
    await page.evaluate(() => {
      const original = Storage.prototype.setItem;
      Storage.prototype.setItem = function(key, value) {
        Storage.prototype.setItem = original;
        if (key === "case02.personal-expense-tracker") throw new DOMException("Full", "QuotaExceededError");
        return original.call(this, key, value);
      };
    });
    await page.getByRole("button", { name: "Save transaction" }).click();
    await expect(page.getByRole("region", { name: "Storage error" })).toBeVisible();
    await expect(page.locator("#transaction-note")).toHaveValue("Retry save");
    expect(await readLedger(page)).toEqual(before);
    await page.getByRole("button", { name: "Save transaction" }).click();
    await expect(operationRow(page, "Retry save")).toBeVisible();
    expect((await readLedger(page)).ledger.expenses.filter(row => row.note === "Retry save")).toHaveLength(1);
  });
});

test("stale revision rejects overwrite and reload recovers external data", async () => {
  await withPage(async page => {
    await fillTransaction(page, "income", "10", "Stale form");
    await page.evaluate(key => {
      const data = JSON.parse(localStorage.getItem(key)!); data.revision++; data.ledger.incomes[0].note = "External change";
      localStorage.setItem(key, JSON.stringify(data));
    }, STORAGE_KEY);
    const external = await readLedger(page);
    await page.getByRole("button", { name: "Save transaction" }).click();
    await expect(page.getByRole("region", { name: "Storage error" })).toContainText("Data changed");
    expect(await readLedger(page)).toEqual(external);
    await page.getByRole("button", { name: "Reload data" }).click();
    await expect(operationRow(page, "External change")).toBeVisible();
    await expect(page.locator("#transaction-note")).toHaveCount(0);
  });
});

test("dashboard filters, KPI totals, category chart and period modes reconcile in production", async () => {
  await withPage(async page => {
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
    for (const width of [320, 375, 390, 768]) {
      await page.setViewportSize({ width, height: 900 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    }
    await page.setViewportSize({ width: 390, height: 844 });
    // Demo assertions must not depend on the calendar month of the test run.
    await page.locator("#report-month").fill("2026-09");
    const kpis = page.getByRole("region", { name: "Period summary" });
    const comparison = page.getByRole("region", { name: "Key Metrics" });
    const categories = page.getByRole("region", { name: "Expenses by Category" });
    async function expectTotals(income: string, expense: string, categoryAmounts: string[]) {
      await expect(kpis.getByRole("article").nth(0).locator("strong")).toHaveText(income);
      await expect(kpis.getByRole("article").nth(1).locator("strong")).toHaveText(expense);
      await expect(comparison.locator(".bar-row").filter({ hasText: /^Income/ }).locator("strong")).toHaveText(income);
      await expect(comparison.locator(".bar-row").filter({ hasText: /^Expenses/ }).locator("strong")).toHaveText(expense);
      await expect(categories.locator(".bar-row strong")).toHaveText(categoryAmounts);
    }
    await expectTotals("$3,250.00", "$1,068.20", ["$1,000.00", "$65.70", "$2.50"]);
    await expect(kpis.getByText("Remaining: $431.80", { exact: true })).toBeVisible();
    await page.locator("#report-category").selectOption("food");
    await expectTotals("$3,250.00", "$65.70", ["$65.70"]);
    await expect(categories).toContainText("Groceries");
    await page.getByRole("button", { name: "Week" }).click();
    await page.locator("#report-week").fill("2026-09-06");
    await expect(page.getByText("Aug 31, 2026 – Sep 6, 2026", { exact: false })).toBeVisible();
    // Switching period preserves the selected category: food is 10.00 + 45.50.
    await expect(page.locator("#report-category")).toHaveValue("food");
    await expectTotals("$3,100.00", "$55.50", ["$55.50"]);
    // The original 1055.50 expectation belongs to ALL categories (plus 1000 rent).
    await page.locator("#report-category").selectOption("all");
    await expectTotals("$3,100.00", "$1,055.50", ["$1,000.00", "$55.50"]);
    await page.getByRole("button", { name: "Custom range" }).click();
    await page.locator("#report-start").fill("2026-09-01"); await page.locator("#report-end").fill("2026-09-30");
    await expectTotals("$3,250.00", "$1,068.20", ["$1,000.00", "$65.70", "$2.50"]);
    await page.locator("#report-start").fill("2026-10-01"); await page.locator("#report-end").fill("2026-09-01");
    await expect(page.getByRole("main").getByRole("alert")).toHaveText("Check the selected period.");
  }, false, "/");
});

test("mobile forms and navigation fit 320/390/768/1280px without horizontal overflow", async () => {
  await withPage(async page => {
    for (const width of [320, 375, 390, 768, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      await page.getByRole("button", { name: "Add transaction" }).click();
      await expect(page.locator("#transaction-amount")).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      if (width === 320) await page.screenshot({ path: test.info().outputPath("mobile-form-320.png"), fullPage: true });
      await page.getByRole("button", { name: "Cancel", exact: true }).click();
      for (const name of ["Categories", "Budget", "Transactions"]) {
        await page.getByRole("link", { name, exact: true }).click();
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      }
    }
    await page.screenshot({ path: test.info().outputPath("desktop-list-1280.png"), fullPage: true });
  });
});

for (const method of ["getItem", "setItem"] as const) {
  test(`denied ${method} reports failure instead of claiming data are ready`, async () => {
    const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || "msedge" });
    try {
      const page = await browser.newPage();
      await page.addInitScript(operation => {
        Storage.prototype[operation] = () => { throw new DOMException("Blocked for test", "SecurityError"); };
      }, method);
      await page.goto(url);
      await expect(page.getByRole("main").getByRole("alert")).toBeVisible();
      await expect(page.getByText("Local data is ready.")).toHaveCount(0);
    } finally { await browser.close(); }
  });
}

