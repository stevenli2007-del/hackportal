// Centralized Supabase environment reads.
// NOTE (CodingRules §7): in server clients, call cookies() BEFORE getSupabaseEnv()
// so Next.js does not mis-detect a static route at build time and crash on Vercel.

export function getSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Missing Supabase env vars: NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY",
    );
  }

  return { url, anonKey, serviceRoleKey };
}
