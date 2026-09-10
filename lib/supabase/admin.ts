import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { getSupabaseEnv } from "./env";

// Service-role client BYPASSES RLS. Server-only (Route Handlers / seed).
// NEVER prefix SUPABASE_SERVICE_ROLE_KEY with NEXT_PUBLIC_.
const { url, serviceRoleKey } = getSupabaseEnv();

if (!serviceRoleKey) {
  throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY (server-only).");
}

export const supabaseAdmin = createSupabaseClient(url, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
