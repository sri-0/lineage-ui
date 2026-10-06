"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { schemaOptions } from "@/lib/api/query-options";
import type { SchemaResponse } from "@/lib/api/types";
import { reviveState, serializeState } from "@/lib/schema/filter-mapping";
import { toTableSchema, widenFilterSchema } from "@/lib/schema/to-table-schema";
import { useTabAdapter } from "@/lib/store/adapters/tab";
import { DataTableStoreProvider } from "@/lib/store/provider/DataTableStoreProvider";
import { createSchema, field } from "@/lib/store/schema";
import { useTabs } from "@/lib/store/tabs";
import { generateFilterSchema } from "@/lib/table-schema";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle } from "lucide-react";
import * as React from "react";
import { EventsTable } from "./events-table";

/** The lineage view (/lineage): every top-level run ever indexed. Schema from the API, a persisted filter store, the grid. */
export function LineageView() {
  const { data: schema, isLoading, error } = useQuery(schemaOptions());
  if (isLoading) {
    return (
      <div className="flex h-full flex-col gap-3 p-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="flex-1" />
      </div>
    );
  }
  if (error || !schema) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertTitle>Could not load schema</AlertTitle>
          <AlertDescription>{error?.message ?? "Unknown error"}</AlertDescription>
        </Alert>
      </div>
    );
  }
  return <Loaded schema={schema} />;
}

function Loaded({ schema }: { schema: SchemaResponse }) {
  // Read once: the persisted filters only seed the store. Subscribing would re-render
  // the whole grid every time the store writes them back.
  const [eventFilters] = React.useState(() => useTabs.getState().eventFilters);
  const setEventFilters = useTabs((s) => s.setEventFilters);
  const tableSchema = React.useMemo(() => toTableSchema(schema), [schema]);
  const filterSchema = React.useMemo(() => {
    const generated = generateFilterSchema(tableSchema.definition, { sort: field.sort(), uuid: field.string() });
    return createSchema(widenFilterSchema(generated.definition, schema));
  }, [tableSchema, schema]);
  // Revive the persisted filter state once per schema; later writes come from this store.
  const initialState = React.useMemo(() => reviveState(eventFilters, schema), [schema]); // eslint-disable-line react-hooks/exhaustive-deps
  const onChange = React.useCallback((state: Record<string, unknown>) => setEventFilters(serializeState(state)), [setEventFilters]);
  const adapter = useTabAdapter(filterSchema.definition, { id: "events", initialState, onChange });
  return (
    <DataTableStoreProvider adapter={adapter}>
      <EventsTable schema={schema} tableSchema={tableSchema} filterSchema={filterSchema} />
    </DataTableStoreProvider>
  );
}
