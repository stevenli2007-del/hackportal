import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ReviewForm } from "@/components/organizer/review-form";
import type { FormField } from "@/lib/application/validation";
import type { RubricCriterion } from "@/lib/organizer/scoring";

export const dynamic = "force-dynamic";

// Guard the route param before it reaches PostgREST: a malformed uuid would
// otherwise surface as a database error instead of a clean 404.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const STATUS_BADGE: Record<string, string> = {
  draft: "bg-slate-100 text-slate-700",
  submitted: "bg-green-50 text-green-700",
  under_review: "bg-blue-50 text-blue-700",
  accepted: "bg-green-50 text-green-700",
  waitlisted: "bg-yellow-50 text-yellow-700",
  rejected: "bg-red-50 text-red-700",
};

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default async function ApplicationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.role !== "organizer") redirect("/dashboard");

  // Aggregate row from the view (avg_score / coverage) — security_invoker since
  // 0003, so the organizer sees every application and nothing else changes.
  const { data: overview } = await supabase
    .from("application_overview")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!overview) notFound();

  // Raw answers live on the base table; the view does not carry the jsonb.
  const { data: application } = await supabase
    .from("applications")
    .select("responses")
    .eq("id", id)
    .maybeSingle();

  // Labels + order for the response list come from form_fields, exactly like
  // the applicant form — one config table drives both sides of the portal.
  const { data: fields } = await supabase
    .from("form_fields")
    .select("id,type,key,label,kind,options,required,position")
    .eq("type", overview.type)
    .order("position", { ascending: true });

  const { data: criteria } = await supabase
    .from("rubric_criteria")
    .select("id,key,label,weight,max_score,position")
    .order("position", { ascending: true });

  // The caller's own grade, if they already graded this application.
  const { data: myReview } = await supabase
    .from("reviews")
    .select("scores,total,notes")
    .eq("application_id", id)
    .eq("reviewer_id", user.id)
    .maybeSingle();

  const responses = (application?.responses ?? {}) as Record<string, string>;
  const typedFields = (fields ?? []) as FormField[];
  const typedCriteria = (criteria ?? []) as RubricCriterion[];
  const badge = STATUS_BADGE[overview.status] ?? "bg-slate-100 text-slate-700";
  const reviewed = Number(overview.reviewed_count) || 0;
  const assigned = Number(overview.assigned_count) || 0;

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <Link href="/organizer" className="text-sm font-semibold text-berkeley-blue hover:underline">
        ← All applications
      </Link>

      <header className="mt-4 mb-8">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-bold text-berkeley-blue">
            {overview.display_name || "Applicant"}
          </h1>
          <span className={`inline-flex rounded-md px-2 py-0.5 text-xs font-semibold ${badge}`}>
            {overview.status}
          </span>
        </div>
        <p className="mt-1 text-sm capitalize text-slate-600">
          {overview.type} track · submitted {formatDate(overview.submitted_at)}
        </p>
      </header>

      <section className="mb-8">
        <h2 className="mb-3 text-lg font-bold text-berkeley-blue">Responses</h2>
        {typedFields.length === 0 ? (
          <p className="text-sm text-slate-500">No form is configured for this track.</p>
        ) : (
          <dl className="divide-y divide-slate-200 rounded-md border border-slate-200 bg-white">
            {typedFields.map((f) => (
              <div key={f.id} className="flex gap-4 px-4 py-3">
                <dt className="w-1/3 text-sm font-medium text-slate-500">{f.label}</dt>
                <dd className="w-2/3 whitespace-pre-wrap text-sm text-slate-900">
                  {responses[f.key] || "—"}
                </dd>
              </div>
            ))}
          </dl>
        )}
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-lg font-bold text-berkeley-blue">Grading</h2>

        <dl className="mb-4 flex flex-wrap gap-6 rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
          <div>
            <dt className="text-slate-500">Average score</dt>
            <dd className="font-semibold text-slate-900">
              {reviewed > 0 ? `${Number(overview.avg_score).toFixed(1)} / 5` : "No grades yet"}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">Coverage</dt>
            <dd className="font-semibold text-slate-900">
              {reviewed} of {assigned} assigned reviews
            </dd>
          </div>
          {myReview && (
            <div>
              <dt className="text-slate-500">Your grade</dt>
              <dd className="font-semibold text-berkeley-blue">
                {myReview.total !== null ? `${Number(myReview.total).toFixed(1)} / 5` : "—"}
              </dd>
            </div>
          )}
        </dl>

        {typedCriteria.length === 0 ? (
          <p className="text-sm text-slate-500">No rubric is configured yet.</p>
        ) : (
          <ReviewForm
            applicationId={id}
            criteria={typedCriteria}
            initialScores={(myReview?.scores ?? {}) as Record<string, number>}
            initialNotes={myReview?.notes ?? ""}
          />
        )}
      </section>
    </main>
  );
}
