/** Date values travel as ISO strings or date math; the UI holds Dates when it can. */

export function toISO(v: unknown): string | null {
  if (v instanceof Date) return v.toISOString();
  if (typeof v === "number") return new Date(v).toISOString();
  if (typeof v === "string" && v) return v;
  return null;
}

/** ISO strings and epoch millis become Dates; date math such as `now-7d` stays text. */
export function fromISO(v: unknown): Date | string | null {
  if (!v) return null;
  if (typeof v === "number") return new Date(v);
  if (typeof v === "string") {
    const t = new Date(v);
    return Number.isNaN(t.getTime()) ? v : t;
  }
  return null;
}
