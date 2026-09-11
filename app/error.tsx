"use client";

import { useEffect } from "react";

// C11: app-wide error boundary. PRD §7 asks every surface to have an error
// state; route-level pages already handle their own, and this catches anything
// they do not so a failure never shows a blank page (or the raw dev overlay) to
// a judge mid-demo.
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surfaces the real error in the browser console / Vercel logs, where
    // `digest` can be matched to the server-side stack trace.
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-2xl font-bold text-berkeley-blue">Something went wrong</h1>
      <p className="text-sm text-slate-600">
        An unexpected error occurred while loading this page. Try again — if it
        keeps happening, reload the page.
      </p>
      <button
        onClick={reset}
        className="rounded-md bg-berkeley-blue px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
      >
        Try again
      </button>
    </main>
  );
}
