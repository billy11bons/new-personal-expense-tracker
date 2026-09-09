"use client";
import { useState } from "react";
import { deleteTransaction } from "@/domain/commands";
import { listTransactions, type TransactionItem } from "@/domain/transactions";
import { useLedger } from "./ledger-provider";
import { TransactionForm } from "./transaction-form";
import { ConfirmDelete } from "./confirm-delete";
import { dollars, displayDate } from "./display";
export function TransactionsScreen() {
  const { ledger, saving, commit } = useLedger();
  const [editor, setEditor] = useState<TransactionItem | "new" | null>(null);
  const [pendingDelete, setPendingDelete] = useState<TransactionItem | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const [notice, setNotice] = useState("");
  if (!ledger) return null;
  const rows = listTransactions(ledger);
  return <>
    <div className="section-heading"><h2>Операции</h2><button className="primary" type="button" disabled={saving || editor !== null} onClick={() => { setNotice(""); setEditor("new"); }}>Добавить операцию</button></div>
    {notice && <p role="status" className="success">{notice}</p>}
    {editor && <TransactionForm key={editor === "new" ? "new" : `${editor.type}:${editor.id}`} original={editor === "new" ? undefined : editor} onDone={() => { setEditor(null); setNotice("Операция сохранена."); }} onCancel={() => setEditor(null)} />}
    {rows.length === 0 ? <p className="panel">Операций пока нет. Добавьте первый доход или расход.</p> : <ul className="record-list" aria-label="Список операций">{rows.map(row => <li className="panel record" key={`${row.type}:${row.id}`}>
      <div className="record-info"><div className="record-heading"><strong>{row.note || "Без описания"}</strong><span className={row.type === "income" ? "income" : "expense"}>{row.type === "income" ? "+" : "−"}{dollars(row.amountMinor)}</span></div>
        <p className="muted">{row.type === "income" ? "Доход" : "Расход"} · <time dateTime={row.date}>{displayDate(row.date)}</time>{row.categoryId && ` · ${ledger.categories.find(category => category.id === row.categoryId)?.name}`}</p></div>
      <div className="actions"><button type="button" disabled={saving || editor !== null} onClick={() => { setNotice(""); setEditor(row); window.scrollTo({ top: 0, behavior: "smooth" }); }}>Редактировать</button>
        <button type="button" className="danger-outline" disabled={saving || editor !== null} onClick={() => { setDeleteError(""); setPendingDelete(row); }}>Удалить</button></div>
    </li>)}</ul>}
    {pendingDelete && <ConfirmDelete description={`${pendingDelete.type === "income" ? "Доход" : "Расход"}: ${dollars(pendingDelete.amountMinor)}, ${displayDate(pendingDelete.date)}. ${pendingDelete.note || "Без описания"}`} busy={saving} error={deleteError} onCancel={() => setPendingDelete(null)} onConfirm={async () => {
      setDeleteError("");
      try { await commit(data => deleteTransaction(data, pendingDelete)); setPendingDelete(null); setNotice("Операция удалена."); }
      catch (error) { setDeleteError(error instanceof Error ? error.message : "Не удалось удалить операцию."); }
    }} />}
  </>;
}
