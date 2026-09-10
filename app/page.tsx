import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center gap-6 px-6 text-center">
      <span className="rounded-full bg-california-gold px-3 py-1 text-xs font-bold uppercase tracking-wide text-berkeley-blue">
        Cal Hacks · Take-Home
      </span>
      <h1 className="text-4xl font-extrabold tracking-tight text-berkeley-blue sm:text-5xl">
        HackPortal
      </h1>
      <p className="max-w-xl text-lg text-slate-600">
        A miniature hackathon application portal. Applicant sign-up, organizer
        review, and a Review Console — coming online card by card.
      </p>
      <div className="flex gap-3">
        <Link href="/signup">
          <Button>Apply</Button>
        </Link>
        <Link href="/login">
          <Button className="bg-white text-berkeley-blue ring-1 ring-berkeley-blue">
            Organizer / Log in
          </Button>
        </Link>
      </div>
    </main>
  );
}
