import * as React from "react";

/**
 * Local draft of a committed value: resets whenever the committed value changes
 * (without an effect), and exposes `reset` for Escape.
 */
export function useDraftValue<T>(value: T) {
  const [draft, setDraft] = React.useState(value);
  const [seen, setSeen] = React.useState(value);
  if (seen !== value) {
    setSeen(value);
    setDraft(value);
  }
  return [draft, setDraft, () => setDraft(value)] as const;
}
