"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLedger } from "./ledger-provider";
export function AppShell({ children }: { children: React.ReactNode }) {
  const { ledger, loading, saving, error, reload } = useLedger();
  const pathname = usePathname();
  return <div className="shell">
    <a className="skip-link" href="#content">К содержимому</a>
    <header><h1>Personal Expense Tracker</h1><p className="muted">Личные финансы · USD · хранение в этом браузере</p></header>
    <nav aria-label="Разделы">{[["/", "Dashboard"], ["/transactions", "Операции"], ["/categories", "Категории"], ["/budget", "Бюджет"]].map(([href, title]) =>
      <Link key={href} href={href} aria-current={pathname === href || (pathname === "/" && href === "/transactions") ? "page" : undefined}>{title}</Link>)}</nav>
    <main id="content">
      <p className="muted storage-status" role="status">{loading ? "Загрузка локальных данных…" : saving ? "Сохранение…" : ledger ? "Локальные данные готовы." : "Данные не загружены."}</p>
      {error && <section className="error-box" aria-label="Ошибка хранения"><p role="alert">{error}</p>
        <p>Изменения не подтверждены. Проверьте доступ к хранилищу; при конфликте загрузите актуальные данные. Открытая форма будет сброшена.</p>
        <button type="button" disabled={loading || saving} onClick={() => void reload()}>Повторить загрузку</button></section>}
      {!loading && ledger && children}
    </main>
    <footer>Данные не синхронизируются. Используйте одну вкладку. В новом хранилище доступны демозаписи за август–октябрь 2026 года.</footer>
  </div>;
}
