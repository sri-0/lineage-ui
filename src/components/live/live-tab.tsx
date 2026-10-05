"use client";

import { JobStatusPill } from "@/components/events/status-pill";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { api } from "@/lib/api/client";
import { jobsOptions } from "@/lib/api/query-options";
import type { Job, JobsResponse } from "@/lib/api/types";
import { formatDuration } from "@/lib/status";
import { useTabs } from "@/lib/store/tabs";
import { cn } from "@/lib/utils";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNowStrict } from "date-fns";
import { ArrowDown, ArrowUp, Radio } from "lucide-react";
import * as React from "react";

type StatusFilter = "active" | "queued" | "running" | "finished";
const STATUS_PARAM: Record<StatusFilter, string> = { active: "QUEUED,PENDING,RUNNING", queued: "QUEUED,PENDING", running: "RUNNING", finished: "SUCCEEDED,FAILED,STOPPED" };

type SortKey = "priority" | "queuedAt" | "startedAt" | "cluster" | "plugin";

/** Live jobs from the job-state store, pushed over SSE; priority and queue position first. */
export function LiveTab() {
  const [status, setStatus] = React.useState<StatusFilter>("active");
  const [cluster, setCluster] = React.useState("");
  const [q, setQ] = React.useState("");
  const [sort, setSort] = React.useState<{ key: SortKey; desc: boolean }>({ key: "priority", desc: true });
  const params = React.useMemo(() => ({ status: STATUS_PARAM[status], cluster: cluster || undefined }), [status, cluster]);
  const { data, isLoading, error } = useQuery(jobsOptions(params));
  const qc = useQueryClient();
  const [liveState, setLiveState] = React.useState<"connecting" | "live" | "off">("connecting");

  // SSE keeps the cached list fresh; the query above only loads the first snapshot.
  React.useEffect(() => {
    const es = new EventSource(api.jobsStreamUrl(params));
    es.onopen = () => setLiveState("live");
    es.onerror = () => setLiveState("off");
    es.addEventListener("jobs", (e) => {
      const body = JSON.parse((e as MessageEvent).data) as JobsResponse;
      qc.setQueryData(jobsOptions(params).queryKey, body);
    });
    return () => es.close();
  }, [params, qc]);

  const [, tick] = React.useReducer((n: number) => n + 1, 0);
  React.useEffect(() => {
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);

  const jobs = React.useMemo(() => {
    const list = [...(data?.jobs ?? [])];
    const needle = q.trim().toLowerCase();
    const filtered = needle ? list.filter((j) => [j.rayJobId, j.plugin, j.rootId, j.cluster, j.submissionId].some((v) => v?.toLowerCase().includes(needle))) : list;
    const dir = sort.desc ? -1 : 1;
    filtered.sort((a, b) => {
      const av = a[sort.key] ?? "";
      const bv = b[sort.key] ?? "";
      if (av === bv) return (a.queuedAt < b.queuedAt ? -1 : 1);
      return (av < bv ? -1 : 1) * dir;
    });
    return filtered;
  }, [data, q, sort]);
  const clusters = Array.from(new Set((data?.jobs ?? []).map((j) => j.cluster))).sort();
  const open = useTabs((s) => s.open);

  return (
    <div className="flex h-full min-h-0 flex-col p-2">
      <div className="flex flex-wrap items-center gap-2 pb-2">
        <ToggleGroup type="single" variant="outline" spacing={0} value={status} onValueChange={(v) => v && setStatus(v as StatusFilter)} className="h-8 *:h-8 *:px-3 *:text-xs">
          <ToggleGroupItem value="active" className="aria-checked:bg-muted-foreground/25!">Active</ToggleGroupItem>
          <ToggleGroupItem value="queued" className="aria-checked:bg-muted-foreground/25!">Queued</ToggleGroupItem>
          <ToggleGroupItem value="running" className="aria-checked:bg-muted-foreground/25!">Running</ToggleGroupItem>
          <ToggleGroupItem value="finished" className="aria-checked:bg-muted-foreground/25!">Finished</ToggleGroupItem>
        </ToggleGroup>
        <ToggleGroup type="single" variant="outline" spacing={0} value={cluster} onValueChange={(v) => setCluster(v ?? "")} className="h-8 *:h-8 *:px-3 *:text-xs">
          <ToggleGroupItem value="" className="aria-checked:bg-muted-foreground/25!">All clusters</ToggleGroupItem>
          {clusters.map((c) => (
            <ToggleGroupItem key={c} value={c} className="aria-checked:bg-muted-foreground/25!">{c}</ToggleGroupItem>
          ))}
        </ToggleGroup>
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter by id, plugin, root" className="h-8 w-64 text-xs" />
        <Badge variant="outline" className={cn("ml-auto h-6 gap-1.5 text-[11px]", liveState === "live" ? "border-success/30 text-success" : "text-muted-foreground")}>
          <Radio className={cn("size-3", liveState === "live" && "animate-pulse")} /> {liveState === "live" ? "live" : liveState === "connecting" ? "connecting" : "stream off"}
        </Badge>
        <span className="text-xs text-muted-foreground">{data?.total ?? 0} jobs</span>
      </div>
      {error && <p className="text-xs text-destructive">{error.message}</p>}
      <div className="min-h-0 flex-1 rounded-lg border">
        <ScrollArea className="h-full">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-background">
              <TableRow>
                <SortHead label="Priority" k="priority" sort={sort} setSort={setSort} className="w-24" />
                <TableHead className="w-16">Pos</TableHead>
                <TableHead className="w-28">Status</TableHead>
                <SortHead label="Cluster" k="cluster" sort={sort} setSort={setSort} className="w-24" />
                <SortHead label="Plugin" k="plugin" sort={sort} setSort={setSort} />
                <TableHead>Progress</TableHead>
                <SortHead label="Queued" k="queuedAt" sort={sort} setSort={setSort} className="w-28" />
                <SortHead label="Started" k="startedAt" sort={sort} setSort={setSort} className="w-28" />
                <TableHead className="w-24">Elapsed</TableHead>
                <TableHead>Root</TableHead>
                <TableHead className="w-24">Ray job</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={11}><Skeleton className="h-6" /></TableCell>
                </TableRow>
              )}
              {jobs.map((j) => (
                <JobRow key={j.rayJobId} job={j} onOpen={() => j.runId && open(j.runId, "lineage")} />
              ))}
              {!isLoading && jobs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={11} className="py-8 text-center text-xs text-muted-foreground">No jobs match.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </div>
    </div>
  );
}

