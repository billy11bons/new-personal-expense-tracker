import type { Metadata } from "next";
import "./globals.css";
import { LedgerProvider } from "@/components/ledger-provider";
import { AppShell } from "@/components/app-shell";

export const metadata: Metadata = {
  title: "Personal Expense Tracker — Case 02",
  description: "Основа трекера личных финансов",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ru"><body><LedgerProvider><AppShell>{children}</AppShell></LedgerProvider></body></html>;
}
