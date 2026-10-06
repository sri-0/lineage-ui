import type { ApiField, Filter, QueryRequest, SchemaResponse, Sort } from "@/lib/api/types";
import { toISO } from "./dates";
import { facetable, gridFields } from "./fields";

/** Data-table state keys that are not column filters (see the extra fields in lineage-view.tsx). */
export const STATE_KEYS = new Set(["sort", "uuid"]);

function isEmpty(v: unknown) {
  return v === null || v === undefined || v === "" || (Array.isArray(v) && v.length === 0);
}

/** Converts one data-table filter value into typed API filters. */
export function columnFilterToApi(field: ApiField, value: unknown): Filter[] {
  const name = field.name;
  if (isEmpty(value)) return [];
  if (Array.isArray(value)) {
    switch (field.kind) {
      case "date": {
        const [from, to] = value;
        if (isEmpty(from) && isEmpty(to)) return [];
        return [{ field: name, op: "between", value: [toISO(from), toISO(to)] }];
      }
      case "integer":
      case "float": {
        const nums = value.filter((v) => typeof v === "number") as number[];
        if (nums.length === 0) return [];
        if (nums.length >= 2) return [{ field: name, op: "between", value: [nums[0], nums[1]] }];
        return [{ field: name, op: "gte", value: nums[0] }];
      }
      case "boolean": {
        const bools = value.filter((v) => typeof v === "boolean");
        return bools.length === 1 ? [{ field: name, op: "eq", value: bools[0] }] : [];
      }
      default:
        return [{ field: name, op: "in", value: value.filter((v) => !isEmpty(v)) }];
    }
  }
  if (typeof value === "string") {
    const s = value.trim();
    if (!s) return [];
    if (field.kind === "text") return [{ field: name, op: "match", value: s }];
    if (field.kind === "ip") return [{ field: name, op: "eq", value: s }];
    return [{ field: name, op: "wildcard", value: /[*?]/.test(s) ? s : `*${s}*` }];
  }
  if (typeof value === "number" || typeof value === "boolean") return [{ field: name, op: "eq", value }];
  return [];
}

/** Builds the POST body for /events/query from the data-table state. */
export function buildEventsRequest(schema: SchemaResponse, state: Record<string, unknown>, opts: { size?: number; histogramSeries?: string } = {}): Omit<QueryRequest, "cursor" | "meta"> {
  const fields = gridFields(schema);
  const byName = new Map(fields.map((f) => [f.name, f]));
  const filters: Filter[] = [];
  for (const [key, value] of Object.entries(state)) {
    if (STATE_KEYS.has(key) || isEmpty(value)) continue;
    const f = byName.get(key);
    if (f) filters.push(...columnFilterToApi(f, value));
  }
  const sort: Sort[] = [];
  const s = state.sort as { id: string; desc: boolean } | null | undefined;
  if (s?.id && byName.get(s.id)?.sortable) sort.push({ field: s.id, order: s.desc ? "desc" : "asc" });
  const facets = fields.filter(facetable).map((f) => f.name);
  const body: Omit<QueryRequest, "cursor" | "meta"> = { filters, sort, size: opts.size ?? 50, facets };
  if (schema.timeField) body.histogram = { field: schema.timeField, interval: "auto", series: opts.histogramSeries || undefined };
  return body;
}

/** Dates cannot be persisted as JSON; store epoch ms and revive by schema. */
export function serializeState(state: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(state)) {
    if (isEmpty(v)) continue;
    out[k] = Array.isArray(v) ? v.map((x) => (x instanceof Date ? x.getTime() : x)) : v;
  }
  return out;
}

export function reviveState(state: Record<string, unknown>, schema: SchemaResponse): Record<string, unknown> {
  const dates = new Set(gridFields(schema).filter((f) => f.kind === "date").map((f) => f.name));
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(state)) {
    out[k] = dates.has(k) && Array.isArray(v) ? v.map((x) => (typeof x === "number" ? new Date(x) : x)) : v;
  }
  return out;
}
