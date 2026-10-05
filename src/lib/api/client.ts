import type {
  EventDetail, Job, JobsResponse, LineageGraph, LiveSnapshot, LogsResponse, LogTarget, MiniLineage, QueryRequest, QueryResponse,
  RelatedResponse, SchemaResponse, OtlpTrace,
} from "./types";

/** The UI is a pure client app: it talks to lineage-api directly (CORS). */
export const API_BASE = `${process.env.NEXT_PUBLIC_LINEAGE_API_URL ?? "http://localhost:8081"}/v1`;

export class ApiError extends Error {
  status: number;
  reason?: string;
  constructor(status: number, message: string, reason?: string) {
    super(message);
    this.status = status;
    this.reason = reason;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, { ...init, headers: { "content-type": "application/json", ...(init?.headers ?? {}) } });
  if (!res.ok) {
    let body: { error?: string; reason?: string } = {};
    try {
      body = await res.json();
    } catch {
      /* non-JSON error */
    }
    throw new ApiError(res.status, body.error ?? res.statusText, body.reason);
  }
  return (await res.json()) as T;
}

const qs = (params: Record<string, string | number | undefined>) => {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== "") p.set(k, String(v));
  const s = p.toString();
  return s ? `?${s}` : "";
};

export const api = {
  schema: (signal?: AbortSignal) => request<SchemaResponse>("/schema", { signal }),
  events: (body: QueryRequest, signal?: AbortSignal) => request<QueryResponse>("/events/query", { method: "POST", body: JSON.stringify(body), signal }),
  event: (runId: string, signal?: AbortSignal) => request<EventDetail>(`/events/${runId}`, { signal }),
  lineage: (runId: string, signal?: AbortSignal) => request<LineageGraph>(`/events/${runId}/lineage`, { signal }),
  rawEvents: (runId: string, signal?: AbortSignal) => request<{ events: Record<string, unknown>[] }>(`/events/${runId}/lineage?raw=true`, { signal }),
  mini: (runId: string, signal?: AbortSignal) => request<MiniLineage>(`/events/${runId}/mini`, { signal }),
  related: (runId: string, signal?: AbortSignal) => request<RelatedResponse>(`/events/${runId}/related`, { signal }),
  trace: (runId: string, signal?: AbortSignal) => request<OtlpTrace>(`/events/${runId}/trace`, { signal }),
  logTargets: (runId: string, signal?: AbortSignal) => request<{ runs: LogTarget[] | null }>(`/events/${runId}/logs`, { signal }),
  logs: (runId: string, run: string, signal?: AbortSignal) => request<LogsResponse>(`/events/${runId}/logs${qs({ run })}`, { signal }),
  jobs: (params: { status?: string; cluster?: string; limit?: number } = {}, signal?: AbortSignal) => request<JobsResponse>(`/jobs${qs(params)}`, { signal }),
  job: (rayJobId: string, signal?: AbortSignal) => request<{ job: Job; ray?: Record<string, unknown> }>(`/jobs/${rayJobId}`, { signal }),
  live: (signal?: AbortSignal) => request<LiveSnapshot>("/live", { signal }),
  /** The live WebSocket: a snapshot, then deltas as runs change. */
  liveWsUrl: () => `${API_BASE.replace(/^http/, "ws")}/live/ws`,
};
