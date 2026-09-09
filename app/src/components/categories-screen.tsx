"use client";
import { useState } from "react";
import { saveCategory, setCategoryArchived } from "@/domain/commands";
import type { Category } from "@/domain/types";
import { useLedger } from "./ledger-provider";
import { errorsFrom, FieldError, noErrors } from "./form-feedback";
function CategoryForm({ original, onDone, onCancel }: { original?: Category; onDone: () => void; onCancel: () => void }) {
  const { saving, commit } = useLedger();
  const [name, setName] = useState(original?.name ?? "");
  const [id] = useState(() => original?.id ?? crypto.randomUUID());
  const [errors, setErrors] = useState(noErrors);
  return <form className="panel" noValidate onSubmit={async event => {
    event.preventDefault(); setErrors(noErrors);
    try { await commit(data => saveCategory(data, name, id, !!original)); onDone(); }
    catch (error) { setErrors(errorsFrom(error)); }
  }}>
    <h3>{original ? "Переименование категории" : "Новая категория"}</h3>
    {errors.message && <p role="alert" className="field-error">{errors.message}</p>}
    <fieldset disabled={saving}><label htmlFor="category-name">Название категории<input id="category-name" autoFocus value={name} maxLength={80} onChange={event => setName(event.target.value)} aria-invalid={!!errors.fields.name} aria-describedby={errors.fields.name ? "name-error" : undefined} /><FieldError id="name-error" text={errors.fields.name} /></label>
      <div className="actions"><button type="submit" className="primary">Сохранить категорию</button><button type="button" onClick={onCancel}>Отмена</button></div></fieldset>
  </form>;
}
export function CategoriesScreen() {
  const { ledger, saving, commit } = useLedger();
  const [editor, setEditor] = useState<Category | "new" | null>(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  if (!ledger) return null;
  return <>
    <div className="section-heading"><h2>Категории</h2><button type="button" className="primary" disabled={saving || editor !== null} onClick={() => { setNotice(""); setEditor("new"); }}>Добавить категорию</button></div>
    <p>Категории относятся к расходам. Архивирование убирает категорию из новых операций и сохраняет историю; её можно восстановить.</p>
    {notice && <p role="status" className="success">{notice}</p>}{error && <p role="alert" className="field-error">{error}</p>}
    {editor && <CategoryForm key={editor === "new" ? "new" : editor.id} original={editor === "new" ? undefined : editor} onDone={() => { setEditor(null); setNotice("Категория сохранена."); }} onCancel={() => setEditor(null)} />}
    {!ledger.categories.length && <p className="panel">Категорий пока нет. Добавьте первую категорию расходов.</p>}
    <ul className="record-list" aria-label="Список категорий">{ledger.categories.map(row => <li className="panel record" key={row.id}>
      <div className="record-info"><strong>{row.name}</strong><p className="muted">{row.archived ? "В архиве" : "Активна"}</p></div>
      <div className="actions"><button type="button" disabled={saving || editor !== null} onClick={() => setEditor(row)}>Переименовать</button>
        <button type="button" disabled={saving || editor !== null} onClick={async () => {
          setError(""); setNotice("");
          try { await commit(data => setCategoryArchived(data, row.id, !row.archived)); setNotice(row.archived ? "Категория восстановлена." : "Категория перемещена в архив."); }
          catch (error) { setError(error instanceof Error ? error.message : "Не удалось изменить категорию."); }
        }}>{row.archived ? "Восстановить" : "В архив"}</button></div>
    </li>)}</ul>
  </>;
}
