"use client";

import { RunStatusPill } from "@/components/events/status-pill";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { relatedOptions } from "@/lib/api/query-options";
import { formatDuration } from "@/lib/status";
import { useTabs } from "@/lib/store/tabs";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Columns2, ExternalLink, Link2 } from "lucide-react";
import { EmptyState } from "./empty";

/** Other feeds of the same root file (refeeds) and runs sharing the purge id. */
export function RelatedTab({ runId }: { runId: string }) {
  const { data, isLoading } = useQuery(relatedOptions(runId));
  const open = useTabs((s) => s.open);
  const setCompare = useTabs((s) => s.setCompare);
  const setDetailTab = useTabs((s) => s.setDetailTab);
  if (isLoading) return <Skeleton className="m-3 h-40" />;
  if (!data?.related.length) return <EmptyState icon={Link2} title="No related runs" description="No other feeds of this root file and nothing else under its purge id." />;
  return (
    <ScrollArea className="h-full">
      <div className="p-3 text-xs">
        <div className="mb-2 text-muted-foreground">
          root <span className="font-mono">{data.rootId}</span>
          {data.purgeId && data.purgeId !== data.rootId && (
            <>
              {" "}· purge <span className="font-mono">{data.purgeId}</span>
            </>
          )}
        </div>
        <div className="divide-y rounded-md border">
          {data.related.map((r) => (
            <div key={r.runId} className="flex items-center gap-2 px-2 py-1.5">
              <Badge variant="outline" className="h-5 w-14 justify-center text-[10px]">{r.relation}</Badge>
              <RunStatusPill status={r.state.status} />
              <span className="font-mono">{r.processingDatetime ? format(new Date(r.processingDatetime), "d MMM HH:mm") : ""}</span>
              {r.relation === "refeed" && <span className="text-muted-foreground">#{r.refeedSeq}</span>}
              <span className="truncate text-muted-foreground">{r.filename}</span>
              <span className="ml-auto font-mono text-muted-foreground">{formatDuration(r.state.durationMs)}</span>
              <Button variant="ghost" size="icon" className="size-6" aria-label="Compare lineage" onClick={() => { setCompare(r.runId); setDetailTab("lineage"); }}>
                <Columns2 className="size-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="size-6" aria-label="Open" onClick={() => open(r.runId, "lineage")}>
                <ExternalLink className="size-3.5" />
              </Button>
            </div>
          ))}
        </div>
      </div>
    </ScrollArea>
  );
}
