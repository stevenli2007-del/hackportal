"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { isDecided, isUnassigned, needsReview, pendingReviews } from "@/lib/organizer/coverage";

export type OrganizerRow = {
  id: string;
  user_id: string;
  display_name: string | null;
  type: string;
  status: string;
  submitted_at: string | null;
  decided_at: string | null;
  avg_score: number;
  assigned_count: number;
  reviewed_count: number;
};

const TRACKS = ["hacker", "judge", "mentor", "volunteer"] as const;

const STATUS_BADGE: Record<string, string> = {
  draft: "bg-slate-100 text-slate-700",
  submitted: "bg-green-50 text-green-700",
  under_review: "bg-blue-50 text-blue-700",
  accepted: "bg-green-50 text-green-700",
  waitlisted: "bg-yellow-50 text-yellow-700",
  rejected: "bg-red-50 text-red-700",
};

const selectCls =
  "rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 outline-none focus:border-berkeley-blue focus:ring-1 focus:ring-berkeley-blue";

export function ApplicationsTable({ applications }: { applications: OrganizerRow[] }) {
  const [track, setTrack] = useState("");
  const [status, setStatus] = useState("");
  const [gapsOnly, setGapsOnly] = useState(false);

  const filtered = useMemo(
    () =>
      applications.filter(
        (a) =>
          (track === "" || a.type === track) &&
          (status === "" || a.status === status) &&
          (!gapsOnly || needsReview(a)),
      ),
    [applications, track, status, gapsOnly],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm font-medium text-slate-600">
          Track
          <select value={track} onChange={(e) => setTrack(e.target.value)} className={`ml-2 ${selectCls}`}>
            <option value="">All</option>
            {TRACKS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-medium text-slate-600">
          Status
          <select value={status} onChange={(e) => setStatus(e.target.value)} className={`ml-2 ${selectCls}`}>
            <option value="">All</option>
            {Object.keys(STATUS_BADGE).map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm font-medium text-slate-600">
          <input
            type="checkbox"
            checked={gapsOnly}
            onChange={(e) => setGapsOnly(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 accent-berkeley-blue"
          />
          Needs review only
        </label>
        {(track || status || gapsOnly) && (
          <button
            onClick={() => {
              setTrack("");
              setStatus("");
              setGapsOnly(false);
            }}
            className="text-sm font-semibold text-berkeley-blue hover:underline"
          >
            Clear
          </button>
        )}
        <span className="ml-auto text-sm text-slate-400">
          {filtered.length} of {applications.length}
        </span>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-md border border-slate-200 bg-white p-10 text-center text-slate-500">
          No applications match this filter.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-md border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Applicant</th>
                <th className="px-4 py-3">Track</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Avg score</th>
                <th className="px-4 py-3">Coverage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((a) => (
                <tr key={a.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium">
                    <Link
                      href={`/organizer/${a.id}`}
                      className="text-berkeley-blue hover:underline"
                    >
                      {a.display_name ?? "—"}
                    </Link>
                  </td>
                  <td className="px-4 py-3 capitalize text-slate-600">{a.type}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-md px-2 py-0.5 text-xs font-semibold ${
                        STATUS_BADGE[a.status] ?? "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {a.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {a.reviewed_count > 0 ? a.avg_score.toFixed(1) : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <CoverageCell row={a} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// Per-row coverage, rendered through the same helpers as the summary panel so
// the two can never disagree. The `Unassigned` case gets its own badge rather
// than showing "0/0": an application nobody was assigned to is the one failure
// a reviewed/assigned ratio hides completely.
function CoverageCell({ row }: { row: OrganizerRow }) {
  const assigned = Number(row.assigned_count) || 0;
  const reviewed = Number(row.reviewed_count) || 0;

  if (isDecided(row.status)) {
    return <span className="text-slate-400">{reviewed}/{assigned}</span>;
  }

  if (isUnassigned(row)) {
    return (
      <span className="inline-flex rounded-md bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-700">
        Unassigned
      </span>
    );
  }

  const pending = pendingReviews(row);

  return (
    <span className="inline-flex items-baseline gap-2">
      <span className={`font-medium ${pending > 0 ? "text-amber-700" : "text-green-700"}`}>
        {reviewed}/{assigned}
      </span>
      <span className="text-xs text-slate-500">
        {pending > 0 ? `${pending} to go` : "complete"}
      </span>
    </span>
  );
}
