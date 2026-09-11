"use client";

import { useActionState } from "react";
import { decideApplication, type DecisionState } from "@/lib/organizer/actions";

const initialState: DecisionState = { error: null, decided: null };

// F-7 decision bar. Three submit buttons share one action and each posts its own
// `decision` value, so the Server Action only ever sees an allowlisted status.
// Colours follow the status badges: accepted = green, waitlisted = gold, rejected
// = red. Re-deciding is allowed, so the buttons stay live until settled.
const OPTIONS = [
  { value: "accepted", label: "Accept", cls: "bg-green-600 hover:bg-green-700" },
  {
    value: "waitlisted",
    label: "Waitlist",
    cls: "bg-california-gold-dark hover:opacity-90",
  },
  { value: "rejected", label: "Reject", cls: "bg-red-600 hover:bg-red-700" },
] as const;

export function DecisionForm({
  applicationId,
  currentStatus,
  decidedAt,
}: {
  applicationId: string;
  currentStatus: string;
  decidedAt: string | null;
}) {
  const [state, formAction, pending] = useActionState(decideApplication, initialState);

  return (
    <form
      action={formAction}
      className="space-y-3 rounded-md border border-slate-200 bg-white p-6"
    >
      <input type="hidden" name="application_id" value={applicationId} />

      <div className="flex flex-wrap gap-3">
        {OPTIONS.map((o) => (
          <button
            key={o.value}
            type="submit"
            name="decision"
            value={o.value}
            disabled={pending}
            className={`inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-50 ${o.cls}`}
          >
            {o.label}
          </button>
        ))}
      </div>

      {state.error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {state.error}
        </p>
      )}
      {state.decided && !state.error && (
        <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">
          Decision saved: {state.decided}.
        </p>
      )}

      {decidedAt && (
        <p className="text-xs text-slate-400">
          Current decision: {currentStatus} · decided{" "}
          {new Date(decidedAt).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
          })}
        </p>
      )}
    </form>
  );
}
