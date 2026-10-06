/** Types mirroring the lineage-api JSON contract. */

/** UI-level field kind, derived from the OpenSearch mapping type. */
export type FieldType = "keyword" | "text" | "boolean" | "integer" | "float" | "date" | "ip" | "object";
export type Op =
  | "eq" | "ne" | "in" | "not_in" | "prefix" | "wildcard" | "match" | "match_phrase"
  | "gt" | "gte" | "lt" | "lte" | "between" | "exists" | "not_exists";

/** A mapping leaf as returned by /v1/schema. `type` is the OpenSearch type. */
export type SchemaField = {
  name: string;
  type: string;
  ops: Op[];
  sortable: boolean;
  aggregatable: boolean;
  searchable: boolean;
  nestedPath?: string;
  /** Exact-match multi-field of a text field (dynamic mapping of a new string field). */
  keyword?: string;
  enum?: string[];
  description?: string;
};

/** Normalised field used by the grid builders. */
export type ApiField = SchemaField & { kind: FieldType; label: string; hidden?: boolean; cell?: string };

/** Logical identifier name -> document path (from the API's YAML config). */
export type Paths = Record<string, string>;

export type SchemaResponse = { index: string; timeField: string; fields: SchemaField[]; paths: Paths };

export type Filter = { field: string; op: Op; value?: unknown };
export type Sort = { field: string; order?: "asc" | "desc" };

export type QueryRequest = {
  lucene?: string;
  text?: string;
  filters?: Filter[];
  sort?: Sort[];
  size?: number;
  cursor?: string;
  histogram?: { field?: string; interval?: string; series?: string };
  facets?: string[];
  fields?: string[];
  meta?: boolean;
};

export type FacetRow = { value: unknown; total: number };
export type Facet = { rows?: FacetRow[]; total: number; min?: number; max?: number };
export type QueryMeta = {
  totalRowCount: number;
  filterRowCount: number;
  filterRowCountRelation: "eq" | "gte";
  tookMs: number;
  chartData?: Array<{ timestamp: number; [key: string]: number }>;
  chartSeries?: string[];
  facets?: Record<string, Facet>;
  timeField?: string;
};

export type RunStatus = "QUEUED" | "RUNNING" | "COMPLETE" | "FAIL" | "ABORT";

/** A top-level run row: the START event document plus list enrichment. */
export type EventRow = Record<string, unknown> & {
  _id: string;
  _runId: string;
  _status: RunStatus;
  _durationMs: number | null;
  _endedAt: string | null;
  _error: string;
};

export type QueryResponse = { data: EventRow[]; meta?: QueryMeta; nextCursor: string | null; prevCursor: string | null };

export type RunState = { status: RunStatus; startedAt: string; endedAt?: string; durationMs?: number; error?: string };

export type EventDetail = { runId: string; state: RunState; start: Record<string, unknown>; terminal: Record<string, unknown> | null };

export type RunNode = {
  id: string;
  kind: "ingest" | "plugin";
  job: string;
  plugin?: string;
  seq?: number;
  tenancy: string;
  status: RunStatus;
  startedAt: string;
  endedAt?: string;
  durationMs?: number;
  controlset: string;
  detailLevel?: string;
  parentRunId?: string;
  error?: string;
  traceId?: string;
  submissionId?: string;
  rayJobId?: string;
  facets?: Record<string, unknown>;
  eventIds: string[];
};
export type DatasetNode = { id: string; namespace: string; name: string; facets?: Record<string, unknown> };
export type GraphEdge = { from: string; to: string; kind: "input" | "output"; controlset: string };
export type LineageGraph = { rootRunId: string; runs: RunNode[]; datasets: DatasetNode[]; edges: GraphEdge[]; tenancies: string[]; stubs?: { afterRunId: string; reason: string }[] };

export type MiniRun = { id: string; plugin: string; tenancy: string; status: RunStatus; startedAt: string; durationMs?: number };
export type MiniLineage = { rootRunId: string; status: RunStatus; runs: MiniRun[] | null };

