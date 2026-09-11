import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { OrganizerViews } from "@/components/organizer/organizer-views";
import { ApplicationsTable, type OrganizerRow } from "@/components/organizer/applications-table";
import { CoverageSummary } from "@/components/organizer/coverage-summary";

export const dynamic = "force-dynamic";

export default async function OrganizerPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Organizer-only surface. RLS already blocks non-organizers at the row level,
  // but we redirect early so applicants never see an empty organizer list.
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.role !== "organizer") redirect("/dashboard");

  // application_overview is the reviewed Postgres view (Database.md §3): it joins
  // applications + profiles and computes avg_score / assigned_count / reviewed_count
  // in one place, so the query stays reviewable and RLS-scoped.
  const { data, error } = await supabase
    .from("application_overview")
    .select("*")
    .order("created_at", { ascending: true });

  const applications = (data ?? []) as OrganizerRow[];

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <header className="mb-8">
        <Link
          href="/"
          className="rounded-full bg-california-gold px-3 py-1 text-xs font-bold uppercase tracking-wide text-berkeley-blue"
        >
          Cal Hacks · Organizer
        </Link>
        <h1 className="mt-3 text-3xl font-bold text-berkeley-blue">Applications</h1>
        <p className="mt-1 text-sm text-slate-600">
          Every application across all tracks, with average review score and grading coverage.
        </p>
      </header>

      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 p-6 text-sm text-red-700" role="alert">
          Could not load applications. Please try again.
        </div>
      ) : applications.length === 0 ? (
        <div className="rounded-md border border-slate-200 bg-white p-10 text-center text-slate-500">
          No applications have been submitted yet.
        </div>
      ) : (
        <>
          <CoverageSummary applications={applications} />
          <OrganizerViews applications={applications} />
        </>
      )}
    </main>
  );
}
