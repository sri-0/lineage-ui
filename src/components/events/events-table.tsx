"use client";

import { useControls } from "@/components/controls";
import { TimelineChart, type TimelineChartSeries } from "@/components/data-table/data-table-chart/timeline-chart";
import { DataTableFilterCommand } from "@/components/data-table/data-table-filter-command";
import { DataTableInfinite } from "@/components/data-table/data-table-infinite";
import { useDataTable } from "@/components/data-table/data-table-provider";
import { DataTableRefreshButton } from "@/components/data-table/data-table-refresh-button";
import { Button } from "@/components/ui/button";
import { eventsOptions } from "@/lib/api/query-options";
import type { EventRow, QueryMeta, SchemaResponse } from "@/lib/api/types";
import { applyFacets, getFacetedMinMaxValues, getFacetedUniqueValues } from "@/lib/data-table";
import { isActive } from "@/lib/filters";
import { STATE_KEYS, buildEventsRequest } from "@/lib/schema/filter-mapping";
import { toTableSchema } from "@/lib/schema/to-table-schema";
import { at, gridFields } from "@/lib/schema/fields";
import { RUN_STATUS, TENANCY_COLORS, formatDuration } from "@/lib/status";
import { useFilterState } from "@/lib/store/hooks/useFilterState";
import type { SchemaDefinition } from "@/lib/store/schema";
import { useTabs } from "@/lib/store/tabs";
import type { DataTableFeatures } from "@/lib/table/features";
import { generateColumns, generateFilterFields, getDefaultColumnVisibility } from "@/lib/table-schema";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { SlidersHorizontal } from "lucide-react";
import * as React from "react";
import { MiniLineage } from "./mini-lineage";
import { RunStatusPill } from "./status-pill";

type Props = { schema: SchemaResponse; tableSchema: ReturnType<typeof toTableSchema>; filterSchema: { definition: SchemaDefinition } };

const EXTRA: ColumnDef<DataTableFeatures, EventRow>[] = [
  {
    id: "_status",
    accessorKey: "_status",
    header: "Status",
    size: 110,
    enableSorting: false,
    enableResizing: true,
    cell: ({ row }) => <RunStatusPill status={row.original._status} />,
    meta: { label: "Status" },
  },
  {
    id: "_durationMs",
    accessorKey: "_durationMs",
    header: "Duration",
    size: 100,
    enableSorting: false,
    enableResizing: true,
    cell: ({ row }) => <span className="font-mono text-xs">{row.original._durationMs === null ? "…" : formatDuration(row.original._durationMs)}</span>,
    meta: { label: "Duration" },
  },
  {
    id: "_lineage",
    header: "Lineage",
    size: 220,
    enableSorting: false,
    enableResizing: true,
    cell: ({ row }) => <MiniLineage runId={row.original._runId} />,
    meta: { label: "Lineage" },
  },
];

