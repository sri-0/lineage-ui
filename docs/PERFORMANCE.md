# Data grid performance: what to measure and what to fix

This is the checklist used to make the `@data-table-filters` infinite grid in this repo smooth on
modest hardware, written so it can be applied to any repo that copies the same grid. Every item
below was found with react-scan's render report, fixed, and re-measured. Numbers at the end.

## 1. Measure first

React DevTools' flame chart tells you what rendered once; you need what renders *repeatedly*, and
why. Use react-scan with an `onRender` aggregator (this version's `getReport()` map is never filled):

```tsx
// src/components/dev/react-scan.tsx, mounted once in the root layout, development only
import("react-scan").then((rs) => {
  const agg = new Map<string, { count: number; time: number; unnecessary: number }>();
  rs.scan({
    enabled: true, trackUnnecessaryRenders: true,
    onRender: (_fiber, renders) => {
      for (const r of renders) {
        const a = agg.get(r.componentName ?? "(anonymous)") ?? { count: 0, time: 0, unnecessary: 0 };
        a.count += r.count || 1; a.time += r.time ?? 0; if (r.unnecessary) a.unnecessary++;
        agg.set(r.componentName ?? "(anonymous)", a);
      }
    },
  });
  window.__reactScan = { report: () => Object.fromEntries(agg), reset: () => agg.clear(), setOptions: rs.setOptions };
});
```

Then drive the page with Playwright and read the report after each interaction (idle, scroll to the
bottom three times, scroll back, hover rows, open the detail, toggle the filters, type in search; for
a live grid: idle ten seconds). Rank by total time. Three signals matter:

- A component that renders far more often than the interactions you performed (hundreds of
  `Rectangle`/`BarRectangle` renders from one scroll means a chart animating or re-rendering).
- Row-level components rendering about `rows × fetches` times (every row re-rendering on every
  page load).
- Chrome that re-renders on every data tick (headers, toolbar, menus) although nothing visible changed.

Judge frame rate on a production build (`next build && next start`) with CPU throttling through
CDP (`Emulation.setCPUThrottlingRate`), counting `requestAnimationFrame` and `longtask` entries over
ten seconds. Dev builds, StrictMode and react-scan itself inflate the cost two to four times.

## 2. What needed fixing in this grid

### Infinite scroll fetching in a loop (`overflow-anchor`)

When a page is appended, its rows (or the virtualiser's spacer row) land above the "Load More" row
the viewport is anchored to. The browser's scroll anchoring then scrolls down to keep that row in
view, the grid is "at the bottom" again, and `onScroll` fetches the next page. Twenty-eight pages
per scroll, six requests a second. Fix: `overflow-anchor: none` on the scroll container.

### Charts re-animating on every table render

A recharts chart that re-renders restarts its entry animation: about thirty frames of every bar.
Memoise the chart component (`React.memo`) so stable props skip it, keep its props stable (`data`
from the first page's meta, `series` memoised by the caller), and set `isAnimationActive={false}`
on the bars so a genuine data change is one render, not thirty.

### Row identity across page appends

The row memo compares `row.original` by identity. Anything that rebuilds row objects on every
render (flattening nested keys, mapping over `pages.flatMap(...)`) makes every mounted row
re-render on every fetch. Cache derived rows per source row in a `WeakMap`: react-query keeps
earlier pages referentially stable when a page is appended, so cached rows keep their identity.
For live data, the store should replace only the rows whose rendered fields changed (compare a
structural key) and keep fast-changing fields (progress, messages) in a separate slice read by the
one cell that shows them.

### Virtualisation without index re-renders

Virtualise rows (TanStack Virtual) with spacer rows above and below the window and measured row
heights. Do not pass the row index as a prop: a new row at the top shifts every index below it and
re-renders every row for an attribute. Stamp `data-index` onto the `<tr>` imperatively, in the
`measure` ref callback and in a layout effect after each render, and leave it out of the memo.

### Stable callbacks

`getRowClassName`, `onRowClick`, `measure` are compared by identity in the row memo. An inline
arrow recreated per render re-renders every row. `useCallback` them, with real dependencies.

### Subscribe narrowly

- A parent that subscribes to state it only writes (the persisted filters the grid writes back)
  re-renders the whole grid on every write. Read such state once (`useState(() => store.getState())`).
- Charts and toolbar controls should subscribe to the store themselves rather than receive the data
  through the grid's parent, so a counter tick does not re-render the table.
- The table context value changes on every data tick (in TanStack Table v9 the table object is new
  whenever state or data changes). Components that need the table only in event handlers (a header's
  drag-to-reorder) read it through a stable ref context (`useDataTableRef`) instead of `useDataTable()`.
  Memoise the header row against data (`getHeaderGroups()` is memoised by the table; pass sorting
  and sizing state explicitly). Make closed menus cheap: a constant trigger element and content
  mounted only while open (the column-visibility popover).

### Ticking cells

Elapsed-time cells share one `setInterval` through `useSyncExternalStore`, so a tick re-renders
those cells and nothing else; with virtualisation that is the visible rows only. Throttle chart
data (every two seconds is plenty for per-minute series) and keep chart animation off.

## 3. Results

Measured with the react-scan report in development (which exaggerates absolute times; ratios hold):

| Scenario | Before | After |
|---|---|---|
| Lineage grid, scroll to bottom three times | 281k renders, 2.5 s, 28 page fetches | 34k renders, 0.54 s, 3 fetches |
| Lineage grid, histogram renders per scroll | 43 (8,640 bar renders) | 6 (0 animation frames) |
| Dashboard, idle ten seconds | 29.5k renders, 0.72 s | 12k renders, 0.59 s |
| Dashboard, header and menu renders per tick | 7 headers + menu (4–6 ms) | 0 |

Production build, 4x CPU throttle, dashboard with the detail panel open: 57 FPS, four long tasks
in ten seconds; with the panel closed: 59 FPS, none.

## 4. Applying this to another repo

1. Copy the react-scan loader and the Playwright report script; run the scenarios above before
   touching code, and keep the output.
2. Fix in this order: fetch loops (network tab), chart animation, row identity, callbacks, context
   subscriptions, ticking cells.
3. Re-run the report after each fix; a fix that does not change a number is not a fix.
4. Finish with a production build under CPU throttling. If it holds 55+ FPS with no long tasks
   while idle, stop.
