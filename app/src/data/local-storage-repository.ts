import { assertLedger } from "../domain/validation";
import type { Ledger } from "../domain/types";
import { RepositoryError, type LedgerRepository, type StoredLedger } from "./repository";

export const STORAGE_KEY = "case02.personal-expense-tracker";
export const SCHEMA_VERSION = 1;
export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export class LocalStorageRepository implements LedgerRepository {
  constructor(private readonly storage: KeyValueStorage) {}

  private read(): StoredLedger | null {
    let raw: string | null;
    try { raw = this.storage.getItem(STORAGE_KEY); }
    catch (cause) { throw new RepositoryError("unavailable", "Локальное хранилище недоступно.", { cause }); }
    if (raw === null) return null;
    try {
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("Invalid envelope");
      if (parsed.schemaVersion !== SCHEMA_VERSION) throw new RepositoryError("version", "Версия сохранённых данных не поддерживается. Данные не изменены.");
      if (!Number.isSafeInteger(parsed.revision) || parsed.revision < 1) throw new Error("Invalid revision");
      assertLedger(parsed.ledger);
      return { revision: parsed.revision, ledger: parsed.ledger };
    } catch (cause) {
      if (cause instanceof RepositoryError) throw cause;
      throw new RepositoryError("corrupt", "Не удалось прочитать сохранённые данные. Исходная запись не изменена.", { cause });
    }
  }

  async load(): Promise<StoredLedger | null> { return this.read(); }

  async save(ledger: Ledger, expectedRevision: number | null): Promise<StoredLedger> {
    assertLedger(ledger);
    // No await between read and write: sequential calls in one tab cannot race.
    const current = this.read();
    if ((current?.revision ?? null) !== expectedRevision) throw new RepositoryError("conflict", "Данные изменились. Загрузите актуальную версию перед сохранением.");
    const revision = (current?.revision ?? 0) + 1;
    if (!Number.isSafeInteger(revision)) throw new RepositoryError("version", "Достигнут предел версии записи.");
    const serialized = JSON.stringify({ schemaVersion: SCHEMA_VERSION, revision, ledger });
    try { this.storage.setItem(STORAGE_KEY, serialized); }
    catch (cause) { throw new RepositoryError("unavailable", "Не удалось сохранить данные: хранилище недоступно или заполнено.", { cause }); }
    return { revision, ledger: JSON.parse(serialized).ledger };
  }
}
