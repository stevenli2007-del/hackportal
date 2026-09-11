"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { clampScore, weightedTotal, type RubricCriterion } from "./scoring";

export type ReviewState = {
  error: string | null;
  saved: boolean;
};

// F-6: an organizer grades one application with the weighted rubric. A reviewed
// application is upserted on (application_id, reviewer_id) — the unique key from
// 0001 — so re-grading edits the caller's own row instead of stacking duplicates.
// Writes go through the organizer's session; RLS is the real gate.
export async function saveReview(
  _prev: ReviewState,
  formData: FormData,
): Promise<ReviewState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Please sign in again.", saved: false };

  const applicationId = String(formData.get("application_id") ?? "");
  if (!applicationId) return { error: "Missing application.", saved: false };

  // The page hides this form from applicants, but the Server Action is a public
  // endpoint — re-check the role here rather than trusting the UI.
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.role !== "organizer")
    return { error: "Only organizers can grade applications.", saved: false };

  const { data: criteria, error: criteriaError } = await supabase
    .from("rubric_criteria")
    .select("id,key,label,weight,max_score,position")
    .order("position", { ascending: true });
  if (criteriaError || !criteria || criteria.length === 0)
    return { error: "Could not load the rubric.", saved: false };

  const typed = criteria as RubricCriterion[];
  const scores: Record<string, number> = {};
  for (const c of typed) {
    scores[c.key] = clampScore(formData.get(`score_${c.key}`), c.max_score);
  }

  const notes = String(formData.get("notes") ?? "").trim();

  const { error } = await supabase.from("reviews").upsert(
    {
      application_id: applicationId,
      reviewer_id: user.id,
      scores,
      total: weightedTotal(scores, typed),
      notes: notes || null,
    },
    { onConflict: "application_id,reviewer_id" },
  );
  if (error) return { error: "Could not save your grade.", saved: false };

  // F-4 timeline: grading has started, so an application still in "submitted"
  // moves to "under_review" (step 2 of the applicant timeline, dashboard/page.tsx).
  // The `status = 'submitted'` guard stops a decided row from regressing; this
  // flip is best-effort and must not fail the grade write above.
  await supabase
    .from("applications")
    .update({ status: "under_review" })
    .eq("id", applicationId)
    .eq("status", "submitted");

  revalidatePath(`/organizer/${applicationId}`);
  revalidatePath("/organizer");
  return { error: null, saved: true };
}

export type DecisionState = {
  error: string | null;
  decided: string | null; // the status just written, for the confirmation line
};

// F-7: an organizer accepts / waitlists / rejects an application. The decision is
// recorded as `status` + `decided_at`. RLS (`applications_organizer_update`,
// 0001) is `for update using (is_organizer())`, so an organizer may write any
// status — no migration needed. Re-deciding overwrites the previous decision.
const DECISIONS = ["accepted", "waitlisted", "rejected"] as const;
type Decision = (typeof DECISIONS)[number];

export async function decideApplication(
  _prev: DecisionState,
  formData: FormData,
): Promise<DecisionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Please sign in again.", decided: null };

  const applicationId = String(formData.get("application_id") ?? "");
  if (!applicationId) return { error: "Missing application.", decided: null };

  // The page hides this form from applicants, but the Server Action is a public
  // endpoint — re-check the role here rather than trusting the UI.
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.role !== "organizer")
    return { error: "Only organizers can decide applications.", decided: null };

  // Allowlist the posted decision — never write an arbitrary status string.
  const decision = String(formData.get("decision") ?? "");
  if (!DECISIONS.includes(decision as Decision))
    return { error: "Unknown decision.", decided: null };

  // .select() returns the written row, so a silent RLS block (0 rows) surfaces
  // as an error instead of a false success. Organizers have select + update here.
  const { data: updated, error } = await supabase
    .from("applications")
    .update({ status: decision, decided_at: new Date().toISOString() })
    .eq("id", applicationId)
    .select("id,status,decided_at")
    .maybeSingle();
  if (error || !updated) return { error: "Could not save the decision.", decided: null };

  revalidatePath(`/organizer/${applicationId}`);
  revalidatePath("/organizer");
  return { error: null, decided: decision };
}

// C10: a board move. Reuses DecisionState — the board is just a drag-and-drop
// front end for the same status write `decideApplication` does for the three
// terminal decisions, extended to the two in-flight stages. One allowlist of
// valid stages keeps any dropped column honest; the `decided_at` rule matches
// C8: only the terminal decisions stamp a decision time, so moving a card back
// to `submitted` / `under_review` clears it. RLS (`applications_organizer_update`,
// 0001) already permits organizers to set any status, so no migration is needed.
const STAGES = ["submitted", "under_review", "accepted", "waitlisted", "rejected"] as const;
type Stage = (typeof STAGES)[number];
const TERMINAL = new Set<Stage>(["accepted", "waitlisted", "rejected"]);

export async function setApplicationStage(
  _prev: DecisionState,
  formData: FormData,
): Promise<DecisionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Please sign in again.", decided: null };

  const applicationId = String(formData.get("application_id") ?? "");
  if (!applicationId) return { error: "Missing application.", decided: null };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.role !== "organizer")
    return { error: "Only organizers can move applications.", decided: null };

  const stage = String(formData.get("stage") ?? "");
  if (!STAGES.includes(stage as Stage))
    return { error: "Unknown stage.", decided: null };

  const patch =
    TERMINAL.has(stage as Stage)
      ? { status: stage, decided_at: new Date().toISOString() }
      : { status: stage, decided_at: null };

  const { data: updated, error } = await supabase
    .from("applications")
    .update(patch)
    .eq("id", applicationId)
    .select("id,status,decided_at")
    .maybeSingle();
  if (error || !updated) return { error: "Could not move the application.", decided: null };

  revalidatePath(`/organizer/${applicationId}`);
  revalidatePath("/organizer");
  return { error: null, decided: updated.status };
}
