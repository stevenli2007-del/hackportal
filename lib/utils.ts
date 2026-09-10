// Minimal class joiner (no external deps). Keeps conditional classNames readable.
export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}
