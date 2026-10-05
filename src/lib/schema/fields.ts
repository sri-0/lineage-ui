import type { ApiField, FieldType, SchemaField, SchemaResponse } from "@/lib/api/types";

/** Maps OpenSearch mapping types onto the UI's field kinds. */
export function kindOf(osType: string): FieldType {
  switch (osType) {
    case "keyword":
    case "constant_keyword":
    case "flat_object":
      return "keyword";
    case "text":
    case "match_only_text":
    case "search_as_you_type":
      return "text";
    case "boolean":
      return "boolean";
    case "long":
    case "integer":
    case "short":
    case "byte":
    case "unsigned_long":
      return "integer";
    case "double":
    case "float":
    case "half_float":
    case "scaled_float":
      return "float";
    case "date":
    case "date_nanos":
      return "date";
    case "ip":
      return "ip";
    default:
      return "object";
  }
}

/** Fields that identify the run itself; kept out of the grid but still used by paths. */
const INTERNAL = new Set(["run_kind", "root_run_id", "detail_level", "event_ref", "span_id", "plugin", "plugin_seq", "tenancy", "submission_id", "ray_job_id", "error", "parent_ids", "filepath"]);
/** Start hidden in the grid; still filterable and in the column picker. */
const DEFAULT_HIDDEN = new Set(["purge_id", "object_ids", "s3_ref", "trace_id", "disposition_datetime", "event_datetime", "refeed_seq", "eventType", "job.name", "job.namespace"]);

/** The grid's fields: the time field plus the API's listed fields, labelled without their prefix. */
export function gridFields(schema: SchemaResponse): ApiField[] {
  return schema.fields
    .filter((f) => f.type !== "flat_object")
    .map((f) => {
      const short = f.name.replace(/^promoted\./, "");
      return { ...f, kind: f.keyword ? "keyword" : kindOf(f.type), label: short, hidden: DEFAULT_HIDDEN.has(short) };
    })
    .filter((f) => !INTERNAL.has(f.label) || f.name === schema.timeField);
}

/** Keyword-ish fields get a terms facet; numbers and dates get stats. Ids are excluded. */
export function facetable(f: SchemaField & { kind: FieldType }): boolean {
  if (!f.aggregatable || f.nestedPath) return false;
  if (f.kind === "ip" || f.kind === "date") return false;
  if (/(^|\.)(root_id|purge_id|object_ids|trace_id|run_id|runId|_id)$/.test(f.name)) return false;
  return true;
}

/** Reads a document value through a configured path like "promoted.root_id". */
export function at(doc: Record<string, unknown>, path: string | undefined): unknown {
  if (!path) return undefined;
  let cur: unknown = doc;
  for (const part of path.split(".")) {
    if (cur === null || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[part];
  }
  return cur;
}

export function str(v: unknown): string {
  if (Array.isArray(v)) return v.length ? String(v[0]) : "";
  return v === undefined || v === null ? "" : String(v);
}
