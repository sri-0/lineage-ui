"use client";

import {
  Sortable,
  SortableDragHandle,
  SortableItem,
} from "@/components/custom/sortable";
import { useDataTable } from "@/components/data-table/data-table-provider";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { boxRadiusClassName } from "@/lib/style";
import { cn } from "@/lib/utils";
import { Check, Eye, GripVertical } from "lucide-react";
import { useMemo, useState } from "react";

/**
 * The trigger never changes, so it is one constant element: the table context
 * changes on every data tick (a live grid ticks once a second) and this
 * component re-renders with it, but React bails out of an identical element.
 * The list itself mounts only while the popover is open.
 */
const TRIGGER = (
  <PopoverTrigger asChild>
    <Button variant="outline" size="icon" role="combobox" className="shadow-none">
      <Eye className="h-4 w-4" />
      <span className="sr-only">Show or hide columns</span>
    </Button>
  </PopoverTrigger>
);

export function DataTableViewOptions() {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      {TRIGGER}
      {open && <ViewOptionsContent />}
    </Popover>
  );
}

function ViewOptionsContent() {
  const { table, enableColumnOrdering } = useDataTable();
  const [drag, setDrag] = useState(false);
  const [search, setSearch] = useState("");

  const columnOrder = table.state.columnOrder;

  const sortedColumns = useMemo(
    () =>
      table.getAllColumns().sort((a, b) => {
        return columnOrder.indexOf(a.id) - columnOrder.indexOf(b.id);
      }),
    [columnOrder, table],
  );

  return (
      <PopoverContent side="bottom" align="end" className="w-[200px] p-0">
        <Command>
          <CommandInput
            value={search}
            onValueChange={setSearch}
            placeholder="Search options..."
          />
          <CommandList>
            <CommandEmpty>No option found.</CommandEmpty>
            {!search && (
              <CommandGroup>
                <CommandItem value="__toggle_all" onSelect={() => table.toggleAllColumnsVisible(!table.getIsAllColumnsVisible())}>
                  {table.getIsAllColumnsVisible() ? "Hide all columns" : "Show all columns"}
                </CommandItem>
              </CommandGroup>
            )}
            <CommandGroup>
              <Sortable
                value={sortedColumns.map((c) => ({ id: c.id }))}
                onValueChange={(items) =>
                  table.setColumnOrder(items.map((c) => c.id))
                }
                overlay={
                  <div
                    className={cn("bg-muted/60 h-8 w-full", boxRadiusClassName)}
                  />
                }
                onDragStart={() => setDrag(true)}
                onDragEnd={() => setDrag(false)}
                onDragCancel={() => setDrag(false)}
              >
                {sortedColumns
                  // `getCanHide()` is the single source of truth: columns that
                  // must always render (select) declare `enableHiding: false`
                  // instead of being special-cased here.
                  .filter((column) => column.getCanHide())
                  .map((column) => (
                    <SortableItem key={column.id} value={column.id} asChild>
                      <CommandItem
                        value={column.id}
                        onSelect={() =>
                          column.toggleVisibility(!column.getIsVisible())
                        }
                        className={"capitalize"}
                        disabled={drag}
                      >
                        <div
                          className={cn(
                            "border-input flex h-4 w-4 items-center justify-center rounded-sm border",
                            column.getIsVisible()
                              ? "bg-primary text-primary-foreground"
                              : "opacity-50 [&_svg]:invisible",
                          )}
                        >
                          <Check className={cn("text-background size-3")} />
                        </div>
                        <span>{column.columnDef.meta?.label || column.id}</span>
                        <span data-slot="command-shortcut" className="hidden" />
                        {enableColumnOrdering && !search ? (
                          <SortableDragHandle
                            variant="ghost"
                            size="icon"
                            className="text-muted-foreground hover:text-foreground focus:bg-muted focus:text-foreground ml-auto size-5"
                          >
                            <GripVertical
                              className="size-4"
                              aria-hidden="true"
                            />
                          </SortableDragHandle>
                        ) : null}
                      </CommandItem>
                    </SortableItem>
                  ))}
              </Sortable>
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
  );
}
