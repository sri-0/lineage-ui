"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { OtlpTrace } from "@/lib/api/types";
import { cn } from "@/lib/utils";
import { useVirtualizer } from "@tanstack/react-virtual";
import { ChevronDown, ChevronRight, ChevronsDownUp, ChevronsUpDown, Search } from "lucide-react";
import * as React from "react";
import { buildRows, formatNanos, fromOtlp, serviceColor, type SpanRow, type Trace } from "./span-tree";
import { SpanDetail } from "./span-detail";
import { TraceMinimap } from "./trace-minimap";

const ROW_HEIGHT = 28;

/**
 * Jaeger-style trace page: header, minimap with brush, tick header, one
 * virtualised row per span (name column + duration bar), detail pane for the
 * selected span. Self-contained: only shadcn primitives and TanStack Virtual.
 */
export function TraceView({ otlp, className }: { otlp: OtlpTrace; className?: string }) {
  const trace = React.useMemo(() => fromOtlp(otlp), [otlp]);
  const [collapsed, setCollapsed] = React.useState<Set<string>>(new Set());
  const [selected, setSelected] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState("");
  const [range, setRange] = React.useState<[number, number]>([0, 1]);
  const rows = React.useMemo(() => buildRows(trace, collapsed), [trace, collapsed]);
  const matches = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return new Set<string>();
    return new Set(
      trace.spans
        .filter((s) => s.name.toLowerCase().includes(q) || s.service.toLowerCase().includes(q) || JSON.stringify(s.attributes).toLowerCase().includes(q))
        .map((s) => s.spanId),
    );
  }, [search, trace.spans]);
  const selectedSpan = trace.spans.find((s) => s.spanId === selected);
  const errors = trace.spans.filter((s) => s.statusCode === "ERROR").length;

  const toggle = (id: string) =>
    setCollapsed((c) => {
      const n = new Set(c);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  const collapseAll = () => setCollapsed(new Set(rows.filter((r) => r.hasChildren).map((r) => r.span.spanId)));
  const expandAll = () => setCollapsed(new Set());

  return (
    <div className={cn("flex h-full min-h-0 flex-col", className)}>
      <header className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b px-3 py-2 text-sm">
        <div className="min-w-0">
          <div className="truncate font-medium">{trace.spans.find((s) => !s.parentSpanId)?.name ?? "Trace"}</div>
          <div className="font-mono text-xs text-muted-foreground">{trace.traceId}</div>
        </div>
        <Stat label="Duration" value={formatNanos(trace.durationNs)} />
        <Stat label="Services" value={String(trace.services.length)} />
        <Stat label="Spans" value={String(trace.spans.length)} />
        {errors > 0 && <Badge variant="outline" className="border-error/30 bg-error/10 text-error">{errors} error{errors > 1 ? "s" : ""}</Badge>}
        <div className="ml-auto flex items-center gap-1">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Find spans" className="h-8 w-56 pl-7 text-xs" />
            {matches.size > 0 && <span className="absolute top-1/2 right-2 -translate-y-1/2 text-[10px] text-muted-foreground">{matches.size}</span>}
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="size-8" onClick={collapseAll} aria-label="Collapse all">
                <ChevronsDownUp className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Collapse all</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="size-8" onClick={expandAll} aria-label="Expand all">
                <ChevronsUpDown className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Expand all</TooltipContent>
          </Tooltip>
        </div>
      </header>

      <TraceMinimap trace={trace} rows={rows} range={range} onRangeChange={setRange} />

      <ResizablePanelGroup orientation="horizontal" className="min-h-0 flex-1">
        <ResizablePanel id="trace-rows" defaultSize={selectedSpan ? "62%" : "100%"} minSize="40%" className="min-w-0">
          <SpanRows rows={rows} trace={trace} range={range} collapsed={collapsed} selected={selected} matches={matches} onToggle={toggle} onSelect={setSelected} />
        </ResizablePanel>
        {selectedSpan && (
          <>
            <ResizableHandle className="w-0 bg-transparent after:w-2" />
            <ResizablePanel id="trace-detail" defaultSize="38%" minSize="25%" className="min-w-0">
              <SpanDetail span={selectedSpan} trace={trace} onClose={() => setSelected(null)} />
            </ResizablePanel>
          </>
        )}
      </ResizablePanelGroup>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-xs">
      <span className="text-muted-foreground">{label} </span>
      <span className="font-mono">{value}</span>
    </div>
  );
}

function SpanRows({
  rows, trace, range, collapsed, selected, matches, onToggle, onSelect,
}: {
  rows: SpanRow[];
  trace: Trace;
  range: [number, number];
  collapsed: Set<string>;
  selected: string | null;
  matches: Set<string>;
  onToggle: (id: string) => void;
  onSelect: (id: string) => void;
}) {
  const parentRef = React.useRef<HTMLDivElement>(null);
  const virtual = useVirtualizer({ count: rows.length, getScrollElement: () => parentRef.current, estimateSize: () => ROW_HEIGHT, overscan: 12 });
  const [nameWidth, setNameWidth] = React.useState(280);
  const span = range[1] - range[0] || 1;
  // map a 0..1 trace offset to a 0..1 visible offset under the current brush
  const vis = (x: number) => (x - range[0]) / span;
  const tickMarks = React.useMemo(() => Array.from({ length: 6 }, (_, i) => ({ at: i / 5, label: formatNanos(trace.durationNs * (range[0] + (span * i) / 5)) })), [trace.durationNs, span, range]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex h-8 shrink-0 items-stretch border-b bg-muted/40 text-[11px] text-muted-foreground">
        <div className="flex shrink-0 items-center border-r px-2" style={{ width: nameWidth }}>
          Service & operation
        </div>
        <div className="relative min-w-0 flex-1">
          {tickMarks.map((t) => (
            <div key={t.at} className="absolute inset-y-0 border-l border-border/60 pl-1 leading-8" style={{ left: `${t.at * 100}%` }}>
              {t.label}
            </div>
          ))}
        </div>
      </div>
      <div ref={parentRef} className="relative min-h-0 flex-1 overflow-auto">
        <div style={{ height: virtual.getTotalSize(), position: "relative" }}>
          {virtual.getVirtualItems().map((v) => {
            const r = rows[v.index];
            const s = r.span;
            const isSel = s.spanId === selected;
            const isErr = s.statusCode === "ERROR";
            const dim = matches.size > 0 && !matches.has(s.spanId);
            const color = serviceColor(s.service, trace.services);
            const left = Math.max(0, vis(r.left));
            const right = Math.min(1, vis(r.left + r.width));
            return (
              <div
                key={s.spanId}
                role="row"
                onClick={() => onSelect(s.spanId)}
                className={cn(
                  "absolute inset-x-0 flex cursor-pointer items-stretch border-b border-border/40 text-xs hover:bg-accent/40",
                  isSel && "bg-accent/60",
                  dim && "opacity-40",
                )}
                style={{ top: v.start, height: ROW_HEIGHT }}
              >
                <div className="flex shrink-0 items-center gap-1 overflow-hidden border-r pr-2" style={{ width: nameWidth, paddingLeft: 6 + r.depth * 14 }}>
                  {r.hasChildren ? (
                    <button
                      type="button"
                      aria-label={collapsed.has(s.spanId) ? "Expand" : "Collapse"}
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggle(s.spanId);
                      }}
                      className="shrink-0 rounded-sm text-muted-foreground hover:text-foreground"
                    >
                      {collapsed.has(s.spanId) ? <ChevronRight className="size-3.5" /> : <ChevronDown className="size-3.5" />}
                    </button>
                  ) : (
                    <span className="inline-block w-3.5 shrink-0" />
                  )}
                  <span className="size-2 shrink-0 rounded-sm" style={{ background: color }} />
                  <span className="truncate text-muted-foreground">{s.service}</span>
                  <span className={cn("truncate", isErr && "text-error")}>{s.name}</span>
                  {collapsed.has(s.spanId) && r.descendants > 0 && <Badge variant="secondary" className="ml-auto h-4 px-1 text-[10px]">{r.descendants}</Badge>}
                </div>
                <div className="relative min-w-0 flex-1">
                  {tickMarks.map((t) => (
                    <div key={t.at} className="absolute inset-y-0 border-l border-border/30" style={{ left: `${t.at * 100}%` }} />
                  ))}
                  {right > 0 && left < 1 && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div
                          className={cn("absolute top-1.5 h-4 rounded-sm", isErr && "ring-1 ring-error")}
                          style={{ left: `${left * 100}%`, width: `${Math.max((right - left) * 100, 0.3)}%`, background: color, opacity: isErr ? 0.9 : 0.75 }}
                        />
                      </TooltipTrigger>
                      <TooltipContent side="top" className="font-mono text-xs">
                        {s.name} · {formatNanos(s.durationNs)} · starts +{formatNanos(s.startNs - trace.startNs)}
                      </TooltipContent>
                    </Tooltip>
                  )}
                  <span className="pointer-events-none absolute top-1.5 right-2 font-mono text-[10px] text-muted-foreground">{formatNanos(s.durationNs)}</span>
                </div>
              </div>
            );
          })}
        </div>
        <div
          role="separator"
          aria-orientation="vertical"
          className="absolute inset-y-0 z-10 w-1 cursor-col-resize hover:bg-primary/40"
          style={{ left: nameWidth - 2 }}
          onPointerDown={(e) => {
            const startX = e.clientX;
            const startW = nameWidth;
            const move = (ev: PointerEvent) => setNameWidth(Math.max(160, Math.min(600, startW + ev.clientX - startX)));
            const up = () => {
              window.removeEventListener("pointermove", move);
              window.removeEventListener("pointerup", up);
            };
            window.addEventListener("pointermove", move);
            window.addEventListener("pointerup", up);
          }}
        />
      </div>
    </div>
  );
}
