// Pure scoring helpers for the organizer rubric (F-6). Kept free of Supabase
// imports so the weighting rule stays easy to read and to test — mirrors how
// lib/application/validation.ts is separated from its Server Action.

export interface RubricCriterion {
  id: string;
  key: string;
  label: string;
  weight: number;
  max_score: number;
  position: number;
}

// Weighted rubric total, always on a 0..5 scale.
//
// Each criterion is first normalised to its own scale (score / max_score), then
// weighted, then rescaled to 5 — so the result stays comparable even if an
// organizer edits max_score later. With the seeded rubric (every max_score = 5)
// this reduces exactly to the plain weighted average used in seed.sql, e.g.
// (5*2 + 4*1 + 4*1) / 4 = 4.5.
export function weightedTotal(
  scores: Record<string, number>,
  criteria: RubricCriterion[],
): number | null {
  const totalWeight = criteria.reduce((sum, c) => sum + Number(c.weight), 0);
  if (criteria.length === 0 || totalWeight <= 0) return null;

  const weighted = criteria.reduce((sum, c) => {
    const raw = Number(scores[c.key] ?? 0);
    const max = Number(c.max_score) || 5;
    return sum + (raw / max) * 5 * Number(c.weight);
  }, 0);

  // Round to 2 decimals so a stored total reads the same on every fetch.
  return Math.round((weighted / totalWeight) * 100) / 100;
}

// Parse a raw rubric input into an integer clamped to [0, max_score]. The form
// only offers valid options, but a Server Action is a public endpoint: never
// trust the posted value.
export function clampScore(value: unknown, maxScore: number): number {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n)) return 0;
  return Math.min(Math.max(n, 0), maxScore);
}
