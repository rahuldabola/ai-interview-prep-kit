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
}: {
  value: string;
  onSave: (value: string) => void;
  multiline?: boolean;
  ariaLabel: string;
  className?: string;
  placeholder?: string;
}) {
  const [local, setLocal] = useState(value);
  const [prevValue, setPrevValue] = useState(value);
  const [dirty, setDirty] = useState(false);
  const debouncedSave = useDebouncedCallback(onSave, 700);

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

  return multiline ? <textarea rows={3} {...shared} /> : <input type="text" {...shared} />;
}
