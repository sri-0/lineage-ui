"use client";

import { useUi } from "@/lib/store/ui";
import type { Dispatch, SetStateAction } from "react";

/**
 * Open state of the filters panel. Kept as a hook with the data-table's
 * original `useControls` shape so the copied table components need no changes,
 * but backed by the shared UI store rather than per-table context.
 */
export function useControls(): { open: boolean; setOpen: Dispatch<SetStateAction<boolean>> } {
  const open = useUi((s) => s.filtersOpen);
  const setOpen = useUi((s) => s.setFiltersOpen);
  return { open, setOpen };
}

/** No-op wrapper kept for the data-table provider's composition. */
export function ControlsProvider({ children }: { children: React.ReactNode }) {
  return <div className="h-full min-h-0">{children}</div>;
}
