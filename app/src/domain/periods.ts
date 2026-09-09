import { ValidationError } from "./errors";
import type { Period } from "./types";

function daysInMonth(year: number, month: number): number {
  if (month === 2) return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0) ? 29 : 28;
  return [4, 6, 9, 11].includes(month) ? 30 : 31;
}

export function assertMonth(value: unknown): asserts value is string {
  if (typeof value !== "string" || !/^(?!0000)\d{4}-(0[1-9]|1[0-2])$/.test(value)) {
    throw new ValidationError("Месяц должен иметь формат YYYY-MM (годы 0001–9999).");
  }
}

export function assertDate(value: unknown): asserts value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new ValidationError("Дата должна иметь формат YYYY-MM-DD.");
  assertMonth(value.slice(0, 7));
  const [year, month, day] = value.split("-").map(Number);
  if (day < 1 || day > daysInMonth(year, month)) throw new ValidationError("Такой календарной даты не существует.");
}

export function dateRange(start: string, end: string): Period {
  assertDate(start); assertDate(end);
  if (start > end) throw new ValidationError("Начало периода должно быть не позже конца.");
  return { start, end };
}

export function monthPeriod(month: string): Period {
  assertMonth(month);
  const [year, m] = month.split("-").map(Number);
  return { start: `${month}-01`, end: `${month}-${daysInMonth(year, m)}` };
}

/** UTC is only used for calendar arithmetic, never to reinterpret a user's local date. */
export function weekPeriod(date: string): Period {
  assertDate(date);
  const [year, month, day] = date.split("-").map(Number);
  const cursor = new Date(0);
  cursor.setUTCFullYear(year, month - 1, day);
  cursor.setUTCDate(cursor.getUTCDate() - (cursor.getUTCDay() + 6) % 7);
  const start = cursor.toISOString().slice(0, 10);
  cursor.setUTCDate(cursor.getUTCDate() + 6);
  const end = cursor.toISOString().slice(0, 10);
  return dateRange(start, end);
}

export function isInPeriod(date: string, period: Period): boolean {
  assertDate(date); dateRange(period.start, period.end);
  return date >= period.start && date <= period.end;
}
