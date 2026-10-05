"use client";

import { useControls } from "@/components/controls";
import { useDataTable } from "@/components/data-table/data-table-provider";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { DataTableFeatures } from "@/lib/table/features";
import { cn } from "@/lib/utils";
import type { Column, RowData } from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronDown, EyeOff, GripVertical, ListFilter, X } from "lucide-react";
import * as React from "react";

interface DataTableColumnHeaderProps<TData extends RowData, TValue> extends React.ComponentProps<"div"> {
  column: Column<DataTableFeatures, TData, TValue>;
  title: string;
}

const DRAG_TYPE = "application/x-column-id";

/**
 * Column header: a grip to drag the column to a new position, the title
 * (click toggles sort) and a chevron menu with explicit sort directions, a
 * jump to the column's filter, and hide.
 */
export function DataTableColumnHeader<TData extends RowData, TValue>({ column, title, className, ...props }: DataTableColumnHeaderProps<TData, TValue>) {
  const { setOpen } = useControls();
  const { table } = useDataTable();
  const [dropSide, setDropSide] = React.useState<"left" | "right" | null>(null);
  const canSort = column.getCanSort();
  const canFilter = column.getCanFilter();
  const canHide = column.getCanHide();
  const sorted = column.getIsSorted();

  const onDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    if (!e.dataTransfer.types.includes(DRAG_TYPE)) return;
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    setDropSide(e.clientX < rect.left + rect.width / 2 ? "left" : "right");
  };
  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    const dragged = e.dataTransfer.getData(DRAG_TYPE);
    setDropSide(null);
    if (!dragged || dragged === column.id) return;
    e.preventDefault();
    const current = table.state.columnOrder.length ? [...table.state.columnOrder] : table.getAllLeafColumns().map((c) => c.id);
    const from = current.indexOf(dragged);
    if (from >= 0) current.splice(from, 1);
    const target = current.indexOf(column.id);
    current.splice(dropSide === "right" ? target + 1 : target, 0, dragged);
    table.setColumnOrder(current);
  };

  return (
    <div
      className={cn(
        "group/header relative flex h-7 w-full items-center gap-0.5",
        dropSide === "left" && "before:absolute before:inset-y-0 before:-left-2 before:w-0.5 before:bg-primary",
        dropSide === "right" && "after:absolute after:inset-y-0 after:-right-2 after:w-0.5 after:bg-primary",
        className,
      )}
      onDragOver={onDragOver}
      onDragLeave={() => setDropSide(null)}
      onDrop={onDrop}
      {...props}
    >
      <span
        draggable
        onDragStart={(e) => {
          e.dataTransfer.setData(DRAG_TYPE, column.id);
          e.dataTransfer.effectAllowed = "move";
        }}
        title="Drag to reorder"
        aria-label={`Drag ${title} column`}
        // Zero width until hover so the title stays flush left; it slides in on hover.
        className="w-0 shrink-0 cursor-grab overflow-hidden rounded-sm text-muted-foreground opacity-0 transition-all duration-150 group-hover/header:-ml-1 group-hover/header:w-4 group-hover/header:opacity-100 active:cursor-grabbing"
      >
        <GripVertical className="size-3.5" />
      </span>
      <Button
        variant="ghost"
        disabled={!canSort}
        onClick={() => column.toggleSorting(undefined)}
        className="h-7 min-w-0 flex-1 justify-start gap-1 px-0 hover:bg-transparent disabled:opacity-100"
      >
        <span className="truncate">{title}</span>
        {sorted === "asc" && <ArrowUp className="size-3 shrink-0 text-accent-foreground" />}
        {sorted === "desc" && <ArrowDown className="size-3 shrink-0 text-accent-foreground" />}
      </Button>
      {(canSort || canFilter || canHide) && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-6 shrink-0 text-muted-foreground opacity-0 group-hover/header:opacity-100 data-[state=open]:opacity-100"
              aria-label={`${title} column actions`}
            >
              <ChevronDown className="size-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="min-w-44">
            {canSort && (
              <>
                <DropdownMenuItem onClick={() => column.toggleSorting(false)}>
                  <ArrowUp className="size-4" /> Sort ascending
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => column.toggleSorting(true)}>
                  <ArrowDown className="size-4" /> Sort descending
                </DropdownMenuItem>
                {sorted && (
                  <DropdownMenuItem onClick={() => column.clearSorting()}>
                    <ArrowUpDown className="size-4" /> Clear sort
                  </DropdownMenuItem>
                )}
              </>
            )}
            {canFilter && (
              <>
                {canSort && <DropdownMenuSeparator />}
                <DropdownMenuItem onClick={() => setOpen(true)}>
                  <ListFilter className="size-4" /> Filter this column
                </DropdownMenuItem>
                {column.getIsFiltered() && (
                  <DropdownMenuItem onClick={() => column.setFilterValue(undefined)}>
                    <X className="size-4" /> Clear filter
                  </DropdownMenuItem>
                )}
              </>
            )}
            {canHide && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => column.toggleVisibility(false)}>
                  <EyeOff className="size-4" /> Hide column
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
