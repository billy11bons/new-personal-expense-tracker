import type { Metadata } from "next";
import "./globals.css";
import { LedgerProvider } from "@/components/ledger-provider";
import { AppShell } from "@/components/app-shell";

export const metadata: Metadata = {
  title: "Smart Expense Tracker",
  description: "A simple personal finance tracker for income, expenses, and budgets.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en-US"><body><LedgerProvider><AppShell>{children}</AppShell></LedgerProvider></body></html>;
}
