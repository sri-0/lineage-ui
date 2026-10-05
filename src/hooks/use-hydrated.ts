import * as React from "react";

/** False during SSR and the hydration render, true afterwards. */
export function useHydrated() {
  return React.useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}
