import { coverageSummary, type CoverageRow } from "@/lib/organizer/coverage";

// F-7: the coverage tracker. Every number here is derived from the counters the
// `application_overview` view already computes (assigned_count / reviewed_count),
// so the panel costs no extra query — and it cannot drift from the table below
// it, because both read the same rows through the same helpers in
// lib/organizer/coverage.ts.
export function CoverageSummary({ applications }: { applications: CoverageRow[] }) {
  const summary = coverageSummary(applications);

  // Zero should not look alarming, so a tile only turns amber/red once it is
  // actually reporting a problem.
  const tiles = [
    {
      label: "Needs review",
      value: summary.needsReview,
      hint: "assigned, not graded yet",
      tone:
        summary.needsReview > 0
          ? "border-amber-200 bg-amber-50 text-amber-800"
          : "border-slate-200 bg-white text-slate-500",
    },
    {
      label: "Unassigned",
      value: summary.unassigned,
      hint: "nobody assigned — never graded",
      tone:
        summary.unassigned > 0
          ? "border-red-200 bg-red-50 text-red-700"
          : "border-slate-200 bg-white text-slate-500",
    },
    {
      label: "Ready to decide",
      value: summary.readyToDecide,
      hint: "every assigned review is in",
      tone: "border-slate-200 bg-white text-slate-500",
    },
    {
      label: "Open slots",
      value: summary.openSlots,
      hint: "grades still missing",
      tone: "border-slate-200 bg-white text-slate-500",
    },
  ];

  return (
    <section className="mb-8">
      <div className="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2 className="text-lg font-bold text-berkeley-blue">Grading coverage</h2>
        <p className="text-sm text-slate-500">
          {summary.inFlight === 0
            ? "No application is awaiting a decision."
            : `${summary.inFlight} application${summary.inFlight === 1 ? "" : "s"} awaiting a decision.`}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {tiles.map((tile) => (
          <div key={tile.label} className={`rounded-md border p-4 ${tile.tone}`}>
            <p className="text-2xl font-bold">{tile.value}</p>
            <p className="mt-1 text-sm font-semibold">{tile.label}</p>
            <p className="mt-0.5 text-xs opacity-80">{tile.hint}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
