"use client";

import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { useLive } from "@/lib/live/store";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import * as React from "react";
import { Area, AreaChart, Bar, BarChart, XAxis, YAxis } from "recharts";

const activityConfig = {
  started: { label: "Jobs started", color: "var(--chart-1)" },
  finished: { label: "Jobs finished", color: "var(--chart-2)" },
} satisfies ChartConfig;

const throughputConfig = {
  ok: { label: "Succeeded", color: "var(--success)" },
  failed: { label: "Failed", color: "var(--error)" },
} satisfies ChartConfig;

const hhmm = (t: number) => format(t, "HH:mm");

/**
 * Four compact panels above the live grid, all from the job store: what is in
 * flight, jobs started and finished per minute, throughput with the failure
 * rate, and the queue by priority. Recharts runs without animation and the
 * stats feed is throttled upstream, so redraws are cheap even on slow machines.
 */
export const LiveCharts = React.memo(function LiveCharts() {
  const stats = useLive((s) => s.stats);
  const series = React.useMemo(() => (stats?.series ?? []).map((b) => ({ ...b, ok: b.finished - b.failed })), [stats?.series]);
  const last5 = series.slice(-6, -1); // whole minutes only
  const perMin = last5.length ? last5.reduce((n, b) => n + b.finished, 0) / last5.length : 0;
  const failed = series.reduce((n, b) => n + b.failed, 0);
  const finished = series.reduce((n, b) => n + b.finished, 0);
  const started = series.reduce((n, b) => n + b.started, 0);
  const by = stats?.byStatus ?? {};
  const queued = by.QUEUED ?? 0;
  const running = by.RUNNING ?? 0;
  const maxPrio = Math.max(1, ...(stats?.byPriority.map((p) => p.count) ?? [1]));
  const pending = stats ? stats.runs - stats.enriched : 0;

  return (
    <div className="grid grid-cols-2 gap-2 xl:grid-cols-4">
      <Card title="In flight" value={`${queued + running}`} hint={`files · ${stats?.retain ?? "15m"} window${pending ? ` · ${pending} awaiting lineage` : ""}`}>
        <div className="mt-1 flex h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <Seg n={running} total={stats?.runs ?? 0} className="bg-info" />
          <Seg n={queued} total={stats?.runs ?? 0} className="bg-muted-foreground/50" />
          <Seg n={by.COMPLETE ?? 0} total={stats?.runs ?? 0} className="bg-success" />
          <Seg n={by.FAIL ?? 0} total={stats?.runs ?? 0} className="bg-error" />
        </div>
        <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
          <Stat dot="bg-info" label="Running" n={running} />
          <Stat dot="bg-muted-foreground/50" label="Queued" n={queued} />
          <Stat dot="bg-success" label="Completed" n={by.COMPLETE ?? 0} />
          <Stat dot="bg-error" label="Failed" n={by.FAIL ?? 0} />
        </dl>
        {stats?.byCluster.length ? (
          <p className="mt-1.5 truncate font-mono text-[10px] text-muted-foreground">
            {stats.byCluster.map((c) => `${c.cluster} ${c.running}▶ ${c.queued}⏸`).join(" · ")}
          </p>
        ) : null}
      </Card>

      <Card title="Job activity" value={started.toLocaleString()} hint="jobs started / min, last hour">
        <ChartContainer config={activityConfig} className="mt-1 h-20 w-full aspect-auto">
          <AreaChart data={series} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="live-fill-started" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-started)" stopOpacity={0.5} />
                <stop offset="100%" stopColor="var(--color-started)" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <XAxis dataKey="t" tickFormatter={hhmm} tickLine={false} axisLine={false} minTickGap={48} fontSize={10} height={14} />
            <YAxis hide domain={[0, "dataMax"]} />
            <ChartTooltip content={<ChartTooltipContent labelFormatter={(_, p) => hhmm((p?.[0]?.payload as { t: number })?.t ?? 0)} />} />
            <Area type="monotone" dataKey="started" stroke="var(--color-started)" strokeWidth={1.5} fill="url(#live-fill-started)" isAnimationActive={false} />
            <Area type="monotone" dataKey="finished" stroke="var(--color-finished)" strokeWidth={1.5} fill="transparent" isAnimationActive={false} />
          </AreaChart>
        </ChartContainer>
      </Card>

      <Card title="Throughput" value={`${perMin.toFixed(1)}/min`} hint={`jobs finished · ${finished ? Math.round((failed / finished) * 100) : 0}% failed`}>
        <ChartContainer config={throughputConfig} className="mt-1 h-20 w-full aspect-auto">
          <BarChart data={series} margin={{ top: 4, right: 0, bottom: 0, left: 0 }} barCategoryGap={1}>
            <XAxis dataKey="t" tickFormatter={hhmm} tickLine={false} axisLine={false} minTickGap={48} fontSize={10} height={14} />
            <YAxis hide />
            <ChartTooltip content={<ChartTooltipContent labelFormatter={(_, p) => hhmm((p?.[0]?.payload as { t: number })?.t ?? 0)} />} />
            <Bar dataKey="ok" stackId="a" fill="var(--color-ok)" isAnimationActive={false} />
            <Bar dataKey="failed" stackId="a" fill="var(--color-failed)" radius={[2, 2, 0, 0]} isAnimationActive={false} />
          </BarChart>
        </ChartContainer>
      </Card>

      <Card title="Waiting by priority" value={`${stats?.byPriority.reduce((n, p) => n + p.count, 0) ?? 0}`} hint="jobs queued, higher priority first">
        <div className="mt-1.5 flex flex-col gap-1">
          {stats?.byPriority.length ? (
            stats.byPriority.map((p) => (
              <div key={p.priority} className="flex items-center gap-2 text-[11px]">
                <span className={cn("w-6 shrink-0 font-mono", p.priority >= 5 ? "text-warning" : "text-muted-foreground")}>P{p.priority}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                  <div className={cn("h-full rounded-full", p.priority >= 5 ? "bg-warning" : "bg-chart-1")} style={{ width: `${Math.max(4, (p.count / maxPrio) * 100)}%` }} />
                </div>
                <span className="w-5 text-right font-mono">{p.count}</span>
              </div>
            ))
          ) : (
            <p className="py-4 text-center text-[11px] text-muted-foreground">Nothing waiting</p>
          )}
        </div>
      </Card>
    </div>
  );
});

function Card({ title, value, hint, children }: { title: string; value: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0 rounded-lg border bg-card/60 px-3 py-2">
      <div className="truncate text-[10px] font-medium tracking-wide text-muted-foreground uppercase">{title}</div>
      <div className="flex items-baseline gap-2">
        <span className="font-mono text-lg leading-tight font-semibold tabular-nums">{value}</span>
        {hint && <span className="truncate text-[10px] text-muted-foreground">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

function Seg({ n, total, className }: { n: number; total: number; className: string }) {
  if (!n || !total) return null;
  return <div className={cn("h-full", className)} style={{ width: `${(n / total) * 100}%` }} />;
}

function Stat({ dot, label, n }: { dot: string; label: string; n: number }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={cn("size-1.5 shrink-0 rounded-full", dot)} />
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="ml-auto font-mono tabular-nums">{n}</dd>
    </div>
  );
}
