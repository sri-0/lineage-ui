"use client";

import * as React from "react";

type Agg = { count: number; time: number; unnecessary: number };

/**
 * Loads react-scan in development so re-renders are visible while profiling.
 * Set NEXT_PUBLIC_REACT_SCAN=0 to turn it off for everyone, or
 * `localStorage["lineage-ui.react-scan"] = "off"` for one browser (the
 * screenshot scripts do this); production builds never include it.
 *
 * For scripted profiling, `window.__reactScan.report()` returns render count,
 * time and unnecessary-render count per component since the last `reset()`.
 */
export function ReactScan() {
  React.useEffect(() => {
    if (process.env.NODE_ENV !== "development" || process.env.NEXT_PUBLIC_REACT_SCAN === "0") return;
    try {
      if (localStorage.getItem("lineage-ui.react-scan") === "off") return;
    } catch {
      /* storage unavailable */
    }
    import("react-scan")
      .then((rs) => {
        const agg = new Map<string, Agg>();
        rs.scan({
          enabled: true,
          showToolbar: true,
          animationSpeed: "fast",
          trackUnnecessaryRenders: true,
          onRender: (_fiber, renders) => {
            for (const r of renders) {
              const key = r.componentName ?? "(anonymous)";
              const a = agg.get(key) ?? { count: 0, time: 0, unnecessary: 0 };
              a.count += r.count || 1;
              a.time += r.time ?? 0;
              if (r.unnecessary) a.unnecessary += 1;
              agg.set(key, a);
            }
          },
        });
        (window as unknown as { __reactScan?: unknown }).__reactScan = {
          report: () => Object.fromEntries(agg),
          reset: () => agg.clear(),
          setOptions: rs.setOptions,
        };
      })
      .catch(() => {});
  }, []);
  return null;
}
