"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import type { InternalStoreAdapter } from "../../adapter/types";
import { getSchemaDefaults } from "../../schema/serialization";
import type { SchemaDefinition, StoreSnapshot } from "../../schema/types";

/**
 * A memory-backed store adapter for one query tab. Unlike the nuqs adapter it
 * does not touch the URL, so several tabs can hold independent filter state.
 * The initial state is revived from the persisted tab and every change is
 * reported back through `onChange` so the tab survives a reload.
 */
export function useTabAdapter<T extends Record<string, unknown>>(
  schema: SchemaDefinition,
  options: { id: string; initialState?: Partial<T>; onChange?: (state: T) => void },
): InternalStoreAdapter<T> {
  const defaults = useMemo(() => getSchemaDefaults(schema) as T, [schema]);
  const stateRef = useRef<T>({ ...defaults, ...(options.initialState ?? {}) } as T);
  const versionRef = useRef(0);
  const listenersRef = useRef(new Set<() => void>());
  const pausedRef = useRef(false);
  const pendingRef = useRef<Partial<T> | null>(null);
  const onChangeRef = useRef(options.onChange);
  useEffect(() => {
    onChangeRef.current = options.onChange;
  }, [options.onChange]);

  const notify = useCallback(() => {
    for (const listener of listenersRef.current) listener();
    onChangeRef.current?.(stateRef.current);
  }, []);

  // The schema changes when the model set changes: keep values for keys that still exist.
  useEffect(() => {
    const next = { ...defaults } as Record<string, unknown>;
    for (const key of Object.keys(defaults)) {
      if (key in stateRef.current) next[key] = (stateRef.current as Record<string, unknown>)[key];
    }
    stateRef.current = next as T;
    versionRef.current++;
    for (const listener of listenersRef.current) listener();
  }, [defaults]);

  return useMemo<InternalStoreAdapter<T>>(
    () => ({
      subscribe(listener) {
        listenersRef.current.add(listener);
        return () => {
          listenersRef.current.delete(listener);
        };
      },
      getSnapshot(): StoreSnapshot<T> {
        return { state: stateRef.current, version: versionRef.current };
      },
      getServerSnapshot(): StoreSnapshot<T> {
        return { state: stateRef.current, version: 0 };
      },
      setState(partial) {
        if (pausedRef.current) {
          pendingRef.current = { ...(pendingRef.current ?? {}), ...partial } as Partial<T>;
          return;
        }
        stateRef.current = { ...stateRef.current, ...partial };
        versionRef.current++;
        notify();
      },
      setField(key, value) {
        this.setState({ [key]: value } as unknown as Partial<T>);
      },
      reset(fields) {
        if (fields) {
          const partial: Partial<T> = {};
          for (const f of fields) partial[f] = defaults[f];
          this.setState(partial);
        } else {
          stateRef.current = { ...defaults };
          versionRef.current++;
          notify();
        }
      },
      pause() {
        pausedRef.current = true;
      },
      resume() {
        pausedRef.current = false;
        if (pendingRef.current) {
          const pending = pendingRef.current;
          pendingRef.current = null;
          this.setState(pending);
        }
      },
      isPaused() {
        return pausedRef.current;
      },
      destroy() {
        listenersRef.current.clear();
      },
      getTableId() {
        return options.id;
      },
      getSchema() {
        return schema;
      },
      getDefaults() {
        return defaults;
      },
    }),
    [schema, defaults, notify, options.id],
  );
}
