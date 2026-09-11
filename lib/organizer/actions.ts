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

  revalidatePath(`/organizer/${applicationId}`);
  revalidatePath("/organizer");
  return { error: null, saved: true };
}
