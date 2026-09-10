"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { applyAction, type ApplyState } from "@/lib/application/actions";
import type { FormField } from "@/lib/application/validation";

const initialState: ApplyState = { errors: {}, saved: false, submitted: false };

export function ApplicationForm({
  fields,
  initialValues = {},
}: {
  fields: FormField[];
  initialValues?: Record<string, string>;
}) {
  const [state, formAction, pending] = useActionState(applyAction, initialState);
  // Seed controlled state from the saved draft so a reload re-populates the form.
  const [values, setValues] = useState<Record<string, string>>(initialValues);
  const set = (key: string, value: string) =>
    setValues((prev) => ({ ...prev, [key]: value }));

  const err = state.errors ?? {};

  return (
    <form action={formAction} className="space-y-6">
      {fields.map((f) => {
        const value = values[f.key] ?? "";
        const fieldErr = err[f.key];
        const labelCls = "block text-sm font-semibold text-berkeley-blue";
        const inputCls =
          "mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-berkeley-blue focus:ring-1 focus:ring-berkeley-blue";

        return (
          <div key={f.id}>
            <label htmlFor={f.key} className={labelCls}>
              {f.label}
              {f.required && <span className="text-california-gold-dark"> *</span>}
            </label>

            {f.kind === "textarea" ? (
              <textarea
                id={f.key}
                name={f.key}
                rows={3}
                value={value}
                onChange={(e) => set(f.key, e.target.value)}
                className={inputCls}
                aria-invalid={!!fieldErr}
              />
            ) : f.kind === "select" ? (
              <select
                id={f.key}
                name={f.key}
                value={value}
                onChange={(e) => set(f.key, e.target.value)}
                className={inputCls}
                aria-invalid={!!fieldErr}
              >
                <option value="">Select…</option>
                {(f.options ?? []).map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            ) : (
              <input
                id={f.key}
                name={f.key}
                type={f.kind === "email" ? "email" : f.kind === "number" ? "number" : "text"}
                value={value}
                onChange={(e) => set(f.key, e.target.value)}
                className={inputCls}
                aria-invalid={!!fieldErr}
              />
            )}

            {fieldErr && <p className="mt-1 text-sm text-red-600">{fieldErr}</p>}
          </div>
        );
      })}

      {err._form && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{err._form}</p>
      )}

      {state.saved && Object.keys(err).length === 0 && (
        <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">Draft saved.</p>
      )}

      <div className="flex gap-3">
        <Button type="submit" name="intent" value="draft" disabled={pending}>
          {pending ? "Saving…" : "Save draft"}
        </Button>
        <Button type="submit" name="intent" value="submit" disabled={pending}>
          {pending ? "Submitting…" : "Submit application"}
        </Button>
      </div>
    </form>
  );
}
