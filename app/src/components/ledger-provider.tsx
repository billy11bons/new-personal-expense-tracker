"use client";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import type { Ledger } from "@/domain/types";
import { createBrowserRepository } from "@/data/browser";
import { initializeLedger } from "@/data/initialize";
import type { LedgerRepository, StoredLedger } from "@/data/repository";
interface LedgerContextValue {
  ledger: Ledger | null; loading: boolean; saving: boolean; error: string;
  reload: () => Promise<void>;
  commit: (change: (ledger: Ledger) => Ledger) => Promise<void>;
}
const LedgerContext = createContext<LedgerContextValue | null>(null);
export function LedgerProvider({ children }: { children: React.ReactNode }) {
  const repository = useRef<LedgerRepository | null>(null);
  const current = useRef<StoredLedger | null>(null);
  const locked = useRef(false);
  const [ledger, setLedger] = useState<Ledger | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const reload = useCallback(async () => {
    if (locked.current) return;
    locked.current = true; setLoading(true); setError("");
    try {
      repository.current ??= createBrowserRepository();
      const loaded = await initializeLedger(repository.current);
      current.current = loaded; setLedger(loaded.ledger);
    } catch (error) { setError(error instanceof Error ? error.message : "Не удалось прочитать данные."); }
    finally { locked.current = false; setLoading(false); }
  }, []);
  useEffect(() => { void reload(); }, [reload]);
  const commit = useCallback(async (change: (ledger: Ledger) => Ledger) => {
    if (locked.current) throw new Error("Дождитесь завершения текущего сохранения.");
    if (!current.current || !repository.current) throw new Error("Данные ещё не загружены.");
    const next = change(current.current.ledger);
    locked.current = true; setSaving(true); setError("");
    try {
      const saved = await repository.current.save(next, current.current.revision);
      current.current = saved; setLedger(saved.ledger);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Не удалось сохранить данные."); throw error;
    } finally { locked.current = false; setSaving(false); }
  }, []);
  return <LedgerContext.Provider value={{ ledger, loading, saving, error, reload, commit }}>{children}</LedgerContext.Provider>;
}
export function useLedger() {
  const context = useContext(LedgerContext);
  if (!context) throw new Error("LedgerProvider is required");
  return context;
}
