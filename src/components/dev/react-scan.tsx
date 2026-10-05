"use client";

import * as React from "react";

/**
 * Loads react-scan in development so re-renders are visible while profiling.
 * Set NEXT_PUBLIC_REACT_SCAN=0 to turn it off; production builds never include it.
 */
export function ReactScan() {
  React.useEffect(() => {
    if (process.env.NODE_ENV !== "development" || process.env.NEXT_PUBLIC_REACT_SCAN === "0") return;
    import("react-scan")
      .then(({ scan }) => scan({ enabled: true, showToolbar: true, animationSpeed: "fast" }))
      .catch(() => {});
  }, []);
  return null;
}
