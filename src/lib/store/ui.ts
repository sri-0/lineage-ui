"use client";

import { create } from "zustand";

/** Cross-tab UI state that is not worth persisting. */
type UiStore = {
  /** Filters panel of the events grid. */
  filtersOpen: boolean;
  setFiltersOpen: (v: boolean | ((prev: boolean) => boolean)) => void;
};

export const useUi = create<UiStore>()((set) => ({
  filtersOpen: true,
  setFiltersOpen: (v) => set((s) => ({ filtersOpen: typeof v === "function" ? v(s.filtersOpen) : v })),
}));
