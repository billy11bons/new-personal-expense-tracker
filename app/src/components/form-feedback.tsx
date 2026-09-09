import { FormValidationError } from "@/domain/commands";
export interface FormErrors { fields: Record<string, string>; message: string }
export const noErrors: FormErrors = { fields: {}, message: "" };
export function errorsFrom(error: unknown): FormErrors {
  return error instanceof FormValidationError ? { fields: error.fields, message: "Проверьте отмеченные поля." }
    : { fields: {}, message: error instanceof Error ? error.message : "Не удалось сохранить изменения." };
}
export function FieldError({ id, text }: { id: string; text?: string }) { return text ? <span id={id} className="field-error">{text}</span> : null; }
