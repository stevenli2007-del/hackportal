// Shared role helpers. Deliberately NOT in actions.ts: that module is marked
// "use server", and Next.js requires every export of a "use server" file to be
// an async function — a plain sync helper there would fail the build.
export function homePathForRole(role: string | null | undefined): string {
  return role === "organizer" ? "/organizer" : "/dashboard";
}
