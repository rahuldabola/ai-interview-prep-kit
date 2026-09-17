"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useSyncExternalStore } from "react";

export type ThemeChoice = "light" | "dark" | "system";

const STORAGE_KEY = "aipk.theme";
/** Fired when this tab changes the preference; `storage` only fires in *other* tabs. */
const CHANGE_EVENT = "aipk:theme-change";

/**
 * Runs before first paint (injected as an inline script by the root layout) so the correct
 * theme is on <html> from the very first frame. Without this, a dark-mode user sees a white
 * flash while React hydrates.
 */
export const THEME_INIT_SCRIPT = `
(function() {
  try {
    var stored = localStorage.getItem('${STORAGE_KEY}');
    var choice = (stored === 'light' || stored === 'dark' || stored === 'system') ? stored : 'system';
    var resolved = choice === 'system'
      ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : choice;
    document.documentElement.setAttribute('data-theme', resolved);
  } catch (e) {
    document.documentElement.setAttribute('data-theme', 'light');
  }
})();
`.trim();

/*
 * The stored preference and the OS setting are both external, mutable state that React does
 * not own, so they are read through useSyncExternalStore rather than copied into state in an
 * effect. That keeps the server render and the first client render consistent (both use the
 * server snapshot) without the cascading re-render that reading storage in an effect causes.
 */

function subscribeChoice(onChange: () => void): () => void {
  window.addEventListener("storage", onChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

function getChoiceSnapshot(): ThemeChoice {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark" || stored === "system") return stored;
  } catch {
    // Blocked storage (private mode): fall through to the default.
  }
  return "system";
}

function subscribeSystem(onChange: () => void): () => void {
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

function getSystemSnapshot(): "light" | "dark" {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

/** There is no OS preference to read on the server; the inline script corrects it instantly. */
const serverChoice = (): ThemeChoice => "system";
const serverSystem = (): "light" | "dark" => "light";

interface ThemeContextValue {
  choice: ThemeChoice;
  resolved: "light" | "dark";
  setChoice: (choice: ThemeChoice) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const choice = useSyncExternalStore(subscribeChoice, getChoiceSnapshot, serverChoice);
  const systemPref = useSyncExternalStore(subscribeSystem, getSystemSnapshot, serverSystem);

  const resolved = choice === "system" ? systemPref : choice;

  // Pushing the resolved theme onto <html> is exactly the "update an external system"
  // case an effect is for.
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", resolved);
  }, [resolved]);

  const setChoice = useCallback((next: ThemeChoice) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Preference will not persist, but the event below still switches this session.
    }
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);

  const value = useMemo(() => ({ choice, resolved, setChoice }), [choice, resolved, setChoice]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside <ThemeProvider>");
  return ctx;
}
