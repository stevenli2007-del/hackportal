"use server";

import { createClient } from "@/lib/supabase/server";
import {
  validateApplication,
  validatePartial,
  type FormField,
} from "./validation";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export type ApplyState = {
  errors: Record<string, string>;
  saved: boolean;
  submitted: boolean;
};

// Form entry point. The two submit buttons post with `intent` = "draft" |
// "submit"; this dispatches to the matching Server Action so both share one
// action state. (Per-card discipline: one Server Action drives the form.)
export async function applyAction(
  _prev: ApplyState,
  formData: FormData,
): Promise<ApplyState> {
  const intent = formData.get("intent");
  if (intent === "submit") return submitApplication(_prev, formData);
  return saveDraft(_prev, formData);
}

// Persists answers WITHOUT flipping status — partial answers are allowed.
export async function saveDraft(
  _prev: ApplyState,
  formData: FormData,
): Promise<ApplyState> {
  return persist(formData, false);
}

// Full validation, then flips status to "submitted" and locks edits (RLS keeps
// the row immutable afterwards). Redirects back to /apply — never /dashboard,
// that route lands in C5 and would 404 (already hit once in C2).
export async function submitApplication(
  _prev: ApplyState,
  formData: FormData,
): Promise<ApplyState> {
  return persist(formData, true);
}

async function persist(
  formData: FormData,
  isSubmit: boolean,
): Promise<ApplyState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return { errors: { _form: "Please sign in again." }, saved: false, submitted: false };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (!profile)
    return { errors: { _form: "Profile not found." }, saved: false, submitted: false };

  const { data: fields, error } = await supabase
    .from("form_fields")
    .select("id,type,key,label,kind,options,required,position")
    .eq("type", profile.role)
    .order("position", { ascending: true });
  if (error || !fields) {
    return { errors: { _form: "Could not load the form." }, saved: false, submitted: false };
  }

  const typed = fields as FormField[];
  const raw: Record<string, string> = {};
  for (const f of typed) raw[f.key] = String(formData.get(f.key) ?? "");

  // Drafts allow partial input; submit requires everything valid.
  const { errors } = isSubmit
    ? validateApplication(raw, typed)
    : validatePartial(raw, typed);
  if (Object.keys(errors).length > 0)
    return { errors, saved: false, submitted: false };

  // Writes go through the USER'S session so RLS is the real gate (no service
  // role here). `onConflict` targets user_id — that is the unique column, not
  // the surrogate id — so re-saving upserts the one row per applicant.
  const patch = {
    user_id: user.id,
    type: profile.role,
    responses: raw,
    status: isSubmit ? "submitted" : "draft",
    ...(isSubmit ? { submitted_at: new Date().toISOString() } : {}),
  };
  const { error: upsertError } = await supabase
    .from("applications")
    .upsert(patch, { onConflict: "user_id" });
  if (upsertError) {
    return {
      errors: { _form: "Could not save your application." },
      saved: false,
      submitted: false,
    };
  }

  revalidatePath("/apply");
  if (isSubmit) redirect("/apply");
  return { errors: {}, saved: true, submitted: false };
}
