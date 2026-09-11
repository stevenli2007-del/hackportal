import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// Applicant-facing labels + colours for each stored status.
const STATUS_BANNER: Record<string, { label: string; cls: string }> = {
  draft: { label: "Draft", cls: "bg-slate-100 text-slate-700" },
  submitted: { label: "Submitted", cls: "bg-green-50 text-green-700" },
  under_review: { label: "Under review", cls: "bg-blue-50 text-blue-700" },
  accepted: { label: "Accepted", cls: "bg-green-50 text-green-700" },
  waitlisted: { label: "Waitlisted", cls: "bg-yellow-50 text-yellow-700" },
  rejected: { label: "Rejected", cls: "bg-red-50 text-red-700" },
};

// PRD F-4: the 3-step applicant timeline (Applied → Under review → Decision).
const STEPS = ["Applied", "Under review", "Decision"] as const;

// How many timeline steps a given status has reached.
function reachedSteps(status: string): number {
  switch (status) {
    case "draft":
      return 0;
    case "submitted":
      return 1;
    case "under_review":
      return 2;
    default:
      return 3; // accepted / waitlisted / rejected → decided
  }
}

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

const cta =
  "inline-flex items-center justify-center rounded-md bg-berkeley-blue px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, role")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile) redirect("/login");

  // Organizers have no application of their own — the applicant dashboard is
  // not their surface. Mirrors the guard in app/organizer/page.tsx.
  if (profile.role === "organizer") redirect("/organizer");

  // The applicant's own row. RLS lets the owner read it (applications_select
  // allows user_id = auth.uid()); no review data crosses this surface.
  const { data: application } = await supabase
    .from("applications")
    .select("status, submitted_at, decided_at")
    .eq("user_id", user.id)
    .maybeSingle();

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <header className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-wide text-california-gold-dark">
          {profile.role} dashboard
        </p>
        <h1 className="text-3xl font-bold text-berkeley-blue">
          Welcome, {profile.display_name}
        </h1>
      </header>

      {!application ? (
        <section className="rounded-md border border-slate-200 bg-white p-6 text-center">
          <p className="text-slate-700">
            You haven&apos;t started an application yet.
          </p>
          <Link href="/apply" className={`mt-4 ${cta}`}>
            Start your application
          </Link>
        </section>
      ) : application.status === "draft" ? (
        <section className="space-y-4 rounded-md border border-slate-200 bg-white p-6">
          <span
            className={`inline-flex rounded-md px-3 py-1 text-sm font-semibold ${STATUS_BANNER.draft.cls}`}
          >
            Draft
          </span>
          <p className="text-slate-700">
            Your application is saved as a draft. Submit it when you&apos;re ready.
          </p>
          <Link href="/apply" className={cta}>
            Continue your application
          </Link>
        </section>
      ) : (
        <SubmittedSummary application={application} />
      )}
    </main>
  );
}

function SubmittedSummary({
  application,
}: {
  application: {
    status: string;
    submitted_at: string | null;
    decided_at: string | null;
  };
}) {
  const banner = STATUS_BANNER[application.status] ?? {
    label: application.status,
    cls: "bg-slate-100 text-slate-700",
  };
  const reached = reachedSteps(application.status);

  return (
    <div className="space-y-8">
      <span
        className={`inline-flex rounded-md px-3 py-1 text-sm font-semibold ${banner.cls}`}
      >
        {banner.label}
      </span>

      <ol className="flex items-center">
        {STEPS.map((step, i) => {
          const done = i < reached;
          return (
            <li key={step} className="flex flex-1 items-center last:flex-none">
              <div className="flex flex-col items-center gap-2">
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${
                    done ? "bg-berkeley-blue text-white" : "bg-slate-200 text-slate-500"
                  }`}
                >
                  {i + 1}
                </span>
                <span
                  className={`text-xs font-medium ${
                    done ? "text-berkeley-blue" : "text-slate-400"
                  }`}
                >
                  {step}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <span
                  className={`mx-2 h-0.5 flex-1 ${
                    i < reached - 1 ? "bg-berkeley-blue" : "bg-slate-200"
                  }`}
                />
              )}
            </li>
          );
        })}
      </ol>

      <dl className="divide-y divide-slate-200 rounded-md border border-slate-200">
        <div className="flex gap-4 px-4 py-3">
          <dt className="w-1/3 text-sm font-medium text-slate-500">Submitted</dt>
          <dd className="w-2/3 text-sm text-slate-900">
            {formatDate(application.submitted_at)}
          </dd>
        </div>
        {application.decided_at && (
          <div className="flex gap-4 px-4 py-3">
            <dt className="w-1/3 text-sm font-medium text-slate-500">Decided</dt>
            <dd className="w-2/3 text-sm text-slate-900">
              {formatDate(application.decided_at)}
            </dd>
          </div>
        )}
      </dl>

      <Link href="/apply" className={cta}>
        View your application
      </Link>
    </div>
  );
}
