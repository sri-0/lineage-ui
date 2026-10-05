"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type TabKind = "events" | "live";

/** Which top-level run is open in the detail panel, and which panel tab. */
export type DetailTab = "lineage" | "trace" | "logs" | "metadata" | "related";

/** Where the detail panel docks. */
export type DetailPosition = "right" | "bottom";

type Store = {
  tab: TabKind;
  setTab: (t: TabKind) => void;
  /** Serialized data-table filter state for the events tab (Dates as epoch ms). */
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
      tab: "events",
      setTab: (tab) => set({ tab }),
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
      version: 2,
      partialize: (s) => ({ tab: s.tab, eventFilters: s.eventFilters, selectedRunId: s.selectedRunId, detailTab: s.detailTab, detailPosition: s.detailPosition }),
      migrate: (persisted) => ({ detailPosition: "right", ...(persisted as object) }) as unknown as Store,
    },
  ),
);
