import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query";
import { api } from "./client";
import type { QueryRequest } from "./types";

export const schemaOptions = () => queryOptions({ queryKey: ["schema"], queryFn: ({ signal }) => api.schema(signal), staleTime: 5 * 60_000 });

export const eventsOptions = (body: Omit<QueryRequest, "cursor" | "meta">) =>
  infiniteQueryOptions({
    queryKey: ["events", body],
    queryFn: ({ pageParam, signal }) => api.events(pageParam ? { ...body, cursor: pageParam, meta: false } : { ...body, meta: true }, signal),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
    staleTime: 30_000,
  });

export const eventOptions = (runId: string) => queryOptions({ queryKey: ["event", runId], queryFn: ({ signal }) => api.event(runId, signal) });
export const lineageOptions = (runId: string) => queryOptions({ queryKey: ["lineage", runId], queryFn: ({ signal }) => api.lineage(runId, signal), staleTime: 15_000 });
export const rawEventsOptions = (runId: string) => queryOptions({ queryKey: ["raw-events", runId], queryFn: ({ signal }) => api.rawEvents(runId, signal) });
export const miniOptions = (runId: string) => queryOptions({ queryKey: ["mini", runId], queryFn: ({ signal }) => api.mini(runId, signal), staleTime: 15_000 });
export const relatedOptions = (runId: string) => queryOptions({ queryKey: ["related", runId], queryFn: ({ signal }) => api.related(runId, signal), staleTime: 60_000 });
export const traceOptions = (runId: string) => queryOptions({ queryKey: ["trace", runId], queryFn: ({ signal }) => api.trace(runId, signal), retry: false });
export const logTargetsOptions = (runId: string) => queryOptions({ queryKey: ["log-targets", runId], queryFn: ({ signal }) => api.logTargets(runId, signal) });
export const logsOptions = (runId: string, run: string) =>
  queryOptions({ queryKey: ["logs", runId, run], queryFn: ({ signal }) => api.logs(runId, run, signal), retry: false, enabled: !!run });
export const jobsOptions = (params: { status?: string; cluster?: string } = {}) =>
  queryOptions({ queryKey: ["jobs", params], queryFn: ({ signal }) => api.jobs({ ...params, limit: 500 }, signal), staleTime: 5_000 });
