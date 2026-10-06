"use client";

import { DataTableInfinite } from "@/components/data-table/data-table-infinite";
import { MiniLineage } from "@/components/events/mini-lineage";
import { RunStatusPill } from "@/components/events/status-pill";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useNow } from "@/hooks/use-now";
import { schemaOptions } from "@/lib/api/query-options";
import type { LiveRun, SchemaResponse } from "@/lib/api/types";
import { useLive, type LiveConnection } from "@/lib/live/store";
import { toTableSchema } from "@/lib/schema/to-table-schema";
import { formatDuration } from "@/lib/status";
import { useMemoryAdapter } from "@/lib/store/adapters/memory";
import { useFilterState } from "@/lib/store/hooks/useFilterState";
import { DataTableStoreProvider } from "@/lib/store/provider/DataTableStoreProvider";
import { createSchema, field } from "@/lib/store/schema";
import { useTabs } from "@/lib/store/tabs";
import type { DataTableFeatures } from "@/lib/table/features";
import { generateColumns, getDefaultColumnVisibility } from "@/lib/table-schema";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { AlertCircle, CircleDashed, Radio, Search } from "lucide-react";
import * as React from "react";
import { LiveCharts } from "./live-charts";

type StatusFilter = "active" | "queued" | "running" | "finished";
const STATUS_SETS: Record<StatusFilter, Set<string>> = {
  active: new Set(["QUEUED", "RUNNING"]),
  queued: new Set(["QUEUED"]),
  running: new Set(["RUNNING"]),
  finished: new Set(["COMPLETE", "FAIL", "ABORT"]),
};

/** The Live tab: the same grid as Events, fed by the WebSocket store. */
export function LiveTab() {
  const { data: schema, isLoading, error } = useQuery(schemaOptions());
  if (isLoading) {
    return (
      <div className="flex h-full flex-col gap-3 p-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-28 w-full" />
        <Skeleton className="flex-1" />
      </div>
    );
  }
  if (error || !schema) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertTitle>Could not load schema</AlertTitle>
          <AlertDescription>{error?.message ?? "Unknown error"}</AlertDescription>
        </Alert>
      </div>
    );
  }
  return <Loaded schema={schema} />;
}

// Only the detail selection and sort live in the store; the toggles are plain state.
const LIVE_SCHEMA = createSchema({ uuid: field.string(), sort: field.sort() });

function Loaded({ schema }: { schema: SchemaResponse }) {
  const adapter = useMemoryAdapter(LIVE_SCHEMA.definition, { id: "live" });
  return (
    <DataTableStoreProvider adapter={adapter}>
      <LiveTable schema={schema} />
    </DataTableStoreProvider>
  );
}

const noop = async () => {};

function LiveTable({ schema }: { schema: SchemaResponse }) {
  const tableSchema = React.useMemo(() => toTableSchema(schema), [schema]);
  const columns = React.useMemo(() => {
    const generated = generateColumns<LiveRun>(tableSchema.definition);
    // select, time, then the live columns, then the promoted fields
    return [generated[0], generated[1], ...liveColumns(schema.timeField), ...generated.slice(2)];
  }, [tableSchema, schema.timeField]);
  const defaultVisibility = React.useMemo(() => getDefaultColumnVisibility(tableSchema.definition), [tableSchema]);

  const byId = useLive((s) => s.runs);
  const [status, setStatus] = React.useState<StatusFilter>("active");
  const [cluster, setCluster] = React.useState("");
  const [q, setQ] = React.useState("");

  const clusters = React.useMemo(() => {
    const set = new Set<string>();
    for (const r of Object.values(byId)) if (r._cluster) set.add(r._cluster);
    return Array.from(set).sort();
  }, [byId]);

  const rows = React.useMemo(() => {
    const allowed = STATUS_SETS[status];
    const needle = q.trim().toLowerCase();
    const out: LiveRun[] = [];
    for (const r of Object.values(byId)) {
      if (!allowed.has(r._status)) continue;
      if (cluster && r._cluster !== cluster) continue;
      if (needle && !haystack(r, schema).includes(needle)) continue;
      out.push(r);
    }
    out.sort(byDefaultOrder(schema.timeField));
    return out;
  }, [byId, status, cluster, q, schema]);

  const open = useTabs((s) => s.open);
  const uuid = useFilterState<Record<string, unknown>, string | null | undefined>((s) => s.uuid as string | null | undefined);
  React.useEffect(() => {
    if (uuid) open(uuid);
  }, [uuid, open]);
  const rowClass = React.useCallback(
    (row: { original: LiveRun }) => (row.original._status === "FAIL" ? "bg-error/5 hover:bg-error/10" : row.original._status === "QUEUED" ? "text-muted-foreground" : ""),
    [],
  );

  return (
    <div className="h-full min-h-0">
      <DataTableInfinite<LiveRun>
        columns={columns}
        data={rows}
        totalRows={Object.keys(byId).length}
        filterRows={rows.length}
        totalRowsFetched={rows.length}
        defaultColumnVisibility={defaultVisibility}
        defaultRowSelection={uuid ? { [uuid]: true } : undefined}
        fetchNextPage={noop}
        hasNextPage={false}
        getRowId={(row) => row._runId}
        getRowClassName={rowClass}
        hideFilters
        tableId="live"
        commandSlot={<LiveControls status={status} setStatus={setStatus} cluster={cluster} setCluster={setCluster} clusters={clusters} q={q} setQ={setQ} />}
        chartSlot={<LiveCharts />}
      />
    </div>
  );
}

