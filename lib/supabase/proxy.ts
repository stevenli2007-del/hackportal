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
  const isAuthPage = path === "/login" || path === "/signup";

  if (isProtected && !user) {
    const redirect = request.nextUrl.clone();
    redirect.pathname = "/login";
    return NextResponse.redirect(redirect);
  }
  if (isAuthPage && user) {
    const redirect = request.nextUrl.clone();
    redirect.pathname = "/dashboard";
    return NextResponse.redirect(redirect);
  }

  return supabaseResponse;
}
