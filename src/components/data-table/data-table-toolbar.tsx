"use client";

import { useDataTable } from "@/components/data-table/data-table-provider";
import { formatCompactNumber } from "@/lib/format";
import { DataTableResetButton } from "./data-table-reset-button";
import { DataTableViewOptions } from "./data-table-view-options";

interface DataTableToolbarProps {
  renderActions?: () => React.ReactNode;
}

export function DataTableToolbar({ renderActions }: DataTableToolbarProps) {
  const { table, columnFilters, totalRows, filterRows } = useDataTable();
  const rows = {
    total: totalRows ?? table.getCoreRowModel().rows.length,
    filtered: filterRows ?? table.getFilteredRowModel().rows.length,
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <div>
          <p className="text-muted-foreground hidden text-sm sm:block">
            <span className="font-mono font-medium">
              {formatCompactNumber(rows.filtered)}
            </span>{" "}
            of{" "}
            <span className="font-mono font-medium">
              {formatCompactNumber(rows.total)}
            </span>{" "}
            row(s) <span className="sr-only sm:not-sr-only">filtered</span>
          </p>
          <p className="text-muted-foreground block text-sm sm:hidden">
            <span className="font-mono font-medium">
              {formatCompactNumber(rows.filtered)}
            </span>{" "}
            row(s)
          </p>
        </div>
      </div>
      <div className="ml-auto flex items-center gap-2">
        {columnFilters.length ? <DataTableResetButton /> : null}
        {renderActions?.()}
        <DataTableViewOptions />
      </div>
    </div>
  );
}