export type RelatedRun = { runId: string; relation: "refeed" | "purge"; processingDatetime?: string; refeedSeq: number; state: RunState; project?: string; filename?: string };
export type RelatedResponse = { rootId: string; purgeId?: string; related: RelatedRun[] };

/** OTLP/JSON trace as produced by pdata's JSON marshaler. */
export type OtlpAnyValue = { stringValue?: string; intValue?: string | number; doubleValue?: number; boolValue?: boolean; arrayValue?: { values: OtlpAnyValue[] }; kvlistValue?: { values: OtlpKeyValue[] }; bytesValue?: string };
export type OtlpKeyValue = { key: string; value: OtlpAnyValue };
export type OtlpSpan = {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  name: string;
  kind?: number | string;
  startTimeUnixNano: string | number;
  endTimeUnixNano: string | number;
  attributes?: OtlpKeyValue[];
  events?: { name: string; timeUnixNano: string | number; attributes?: OtlpKeyValue[] }[];
  links?: { traceId: string; spanId: string; attributes?: OtlpKeyValue[] }[];
  status?: { code?: number | string; message?: string };
};
export type OtlpTrace = {
  resourceSpans: { resource?: { attributes?: OtlpKeyValue[] }; scopeSpans: { scope?: { name?: string }; spans: OtlpSpan[] }[] }[];
};

export type LogTarget = { runId: string; plugin: string; tenancy: string; submissionId: string; rayJobId: string };
export type LogsResponse = { runId: string; plugin: string; tenancy: string; submissionId: string; logs: string };

export type JobStatus = "QUEUED" | "PENDING" | "RUNNING" | "SUCCEEDED" | "FAILED" | "STOPPED";
export type Job = {
  rayJobId: string;
  submissionId: string;
  cluster: string;
  status: JobStatus;
  priority: number;
  queuePosition?: number;
  plugin: string;
  rootId: string;
  runId: string;
  processingDatetime: string;
  queuedAt: string;
  startedAt?: string;
  updatedAt: string;
  finishedAt?: string;
  /** Only present when the job-state service reports one; Ray itself has no progress. */
  progress?: number;
  message?: string;
};
export type JobsResponse = { jobs: Job[]; total: number };

/**
 * One plugin step of a dashboard run, keyed by Ray job id. The job-state store
 * is the source; OpenLineage adds the plugin run id and exact timings once indexed.
 */
export type DashboardStep = MiniRun & {
  runId?: string;
  endedAt?: string;
  error?: string;
  priority: number;
  queuePosition?: number;
  progress?: number;
  message?: string;
  queuedAt: string;
};

/**
 * A dashboard row: run state from the job store, plus the top-level START
 * document (and the events list enrichment) once OpenLineage has been indexed
 * (`_enriched`). Without it the document fields are simply absent.
 */
export type DashboardRun = EventRow & {
  _rootId: string;
  _enriched: boolean;
  _startedAt: string;
  _updatedAt: string;
  _steps: DashboardStep[];
  _current: DashboardStep | null;
  _job: Job | null;
  _cluster: string;
  _priority: number | null;
  _queuePosition: number | null;
};

/** Jobs per minute from job-store transitions. */
export type DashboardBucket = { t: number; started: number; finished: number; failed: number };
export type DashboardStats = {
  at: string;
  source: string;
  byStatus: Record<string, number>;
  byPriority: { priority: number; count: number }[];
  byCluster: { cluster: string; running: number; queued: number }[];
  series: DashboardBucket[];
  retain: string;
  enriched: number;
  runs: number;
};
export type DashboardSnapshot = { type: "snapshot"; at: string; runs: DashboardRun[]; stats: DashboardStats };
export type DashboardDelta = { type: "delta"; at: string; runs?: DashboardRun[]; removed?: string[]; stats?: DashboardStats };
export type DashboardMessage = DashboardSnapshot | DashboardDelta;

/** Distinct values of one field over the runs matching `filters`, optionally narrowed by a substring. */
export type ValuesRequest = { field: string; q?: string; size?: number; filters?: Filter[] };
export type ValuesResponse = { field: string; values: FacetRow[] };
