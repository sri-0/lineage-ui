"use client";

import { api } from "@/lib/api/client";
import type { LiveMessage, LiveRun, LiveStats } from "@/lib/api/types";
import { create } from "zustand";

export type LiveConnection = "connecting" | "live" | "off";
type Counts = { queued: number; running: number; finished: number };

type LiveStore = {
  status: LiveConnection;
  /** Live runs by top-level run id. Only runs that changed get a new object, so row memos hold. */
  runs: Record<string, LiveRun>;
  counts: Counts;
  stats: LiveStats | null;
  statsAt: number;
  at: string | null;
  apply: (m: LiveMessage) => void;
  setStatus: (s: LiveConnection) => void;
};

const STATS_EVERY_MS = 2000;

/** Mirrors nested document values onto dotted keys (`promoted.project`) so the generated grid columns read them flat. */
function flatten(r: LiveRun): LiveRun {
  const out: LiveRun = { ...r };
  for (const [k, v] of Object.entries(r)) {
    if (k.startsWith("_") || v === null || typeof v !== "object" || Array.isArray(v)) continue;
    for (const [sub, val] of Object.entries(v as Record<string, unknown>)) out[`${k}.${sub}`] = val;
  }
  return out;
}

function count(runs: Record<string, LiveRun>): Counts {
  const c: Counts = { queued: 0, running: 0, finished: 0 };
  for (const r of Object.values(runs)) {
    if (r._status === "QUEUED") c.queued++;
    else if (r._status === "RUNNING") c.running++;
    else c.finished++;
  }
  return c;
}

export const useLive = create<LiveStore>()((set) => ({
  status: "connecting",
  runs: {},
  counts: { queued: 0, running: 0, finished: 0 },
  stats: null,
  statsAt: 0,
  at: null,
  setStatus: (status) => set({ status }),
  apply: (m) =>
    set((s) => {
      const now = Date.now();
      if (m.type === "snapshot") {
        const runs: Record<string, LiveRun> = {};
        for (const r of m.runs) runs[r._runId] = flatten(r);
        return { runs, counts: count(runs), stats: m.stats, statsAt: now, at: m.at };
      }
      let runs = s.runs;
      if (m.runs?.length || m.removed?.length) {
        runs = { ...s.runs };
        for (const r of m.runs ?? []) runs[r._runId] = flatten(r);
        for (const id of m.removed ?? []) delete runs[id];
      }
      // Charts redraw at most every couple of seconds; rows update every tick.
      const takeStats = m.stats && (!s.stats || now - s.statsAt >= STATS_EVERY_MS);
      return { runs, counts: runs === s.runs ? s.counts : count(runs), stats: takeStats ? m.stats! : s.stats, statsAt: takeStats ? now : s.statsAt, at: m.at };
    }),
}));

/**
 * Opens the live socket and keeps it open with exponential backoff. Returns a
 * disposer; call it once from the app shell.
 */
export function connectLive(): () => void {
  let ws: WebSocket | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let attempt = 0;
  let closed = false;
  const open = () => {
    useLive.getState().setStatus("connecting");
    ws = new WebSocket(api.liveWsUrl());
    ws.onopen = () => {
      attempt = 0;
      useLive.getState().setStatus("live");
    };
    ws.onmessage = (e) => useLive.getState().apply(JSON.parse(e.data as string) as LiveMessage);
    ws.onerror = () => ws?.close();
    ws.onclose = () => {
      useLive.getState().setStatus("off");
      if (closed) return;
      timer = setTimeout(open, Math.min(30_000, 1000 * 2 ** attempt++));
    };
  };
  open();
  return () => {
    closed = true;
    if (timer) clearTimeout(timer);
    ws?.close();
  };
}
