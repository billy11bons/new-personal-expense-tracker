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
    <h3 id="transaction-form-title">{original ? "Редактирование операции" : "Новая операция"}</h3>
    <form noValidate onSubmit={async event => {
      event.preventDefault(); setErrors(noErrors);
      try { await commit(data => saveTransaction(data, draft, id, original)); onDone(); }
      catch (error) { setErrors(errorsFrom(error)); }
    }}>
      {errors.message && <p role="alert" className="field-error">{errors.message}</p>}
      <fieldset disabled={saving}><div className="form-grid">
        <label htmlFor="transaction-type">Тип операции<select id="transaction-type" value={draft.type} onChange={event => set("type", event.target.value)} aria-invalid={!!errors.fields.type} aria-describedby={errors.fields.type ? "type-error" : undefined}>
          <option value="expense">Расход</option><option value="income">Доход</option></select><FieldError id="type-error" text={errors.fields.type} /></label>
        <label htmlFor="transaction-amount">Сумма, USD<input id="transaction-amount" autoFocus inputMode="decimal" type="text" value={draft.amount} onChange={event => set("amount", event.target.value)} placeholder="Например, 12.50" aria-invalid={!!errors.fields.amount} aria-describedby={errors.fields.amount ? "amount-help amount-error" : "amount-help"} />
          <small id="amount-help">Доллары, до двух знаков после точки или запятой.</small><FieldError id="amount-error" text={errors.fields.amount} /></label>
        <label htmlFor="transaction-date">Дата<input id="transaction-date" type="date" value={draft.date} onChange={event => set("date", event.target.value)} aria-invalid={!!errors.fields.date} aria-describedby={errors.fields.date ? "date-error" : undefined} />
          <FieldError id="date-error" text={errors.fields.date} /></label>
        {draft.type === "expense" && <label htmlFor="transaction-category">Категория<select id="transaction-category" value={draft.categoryId} onChange={event => set("categoryId", event.target.value)} aria-invalid={!!errors.fields.categoryId} aria-describedby={errors.fields.categoryId ? "category-error" : undefined}>
          <option value="">Выберите категорию</option>{categories.map(row => <option key={row.id} value={row.id}>{row.name}{row.archived ? " (архив)" : ""}</option>)}</select><FieldError id="category-error" text={errors.fields.categoryId} /></label>}
      </div>
      {draft.type === "expense" && !categories.length && <p>Нет активных категорий. <Link href="/categories">Добавьте или восстановите категорию</Link>, затем вернитесь к операции.</p>}
      <label htmlFor="transaction-note">Описание (необязательно)<textarea id="transaction-note" rows={2} maxLength={500} value={draft.note} onChange={event => set("note", event.target.value)} aria-invalid={!!errors.fields.note} aria-describedby={errors.fields.note ? "note-error" : undefined} /><FieldError id="note-error" text={errors.fields.note} /></label>
      <div className="actions"><button type="submit" className="primary">{saving ? "Сохранение…" : "Сохранить операцию"}</button><button type="button" onClick={onCancel}>Отмена</button></div>
      </fieldset>
    </form>
  </section>;
}
