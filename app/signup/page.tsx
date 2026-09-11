import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth/auth-form";
import { createClient } from "@/lib/supabase/server";
import { homePathForRole } from "@/lib/auth/roles";

export const dynamic = "force-dynamic";

export default async function SignupPage() {
  // Signed-in visitors have a home already. Bounce only when a profile row
  // exists; a session with no profile is an orphan, and sending it to
  // /dashboard would redirect straight back here forever.
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
    if (profile) redirect(homePathForRole(profile.role));
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 px-6">
      <div className="flex flex-col items-center gap-2 text-center">
        <Link
          href="/"
          className="rounded-full bg-california-gold px-3 py-1 text-xs font-bold uppercase tracking-wide text-berkeley-blue"
        >
          Cal Hacks · Take-Home
        </Link>
        <h1 className="text-3xl font-extrabold tracking-tight text-berkeley-blue">Apply</h1>
        <p className="text-sm text-slate-600">
          Pick a track and create your HackPortal account.
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <AuthForm defaultMode="signup" />
      </div>
    </main>
  );
}
