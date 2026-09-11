import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SignOutButton } from "@/components/auth/sign-out-button";

// C11: one shared header for every signed-in surface, mounted in the root
// layout so no page has to remember to render it.
//
// It returns null when there is no session, which keeps /login, /signup and the
// landing page on their own centred layouts — a nav bar with a "Sign out"
// button above a login form would be nonsense.
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
          href="/"
          className="text-base font-extrabold tracking-tight text-berkeley-blue"
        >
          HackPortal
        </Link>

        <nav className="flex items-center gap-4 text-sm font-medium text-slate-600">
          <Link href="/dashboard" className={navLink}>
            Dashboard
          </Link>
          <Link href="/apply" className={navLink}>
            My application
          </Link>
          {isOrganizer && (
            <Link href="/organizer" className={navLink}>
              Organizer
            </Link>
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
