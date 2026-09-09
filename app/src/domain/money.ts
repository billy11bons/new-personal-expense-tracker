import { ValidationError } from "./errors";

export function assertAmountMinor(value: unknown, allowZero = false): asserts value is number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < (allowZero ? 0 : 1)) {
    throw new ValidationError("Сумма должна быть положительным целым числом центов (бюджет может быть нулевым).");
  }
}

/** Parse decimal text directly into cents; never multiply a floating point amount. */
export function parseAmount(input: string, allowZero = false): number {
  if (!input.trim()) throw new ValidationError("Введите сумму в долларах.");
  if (input.trim().startsWith("-")) throw new ValidationError("Сумма не может быть отрицательной.");
  if (!/^\d+(?:[.,]\d{1,2})?$/.test(input.trim())) {
    throw new ValidationError("Введите сумму цифрами, не более двух знаков после точки или запятой.");
  }
  const [whole, fraction = ""] = input.trim().replace(",", ".").split(".");
  const cents = BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0"));
  if (cents > BigInt(Number.MAX_SAFE_INTEGER)) throw new ValidationError("Сумма слишком велика.");
  const value = Number(cents);
  if (value === 0 && !allowZero) throw new ValidationError("Сумма операции должна быть больше нуля.");
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
    if (!Number.isSafeInteger(next)) throw new ValidationError("Общая сумма слишком велика.");
    return next;
  }, 0);
}
