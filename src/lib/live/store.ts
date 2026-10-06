"use client";

import { api } from "@/lib/api/client";
import type { LiveMessage, LiveRun, LiveStats } from "@/lib/api/types";
import { create } from "zustand";

export type LiveConnection = "connecting" | "live" | "off";
type Counts = { queued: number; running: number; finished: number };

/**
 * The fast-changing part of a run, kept apart from the row so a progress tick
 * does not re-render the whole row: only the cells that subscribe to it.
 */
export type Volatile = { progress?: number; message?: string; jobStatus?: string; updatedAt: string };

type LiveStore = {
  status: LiveConnection;
  /** Rows by top-level run id. A row object is replaced only when something the row shows has changed. */
  runs: Record<string, LiveRun>;
  /** Structural fingerprint per run, used to decide whether a row object must be replaced. */
  keys: Record<string, string>;
  volatile: Record<string, Volatile>;
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

/** Everything a row renders except progress; the START document itself never changes. */
function rowKey(r: LiveRun): string {
  return JSON.stringify([
    r._status, r._enriched, r._startedAt, r._endedAt, r._error, r._cluster, r._priority, r._queuePosition, r._current?.id,
    r._steps.map((s) => `${s.id}:${s.status}:${s.startedAt}:${s.endedAt ?? ""}`),
    r._job?.rayJobId, r._job?.status, r._job?.queuedAt, r._job?.plugin,
  ]);
}

function volatileOf(r: LiveRun): Volatile {
  return { progress: r._job?.progress, message: r._job?.message, jobStatus: r._job?.status, updatedAt: r._updatedAt };
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
  keys: {},
  volatile: {},
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
        const keys: Record<string, string> = {};
        const volatile: Record<string, Volatile> = {};
        for (const r of m.runs) {
          runs[r._runId] = flatten(r);
          keys[r._runId] = rowKey(r);
          volatile[r._runId] = volatileOf(r);
        }
        return { runs, keys, volatile, counts: count(runs), stats: m.stats, statsAt: now, at: m.at };
      }
      let runs = s.runs;
      let keys = s.keys;
      let volatile = s.volatile;
      const copy = () => {
        if (runs === s.runs) {
          runs = { ...s.runs };
          keys = { ...s.keys };
        }
      };
      for (const r of m.runs ?? []) {
        const id = r._runId;
        const key = rowKey(r);
        if (keys[id] !== key) {
          copy();
          runs[id] = flatten(r);
          keys[id] = key;
        }
        const v = volatileOf(r);
        const pv = volatile[id];
        if (!pv || pv.progress !== v.progress || pv.message !== v.message || pv.jobStatus !== v.jobStatus) {
          if (volatile === s.volatile) volatile = { ...s.volatile };
          volatile[id] = v;
        }
      }
      for (const id of m.removed ?? []) {
        if (id in runs) {
          copy();
          delete runs[id];
          delete keys[id];
        }
        if (id in volatile) {
          if (volatile === s.volatile) volatile = { ...s.volatile };
          delete volatile[id];
        }
      }
      // Charts redraw at most every couple of seconds; rows update every tick.
      const takeStats = m.stats && (!s.stats || now - s.statsAt >= STATS_EVERY_MS);
      return {
        runs, keys, volatile,
        counts: runs === s.runs ? s.counts : count(runs),
        stats: takeStats ? m.stats! : s.stats,
        statsAt: takeStats ? now : s.statsAt,
        at: m.at,
      };
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
