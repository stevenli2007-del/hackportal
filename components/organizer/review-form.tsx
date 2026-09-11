"use client";

import { useActionState } from "react";
import { saveReview, type ReviewState } from "@/lib/organizer/actions";
import type { RubricCriterion } from "@/lib/organizer/scoring";

const initialState: ReviewState = { error: null, saved: false };

const selectCls =
  "rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 outline-none focus:border-berkeley-blue focus:ring-1 focus:ring-berkeley-blue";

// F-6 grading form. One select per rubric criterion (0..max_score) plus notes;
// the action computes the weighted total server-side so the client never posts a
// score it could tamper with.
export function ReviewForm({
  applicationId,
  criteria,
  initialScores,
  initialNotes,
}: {
  applicationId: string;
  criteria: RubricCriterion[];
  initialScores: Record<string, number>;
  initialNotes: string;
}) {
  const [state, formAction, pending] = useActionState(saveReview, initialState);

  return (
    <form
      action={formAction}
      className="space-y-5 rounded-md border border-slate-200 bg-white p-6"
    >
      <input type="hidden" name="application_id" value={applicationId} />

      <div className="space-y-3">
        {criteria.map((c) => (
          <div key={c.id} className="flex items-center justify-between gap-4">
            <label htmlFor={`score_${c.key}`} className="text-sm font-medium text-slate-700">
              {c.label}
              <span className="ml-2 text-xs font-normal text-slate-400">
                weight {Number(c.weight)}
              </span>
            </label>
            <select
              id={`score_${c.key}`}
              name={`score_${c.key}`}
              defaultValue={String(initialScores[c.key] ?? 0)}
              className={selectCls}
            >
              {Array.from({ length: Number(c.max_score) + 1 }, (_, i) => (
                <option key={i} value={i}>
                  {i}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>

      <div>
        <label htmlFor="notes" className="block text-sm font-medium text-slate-700">
          Notes
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={3}
          defaultValue={initialNotes}
          placeholder="Optional reviewer notes"
          className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-berkeley-blue focus:ring-1 focus:ring-berkeley-blue"
        />
      </div>

      {state.error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {state.error}
        </p>
      )}
      {state.saved && !state.error && (
        <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">Grade saved.</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex items-center justify-center rounded-md bg-berkeley-blue px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? "Saving…" : "Save grade"}
      </button>
    </form>
  );
}
