"use client";

import "@xyflow/react/dist/style.css";

import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import type { LineageGraph as Graph } from "@/lib/api/types";
import { tenancyColor } from "@/lib/status";
import { Background, Controls, MiniMap, ReactFlow, ReactFlowProvider, useReactFlow, type Edge, type Node } from "@xyflow/react";
import { Maximize2 } from "lucide-react";
import * as React from "react";
import { DS_H, DS_W, RUN_H, RUN_W, layoutGraph, type LayoutResult } from "./layout";
import { nodeTypes } from "./nodes";

type Props = {
  graph: Graph;
  selectedId?: string | null;
  onSelect: (id: string | null) => void;
  className?: string;
};

/** React Flow canvas with ELK layout, swimlanes per tenancy, datasets toggle. */
export function LineageGraph(props: Props) {
  return (
    <ReactFlowProvider>
      <Canvas {...props} />
    </ReactFlowProvider>
  );
}

function Canvas({ graph, selectedId, onSelect, className }: Props) {
  const [showDatasets, setShowDatasets] = React.useState(false);
  const [layout, setLayout] = React.useState<LayoutResult | null>(null);
  const { fitView } = useReactFlow();

  React.useEffect(() => {
    let alive = true;
    layoutGraph(graph, showDatasets).then((l) => alive && setLayout(l));
    return () => {
      alive = false;
    };
  }, [graph, showDatasets]);

  React.useEffect(() => {
    if (layout) requestAnimationFrame(() => fitView({ padding: 0.15, duration: 200 }));
  }, [layout, fitView]);

  const { nodes, edges } = React.useMemo(() => {
    if (!layout) return { nodes: [] as Node[], edges: [] as Edge[] };
    const open = (id: string) => onSelect(id === selectedId ? null : id);
    const runById = new Map(graph.runs.map((r) => [r.id, r]));
    const dsById = new Map(graph.datasets.map((d) => [d.id, d]));
    const nodes: Node[] = [];
    for (const g of layout.groups) {
      const tenancy = g.id.slice("group:".length);
      nodes.push({ id: g.id, type: "group", position: { x: g.x, y: g.y }, data: { label: tenancy, color: tenancyColor(graph.tenancies, tenancy) }, style: { width: g.width, height: g.height }, selectable: false, draggable: false, zIndex: -1 });
    }
    for (const n of layout.nodes) {
      const run = runById.get(n.id);
      if (run) {
        nodes.push({ id: n.id, type: "run", position: { x: n.x, y: n.y }, parentId: n.parent, extent: n.parent ? "parent" : undefined, data: { run, selected: n.id === selectedId, dim: false, onOpen: open }, style: { width: RUN_W, height: RUN_H } });
        continue;
      }
      const ds = dsById.get(n.id);
      if (ds) nodes.push({ id: n.id, type: "dataset", position: { x: n.x, y: n.y }, data: { dataset: ds, selected: n.id === selectedId, onOpen: open }, style: { width: DS_W, height: DS_H } });
    }
    const edges: Edge[] = [];
    if (showDatasets) {
      for (const e of graph.edges) edges.push({ id: `${e.from}>${e.to}`, source: e.from, target: e.to, type: "smoothstep", animated: runById.get(e.to)?.status === "RUNNING" });
    } else {
      const outputsBy = new Map<string, string[]>();
      for (const e of graph.edges) if (e.kind === "output") (outputsBy.get(e.from) ?? outputsBy.set(e.from, []).get(e.from)!).push(e.to);
      const seen = new Set<string>();
      for (const e of graph.edges) {
        if (e.kind !== "input") continue;
        for (const [run, outs] of outputsBy) {
          if (outs.includes(e.from) && run !== e.to && !seen.has(`${run}>${e.to}`)) {
            seen.add(`${run}>${e.to}`);
            edges.push({ id: `${run}>${e.to}`, source: run, target: e.to, type: "smoothstep", animated: runById.get(e.to)?.status === "RUNNING" });
          }
        }
      }
      for (const r of graph.runs) {
        if (r.parentRunId && runById.has(r.parentRunId) && !seen.has(`${r.parentRunId}>${r.id}`)) {
          seen.add(`${r.parentRunId}>${r.id}`);
          edges.push({ id: `${r.parentRunId}>${r.id}`, source: r.parentRunId, target: r.id, type: "smoothstep", style: { strokeDasharray: "4 4" } });
        }
      }
    }
    // stubs: a locked node after a reduced handoff
    for (const s of graph.stubs ?? []) {
      const after = layout.nodes.find((n) => n.id === s.afterRunId);
      if (!after) continue;
      const parentGroup = layout.groups.find((g) => g.id === after.parent);
      const id = `stub:${s.afterRunId}`;
      nodes.push({ id, type: "stub", position: { x: (parentGroup?.x ?? 0) + after.x, y: (parentGroup?.y ?? 0) + after.y + RUN_H + 40 }, data: { reason: s.reason }, selectable: false, draggable: false, style: { width: RUN_W, height: RUN_H } });
      edges.push({ id: `${s.afterRunId}>${id}`, source: s.afterRunId, target: id, type: "smoothstep", style: { strokeDasharray: "4 4" } });
    }
    return { nodes, edges };
  }, [layout, graph, selectedId, onSelect, showDatasets]);

  return (
    <div className={className}>
      <ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes} fitView fitViewOptions={{ padding: 0.1, maxZoom: 1 }} minZoom={0.1} proOptions={{ hideAttribution: true }} nodesConnectable={false} onPaneClick={() => onSelect(null)} className="bg-background">
        <Background gap={24} className="opacity-40!" />
        <Controls showInteractive={false} className="rounded-md border" />
        <MiniMap pannable zoomable className="rounded-md border" nodeColor={(n) => (n.type === "group" ? "transparent" : n.type === "dataset" ? "#64748b" : "#94a3b8")} maskColor="color-mix(in oklab, var(--background) 70%, transparent)" bgColor="var(--card)" />
      </ReactFlow>
      <div className="pointer-events-none absolute top-2 right-2 flex items-center gap-3">
        <div className="pointer-events-auto flex items-center gap-2 rounded-md border bg-card px-2.5 py-1.5 text-xs">
          <Switch id="show-datasets" checked={showDatasets} onCheckedChange={setShowDatasets} />
          <Label htmlFor="show-datasets" className="text-xs">Show files</Label>
        </div>
        <Button variant="outline" size="icon" className="pointer-events-auto size-8" onClick={() => fitView({ padding: 0.15, duration: 200 })} aria-label="Fit view">
          <Maximize2 className="size-4" />
        </Button>
      </div>
    </div>
  );
}
