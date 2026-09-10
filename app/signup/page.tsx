import Link from "next/link";
import { AuthForm } from "@/components/auth/auth-form";

export default function SignupPage() {
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
