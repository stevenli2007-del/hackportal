"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { signIn, signUp, type AuthState } from "@/lib/auth/actions";
import { Button } from "@/components/ui/button";

const TRACKS = [
  { value: "hacker", label: "Hacker" },
  { value: "judge", label: "Judge" },
  { value: "mentor", label: "Mentor" },
  { value: "volunteer", label: "Volunteer" },
] as const;

const initial: AuthState = { error: null };

const fieldClass =
  "w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-berkeley-blue focus:ring-1 focus:ring-berkeley-blue";

export function AuthForm({
  defaultMode = "signin",
}: {
  defaultMode?: "signin" | "signup";
}) {
  const [mode, setMode] = useState<"signin" | "signup">(defaultMode);

  const [signInState, signInAction, signInPending] = useActionState(signIn, initial);
  const [signUpState, signUpAction, signUpPending] = useActionState(signUp, initial);

  const state = mode === "signin" ? signInState : signUpState;
  const pending = mode === "signin" ? signInPending : signUpPending;
  const action = mode === "signin" ? signInAction : signUpAction;

  return (
    <form action={action} className="flex flex-col gap-4">
      {mode === "signup" && (
        <>
          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
            Display name
            <input name="display_name" className={fieldClass} placeholder="Ada Lovelace" required />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
            Track
            <select name="track" defaultValue="hacker" className={fieldClass}>
              {TRACKS.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>
        </>
      )}

      <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
        Email
        <input name="email" type="email" autoComplete="email" className={fieldClass} placeholder="you@berkeley.edu" required />
      </label>

      <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
        Password
        <input name="password" type="password" autoComplete={mode === "signin" ? "current-password" : "new-password"} className={fieldClass} placeholder="••••••••" minLength={6} required />
      </label>

      {state.error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {state.error}
        </p>
      )}

      <Button type="submit" disabled={pending} className="mt-1">
        {pending ? "Working…" : mode === "signin" ? "Sign in" : "Create account"}
      </Button>

      <p className="text-center text-sm text-slate-600">
        {mode === "signin" ? (
          <>
            No account?{" "}
            <button
              type="button"
              onClick={() => setMode("signup")}
              className="font-semibold text-berkeley-blue hover:underline"
            >
              Create one
            </button>
          </>
        ) : (
          <>
            Already have an account?{" "}
            <Link href="/login" className="font-semibold text-berkeley-blue hover:underline">
              Sign in
            </Link>
          </>
        )}
      </p>
    </form>
  );
}
