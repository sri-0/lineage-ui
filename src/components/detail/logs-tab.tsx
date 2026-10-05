"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError } from "@/lib/api/client";
import { logTargetsOptions, logsOptions } from "@/lib/api/query-options";
import { copyWithToast } from "@/lib/copy";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Copy, ScrollText } from "lucide-react";
import * as React from "react";
import { EmptyState } from "./empty";

/** Ray job logs per plugin run, virtualised, with search; aged-off empty state. */
export function LogsTab({ runId }: { runId: string }) {
  const targets = useQuery(logTargetsOptions(runId));
  const runs = React.useMemo(() => targets.data?.runs ?? [], [targets.data]);
  const [chosen, setRun] = React.useState<string>("");
  // Default to the first plugin run without an effect: derived, not stored.
  const run = chosen || runs[0]?.runId || "";
  const logs = useQuery(logsOptions(runId, run));
  const [q, setQ] = React.useState("");

  if (targets.isLoading) return <Skeleton className="m-3 h-[calc(100%-1.5rem)]" />;
  if (!runs.length) return <EmptyState icon={ScrollText} title="No Ray jobs to show logs for" description="Plugin runs did not record a Ray submission id." />;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center gap-2 border-b px-3 py-2">
        <Select value={run} onValueChange={setRun}>
          <SelectTrigger size="sm" className="w-64 text-xs">
            <SelectValue placeholder="Plugin run" />
          </SelectTrigger>
          <SelectContent>
            {runs.map((r) => (
              <SelectItem key={r.runId} value={r.runId} className="font-mono text-xs">
                {r.plugin} · {r.tenancy} · {r.submissionId}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter lines" className="h-8 w-56 text-xs" />
        {logs.data && (
          <Button variant="ghost" size="sm" className="ml-auto h-8" onClick={() => copyWithToast("Logs", logs.data!.logs)}>
            <Copy className="size-3.5" /> Copy
          </Button>
        )}
      </div>
      {logs.isLoading && <Skeleton className="m-3 flex-1" />}
      {logs.error && <LogsEmpty error={logs.error as ApiError} />}
      {logs.data && <LogLines text={logs.data.logs} filter={q} />}
    </div>
  );
}

function LogsEmpty({ error }: { error: ApiError }) {
  const aged = error.reason === "aged_off" || error.reason === "dashboard unreachable" || error.status === 404;
  return (
    <EmptyState
      icon={ScrollText}
      title={aged ? "Logs have aged off or are not available" : "Logs unavailable"}
      description={aged ? "Ray keeps job logs on the cluster head node only while the job is known to it." : error.message}
    />
  );
}

function LogLines({ text, filter }: { text: string; filter: string }) {
  const lines = React.useMemo(() => {
    const all = text.split("\n");
    const q = filter.trim().toLowerCase();
    return q ? all.filter((l) => l.toLowerCase().includes(q)) : all;
  }, [text, filter]);
  const ref = React.useRef<HTMLDivElement>(null);
  const v = useVirtualizer({ count: lines.length, getScrollElement: () => ref.current, estimateSize: () => 20, overscan: 30 });
  if (!lines.length) return <EmptyState icon={ScrollText} title="No log lines" />;
  return (
    <div ref={ref} className="min-h-0 flex-1 overflow-auto bg-muted/20 font-mono text-[11px] leading-5">
      <div style={{ height: v.getTotalSize(), position: "relative" }}>
        {v.getVirtualItems().map((it) => {
          const l = lines[it.index];
          const level = /\b(ERROR|CRITICAL|Traceback)\b/.test(l) ? "text-error" : /\bWARN/.test(l) ? "text-warning" : "";
          return (
            <div key={it.index} className={cn("absolute inset-x-0 flex gap-3 px-3 whitespace-pre hover:bg-accent/40", level)} style={{ top: it.start, height: 20 }}>
              <span className="w-10 shrink-0 text-right text-muted-foreground select-none">{it.index + 1}</span>
              <span>{l}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
