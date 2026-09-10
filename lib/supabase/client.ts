import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseEnv } from "./env";

// Browser client (RLS-scoped, anon key). Use in "use client" components only.
export function createClient() {
  const { url, anonKey } = getSupabaseEnv();
  return createBrowserClient(url, anonKey);
}
