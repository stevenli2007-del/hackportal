import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseEnv } from "./env";

// Refreshes the Supabase session on every matched request and performs a
// lightweight (UX-layer) route guard. Real authorization lives in Server
// Components/Actions + RLS — this only avoids flashing protected pages.
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });
  const { url, anonKey } = getSupabaseEnv();

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        );
      },
    },
  });

  // getUser() is server-verified. Never use getSession() here (forgeable).
  // Do not put logic between createServerClient and this call.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isProtected = path.startsWith("/apply") || path.startsWith("/dashboard") || path.startsWith("/organizer");

  if (isProtected && !user) {
    const redirect = request.nextUrl.clone();
    redirect.pathname = "/login";
    return NextResponse.redirect(redirect);
  }

  // Signed-in users are kept away from /login and /signup — but by those pages
  // themselves, not here: picking the landing page needs the user's role, which
  // this middleware cannot read without an extra profile query per request. The
  // guard in each auth page also refuses to bounce a session with no profile
  // row, so no redirect loop can form.

  return supabaseResponse;
}
