"use client";

import { useFormStatus } from "react-dom";
import { signOut } from "@/lib/auth/actions";

// C11: a form posting to the `signOut` Server Action, so the session cookie is
// cleared server-side through the same Supabase client that minted it. A plain
// <Link> cannot do this — logout is a mutation, not a navigation.
export function SignOutButton() {
  return (
    <form action={signOut}>
      <Submit />
    </form>
  );
}

// useFormStatus reads the pending state of the *parent* <form>, so this must
// stay a separate child component rather than being inlined above.
function Submit() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md px-3 py-1.5 text-sm font-semibold text-berkeley-blue ring-1 ring-slate-300 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {pending ? "Signing out…" : "Sign out"}
    </button>
  );
}
