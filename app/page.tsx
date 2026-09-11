import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { homePathForRole } from "@/lib/auth/roles";

export const dynamic = "force-dynamic";

// Rendered as styled links (not Button inside Link) to avoid invalid <button>
// nested in <a>, and so each variant owns its text colour outright — the
// Button component's base `text-white` used to win over the override and made
// the secondary label invisible on its white background.
const primaryBtn =
  "inline-flex items-center justify-center rounded-md bg-berkeley-blue px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90";
const secondaryBtn =
  "inline-flex items-center justify-center rounded-md bg-white px-4 py-2 text-sm font-semibold text-berkeley-blue ring-1 ring-berkeley-blue transition hover:bg-slate-50";

export default async function Home() {
  // Signed-in visitors have a home already — drop them there (organizers to the
  // console, applicants to their dashboard) instead of showing a sign-up hero.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    redirect(homePathForRole(profile?.role));
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center gap-6 px-6 text-center">
      <span className="rounded-full bg-california-gold px-3 py-1 text-xs font-bold uppercase tracking-wide text-berkeley-blue">
        Cal Hacks · Take-Home
      </span>
      <h1 className="text-4xl font-extrabold tracking-tight text-berkeley-blue sm:text-5xl">
        HackPortal
      </h1>
      <p className="max-w-xl text-lg text-slate-600">
        A miniature hackathon application portal. Applicant sign-up, organizer
        review, and a Review Console — coming online card by card.
      </p>
      <div className="flex gap-3">
        <Link href="/signup" className={primaryBtn}>
          Apply
        </Link>
        <Link href="/login" className={secondaryBtn}>
          Organizer / Log in
        </Link>
      </div>
    </main>
  );
}
