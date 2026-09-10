import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ApplicationForm } from "@/components/application/application-form";
import type { FormField } from "@/lib/application/validation";

export const dynamic = "force-dynamic";

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
    .single();
  if (!profile) redirect("/login");

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

  const title = profile.role.charAt(0).toUpperCase() + profile.role.slice(1);

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
      <ApplicationForm fields={fields as FormField[]} />
    </main>
  );
}
