"use server";

import { createClient } from "@/lib/supabase/server";
import { validateApplication, type FormField } from "./validation";

export type ApplyState = {
  errors: Record<string, string>;
  submitted: boolean;
};

// C3 scope: validate the submitted application against the user's form_fields
// config. Persistence (upsert into `applications`) is wired in C4 — for now a
// valid submission returns `submitted: true` so the form/render/validation path
// is reviewable end-to-end without a database write.
export async function submitApplication(
  _prev: ApplyState,
  formData: FormData,
): Promise<ApplyState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { errors: { _form: "Please sign in again." }, submitted: false };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (!profile) return { errors: { _form: "Profile not found." }, submitted: false };

  const { data: fields, error } = await supabase
    .from("form_fields")
    .select("id,type,key,label,kind,options,required,position")
    .eq("type", profile.role)
    .order("position", { ascending: true });
  if (error || !fields) {
    return { errors: { _form: "Could not load the form." }, submitted: false };
  }

  const typed = fields as FormField[];
  const raw: Record<string, string> = {};
  for (const f of typed) raw[f.key] = String(formData.get(f.key) ?? "");

  const { errors } = validateApplication(raw, typed);
  if (Object.keys(errors).length > 0) return { errors, submitted: false };

  // C4 will upsert `{ user_id, type: profile.role, responses: raw, status: 'draft' }`
  // here and redirect to /dashboard. For C3 we stop at validation.
  return { errors: {}, submitted: true };
}
