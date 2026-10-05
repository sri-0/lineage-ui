import type { OtlpAnyValue, OtlpKeyValue, OtlpTrace } from "@/lib/api/types";

/** Flattened span used by the viewer. Built from OTLP/JSON once per trace. */
export type Span = {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  name: string;
  service: string;
  kind: string;
  startNs: number;
  endNs: number;
  durationNs: number;
  statusCode: "UNSET" | "OK" | "ERROR";
  statusMessage?: string;
  attributes: Record<string, unknown>;
  resource: Record<string, unknown>;
  events: { name: string; timeNs: number; attributes: Record<string, unknown> }[];
  links: { traceId: string; spanId: string; attributes: Record<string, unknown> }[];
};

export type Trace = { traceId: string; startNs: number; endNs: number; durationNs: number; services: string[]; spans: Span[] };

const KINDS: Record<string, string> = { "0": "UNSPECIFIED", "1": "INTERNAL", "2": "SERVER", "3": "CLIENT", "4": "PRODUCER", "5": "CONSUMER" };
const STATUS: Record<string, Span["statusCode"]> = { "0": "UNSET", "1": "OK", "2": "ERROR", STATUS_CODE_UNSET: "UNSET", STATUS_CODE_OK: "OK", STATUS_CODE_ERROR: "ERROR" };

/** Normalises OTLP/JSON (resourceSpans) into a flat, sorted span list. */
export function fromOtlp(t: OtlpTrace): Trace {
  const spans: Span[] = [];
  const services = new Set<string>();
  for (const rs of t.resourceSpans ?? []) {
    const resource = attrs(rs.resource?.attributes);
    const service = String(resource["service.name"] ?? "unknown");
    services.add(service);
    for (const ss of rs.scopeSpans ?? []) {
      for (const s of ss.spans ?? []) {
        const startNs = Number(s.startTimeUnixNano);
        const endNs = Number(s.endTimeUnixNano);
        spans.push({
          traceId: s.traceId,
          spanId: s.spanId,
          parentSpanId: s.parentSpanId || undefined,
          name: s.name,
          service,
          kind: KINDS[String(s.kind ?? 0)] ?? String(s.kind ?? "").replace(/^SPAN_KIND_/, ""),
          startNs,
          endNs,
          durationNs: endNs - startNs,
          statusCode: STATUS[String(s.status?.code ?? 0)] ?? "UNSET",
          statusMessage: s.status?.message || undefined,
          attributes: attrs(s.attributes),
          resource,
          events: (s.events ?? []).map((e) => ({ name: e.name, timeNs: Number(e.timeUnixNano), attributes: attrs(e.attributes) })),
          links: (s.links ?? []).map((l) => ({ traceId: l.traceId, spanId: l.spanId, attributes: attrs(l.attributes) })),
        });
      }
    }
  }
  spans.sort((a, b) => a.startNs - b.startNs);
  const startNs = spans.length ? Math.min(...spans.map((s) => s.startNs)) : 0;
  const endNs = spans.length ? Math.max(...spans.map((s) => s.endNs)) : 0;
  return { traceId: spans[0]?.traceId ?? "", startNs, endNs, durationNs: endNs - startNs, services: [...services].sort(), spans };
}

function attrs(kv?: OtlpKeyValue[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const { key, value } of kv ?? []) out[key] = anyValue(value);
  return out;
}

function anyValue(v: OtlpAnyValue | undefined): unknown {
  if (!v) return undefined;
  if (v.stringValue !== undefined) return v.stringValue;
  if (v.intValue !== undefined) return Number(v.intValue);
  if (v.doubleValue !== undefined) return v.doubleValue;
  if (v.boolValue !== undefined) return v.boolValue;
  if (v.arrayValue) return v.arrayValue.values.map(anyValue);
  if (v.kvlistValue) return attrs(v.kvlistValue.values);
  if (v.bytesValue !== undefined) return v.bytesValue;
  return undefined;
}

/** A span positioned in the tree and on the timeline. */
export type SpanRow = { span: Span; depth: number; hasChildren: boolean; left: number; width: number; descendants: number };

/** Depth-first rows from the flat list; orphans (missing parent) become roots. */
export function buildRows(trace: Trace, collapsed: Set<string>): SpanRow[] {
  const byParent = new Map<string, Span[]>();
  const ids = new Set(trace.spans.map((s) => s.spanId));
  for (const s of trace.spans) {
    const parent = s.parentSpanId && ids.has(s.parentSpanId) ? s.parentSpanId : "";
    (byParent.get(parent) ?? byParent.set(parent, []).get(parent)!).push(s);
  }
  const total = Math.max(1, trace.durationNs);
  const count = (id: string): number => (byParent.get(id) ?? []).reduce((n, c) => n + 1 + count(c.spanId), 0);
  const rows: SpanRow[] = [];
  const visit = (parent: string, depth: number) => {
    for (const s of byParent.get(parent) ?? []) {
      const children = byParent.get(s.spanId) ?? [];
      rows.push({ span: s, depth, hasChildren: children.length > 0, left: (s.startNs - trace.startNs) / total, width: Math.max(s.durationNs / total, 0.002), descendants: count(s.spanId) });
      if (!collapsed.has(s.spanId)) visit(s.spanId, depth + 1);
    }
  };
  visit("", 0);
  return rows;
}

export function formatNanos(ns: number) {
  const ms = ns / 1e6;
  if (ms < 1) return `${(ns / 1e3).toFixed(0)} µs`;
  if (ms < 1000) return `${ms.toFixed(ms < 10 ? 2 : 0)} ms`;
  return `${(ms / 1000).toFixed(2)} s`;
}

export function serviceColor(service: string, services: string[]) {
  const palette = ["#60a5fa", "#f97316", "#a78bfa", "#34d399", "#f472b6", "#facc15", "#22d3ee", "#fb7185"];
  const i = services.indexOf(service);
  return palette[(i < 0 ? 0 : i) % palette.length];
}
