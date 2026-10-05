"use client";

import { Badge } from "@/components/ui/badge";
import type { DatasetNode, RunNode } from "@/lib/api/types";
import { RUN_STATUS, formatDuration } from "@/lib/status";
import { cn } from "@/lib/utils";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { FileText, Lock } from "lucide-react";

export type RunNodeData = { run: RunNode; selected: boolean; dim: boolean; onOpen: (id: string) => void };
export type DatasetNodeData = { dataset: DatasetNode; selected: boolean; onOpen: (id: string) => void };
export type GroupNodeData = { label: string; color: string };
export type StubNodeData = { reason: string };

export function RunNodeView({ data }: NodeProps & { data: RunNodeData }) {
  const { run, selected, dim } = data;
  const st = RUN_STATUS[run.status] ?? RUN_STATUS.RUNNING;
  const reduced = run.detailLevel === "reduced";
  return (
    <div
      onClick={() => data.onOpen(run.id)}
      className={cn(
        "flex h-16 w-[220px] cursor-pointer flex-col justify-center gap-1 rounded-lg border bg-card px-3 text-card-foreground shadow-sm transition-colors hover:bg-accent/40",
        selected && "ring-2 ring-primary",
        dim && "opacity-40",
        run.status === "FAIL" && "border-error/50",
      )}
    >
      <Handle type="target" position={Position.Top} className="opacity-0!" />
      <div className="flex items-center gap-2">
        <span className="size-2 shrink-0 rounded-full" style={{ background: st.color }} />
        <span className="truncate text-sm font-medium">{run.kind === "ingest" ? run.job : run.plugin}</span>
        {reduced && <Lock className="ml-auto size-3.5 shrink-0 text-muted-foreground" />}
      </div>
      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <Badge variant="outline" className={cn("h-4 px-1 text-[10px]", st.className)}>{st.label}</Badge>
        <span className="font-mono">{run.durationMs !== undefined ? formatDuration(run.durationMs) : "…"}</span>
        <span className="ml-auto font-mono">{run.controlset}</span>
      </div>
      <Handle type="source" position={Position.Bottom} className="opacity-0!" />
    </div>
  );
}

export function DatasetNodeView({ data }: NodeProps & { data: DatasetNodeData }) {
  const { dataset, selected } = data;
  const file = dataset.name.split("/").pop() ?? dataset.name;
  return (
    <div
      onClick={() => data.onOpen(dataset.id)}
      className={cn(
        "flex h-11 w-[200px] cursor-pointer items-center gap-2 rounded-md border border-dashed bg-background px-2.5 text-xs hover:bg-accent/40",
        selected && "ring-2 ring-primary",
      )}
      title={dataset.id}
    >
      <Handle type="target" position={Position.Top} className="opacity-0!" />
      <FileText className="size-3.5 shrink-0 text-muted-foreground" />
      <div className="min-w-0">
        <div className="truncate font-mono">{file}</div>
        <div className="truncate text-[10px] text-muted-foreground">{dataset.namespace}</div>
      </div>
      <Handle type="source" position={Position.Bottom} className="opacity-0!" />
    </div>
  );
}

export function GroupNodeView({ data }: NodeProps & { data: GroupNodeData }) {
  return (
    <div className="h-full w-full rounded-xl border border-dashed" style={{ borderColor: data.color, background: `color-mix(in oklab, ${data.color} 6%, transparent)` }}>
      <div className="absolute top-2 left-3 flex items-center gap-1.5 text-xs font-medium" style={{ color: data.color }}>
        <span className="size-2 rounded-full" style={{ background: data.color }} />
        {data.label}
      </div>
    </div>
  );
}

export function StubNodeView({ data }: NodeProps & { data: StubNodeData }) {
  return (
    <div className="flex h-16 w-[220px] items-center gap-2 rounded-lg border border-dashed bg-muted/40 px-3 text-xs text-muted-foreground">
      <Handle type="target" position={Position.Top} className="opacity-0!" />
      <Lock className="size-4 shrink-0" />
      <span>{data.reason}</span>
    </div>
  );
}

export const nodeTypes = { run: RunNodeView, dataset: DatasetNodeView, group: GroupNodeView, stub: StubNodeView };
