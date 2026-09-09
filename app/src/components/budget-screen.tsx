"use client";
import { useState } from "react";
import { saveBudget } from "@/domain/commands";
import { amountToInput } from "@/domain/money";
import { useLedger } from "./ledger-provider";
import { errorsFrom, FieldError, noErrors } from "./form-feedback";
import { dollars, today } from "./display";
function BudgetForm({ month, onMonthError }: { month: string; onMonthError: (message: string) => void }) {
  const { ledger, saving, commit } = useLedger();
  const existing = ledger?.budgets.find(row => row.month === month);
  const [amount, setAmount] = useState(existing ? amountToInput(existing.amountMinor) : "");
  const [id] = useState(() => existing?.id ?? crypto.randomUUID());
  const [errors, setErrors] = useState(noErrors);
  const [notice, setNotice] = useState("");
  return <form noValidate className="panel" onSubmit={async event => {
    event.preventDefault(); setErrors(noErrors); setNotice(""); onMonthError("");
    try { await commit(data => saveBudget(data, month, amount, id)); setNotice("Бюджет сохранён."); }
    catch (error) { const feedback = errorsFrom(error); setErrors(feedback); onMonthError(feedback.fields.month ?? ""); }
  }}>
    <p>{existing ? `Сохранённый бюджет: ${dollars(existing.amountMinor)}` : "Бюджет на этот месяц не задан."}</p>
    {notice && <p role="status" className="success">{notice}</p>}{errors.message && <p role="alert" className="field-error">{errors.message}</p>}
    <fieldset disabled={saving}><label htmlFor="budget-amount">Месячный бюджет, USD<input id="budget-amount" type="text" inputMode="decimal" value={amount} placeholder="Например, 1500.00" onChange={event => setAmount(event.target.value)} aria-invalid={!!errors.fields.amount} aria-describedby={errors.fields.amount ? "budget-help budget-error" : "budget-help"} />
      <small id="budget-help">Общий лимит расходов на выбранный месяц. Ноль допустим.</small><FieldError id="budget-error" text={errors.fields.amount} /></label>
      <button type="submit" className="primary">Сохранить бюджет</button></fieldset>
  </form>;
}
export function BudgetScreen() {
  const { ledger, saving } = useLedger();
  const [month, setMonth] = useState(() => today().slice(0, 7));
  const [monthError, setMonthError] = useState("");
  return <><h2>Месячный бюджет</h2>
    <label htmlFor="budget-month">Месяц<input id="budget-month" type="month" value={month} disabled={saving} aria-invalid={!!monthError} aria-describedby={monthError ? "month-error" : undefined} onChange={event => { setMonth(event.target.value); setMonthError(""); }} /><FieldError id="month-error" text={monthError} /></label>
    <BudgetForm key={month} month={month} onMonthError={setMonthError} />
    <h3>Сохранённые бюджеты</h3>
    {!ledger?.budgets.length ? <p>Бюджетов пока нет.</p> : <ul className="record-list" aria-label="Сохранённые бюджеты">{[...(ledger?.budgets ?? [])].sort((a, b) => b.month.localeCompare(a.month)).map(row =>
      <li className="panel record" key={row.id}><span>{row.month} · {dollars(row.amountMinor)}</span><button type="button" disabled={saving} onClick={() => { setMonth(row.month); setMonthError(""); }}>Открыть {row.month}</button></li>)}</ul>}
  </>;
}
