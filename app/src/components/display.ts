import { amountToInput } from "@/domain/money";
export function dollars(cents: number): string { return `${amountToInput(cents)} USD`; }
export function displayDate(date: string): string { return date.split("-").reverse().join("."); }
export function today(): string {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
