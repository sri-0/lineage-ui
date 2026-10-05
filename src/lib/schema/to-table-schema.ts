import type { DatePreset } from "@/components/data-table/types";
import type { ApiField, SchemaResponse } from "@/lib/api/types";
import { ARRAY_DELIMITER } from "@/lib/delimiters";
import { field, type SchemaDefinition } from "@/lib/store/schema";
import { col, createTableSchema, type ColBuilder } from "@/lib/table-schema";
import type { TableSchemaDefinition } from "@/lib/table-schema/types";
import { subDays, subHours, subMinutes } from "date-fns";
import { facetable, gridFields } from "./fields";

export const SELECT_COLUMN = "_select";

export function datePresets(): DatePreset[] {
  const now = new Date();
  return [
    { label: "Last 15 minutes", shortcut: "15m", from: subMinutes(now, 15), to: now },
    { label: "Last hour", shortcut: "1h", from: subHours(now, 1), to: now },
    { label: "Last 24 hours", shortcut: "24h", from: subHours(now, 24), to: now },
    { label: "Last 7 days", shortcut: "7d", from: subDays(now, 7), to: now },
    { label: "Last 30 days", shortcut: "30d", from: subDays(now, 30), to: now },
  ];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyCol = ColBuilder<any, any>;

/** One column per field kind, using the same filter primitives as the sidebar. */
function toCol(f: ApiField): AnyCol | null {
  let c: AnyCol;
  switch (f.kind) {
    case "date":
      c = col.timestamp().filterable("timerange", { presets: datePresets() }).minSize(180);
      break;
    case "boolean":
      c = col.boolean().filterable("checkbox").size(90);
      break;
    case "integer":
    case "float":
      c = col.number().filterable("slider", { min: 0, max: 1 }).size(110);
      break;
    case "keyword":
      if (f.enum) {
        c = col.enum(f.enum).filterable("checkbox", { options: f.enum.map((v) => ({ label: v, value: v })) }).display("badge").size(120);
      } else if (facetable(f)) {
        // options are filled from server facets at query time (see widenFilterSchema)
        c = col.enum([] as string[]).filterable("checkbox").display("badge").size(140);
      } else {
        c = col.string().filterable("input").display("code").size(200);
      }
      break;
    case "ip":
      c = col.string().filterable("input").display("code").size(140);
      break;
    case "text":
      c = col.string().filterable("input").display("text").minSize(240).sortable(false);
      break;
    default:
      return null;
  }
  c = c.label(f.label).sheet().resizable().sortable(f.sortable);
  if (f.description) c = c.description(f.description);
  if (f.hidden) c = c.hidden();
  return c;
}

/** Column order for the events grid; anything else follows alphabetically. */
const ORDER = ["project", "controlset_id", "mimetype", "filename", "root_id", "processing_datetime", "refeed_seq", "event_datetime", "purge_id", "object_ids", "s3_ref", "trace_id"];

/** Builds the data-table schema for the events grid: select, time field, then the fields. */
export function toTableSchema(schema: SchemaResponse) {
  const def: TableSchemaDefinition = { [SELECT_COLUMN]: col.select() };
  const fields = gridFields(schema);
  const time = fields.find((f) => f.name === schema.timeField);
  if (time) {
    const c = toCol({ ...time, label: "Started", hidden: false });
    if (c) def[time.name] = c.defaultOpen().commandDisabled().minSize(180);
  }
  const rank = (f: ApiField) => (ORDER.indexOf(f.label) < 0 ? 99 : ORDER.indexOf(f.label));
  for (const f of [...fields].sort((a, b) => rank(a) - rank(b) || a.label.localeCompare(b.label))) {
    if (f.name === schema.timeField) continue;
    const c = toCol(f);
    if (c) def[f.name] = c;
  }
  return createTableSchema(def);
}

/**
 * Keyword columns built as `col.enum([])` would reject every typed value in
 * the command bar (stringLiteral parsing). Replace their filter fields with
 * plain string arrays so `project:alpha` round-trips.
 */
export function widenFilterSchema(def: SchemaDefinition, schema: SchemaResponse): SchemaDefinition {
  const out = { ...def };
  for (const f of gridFields(schema)) {
    if (f.kind === "keyword" && !f.enum && facetable(f) && out[f.name]) {
      out[f.name] = field.array(field.string()).delimiter(ARRAY_DELIMITER);
    }
  }
  return out;
}
