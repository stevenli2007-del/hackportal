// Shared types + validation for the data-driven application form (ADR-1).
// Reused by C3 (render + validate) and C4 (persist). Keep this free of Supabase
// imports so it stays trivially unit-testable.

export type FieldKind = "text" | "textarea" | "select" | "email" | "number";

export interface FormField {
  id: string;
  type: string; // account_type this question belongs to
  key: string; // matches the key in applications.responses jsonb
  label: string;
  kind: FieldKind;
  options: string[] | null; // for kind === "select"
  required: boolean;
  position: number;
}

export interface ValidationResult {
  values: Record<string, string>;
  errors: Record<string, string>;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Validate raw form input against the form_fields config (ADR-1: validate
// against form_fields before any write). Returns per-key errors; an empty
// `errors` object means the submission is valid.
export function validateApplication(
  raw: Record<string, string>,
  fields: FormField[],
): ValidationResult {
  const values: Record<string, string> = {};
  const errors: Record<string, string> = {};

  for (const f of fields) {
    const v = (raw[f.key] ?? "").trim();
    values[f.key] = v;

    if (f.required && !v) {
      errors[f.key] = `${f.label} is required.`;
      continue;
    }
    if (!v) continue; // optional + empty → valid

    if (f.kind === "email" && !EMAIL_RE.test(v)) {
      errors[f.key] = "Enter a valid email address.";
    } else if (f.kind === "number") {
      if (Number.isNaN(Number(v))) errors[f.key] = `${f.label} must be a number.`;
    } else if (f.kind === "select") {
      const opts = f.options ?? [];
      if (!opts.includes(v)) errors[f.key] = "Select a valid option.";
    }
  }

  return { values, errors };
}
