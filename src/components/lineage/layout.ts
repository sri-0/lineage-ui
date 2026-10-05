import type { LineageGraph } from "@/lib/api/types";
import ELK, { type ElkNode } from "elkjs/lib/elk.bundled.js";

export const RUN_W = 220;
export const RUN_H = 64;
export const DS_W = 200;
export const DS_H = 44;

export type Positioned = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  parent?: string;
};

export type LayoutResult = { nodes: Positioned[]; groups: Positioned[] };

const elk = new ELK();

/**
 * Layered top-to-bottom layout with one compound node (lane) per tenancy
 * holding its runs; datasets sit outside groups so edges can cross lanes.
 */
export async function layoutGraph(g: LineageGraph, showDatasets: boolean): Promise<LayoutResult> {
  const children: ElkNode[] = [];
  const edges: { id: string; sources: string[]; targets: string[] }[] = [];

  const byTenancy = new Map<string, ElkNode[]>();
  for (const r of g.runs) {
    const node: ElkNode = { id: r.id, width: RUN_W, height: RUN_H };
    (byTenancy.get(r.tenancy) ?? byTenancy.set(r.tenancy, []).get(r.tenancy)!).push(node);
  }
  for (const [tenancy, nodes] of byTenancy) {
    children.push({ id: `group:${tenancy}`, children: nodes, layoutOptions: { "elk.padding": "[top=36,left=16,bottom=16,right=16]" } });
  }
  if (showDatasets) {
    for (const d of g.datasets) children.push({ id: d.id, width: DS_W, height: DS_H });
    for (const e of g.edges) edges.push({ id: `${e.from}>${e.to}`, sources: [e.from], targets: [e.to] });
  } else {
    // run-to-run edges derived through datasets (or parent links when no datasets)
    const outputsBy = new Map<string, string[]>();
    for (const e of g.edges) if (e.kind === "output") (outputsBy.get(e.from) ?? outputsBy.set(e.from, []).get(e.from)!).push(e.to);
    const seen = new Set<string>();
    for (const e of g.edges) {
      if (e.kind !== "input") continue;
      for (const [run, outs] of outputsBy) {
        if (outs.includes(e.from) && run !== e.to) {
          const id = `${run}>${e.to}`;
          if (!seen.has(id)) {
            seen.add(id);
            edges.push({ id, sources: [run], targets: [e.to] });
          }
        }
      }
    }
    for (const r of g.runs) {
      if (r.parentRunId && !seen.has(`${r.parentRunId}>${r.id}`) && g.runs.some((x) => x.id === r.parentRunId)) {
        seen.add(`${r.parentRunId}>${r.id}`);
        edges.push({ id: `${r.parentRunId}>${r.id}`, sources: [r.parentRunId], targets: [r.id] });
      }
    }
  }

  const root: ElkNode = {
    id: "root",
    layoutOptions: {
      "elk.algorithm": "layered",
      "elk.direction": "DOWN",
      "elk.hierarchyHandling": "INCLUDE_CHILDREN",
      "elk.layered.spacing.nodeNodeBetweenLayers": "40",
      "elk.spacing.nodeNode": "20",
      "elk.spacing.componentComponent": "40",
      "elk.layered.nodePlacement.strategy": "NETWORK_SIMPLEX",
      "elk.edgeRouting": "SPLINES",
    },
    children,
    edges,
  };
  const out = await elk.layout(root);
  const nodes: Positioned[] = [];
  const groups: Positioned[] = [];
  const walk = (n: ElkNode, ox: number, oy: number, parent?: string) => {
    for (const c of n.children ?? []) {
      const x = (c.x ?? 0) + ox;
      const y = (c.y ?? 0) + oy;
      if (c.id.startsWith("group:")) {
        groups.push({ id: c.id, x, y, width: c.width ?? 0, height: c.height ?? 0 });
        walk(c, x, y, c.id);
      } else {
        nodes.push({ id: c.id, x: parent ? (c.x ?? 0) : x, y: parent ? (c.y ?? 0) : y, width: c.width ?? 0, height: c.height ?? 0, parent });
      }
    }
  };
  walk(out, 0, 0);
  return { nodes, groups };
}
