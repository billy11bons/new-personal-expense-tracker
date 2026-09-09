import { LocalStorageRepository } from "./local-storage-repository";
import { RepositoryError, type LedgerRepository } from "./repository";

/** Composition root. Replace this factory when adding another persistence adapter. */
export function createBrowserRepository(): LedgerRepository {
  try { return new LocalStorageRepository(window.localStorage); }
  catch (cause) { throw new RepositoryError("unavailable", "Разрешите локальное хранение в браузере и перезагрузите страницу.", { cause }); }
}
