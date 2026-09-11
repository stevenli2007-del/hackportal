// F-7 coverage math. Kept in one pure module — the same reason `scoring.ts`
// exists for the rubric: the rule "what counts as a coverage gap" is a product
// decision, so it lives in exactly one place and is shared by the summary panel,
// the list filter, and the per-row badge. No I/O, no React.

export type CoverageRow = {
  status: string;
  assigned_count: number;
  reviewed_count: number;
};

// A decision closes the case: nobody still owes a grade on an accepted or
// rejected application, so counting one would make the tracker cry wolf.
//
// `waitlisted` is deliberately NOT in this set — a waitlisted applicant can
// still be promoted, so its outstanding reviews stay real work.
const DECIDED = new Set(["accepted", "rejected"]);

export function isDecided(status: string): boolean {
  return DECIDED.has(status);
}

// Assigned reviewers who have not graded yet. Clamped at 0: an organizer can
// grade an application they were not assigned to, which would otherwise make
// "still missing" negative.
export function pendingReviews(row: CoverageRow): number {
  return Math.max(0, Number(row.assigned_count) - Number(row.reviewed_count));
}

export function needsReview(row: CoverageRow): boolean {
  return !isDecided(row.status) && pendingReviews(row) > 0;
}

// The silent failure this tracker exists for. An application nobody was
// assigned to never looks like a gap in a reviewed/assigned comparison — 0/0
// reads as complete — so it needs its own test. (This is the demo's mentor and
// volunteer rows if they ever lose their assignment.)
export function isUnassigned(row: CoverageRow): boolean {
  return !isDecided(row.status) && Number(row.assigned_count) === 0;
}

export type CoverageSummary = {
  inFlight: number; // not yet accepted / rejected
  needsReview: number; // assigned, still partly ungraded
  unassigned: number; // nobody assigned at all
  readyToDecide: number; // every assigned review is in
  openSlots: number; // graded reviews still missing, in total
};

// The three headline buckets are mutually exclusive on purpose (unassigned rows
// are not also counted as needing review), so the tiles can be read as a
// partition of the in-flight applications instead of overlapping totals.
export function coverageSummary(rows: CoverageRow[]): CoverageSummary {
  const summary: CoverageSummary = {
    inFlight: 0,
    needsReview: 0,
    unassigned: 0,
    readyToDecide: 0,
    openSlots: 0,
  };

  for (const row of rows) {
    if (isDecided(row.status)) continue;
    summary.inFlight += 1;
    summary.openSlots += pendingReviews(row);

    if (Number(row.assigned_count) === 0) summary.unassigned += 1;
    else if (pendingReviews(row) > 0) summary.needsReview += 1;
    else summary.readyToDecide += 1;
  }

  return summary;
}
