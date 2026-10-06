# lineage-ui

Next.js UI ("Haystack" in the title bar) for processing provenance. `/events` is the events dashboard:
what the clusters are doing right now, fed over a WebSocket from the job store, with charts of
in-flight work. `/lineage` is every top-level run ever indexed: a virtualised, infinite grid with
schema-driven filters. Both share a detail panel (dock right or bottom) with Lineage (React Flow +
ELK), Trace (own Jaeger-style waterfall), Logs, Metadata and Related tabs. Same stack and
conventions as `query-ui`.

![Events grid with the lineage detail panel open](docs/screenshot-events.png)

![Events dashboard: in-flight runs from the job store over a WebSocket, with charts](docs/screenshot-live.png)

- `src/components/events` — the lineage view grid, status pills, mini lineage strip; a filter's search box
  asks `POST /v1/events/values` for values beyond the facets, over the same result set
- `src/components/detail` — detail panel and its tabs
- `src/components/lineage` — React Flow canvas, ELK layout, node renderers
- `src/components/trace` — self-contained OTLP trace viewer (tree, virtualised rows, minimap, span detail)
- `src/components/dashboard` — the events dashboard grid (same table component) with status/cluster toggles,
  quick search and charts; rows come from the Valkey job store and gain file/project/lineage detail once
  OpenLineage is indexed (a dashed marker shows rows still waiting for it)
- `src/lib/dashboard` — WebSocket client and store (snapshot + deltas from `/v1/live/ws`); fast-changing progress
  is kept in a separate slice so a tick re-renders only the progress cell
- `src/lib/api` — client, TanStack Query options, types; `src/lib/schema` — mapping → grid columns and filters
- `src/components/data-table`, `src/lib/data-table|filters|store|table-schema|table` — copied from `@data-table-filters`, owned here

```sh
pnpm install
cp .env.local.example .env.local    # NEXT_PUBLIC_LINEAGE_API_URL
pnpm dev -p 3001
```

In `next dev` the [react-scan](https://github.com/aidenybai/react-scan) overlay is on, so re-renders
are visible while profiling; set `NEXT_PUBLIC_REACT_SCAN=0` to turn it off, or
`localStorage["lineage-ui.react-scan"] = "off"` for one browser. `window.__reactScan.report()` returns
render counts and times per component for scripted runs. The grid virtualises rows (TanStack Virtual)
with `overflow-anchor: none` on the scroller, the header row and histogram are memoised against data
ticks, elapsed-time cells share one clock, and live updates replace only the rows that changed.

Light mode is the blue theme (a shade lighter); dark mode is the neutral black and grey one. The
grid performance checklist, reusable for other repos on the same data grid, is in
[docs/PERFORMANCE.md](docs/PERFORMANCE.md).
