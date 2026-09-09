import test from "node:test";
import assert from "node:assert/strict";
import { createDemoLedger } from "../src/data/demo";
import { initializeLedger } from "../src/data/initialize";
import { LocalStorageRepository, STORAGE_KEY, SCHEMA_VERSION, type KeyValueStorage } from "../src/data/local-storage-repository";
import { RepositoryError } from "../src/data/repository";
import { ValidationError } from "../src/domain/errors";

class MemoryStorage implements KeyValueStorage {
  values = new Map<string, string>();
  writes = 0;
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.writes++; this.values.set(key, value); }
}
const hasCode = (code: RepositoryError["code"]) => (error: unknown) => error instanceof RepositoryError && error.code === code;

test("initialization persists demo only once, including concurrent callers", async () => {
  const storage = new MemoryStorage();
  const repository = new LocalStorageRepository(storage);
  const [first, second] = await Promise.all([initializeLedger(repository), initializeLedger(repository)]);
  assert.deepEqual(first, second); assert.equal(storage.writes, 1);
  await initializeLedger(repository); assert.equal(storage.writes, 1);
});

test("save and new adapter instance restore changed data rather than seed", async () => {
  const storage = new MemoryStorage();
  const first = new LocalStorageRepository(storage);
  const initial = await initializeLedger(first);
  initial.ledger.incomes[0].amountMinor = 12345;
  initial.ledger.expenses = [];
  const saved = await first.save(initial.ledger, initial.revision);
  assert.equal(saved.revision, 2);
  const reopened = await initializeLedger(new LocalStorageRepository(storage));
  assert.deepEqual(reopened, saved); assert.equal(storage.writes, 2);
  saved.ledger.incomes[0].amountMinor = 1;
  assert.equal((await first.load())!.ledger.incomes[0].amountMinor, 12345);
});

test("empty user dataset is not treated as missing storage", async () => {
  const storage = new MemoryStorage();
  const repository = new LocalStorageRepository(storage);
  const data = createDemoLedger(); data.incomes = []; data.expenses = []; data.budgets = []; data.categories = [];
  await repository.save(data, null);
  assert.deepEqual((await initializeLedger(repository)).ledger, data);
  assert.equal(storage.writes, 1);
});

test("stale revisions cannot overwrite newer data", async () => {
  const storage = new MemoryStorage();
  const first = new LocalStorageRepository(storage);
  const second = new LocalStorageRepository(storage);
  const data = await initializeLedger(first);
  await first.save(data.ledger, 1);
  await assert.rejects(second.save(data.ledger, 1), hasCode("conflict"));
  await assert.rejects(second.save(data.ledger, null), hasCode("conflict"));
  assert.equal((await second.load())!.revision, 2);
});

test("corrupt JSON, invalid data and invalid revisions survive failed initialization", async () => {
  for (const raw of ["{broken", "null", "[]", JSON.stringify({ schemaVersion: SCHEMA_VERSION, revision: 1, ledger: {} }), JSON.stringify({ schemaVersion: SCHEMA_VERSION, revision: 0, ledger: createDemoLedger() })]) {
    const storage = new MemoryStorage(); storage.values.set(STORAGE_KEY, raw);
    const repository = new LocalStorageRepository(storage);
    await assert.rejects(initializeLedger(repository), hasCode("corrupt"));
    await assert.rejects(repository.save(createDemoLedger(), null), hasCode("corrupt"));
    assert.equal(storage.getItem(STORAGE_KEY), raw); assert.equal(storage.writes, 0);
  }
});

test("unknown schema version is rejected without migration or overwrite", async () => {
  const storage = new MemoryStorage();
  const raw = JSON.stringify({ schemaVersion: 999, revision: 1, ledger: createDemoLedger() });
  storage.values.set(STORAGE_KEY, raw);
  await assert.rejects(initializeLedger(new LocalStorageRepository(storage)), hasCode("version"));
  assert.equal(storage.getItem(STORAGE_KEY), raw);
});

test("read denial and quota exhaustion return actionable errors", async () => {
  const denied = new LocalStorageRepository({ getItem() { throw new Error("SecurityError"); }, setItem() { assert.fail("must not write"); } });
  await assert.rejects(initializeLedger(denied), hasCode("unavailable"));
  const storage = new MemoryStorage();
  const repository = new LocalStorageRepository(storage);
  const saved = await initializeLedger(repository);
  const before = storage.getItem(STORAGE_KEY);
  storage.setItem = () => { throw new Error("QuotaExceededError"); };
  saved.ledger.expenses = [];
  await assert.rejects(repository.save(saved.ledger, saved.revision), hasCode("unavailable"));
  assert.equal(storage.getItem(STORAGE_KEY), before);
});

test("invalid input never reaches persistence", async () => {
  const storage = new MemoryStorage();
  const data = createDemoLedger(); data.expenses[0].amountMinor = 0;
  await assert.rejects(new LocalStorageRepository(storage).save(data, null), ValidationError);
  assert.equal(storage.writes, 0);
});