type ControlsProps = {
  status: StatusFilter;
  setStatus: (s: StatusFilter) => void;
  cluster: string;
  setCluster: (c: string) => void;
  clusters: string[];
  q: string;
  setQ: (q: string) => void;
};

/** Toggles, quick search and the connection badge. Reads counts itself so the grid does not re-render for them. */
const LiveControls = React.memo(function LiveControls({ status, setStatus, cluster, setCluster, clusters, q, setQ }: ControlsProps) {
  const counts = useLive((s) => s.counts);
  const connection = useLive((s) => s.status);
  return (
    <div className="flex flex-wrap items-center gap-2">
      <ToggleGroup type="single" size="sm" spacing={1} value={status} onValueChange={(v) => v && setStatus(v as StatusFilter)} className="rounded-lg bg-muted/60 p-[3px]">
        <ToggleGroupItem value="active" className="h-7 gap-1.5 px-2.5 text-xs">
          Active <Count n={counts.queued + counts.running} />
        </ToggleGroupItem>
        <ToggleGroupItem value="queued" className="h-7 gap-1.5 px-2.5 text-xs">
          Queued <Count n={counts.queued} />
        </ToggleGroupItem>
        <ToggleGroupItem value="running" className="h-7 gap-1.5 px-2.5 text-xs">
          Running <Count n={counts.running} />
        </ToggleGroupItem>
        <ToggleGroupItem value="finished" className="h-7 gap-1.5 px-2.5 text-xs">
          Finished <Count n={counts.finished} />
        </ToggleGroupItem>
      </ToggleGroup>
      <ToggleGroup type="single" size="sm" spacing={1} value={cluster} onValueChange={(v) => setCluster(v ?? "")} className="rounded-lg bg-muted/60 p-[3px]">
        <ToggleGroupItem value="" className="h-7 px-2.5 text-xs">All clusters</ToggleGroupItem>
        {clusters.map((c) => (
          <ToggleGroupItem key={c} value={c} className="h-7 px-2.5 font-mono text-xs">{c}</ToggleGroupItem>
        ))}
      </ToggleGroup>
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Quick search: file, project, plugin, id" className="h-8 w-72 pl-8 text-xs" />
      </div>
      <LiveBadge status={connection} className="ml-auto" />
    </div>
  );
});

function Count({ n }: { n: number }) {
  return <span className="rounded-full bg-foreground/[0.08] px-1.5 font-mono text-[10px] tabular-nums">{n}</span>;
}

function LiveBadge({ status, className }: { status: LiveConnection; className?: string }) {
  const live = status === "live";
  return (
    <Badge variant="outline" className={cn("h-6 gap-1.5 text-[11px]", live ? "border-success/30 text-success" : "text-muted-foreground", className)}>
      <Radio className={cn("size-3", live && "animate-pulse")} />
      {live ? "live" : status === "connecting" ? "connecting…" : "reconnecting…"}
    </Badge>
  );
}

