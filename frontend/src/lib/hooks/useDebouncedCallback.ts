"use client";

import { useCallback, useEffect, useRef } from "react";

export function useDebouncedCallback<T extends unknown[]>(fn: (...args: T) => void, delayMs = 600) {
  const fnRef = useRef(fn);
  useEffect(() => {
    fnRef.current = fn;
  }, [fn]);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  return useCallback(
    (...args: T) => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => fnRef.current(...args), delayMs);
    },
    [delayMs]
  );
}
