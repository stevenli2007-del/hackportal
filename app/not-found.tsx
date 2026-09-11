import Link from "next/link";

// C11: shared 404. Reached by any unknown route, and by `notFound()` in
// /organizer/[id] for a malformed id or an application that is not visible to
// the caller — hence the second sentence, which makes that case legible.
export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="text-sm font-semibold uppercase tracking-wide text-california-gold-dark">
        404
      </p>
      <h1 className="text-2xl font-bold text-berkeley-blue">Page not found</h1>
      <p className="text-sm text-slate-600">
        That page doesn&apos;t exist, or the application you followed a link to
        isn&apos;t available to your account.
      </p>
      <Link
        href="/"
        className="rounded-md bg-berkeley-blue px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
      >
        Back to home
      </Link>
    </main>
  );
}
