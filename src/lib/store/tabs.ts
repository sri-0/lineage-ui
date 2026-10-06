"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

/** Which top-level run is open in the detail panel, and which panel tab. */
export type DetailTab = "lineage" | "trace" | "logs" | "metadata" | "related";

/** Where the detail panel docks. */
export type DetailPosition = "right" | "bottom";

type Store = {
  /** Serialized data-table filter state for the lineage view (Dates as epoch ms). */
  eventFilters: Record<string, unknown>;
  setEventFilters: (f: Record<string, unknown>) => void;
  selectedRunId: string | null;
  detailTab: DetailTab;
  detailPosition: DetailPosition;
  open: (runId: string, tab?: DetailTab) => void;
  close: () => void;
  setDetailTab: (t: DetailTab) => void;
  setDetailPosition: (p: DetailPosition) => void;
  /** Second run for side-by-side lineage comparison. */
  compareRunId: string | null;
  setCompare: (runId: string | null) => void;
};

export const useTabs = create<Store>()(
  persist(
    (set) => ({
      eventFilters: {},
      setEventFilters: (eventFilters) => set({ eventFilters }),
      selectedRunId: null,
      detailTab: "lineage",
      detailPosition: "right",
      open: (runId, tab) => set((s) => ({ selectedRunId: runId, detailTab: tab ?? s.detailTab, compareRunId: null })),
      close: () => set({ selectedRunId: null, compareRunId: null }),
      setDetailTab: (detailTab) => set({ detailTab }),
      setDetailPosition: (detailPosition) => set({ detailPosition }),
      compareRunId: null,
      setCompare: (compareRunId) => set({ compareRunId }),
    }),
    {
      name: "lineage-ui.state",
      version: 3,
      partialize: (s) => ({ eventFilters: s.eventFilters, selectedRunId: s.selectedRunId, detailTab: s.detailTab, detailPosition: s.detailPosition }),
      // v2 kept the selected tab here; the view is the route now
      migrate: (persisted) => {
        const { tab: _tab, ...rest } = { detailPosition: "right", ...(persisted as Record<string, unknown>) } as Record<string, unknown>;
        return rest as unknown as Store;
      },
    },
  ),
);
