"use client";

import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { miniOptions } from "@/lib/api/query-options";
import type { MiniRun } from "@/lib/api/types";
import { RUN_STATUS, formatDuration, tenancyColor } from "@/lib/status";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import * as React from "react";

/**
 * Compact strip of plugin runs: one block per plugin, width by duration,
 * coloured by status, grouped by tenancy. Fetched lazily when the row is
 * on screen; a hover card lists plugins with start times and durations.
 * Live rows pass their steps inline (`runs`) and skip the fetch.
 */
export function MiniLineage({ runId, runs: inline }: { runId: string; runs?: MiniRun[] }) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [visible, setVisible] = React.useState(false);
  React.useEffect(() => {
    if (inline) return;
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => entries.some((e) => e.isIntersecting) && setVisible(true), { rootMargin: "200px" });
    io.observe(el);
    return () => io.disconnect();
  }, [inline]);
  const { data } = useQuery({ ...miniOptions(runId), enabled: visible && !inline });
  const runs = inline ?? data?.runs ?? [];
  const tenancies = Array.from(new Set(runs.map((r) => r.tenancy)));
  const total = Math.max(1, runs.reduce((n, r) => n + Math.max(r.durationMs ?? 500, 200), 0));

  return (
    <div ref={ref} className="h-6 w-full">
      {runs.length > 0 && (
        <HoverCard openDelay={150}>
          <HoverCardTrigger asChild>
            <div className="flex h-6 w-full items-center gap-px">
              {runs.map((r) => (
                <div
                  key={r.id}
                  className="h-3.5 min-w-1 rounded-[2px] border-b-2"
                  style={{
                    flex: `${Math.max(r.durationMs ?? 500, 200) / total} 1 0%`,
                    background: RUN_STATUS[r.status]?.color ?? "var(--muted-foreground)",
                    borderColor: tenancyColor(tenancies, r.tenancy),
                    opacity: r.status === "RUNNING" ? 0.6 : 0.85,
                  }}
                />
              ))}
            </div>
          </HoverCardTrigger>
          <HoverCardContent align="start" className="w-80 p-2">
            <div className="mb-1 text-xs font-medium">{runs.length} plugin runs · {tenancies.join(", ")}</div>
            <div className="grid grid-cols-[1fr_auto_auto] gap-x-3 gap-y-0.5 text-[11px]">
              {runs.map((r) => (
                <React.Fragment key={r.id}>
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="size-1.5 rounded-full" style={{ background: RUN_STATUS[r.status]?.color }} />
                    <span className="truncate">{r.plugin}</span>
                    <span className="truncate text-muted-foreground" style={{ color: tenancyColor(tenancies, r.tenancy) }}>{r.tenancy}</span>
                  </div>
                  <div className="font-mono text-muted-foreground">{format(new Date(r.startedAt), "HH:mm:ss")}</div>
                  <div className="text-right font-mono">{r.durationMs !== undefined ? formatDuration(r.durationMs) : "…"}</div>
                </React.Fragment>
              ))}
            </div>
          </HoverCardContent>
        </HoverCard>
      )}
    </div>
  );
}
