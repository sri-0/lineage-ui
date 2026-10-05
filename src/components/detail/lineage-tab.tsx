"use client";

import { LineageGraph } from "@/components/lineage/lineage-graph";
import { RunStatusPill } from "@/components/events/status-pill";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { lineageOptions } from "@/lib/api/query-options";
import type { LineageGraph as Graph } from "@/lib/api/types";
import { formatDuration } from "@/lib/status";
import { useTabs } from "@/lib/store/tabs";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { GitBranch, X } from "lucide-react";
import * as React from "react";
import { EmptyState } from "./empty";

/** Lineage graph plus a metadata sheet for the selected node; optional side-by-side compare. */
export function LineageTab({ runId }: { runId: string }) {
  const compareId = useTabs((s) => s.compareRunId);
  const setCompare = useTabs((s) => s.setCompare);
  return (
    <div className="flex h-full min-h-0 flex-col">
      {compareId && (
        <div className="flex items-center gap-2 border-b px-3 py-1.5 text-xs">
          <span className="text-muted-foreground">Comparing with run</span>
          <span className="font-mono">{compareId.slice(0, 8)}</span>
          <Button variant="ghost" size="icon" className="ml-auto size-6" onClick={() => setCompare(null)} aria-label="Stop comparing">
            <X className="size-3.5" />
          </Button>
        </div>
      )}
      <div className={compareId ? "grid min-h-0 flex-1 grid-rows-2 divide-y" : "min-h-0 flex-1"}>
        <OneGraph runId={runId} />
        {compareId && <OneGraph runId={compareId} />}
      </div>
    </div>
  );
}

function OneGraph({ runId }: { runId: string }) {
  const { data, isLoading, error } = useQuery({ ...lineageOptions(runId), refetchInterval: (q) => (q.state.data?.runs.some((r) => r.status === "RUNNING") ? 5000 : false) });
  const [selected, setSelected] = React.useState<string | null>(null);
  if (isLoading) return <Skeleton className="m-3 h-[calc(100%-1.5rem)]" />;
  if (error) return <EmptyState icon={GitBranch} title="Lineage unavailable" description={error.message} />;
  if (!data || data.runs.length === 0) return <EmptyState icon={GitBranch} title="No lineage yet" description="No plugin runs have been recorded for this event." />;
  return (
    <div className="relative flex h-full min-h-0">
      <LineageGraph graph={data} selectedId={selected} onSelect={setSelected} className="relative min-w-0 flex-1" />
      {selected && <NodeSheet graph={data} id={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

function NodeSheet({ graph, id, onClose }: { graph: Graph; id: string; onClose: () => void }) {
  const run = graph.runs.find((r) => r.id === id);
  const ds = graph.datasets.find((d) => d.id === id);
  return (
    <div className="flex w-80 shrink-0 flex-col border-l bg-card">
      <div className="flex items-start gap-2 border-b px-3 py-2">
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium">{run ? (run.kind === "ingest" ? run.job : run.plugin) : ds?.name.split("/").pop()}</div>
          <div className="text-[11px] text-muted-foreground">{run ? `${run.tenancy} · ${run.controlset}` : ds?.namespace}</div>
        </div>
        {run && <RunStatusPill status={run.status} />}
        <Button variant="ghost" size="icon" className="size-6" onClick={onClose} aria-label="Close">
          <X className="size-3.5" />
        </Button>
      </div>
      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-3 p-3 text-xs">
          {run && (
            <>
              {run.error && <p className="rounded-md border border-error/30 bg-error/10 p-2 text-error">{run.error}</p>}
              <KV rows={{
                "run id": run.id, started: format(new Date(run.startedAt), "d MMM yyyy HH:mm:ss.SSS"), ended: run.endedAt ? format(new Date(run.endedAt), "HH:mm:ss.SSS") : "",
                duration: run.durationMs !== undefined ? formatDuration(run.durationMs) : "", tenancy: run.tenancy, "ray job": run.rayJobId ?? "", submission: run.submissionId ?? "", trace: run.traceId ?? "",
              }} />
              {run.detailLevel === "reduced" && <Badge variant="outline">reduced copy (controlset handoff)</Badge>}
              <Facets facets={run.facets} />
            </>
          )}
          {ds && (
            <>
              <KV rows={{ namespace: ds.namespace, name: ds.name }} />
              <Facets facets={ds.facets} />
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

function Facets({ facets }: { facets?: Record<string, unknown> }) {
  if (!facets) return null;
  return (
    <>
      {Object.entries(facets).map(([name, f]) => (
        <div key={name}>
          <div className="mb-1 font-medium text-muted-foreground uppercase">{name}</div>
          <KV rows={Object.fromEntries(Object.entries((f ?? {}) as Record<string, unknown>).filter(([k]) => !k.startsWith("_")))} />
        </div>
      ))}
    </>
  );
}

export function KV({ rows }: { rows: Record<string, unknown> }) {
  const entries = Object.entries(rows).filter(([, v]) => v !== "" && v !== undefined && v !== null);
  return (
    <div className="grid grid-cols-[minmax(90px,auto)_1fr] gap-x-3 gap-y-1">
      {entries.map(([k, v]) => (
        <React.Fragment key={k}>
          <div className="truncate font-mono text-muted-foreground">{k}</div>
          <div className="min-w-0 font-mono break-all">{typeof v === "object" ? JSON.stringify(v) : String(v)}</div>
        </React.Fragment>
      ))}
    </div>
  );
}
