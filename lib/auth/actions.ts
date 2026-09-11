"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Self-signup tracks. `organizer` is intentionally excluded — organizers are
// created only by the seed script (see Database.md §5 / ADR-7).
const SIGNUP_TRACKS = ["hacker", "judge", "mentor", "volunteer"] as const;
type SignupTrack = (typeof SIGNUP_TRACKS)[number];

export type AuthState = { error: string | null };

// Translate Supabase's raw errors into clean, non-leaky English copy.
// We never surface the provider's original message to the UI.
function mapAuthError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err ?? "");
  if (msg.includes("Invalid login")) return "Incorrect email or password.";
  if (msg.includes("already been registered") || msg.includes("User already registered"))
    return "An account with this email already exists.";
  if (msg.includes("Email not confirmed")) return "Please confirm your email first.";
  if (msg.includes("Password should be")) return "Password must be at least 6 characters.";
  if (msg.includes("Unable to validate email")) return "Enter a valid email address.";
  if (msg.includes("Signups not allowed") || msg.includes("signup is disabled"))
    return "Sign-ups are currently closed.";
  return "Something went wrong. Please try again.";
}

export async function signIn(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "Email and password are required." };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) return { error: mapAuthError(error) };

  // Role-aware landing: organizers go straight to the organizer console;
  // everyone else lands on their applicant dashboard. Reading the profile row
  // is RLS-scoped — a user can always read their own. Falls back to /dashboard.
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", data.user.id)
    .maybeSingle();
  redirect(profile?.role === "organizer" ? "/organizer" : "/dashboard");
}

export async function signUp(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const displayName = String(formData.get("display_name") ?? "").trim();
  const track = String(formData.get("track") ?? "");

  if (!email || !password || !displayName)
    return { error: "All fields are required." };
  if (!SIGNUP_TRACKS.includes(track as SignupTrack))
    return { error: "Pick a valid track." };

  const supabase = await createClient();
  // `track` + `display_name` go into raw_user_meta_data; the handle_new_user()
  // trigger (Database.md §4) copies them into profiles.role / display_name.
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { display_name: displayName, track } },
  });
  if (error) return { error: mapAuthError(error) };

  // Email confirmation is disabled for the demo (ADR-6), so a session exists
  // immediately and we can drop the user straight into the application form.
  redirect("/apply");
}
