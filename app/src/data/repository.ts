import type { Ledger } from "../domain/types";

export interface StoredLedger { revision: number; ledger: Ledger }

/** An async port; no browser or Supabase types escape into its callers. */
export interface LedgerRepository {
  load(): Promise<StoredLedger | null>;
  /** null means create only if absent; otherwise reject a stale revision. */
  save(ledger: Ledger, expectedRevision: number | null): Promise<StoredLedger>;
}

export class RepositoryError extends Error {
  constructor(public readonly code: "unavailable" | "corrupt" | "version" | "conflict", message: string, options?: ErrorOptions) {
    super(message, options); this.name = "RepositoryError";
  }
}
