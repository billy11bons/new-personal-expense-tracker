import { ValidationError } from "./errors";

export function assertAmountMinor(value: unknown, allowZero = false): asserts value is number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < (allowZero ? 0 : 1)) {
    throw new ValidationError("Amount must be a positive whole number of cents (a budget may be zero).");
  }
}

/** Parse decimal text directly into cents; never multiply a floating point amount. */
export function parseAmount(input: string, allowZero = false): number {
  if (!input.trim()) throw new ValidationError("Enter an amount in US dollars.");
  if (input.trim().startsWith("-")) throw new ValidationError("Amount cannot be negative.");
  if (!/^\d+(?:[.,]\d{1,2})?$/.test(input.trim())) {
    throw new ValidationError("Enter digits with no more than two decimal places.");
  }
  const [whole, fraction = ""] = input.trim().replace(",", ".").split(".");
  const cents = BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0"));
  if (cents > BigInt(Number.MAX_SAFE_INTEGER)) throw new ValidationError("Amount is too large.");
  const value = Number(cents);
  if (value === 0 && !allowZero) throw new ValidationError("Transaction amount must be greater than zero.");
  assertAmountMinor(value, allowZero);
  return value;
}

/** Exact editable decimal text, including values near the safe integer limit. */
export function amountToInput(amountMinor: number): string {
  assertAmountMinor(amountMinor, true);
  const cents = BigInt(amountMinor);
  return `${cents / 100n}.${String(cents % 100n).padStart(2, "0")}`;
}

export function sumMinor(values: readonly number[]): number {
  return values.reduce((sum, value) => {
    assertAmountMinor(value, true);
    const next = sum + value;
    if (!Number.isSafeInteger(next)) throw new ValidationError("Total amount is too large.");
    return next;
  }, 0);
}
