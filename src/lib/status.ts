import type { JobStatus, RunStatus } from "@/lib/api/types";

/** One place for status colours shared by pills, graph nodes, mini strips and the waterfall. */
export const RUN_STATUS: Record<RunStatus, { label: string; className: string; color: string }> = {
  QUEUED: { label: "Queued", className: "bg-muted text-muted-foreground border-border", color: "var(--muted-foreground)" },
  RUNNING: { label: "Running", className: "bg-info/15 text-info border-info/30", color: "var(--info)" },
  COMPLETE: { label: "Complete", className: "bg-success/15 text-success border-success/30", color: "var(--success)" },
  FAIL: { label: "Failed", className: "bg-error/15 text-error border-error/30", color: "var(--error)" },
  ABORT: { label: "Aborted", className: "bg-warning/15 text-warning border-warning/30", color: "var(--warning)" },
};

export const JOB_STATUS: Record<JobStatus, { label: string; className: string }> = {
  QUEUED: { label: "Queued", className: "bg-muted text-muted-foreground border-border" },
  PENDING: { label: "Pending", className: "bg-warning/15 text-warning border-warning/30" },
  RUNNING: { label: "Running", className: "bg-info/15 text-info border-info/30" },
  SUCCEEDED: { label: "Succeeded", className: "bg-success/15 text-success border-success/30" },
  FAILED: { label: "Failed", className: "bg-error/15 text-error border-error/30" },
  STOPPED: { label: "Stopped", className: "bg-warning/15 text-warning border-warning/30" },
};

export const TENANCY_COLORS = ["#60a5fa", "#f97316", "#a78bfa", "#34d399", "#f472b6", "#facc15", "#22d3ee"];

export function tenancyColor(tenancies: string[], t: string) {
  const i = tenancies.indexOf(t);
  return TENANCY_COLORS[(i < 0 ? 0 : i) % TENANCY_COLORS.length];
}

export function formatDuration(ms?: number | null) {
  if (ms === undefined || ms === null) return "";
  if (ms < 1000) return `${ms} ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(ms < 10_000 ? 2 : 1)} s`;
  const m = Math.floor(ms / 60_000);
  const s = Math.round((ms % 60_000) / 1000);
  return `${m}m ${s}s`;
}
