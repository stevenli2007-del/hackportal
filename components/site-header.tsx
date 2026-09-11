import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { homePathForRole } from "@/lib/auth/roles";

// C11: one shared header for every signed-in surface, mounted in the root
// layout so no page has to remember to render it.
//
// It returns null when there is no session, which keeps /login, /signup and the
// landing page on their own centred layouts — a nav bar with a "Sign out"
// button above a login form would be nonsense.
//
// The nav is role-split on purpose: an organizer has no application of their
// own, so "My application" would be a dead end, and an applicant can never
// reach the organizer console. The brand link and the only nav item both point
// at the role's own home.
//
// Reading the user here makes the whole app render per-request (cookies() is a
// dynamic API). That is deliberate: a header that guessed the auth state from
// the client would flash the wrong controls on every navigation, and every page
// that carries real data is already `force-dynamic`.
export async function SiteHeader() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // Own profile row — RLS always allows a user to read it (Database.md §4).
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, role")
    .eq("id", user.id)
    .maybeSingle();

  const isOrganizer = profile?.role === "organizer";
  const navLink = "hover:text-berkeley-blue hover:underline";

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-5 gap-y-2 px-6 py-3">
        <Link
          href={homePathForRole(profile?.role)}
          className="flex items-center gap-2 text-base font-extrabold tracking-tight text-berkeley-blue"
        >
          HackPortal
          {isOrganizer && (
            <span className="rounded-full bg-california-gold px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-berkeley-blue">
              Organizer
            </span>
          )}
        </Link>

        <nav className="flex items-center gap-4 text-sm font-medium text-slate-600">
          {isOrganizer ? (
            <Link href="/organizer" className={navLink}>
              Applications
            </Link>
          ) : (
            <>
              <Link href="/dashboard" className={navLink}>
                Dashboard
              </Link>
              <Link href="/apply" className={navLink}>
                My application
              </Link>
            </>
          )}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          <span className="hidden max-w-[14rem] truncate text-sm text-slate-500 sm:inline">
            {profile?.display_name ?? user.email}
          </span>
          <SignOutButton />
        </div>
      </div>
    </header>
  );
}
