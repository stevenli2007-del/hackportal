import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ApplicationForm } from "@/components/application/application-form";
import type { FormField } from "@/lib/application/validation";

export const dynamic = "force-dynamic";

const STATUS_BANNER: Record<string, { label: string; cls: string }> = {
  submitted: { label: "Submitted", cls: "bg-green-50 text-green-700" },
  under_review: { label: "Under review", cls: "bg-blue-50 text-blue-700" },
  accepted: { label: "Accepted", cls: "bg-green-50 text-green-700" },
  waitlisted: { label: "Waitlisted", cls: "bg-yellow-50 text-yellow-700" },
  rejected: { label: "Rejected", cls: "bg-red-50 text-red-700" },
};

export default async function ApplyPage() {
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

  // Organizers do not apply. Without this the form_fields lookup below runs with
  // type='organizer', matches nothing, and renders "No form yet".
  if (profile.role === "organizer") redirect("/organizer");

  const { data: fields, error } = await supabase
    .from("form_fields")
    .select("id,type,key,label,kind,options,required,position")
    .eq("type", profile.role)
    .order("position", { ascending: true });

  if (error || !fields || fields.length === 0) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-12">
        <h1 className="text-2xl font-bold text-berkeley-blue">No form yet</h1>
        <p className="mt-2 text-slate-600">
          No application form is configured for your track ({profile.role}) yet.
        </p>
      </main>
    );
  }

  const typed = fields as FormField[];

  // The applicant's own application — null on first visit (maybeSingle, not
  // single, so a missing row is not an error).
  const { data: application } = await supabase
    .from("applications")
    .select("status, responses, submitted_at")
    .eq("user_id", user.id)
    .maybeSingle();

  const title = profile.role.charAt(0).toUpperCase() + profile.role.slice(1);
  // Editable when there is no application yet, or the existing one is still a draft.
  const isEditable = !application || application.status === "draft";
  const initialValues = isEditable
    ? ((application?.responses ?? {}) as Record<string, string>)
    : {};

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <header className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-wide text-california-gold-dark">
          {title} application
        </p>
        <h1 className="text-3xl font-bold text-berkeley-blue">Apply to HackPortal</h1>
        <p className="mt-2 text-slate-600">
          Welcome, {profile.display_name}. Fill out your {profile.role} application below.
        </p>
      </header>

      {isEditable ? (
        <ApplicationForm fields={typed} initialValues={initialValues} />
      ) : (
        <ReadOnlyApplication
          fields={typed}
          responses={(application?.responses ?? {}) as Record<string, string>}
          status={application?.status ?? "submitted"}
        />
      )}
    </main>
  );
}

// Read-only view once an application has been submitted (or moved past draft).
// Edits are locked by RLS (applications_update_own using status='draft'), and the
// UI honours that by not rendering the form at all.
function ReadOnlyApplication({
  fields,
  responses,
  status,
}: {
  fields: FormField[];
  responses: Record<string, string>;
  status: string;
}) {
  const banner = STATUS_BANNER[status] ?? {
    label: status,
    cls: "bg-slate-100 text-slate-700",
  };

  return (
    <div className="space-y-6">
      <div className={`inline-flex rounded-md px-3 py-1 text-sm font-semibold ${banner.cls}`}>
        {banner.label}
      </div>
      <p className="text-sm text-slate-600">
        Your application has been submitted and is now locked for edits.
      </p>
      <dl className="divide-y divide-slate-200 rounded-md border border-slate-200">
        {fields.map((f) => (
          <div key={f.id} className="flex gap-4 px-4 py-3">
            <dt className="w-1/3 text-sm font-medium text-slate-500">{f.label}</dt>
            <dd className="w-2/3 text-sm text-slate-900">{responses[f.key] || "—"}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
