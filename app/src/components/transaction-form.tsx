"use client";
import { useState } from "react";
import Link from "next/link";
import { saveTransaction, type TransactionDraft } from "@/domain/commands";
import type { TransactionItem } from "@/domain/transactions";
import { amountToInput } from "@/domain/money";
import { useLedger } from "./ledger-provider";
import { FieldError, errorsFrom, noErrors } from "./form-feedback";
import { today } from "./display";
export function TransactionForm({ original, onDone, onCancel }: { original?: TransactionItem; onDone: () => void; onCancel: () => void }) {
  const { ledger, saving, commit } = useLedger();
  const [draft, setDraft] = useState<TransactionDraft>(() => original
    ? { type: original.type, date: original.date, amount: amountToInput(original.amountMinor), categoryId: original.categoryId ?? "", note: original.note }
    : { type: "expense", date: today(), amount: "", categoryId: "", note: "" });
  const [errors, setErrors] = useState(noErrors);
  const [id] = useState(() => original?.id ?? crypto.randomUUID());
  if (!ledger) return null;
  const categories = ledger.categories.filter(row => !row.archived || (original?.type === "expense" && original.categoryId === row.id));
  const set = (field: keyof TransactionDraft, value: string) => setDraft(current => ({ ...current, [field]: value }));
  return <section className="panel" aria-labelledby="transaction-form-title">
    <h3 id="transaction-form-title">{original ? "Edit Transaction" : "New Transaction"}</h3>
    <form noValidate onSubmit={async event => {
      event.preventDefault(); setErrors(noErrors);
      try { await commit(data => saveTransaction(data, draft, id, original)); onDone(); }
      catch (error) { setErrors(errorsFrom(error)); }
    }}>
      {errors.message && <p role="alert" className="field-error">{errors.message}</p>}
      <fieldset disabled={saving}><div className="form-grid">
        <label htmlFor="transaction-type">Transaction type<select id="transaction-type" value={draft.type} onChange={event => set("type", event.target.value)} aria-invalid={!!errors.fields.type} aria-describedby={errors.fields.type ? "type-error" : undefined}>
          <option value="expense">Expense</option><option value="income">Income</option></select><FieldError id="type-error" text={errors.fields.type} /></label>
        <label htmlFor="transaction-amount">Amount, USD<input id="transaction-amount" autoFocus inputMode="decimal" type="text" value={draft.amount} onChange={event => set("amount", event.target.value)} placeholder="For example, 12.50" aria-invalid={!!errors.fields.amount} aria-describedby={errors.fields.amount ? "amount-help amount-error" : "amount-help"} />
          <small id="amount-help">US dollars, up to two decimal places.</small><FieldError id="amount-error" text={errors.fields.amount} /></label>
        <label htmlFor="transaction-date">Date<input id="transaction-date" type="date" value={draft.date} onChange={event => set("date", event.target.value)} aria-invalid={!!errors.fields.date} aria-describedby={errors.fields.date ? "date-error" : undefined} />
          <FieldError id="date-error" text={errors.fields.date} /></label>
        {draft.type === "expense" && <label htmlFor="transaction-category">Category<select id="transaction-category" value={draft.categoryId} onChange={event => set("categoryId", event.target.value)} aria-invalid={!!errors.fields.categoryId} aria-describedby={errors.fields.categoryId ? "category-error" : undefined}>
          <option value="">Select a category</option>{categories.map(row => <option key={row.id} value={row.id}>{row.name}{row.archived ? " (archived)" : ""}</option>)}</select><FieldError id="category-error" text={errors.fields.categoryId} /></label>}
      </div>
      {draft.type === "expense" && !categories.length && <p>No active categories. <Link href="/categories">Add or restore a category</Link>, then return to this transaction.</p>}
      <label htmlFor="transaction-note">Description (optional)<textarea id="transaction-note" rows={2} maxLength={500} value={draft.note} onChange={event => set("note", event.target.value)} aria-invalid={!!errors.fields.note} aria-describedby={errors.fields.note ? "note-error" : undefined} /><FieldError id="note-error" text={errors.fields.note} /></label>
      <div className="actions"><button type="submit" className="primary">{saving ? "Saving…" : "Save transaction"}</button><button type="button" onClick={onCancel}>Cancel</button></div>
      </fieldset>
    </form>
  </section>;
}
