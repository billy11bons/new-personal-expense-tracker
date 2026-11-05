"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLedger } from "./ledger-provider";
export function AppShell({ children }: { children: React.ReactNode }) {
  const { ledger, loading, saving, error, reload } = useLedger();
  const pathname = usePathname();
  return <div className="shell">
    <a className="skip-link" href="#content">Skip to content</a>
    <header><h1>Smart Expense Tracker</h1><p className="muted">Personal finances · USD · stored in this browser</p></header>
    <nav aria-label="Sections">{[["/", "Dashboard"], ["/transactions", "Transactions"], ["/categories", "Categories"], ["/budget", "Budget"]].map(([href, title]) =>
      <Link key={href} href={href} aria-current={pathname === href || (pathname === "/" && href === "/transactions") ? "page" : undefined}>{title}</Link>)}</nav>
    <main id="content">
      <p className="muted storage-status" role="status">{loading ? "Loading local data…" : saving ? "Saving…" : ledger ? "Local data is ready." : "Data is not loaded."}</p>
      {error && <section className="error-box" aria-label="Storage error"><p role="alert">{error}</p>
        <p>Your changes were not saved. Check storage access; if there is a conflict, reload the latest data. The open form will be reset.</p>
        <button type="button" disabled={loading || saving} onClick={() => void reload()}>Reload data</button></section>}
      {!loading && ledger && children}
    </main>
    <footer>Data does not sync between devices. Use one tab at a time. New storage includes sample entries from August through October 2026.</footer>
  </div>;
}
