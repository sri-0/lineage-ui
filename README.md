# lineage-ui

Next.js UI for processing events: an infinite events grid with schema-driven filters, a right-hand
detail panel with Lineage (React Flow + ELK), Trace (own Jaeger-style waterfall), Logs, Metadata and
Related tabs, and a Live tab of queued and running jobs. Same stack and conventions as `query-ui`.

- `src/components/events` — grid, status pills, mini lineage strip
- `src/components/detail` — detail panel and its tabs
- `src/components/lineage` — React Flow canvas, ELK layout, node renderers
- `src/components/trace` — self-contained OTLP trace viewer (tree, virtualised rows, minimap, span detail)
- `src/components/live` — live jobs table with SSE updates
- `src/lib/api` — client, TanStack Query options, types; `src/lib/schema` — mapping → grid columns and filters
- `src/components/data-table`, `src/lib/data-table|filters|store|table-schema|table` — copied from `@data-table-filters`, owned here

```sh
pnpm install
cp .env.local.example .env.local    # NEXT_PUBLIC_LINEAGE_API_URL
pnpm dev -p 3001
```