/** Text the quick search matches against: identifiers, file, project, current and queued plugin. */
function haystack(r: LiveRun, schema: SchemaResponse): string {
  const p = schema.paths;
  return [r._runId, r._rootId, r._cluster, r._current?.plugin, r._job?.plugin, r._job?.rayJobId, r._job?.submissionId, r[p.filename ?? ""], r[p.project ?? ""], r[p.rootId ?? ""], r[p.controlset ?? ""], r[p.mimetype ?? ""]]
    .flat()
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

/** Running first (newest start on top), then the queue by priority and position, then recently finished. */
function byDefaultOrder(timeField: string) {
  const rank = (s: string) => (s === "RUNNING" ? 0 : s === "QUEUED" ? 1 : 2);
  const t = (r: LiveRun) => Date.parse(String(r[timeField] ?? r._startedAt));
  return (a: LiveRun, b: LiveRun) => {
    const ra = rank(a._status);
    const rb = rank(b._status);
    if (ra !== rb) return ra - rb;
    if (ra === 1) {
      if ((b._priority ?? 0) !== (a._priority ?? 0)) return (b._priority ?? 0) - (a._priority ?? 0);
      return (a._queuePosition ?? 0) - (b._queuePosition ?? 0);
    }
    if (ra === 2) return Date.parse(b._endedAt ?? "") - Date.parse(a._endedAt ?? "");
    return t(b) - t(a);
  };
}

function liveColumns(timeField: string): ColumnDef<DataTableFeatures, LiveRun>[] {
  return [
    {
      id: "_status",
      accessorKey: "_status",
      header: "Status",
      size: 105,
      enableResizing: true,
      cell: ({ row }) => (
        <span className="flex items-center gap-1.5">
          <RunStatusPill status={row.original._status} />
          {!row.original._enriched && <CircleDashed className="size-3.5 shrink-0 text-muted-foreground/70" aria-label="OpenLineage events not indexed yet" />}
        </span>
      ),
      meta: { label: "Status" },
    },
    {
      id: "_priority",
      accessorFn: (r) => r._priority ?? -1,
      header: "Priority",
      size: 80,
      enableResizing: true,
      cell: ({ row }) => {
        const p = row.original._priority;
        if (p === null) return null;
        return <Badge variant="outline" className={cn("h-5 px-1.5 font-mono text-[11px]", p >= 5 && "border-warning/40 text-warning")}>P{p}</Badge>;
      },
      meta: { label: "Priority" },
    },
    {
      id: "_queuePosition",
      accessorFn: (r) => r._queuePosition ?? Number.MAX_SAFE_INTEGER,
      header: "Pos",
      size: 60,
      enableResizing: true,
      cell: ({ row }) => <span className="font-mono text-xs text-muted-foreground">{row.original._queuePosition ? `#${row.original._queuePosition}` : ""}</span>,
      meta: { label: "Queue position" },
    },
    {
      id: "_cluster",
      accessorKey: "_cluster",
      header: "Cluster",
      size: 80,
      enableResizing: true,
      cell: ({ row }) => <span className="font-mono text-xs">{row.original._cluster}</span>,
      meta: { label: "Cluster" },
    },
    {
      id: "_step",
      accessorFn: (r) => r._current?.plugin ?? r._job?.plugin ?? "",
      header: "Step",
      size: 170,
      enableResizing: true,
      cell: ({ row }) => <StepCell run={row.original} />,
      meta: { label: "Step" },
    },
    {
      id: "_progress",
      accessorFn: (r) => r._job?.progress ?? -1,
      header: "Progress",
      size: 130,
      enableResizing: true,
      cell: ({ row }) => <ProgressCell run={row.original} />,
      meta: { label: "Progress" },
    },
    {
      id: "_elapsed",
      accessorFn: (r) => r._durationMs ?? 0,
      header: "Elapsed",
      size: 90,
      enableResizing: true,
      cell: ({ row }) => <Elapsed run={row.original} timeField={timeField} />,
      meta: { label: "Elapsed" },
    },
    {
      id: "_lineage",
      header: "Lineage",
      size: 220,
      enableSorting: false,
      enableResizing: true,
      cell: ({ row }) => <MiniLineage runId={row.original._runId} runs={row.original._steps} />,
      meta: { label: "Lineage" },
    },
  ];
}

function StepCell({ run }: { run: LiveRun }) {
  const n = run._steps.length;
  if (run._status === "QUEUED") {
    return (
      <span className="truncate text-xs text-muted-foreground">
        waiting · <span className="font-mono">{run._job?.plugin ?? "next step"}</span>
      </span>
    );
  }
  if (run._current) {
    return (
      <span className="flex items-center gap-1.5 truncate text-xs">
        <span className="font-mono">{run._current.plugin}</span>
        <span className="text-muted-foreground">#{n}</span>
      </span>
    );
  }
  const err = run._error || run._steps.find((s) => s.error)?.error;
  return <span className="truncate text-xs text-muted-foreground">{n} steps{err ? ` · ${err}` : ""}</span>;
}

/**
 * Progress is whatever the job-state store reports; nothing is invented when it
 * is absent. It is read from the store's volatile slice, so a progress tick
 * re-renders this cell alone rather than the row.
 */
function ProgressCell({ run }: { run: LiveRun }) {
  const v = useLive((s) => s.volatile[run._runId]);
  const p = v?.progress;
  const running = run._status === "RUNNING" && v?.jobStatus === "RUNNING";
  if (p === undefined || p === null || !running) {
    return (
      <span className="text-xs text-muted-foreground" title="No progress reported for this step">
        {run._status === "RUNNING" ? "—" : ""}
      </span>
    );
  }
  const pct = Math.round(Math.min(1, Math.max(0, p)) * 100);
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-info" style={{ width: `${pct}%` }} />
      </div>
      <span className="font-mono text-[11px] text-muted-foreground tabular-nums">{pct}%</span>
    </div>
  );
}

/** Ticks once a second via the shared clock; finished runs show their final duration. */
function Elapsed({ run, timeField }: { run: LiveRun; timeField: string }) {
  const now = useNow();
  if (run._durationMs !== null && run._durationMs !== undefined) return <span className="font-mono text-xs">{formatDuration(run._durationMs)}</span>;
  // queued: time waiting since the job was queued; running: time since the file started
  const since = run._status === "QUEUED" ? Date.parse(run._job?.queuedAt ?? run._startedAt) : Date.parse(String(run[timeField] ?? run._startedAt));
  const ms = Math.max(0, now - (Number.isFinite(since) ? since : now));
  return <span className="font-mono text-xs tabular-nums">{formatDuration(ms)}</span>;
}