function SortHead({ label, k, sort, setSort, className }: { label: string; k: SortKey; sort: { key: SortKey; desc: boolean }; setSort: (s: { key: SortKey; desc: boolean }) => void; className?: string }) {
  const active = sort.key === k;
  return (
    <TableHead className={className}>
      <Button variant="ghost" size="sm" className="-ml-2 h-7 gap-1 px-2 text-xs" onClick={() => setSort({ key: k, desc: active ? !sort.desc : k === "priority" })}>
        {label}
        {active && (sort.desc ? <ArrowDown className="size-3" /> : <ArrowUp className="size-3" />)}
      </Button>
    </TableHead>
  );
}

function JobRow({ job: j, onOpen }: { job: Job; onOpen: () => void }) {
  const started = j.startedAt ? new Date(j.startedAt) : null;
  const finished = j.finishedAt ? new Date(j.finishedAt) : null;
  const elapsed = started ? (finished ?? new Date()).getTime() - started.getTime() : null;
  return (
    <TableRow className="cursor-pointer text-xs" onClick={onOpen}>
      <TableCell>
        <Badge variant="outline" className={cn("h-5 font-mono", j.priority >= 5 && "border-warning/40 text-warning")}>P{j.priority}</Badge>
      </TableCell>
      <TableCell className="font-mono text-muted-foreground">{j.queuePosition ?? ""}</TableCell>
      <TableCell><JobStatusPill status={j.status} /></TableCell>
      <TableCell className="font-mono">{j.cluster}</TableCell>
      <TableCell className="font-mono">{j.plugin}</TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-28 overflow-hidden rounded-full bg-muted">
            <div className={cn("h-full rounded-full", j.status === "FAILED" ? "bg-error" : j.status === "RUNNING" ? "bg-info" : "bg-success")} style={{ width: `${Math.round(j.progress * 100)}%` }} />
          </div>
          <span className="font-mono text-muted-foreground">{Math.round(j.progress * 100)}%</span>
        </div>
      </TableCell>
      <TableCell className="text-muted-foreground">{formatDistanceToNowStrict(new Date(j.queuedAt), { addSuffix: true })}</TableCell>
      <TableCell className="text-muted-foreground">{started ? formatDistanceToNowStrict(started, { addSuffix: true }) : ""}</TableCell>
      <TableCell className="font-mono">{elapsed !== null ? formatDuration(elapsed) : ""}</TableCell>
      <TableCell className="font-mono text-muted-foreground">{j.rootId.slice(0, 8)}</TableCell>
      <TableCell className="font-mono text-muted-foreground">{j.rayJobId}</TableCell>
    </TableRow>
  );
}
