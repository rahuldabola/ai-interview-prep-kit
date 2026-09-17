"use client";

import { useState } from "react";
import { useDebouncedCallback } from "@/lib/hooks/useDebouncedCallback";
import { inputClass } from "@/components/ui";

/**
 * Local state updates on every keystroke (feels immediate), the network save is debounced,
 * and blur flushes immediately — so an edit is never lost to a stray refetch mid-typing but
 * a fast typist never round-trips per keystroke (Section 12: "make ... editing feel
 * immediate rather than round-tripping for every keystroke").
 */
export function EditableField({
  value,
  onSave,
  multiline = false,
  ariaLabel,
  className = "",
  placeholder,
  rows = 3,
}: {
  value: string;
  onSave: (value: string) => void;
  multiline?: boolean;
  ariaLabel: string;
  className?: string;
  placeholder?: string;
  rows?: number;
}) {
  const [local, setLocal] = useState(value);
  const [prevValue, setPrevValue] = useState(value);
  const [dirty, setDirty] = useState(false);
  const debouncedSave = useDebouncedCallback((v: string) => {
    onSave(v);
    setDirty(false);
  }, 700);

  // Adjust local state during render when the server value changes underneath us (e.g. a
  // regeneration or refetch) and we have no unsaved local edit — the recommended React
  // pattern for "reset state when a prop changes" without an effect.
  if (value !== prevValue && !dirty) {
    setPrevValue(value);
    setLocal(value);
  }

  function handleChange(v: string) {
    setLocal(v);
    setDirty(true);
    debouncedSave(v);
  }

  function handleBlur() {
    if (dirty) {
      onSave(local);
      setDirty(false);
    }
  }

  const shared = {
    "aria-label": ariaLabel,
    value: local,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => handleChange(e.target.value),
    onBlur: handleBlur,
    className: `${inputClass} ${className}`,
    placeholder,
  };

  return (
    <div className="relative">
      {multiline ? <textarea rows={rows} {...shared} /> : <input type="text" {...shared} />}
      {/* Tells the user their typing has not yet been persisted, so leaving the page
          immediately after an edit is a visibly informed choice rather than a gamble. */}
      {dirty && (
        <span
          className="pointer-events-none absolute bottom-2 right-2 rounded bg-surface-muted px-1.5 py-0.5 text-[10px] font-medium text-ink-subtle"
          aria-hidden="true"
        >
          Saving…
        </span>
      )}
    </div>
  );
}
