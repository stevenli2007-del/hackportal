"use client";

import { useOptimistic, useTransition } from "react";
import { setApplicationStage } from "@/lib/organizer/actions";
import {
  isDecided,
  isUnassigned,
  pendingReviews,
  type CoverageRow,
} from "@/lib/organizer/coverage";
import type { OrganizerRow } from "@/components/organizer/applications-table";

// C10: the decision board. Same rows as the table, laid out as columns by
// status — drag a card between columns to change its stage. Moves go through
// `setApplicationStage`, so RLS still gates every write and the same
// decided_at rule applies as the three-button form. No dependency: native
// HTML5 drag events (onDragStart / onDrop) keep the bundle lean.

const COLUMNS: { status: string; label: string }[] = [
  { status: "submitted", label: "Submitted" },
  { status: "under_review", label: "Under review" },
  { status: "accepted", label: "Accepted" },
  { status: "waitlisted", label: "Waitlisted" },
  { status: "rejected", label: "Rejected" },
];

export function DecisionBoard({ applications }: { applications: OrganizerRow[] }) {
  const [optimistic, setOptimistic] = useOptimistic(
    applications,
    (state, next: { id: string; status: string }) =>
      state.map((a) => (a.id === next.id ? { ...a, status: next.status } : a)),
  );
  const [, startTransition] = useTransition();

  function move(id: string, status: string) {
    setOptimistic({ id, status });
    const fd = new FormData();
    fd.set("application_id", id);
    fd.set("stage", status);
    startTransition(async () => {
      await setApplicationStage({ error: null, decided: null }, fd);
    });
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
      {COLUMNS.map((col) => {
        const cards = optimistic.filter((a) => a.status === col.status);
        return (
          <div
            key={col.status}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const id = e.dataTransfer.getData("text/plain");
              if (id) move(id, col.status);
            }}
            className="flex flex-col rounded-md border border-slate-200 bg-slate-50 p-3"
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-700">{col.label}</h3>
              <span className="text-xs font-semibold text-slate-400">{cards.length}</span>
            </div>

            <div className="flex flex-col gap-2">
              {cards.length === 0 ? (
                <p className="rounded-md border border-dashed border-slate-200 px-3 py-6 text-center text-xs text-slate-400">
                  Drop here
                </p>
              ) : (
                cards.map((a) => (
                  <article
                    key={a.id}
                    draggable
                    onDragStart={(e) => e.dataTransfer.setData("text/plain", a.id)}
                    className="cursor-grab rounded-md border border-slate-200 bg-white p-3 shadow-sm active:cursor-grabbing"
                  >
                    <p className="text-sm font-semibold text-berkeley-blue">
                      {a.display_name ?? "—"}
                    </p>
                    <p className="mt-0.5 text-xs capitalize text-slate-500">{a.type} track</p>
                    <p className="mt-2 text-xs">
                      <CoverageText row={a} />
                    </p>
                  </article>
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Per-card coverage, through the shared helpers so it can never disagree with
// the table's CoverageCell or the summary panel.
function CoverageText({ row }: { row: CoverageRow }) {
  if (isDecided(row.status)) {
    return <span className="text-slate-400">{row.reviewed_count}/{row.assigned_count}</span>;
  }
  if (isUnassigned(row)) {
    return <span className="font-semibold text-red-600">Unassigned</span>;
  }
  const pending = pendingReviews(row);
  return (
    <span className={pending > 0 ? "font-semibold text-amber-700" : "font-semibold text-green-700"}>
      {row.reviewed_count}/{row.assigned_count}
      {pending > 0 ? ` · ${pending} to go` : " · complete"}
    </span>
  );
}
