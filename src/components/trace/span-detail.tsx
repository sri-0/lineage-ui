"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import * as React from "react";
import { formatNanos, serviceColor, type Span, type Trace } from "./span-tree";

export function SpanDetail({ span, trace, onClose }: { span: Span; trace: Trace; onClose: () => void }) {
  const isErr = span.statusCode === "ERROR";
  return (
    <div className="flex h-full min-h-0 flex-col border-l">
      <div className="flex items-start gap-2 border-b px-3 py-2">
        <span className="mt-1.5 size-2.5 shrink-0 rounded-sm" style={{ background: serviceColor(span.service, trace.services) }} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium">{span.name}</div>
          <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
            <span>{span.service}</span>
            <span>·</span>
            <span className="font-mono">{formatNanos(span.durationNs)}</span>
            <span>·</span>
            <span>starts +{formatNanos(span.startNs - trace.startNs)}</span>
            <Badge variant="outline" className={cn("h-5 text-[10px]", isErr && "border-error/40 text-error")}>{span.statusCode}</Badge>
            <Badge variant="outline" className="h-5 text-[10px]">{span.kind}</Badge>
          </div>
        </div>
        <Button variant="ghost" size="icon" className="size-7" onClick={onClose} aria-label="Close span">
          <X className="size-4" />
        </Button>
      </div>
      <Tabs defaultValue="attributes" className="flex min-h-0 flex-1 flex-col">
        <TabsList className="mx-3 mt-2 w-fit">
          <TabsTrigger value="attributes">Attributes</TabsTrigger>
          <TabsTrigger value="events">Events {span.events?.length ? `(${span.events.length})` : ""}</TabsTrigger>
          <TabsTrigger value="links">Links {span.links?.length ? `(${span.links.length})` : ""}</TabsTrigger>
          <TabsTrigger value="raw">Raw</TabsTrigger>
        </TabsList>
        <ScrollArea className="min-h-0 flex-1">
          <TabsContent value="attributes" className="m-0 p-3">
            {span.statusMessage && <p className="mb-2 rounded-md border border-error/30 bg-error/10 p-2 text-xs text-error">{span.statusMessage}</p>}
            <KV title="Span" rows={{ "span id": span.spanId, "parent id": span.parentSpanId ?? "", "trace id": span.traceId }} />
            <KV title="Attributes" rows={span.attributes} />
            <KV title="Resource" rows={span.resource} />
          </TabsContent>
          <TabsContent value="events" className="m-0 p-3">
            {!span.events?.length && <p className="text-xs text-muted-foreground">No events.</p>}
            {span.events?.map((e, i) => (
              <div key={i} className="mb-3">
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-medium">{e.name}</span>
                  <span className="font-mono text-muted-foreground">+{formatNanos(e.timeNs - span.startNs)}</span>
                </div>
                <KV rows={e.attributes} />
              </div>
            ))}
          </TabsContent>
          <TabsContent value="links" className="m-0 p-3">
            {!span.links?.length && <p className="text-xs text-muted-foreground">No links.</p>}
            {span.links?.map((l, i) => (
              <KV key={i} title={`${l.traceId.slice(0, 12)}… / ${l.spanId}`} rows={l.attributes} />
            ))}
          </TabsContent>
          <TabsContent value="raw" className="m-0 p-3">
            <pre className="overflow-x-auto rounded-md bg-muted/40 p-2 font-mono text-[11px] leading-relaxed">{JSON.stringify(span, null, 2)}</pre>
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </div>
  );
}

function KV({ title, rows }: { title?: string; rows: Record<string, unknown> }) {
  const entries = Object.entries(rows ?? {}).filter(([, v]) => v !== "" && v !== undefined && v !== null);
  if (!entries.length) return null;
  return (
    <div className="mb-3">
      {title && <div className="mb-1 text-[11px] font-medium text-muted-foreground uppercase">{title}</div>}
      <div className="grid grid-cols-[minmax(120px,1fr)_2fr] gap-x-3 gap-y-1 text-xs">
        {entries.map(([k, v]) => (
          <React.Fragment key={k}>
            <div className="truncate font-mono text-muted-foreground" title={k}>{k}</div>
            <div className="min-w-0 font-mono break-all">{typeof v === "object" ? JSON.stringify(v) : String(v)}</div>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
