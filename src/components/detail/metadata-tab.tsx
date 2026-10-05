"use client";

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { eventOptions, rawEventsOptions } from "@/lib/api/query-options";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight } from "lucide-react";
import { KV } from "./lineage-tab";

/** Promoted identifiers plus the raw OpenLineage events as collapsible JSON. */
export function MetadataTab({ runId }: { runId: string }) {
  const detail = useQuery(eventOptions(runId));
  const raw = useQuery(rawEventsOptions(runId));
  if (detail.isLoading) return <Skeleton className="m-3 h-40" />;
  const start = (detail.data?.start ?? {}) as Record<string, unknown>;
  const promoted = flatten(Object.fromEntries(Object.entries(start).filter(([k]) => !["inputs", "outputs", "run", "job"].includes(k))));
  return (
    <ScrollArea className="h-full">
      <div className="space-y-4 p-3 text-xs">
        <section>
          <h3 className="mb-1.5 text-[11px] font-medium text-muted-foreground uppercase">Identifiers</h3>
          <KV rows={promoted} />
        </section>
        <section>
          <h3 className="mb-1.5 text-[11px] font-medium text-muted-foreground uppercase">OpenLineage events {raw.data ? `(${raw.data.events.length})` : ""}</h3>
          {raw.isLoading && <Skeleton className="h-20" />}
          {raw.data?.events.map((e, i) => {
            const ev = e as { eventType?: string; eventTime?: string; job?: { name?: string } };
            return (
              <Collapsible key={i} className="mb-1 rounded-md border">
                <CollapsibleTrigger className="group flex w-full items-center gap-2 px-2 py-1.5 text-left hover:bg-accent/40">
                  <ChevronRight className="size-3.5 transition-transform group-data-[state=open]:rotate-90" />
                  <span className="font-mono">{ev.eventType}</span>
                  <span className="truncate text-muted-foreground">{ev.job?.name}</span>
                  <span className="ml-auto font-mono text-muted-foreground">{ev.eventTime}</span>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <pre className="overflow-x-auto border-t bg-muted/30 p-2 font-mono text-[11px] leading-relaxed">{JSON.stringify(e, null, 2)}</pre>
                </CollapsibleContent>
              </Collapsible>
            );
          })}
        </section>
      </div>
    </ScrollArea>
  );
}

/** Flattens nested objects to dotted keys; arrays and scalars are kept as values. */
function flatten(obj: Record<string, unknown>, prefix = "", out: Record<string, unknown> = {}): Record<string, unknown> {
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object" && !Array.isArray(v)) flatten(v as Record<string, unknown>, key, out);
    else if (v !== null && v !== undefined && v !== "") out[key] = v;
  }
  return out;
}
