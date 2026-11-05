"use client";
import { useEffect, useRef } from "react";
export function ConfirmDelete({ description, busy, error, onCancel, onConfirm }: {
  description: string; busy: boolean; error: string; onCancel: () => void; onConfirm: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { ref.current?.showModal(); }, []);
  return <dialog ref={ref} aria-labelledby="delete-title" aria-describedby="delete-description" onCancel={event => { event.preventDefault(); if (!busy) onCancel(); }}>
    <h2 id="delete-title">Delete transaction?</h2><p id="delete-description">{description}</p><p>Deleted transactions cannot be restored.</p>
    {error && <p role="alert" className="field-error">{error}</p>}
    <div className="actions"><button type="button" autoFocus disabled={busy} onClick={onCancel}>Cancel</button>
      <button type="button" className="danger" disabled={busy} onClick={onConfirm}>{busy ? "Deleting…" : "Confirm deletion"}</button></div>
  </dialog>;
}