export function EventsTable({ schema, tableSchema, filterSchema }: Props) {
  const columns = React.useMemo(() => {
    const generated = generateColumns<EventRow>(tableSchema.definition);
    // select, time, then status/duration/mini lineage, then the promoted fields
    return [generated[0], generated[1], ...EXTRA, ...generated.slice(2)];
  }, [tableSchema]);
  const filterFields = React.useMemo(() => generateFilterFields<EventRow>(tableSchema.definition), [tableSchema]);
  const defaultVisibility = React.useMemo(() => getDefaultColumnVisibility(tableSchema.definition), [tableSchema]);

  const state = useFilterState<Record<string, unknown>>();
  const open = useTabs((s) => s.open);
  const body = React.useMemo(() => buildEventsRequest(schema, state, { histogramSeries: schema.paths.project }), [schema, state]);
  const options = React.useMemo(() => eventsOptions(body), [body]);
  const queryClient = useQueryClient();
  const { data, isFetching, isLoading, fetchNextPage, hasNextPage, error } = useInfiniteQuery(options);
  // The generated columns read dotted keys flat (`row["promoted.project"]`), so mirror nested values onto those keys.
  // Flattened rows are cached per source row: react-query keeps earlier pages referentially stable when a page is
  // appended, so rows already on screen keep their identity and the row memo holds instead of re-rendering them all.
  const dotted = React.useMemo(() => gridFields(schema).map((f) => f.name).filter((n) => n.includes(".")), [schema]);
  // one cache per set of dotted keys; a new schema starts a new one
  const flatCache = React.useMemo(() => new WeakMap<EventRow, EventRow>(), [dotted]);
  const rows = React.useMemo(
    () => (data?.pages.flatMap((p) => p.data) ?? []).map((r) => {
      const cached = flatCache.get(r);
      if (cached) return cached;
      const out: EventRow = { ...r };
      for (const key of dotted) out[key] = at(r, key);
      flatCache.set(r, out);
      return out;
    }),
    [data?.pages, dotted, flatCache],
  );
  const meta: QueryMeta | undefined = data?.pages[0]?.meta;
  const facets = React.useMemo(() => (meta?.facets ? Object.fromEntries(Object.entries(meta.facets).map(([k, f]) => [k, { ...f, rows: f.rows ?? [] }])) : undefined), [meta]);
  const dynamicFilterFields = React.useMemo(() => applyFacets(filterFields, facets), [filterFields, facets]);
  const [defaultColumnFilters] = React.useState(() =>
    Object.entries(state)
      .filter(([k, v]) => !STATE_KEYS.has(k) && isActive(v))
      .map(([id, value]) => ({ id, value })),
  );
  const sort = state.sort as { id: string; desc: boolean } | null | undefined;
  const series = React.useMemo<TimelineChartSeries[]>(
    () => (meta?.chartSeries ?? ["total"]).map((k, i) => ({ key: k, label: k, color: TENANCY_COLORS[i % TENANCY_COLORS.length] })),
    [meta?.chartSeries],
  );
  const refresh = React.useCallback(() => queryClient.resetQueries({ queryKey: options.queryKey, exact: true }), [queryClient, options.queryKey]);
  // Stable: the row memo compares it by identity.
  const rowClass = React.useCallback((row: { original: EventRow }) => (row.original._status === "FAIL" ? "bg-error/5 hover:bg-error/10" : ""), []);

  // Row click (detail state `uuid`) opens the right-hand panel.
  const uuid = state.uuid as string | null | undefined;

  React.useEffect(() => {
    if (uuid) open(uuid);
  }, [uuid, open]);

  return (
    <div className="h-full min-h-0">
      <DataTableInfinite<EventRow>
        columns={columns}
        data={rows}
        totalRows={meta?.totalRowCount}
        filterRows={meta?.filterRowCount}
        totalRowsFetched={rows.length}
        defaultColumnFilters={defaultColumnFilters}
        defaultColumnSorting={sort ? [sort] : undefined}
        defaultRowSelection={uuid ? { [uuid]: true } : undefined}
        defaultColumnVisibility={defaultVisibility}
        filterFields={dynamicFilterFields}
        isFetching={isFetching}
        isLoading={isLoading}
        fetchNextPage={fetchNextPage}
        hasNextPage={hasNextPage}
        getRowId={(row) => row._runId}
        getRowClassName={rowClass}
        getFacetedUniqueValues={getFacetedUniqueValues(facets)}
        getFacetedMinMaxValues={getFacetedMinMaxValues(facets)}
        chartSlot={schema.timeField ? <TimelineChart data={meta?.chartData ?? []} columnId={schema.timeField} series={series} className="-mb-2" /> : undefined}
        toolbarActions={<DataTableRefreshButton onClick={refresh} />}
        commandSlot={
          <div className="flex flex-col gap-1">
            <div className="flex items-start gap-2">
              <FiltersToggle />
              <div className="min-w-0 flex-1">
                <DataTableFilterCommand schema={filterSchema.definition} tableId="events" />
              </div>
            </div>
            {error && <p className="text-xs text-destructive">{error.message}</p>}
          </div>
        }
        footerSlot={<Legend />}
        tableId="events"
      />
    </div>
  );
}

/** Shows or hides the filters panel; sits beside the search bar. */
function FiltersToggle() {
  const { open, setOpen } = useControls();
  return (
    <Button
      variant="outline"
      size="icon"
      className="size-9 shrink-0 aria-pressed:bg-foreground/[0.1] aria-pressed:text-foreground"
      aria-pressed={open}
      aria-label={open ? "Hide filters" : "Show filters"}
      title={open ? "Hide filters" : "Show filters"}
      onClick={() => setOpen((v) => !v)}
    >
      <SlidersHorizontal className="size-4" />
    </Button>
  );
}

function Legend() {
  const { filterRows, totalRows } = useDataTable();
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
      <span className="font-mono">{(filterRows ?? 0).toLocaleString()} / {(totalRows ?? 0).toLocaleString()}</span>
      {Object.entries(RUN_STATUS).filter(([k]) => k !== "QUEUED").map(([k, v]) => (
        <span key={k} className="flex items-center gap-1">
          <span className="size-1.5 rounded-full" style={{ background: v.color }} /> {v.label}
        </span>
      ))}
    </div>
  );
}
