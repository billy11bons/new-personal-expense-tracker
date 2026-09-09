"use client";
import { useEffect, useRef } from "react";
export function ConfirmDelete({ description, busy, error, onCancel, onConfirm }: {
  description: string; busy: boolean; error: string; onCancel: () => void; onConfirm: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { ref.current?.showModal(); }, []);
  return <dialog ref={ref} aria-labelledby="delete-title" aria-describedby="delete-description" onCancel={event => { event.preventDefault(); if (!busy) onCancel(); }}>
    <h2 id="delete-title">Удалить операцию?</h2><p id="delete-description">{description}</p><p>Восстановить удалённую операцию нельзя.</p>
    {error && <p role="alert" className="field-error">{error}</p>}
    <div className="actions"><button type="button" autoFocus disabled={busy} onClick={onCancel}>Отмена</button>
      <button type="button" className="danger" disabled={busy} onClick={onConfirm}>{busy ? "Удаление…" : "Подтвердить удаление"}</button></div>
  </dialog>;
}
