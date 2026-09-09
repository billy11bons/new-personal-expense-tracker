import { createDemoLedger } from "./demo";
import { RepositoryError, type LedgerRepository, type StoredLedger } from "./repository";

export async function initializeLedger(repository: LedgerRepository): Promise<StoredLedger> {
  const existing = await repository.load();
  if (existing) return existing;
  try { return await repository.save(createDemoLedger(), null); }
  catch (error) {
    // React Strict Mode or another caller may have completed initialization first.
    if (error instanceof RepositoryError && error.code === "conflict") {
      const initialized = await repository.load();
      if (initialized) return initialized;
    }
    throw error;
  }
}
