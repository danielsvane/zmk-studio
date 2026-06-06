import { useCallback, useEffect, useState } from "react";

/** "system" follows the OS via `prefers-color-scheme`; "light"/"dark" pin it. */
export type Theme = "system" | "light" | "dark";

/** Shared with the anti-flash boot script in `index.html` — keep in sync. */
export const THEME_STORAGE_KEY = "zmk-studio-theme";

/**
 * The whole palette is built from CSS `light-dark()` tokens
 * (`tailwind.config.js`), which resolve against the element's *used*
 * `color-scheme`. So re-theming the app is a single property flip on the root —
 * no per-element `dark:` class. "system" uses the `light dark` keyword to defer
 * to the OS (the app's original behaviour before a switcher existed).
 */
const colorSchemeFor = (theme: Theme): string =>
  theme === "system" ? "light dark" : theme;

export function getStoredTheme(): Theme {
  try {
    const t = localStorage.getItem(THEME_STORAGE_KEY);
    if (t === "light" || t === "dark" || t === "system") return t;
  } catch {
    /* localStorage blocked (private mode) — fall through to the default */
  }
  return "system";
}

/** Drive every `light-dark()` token by setting the root `color-scheme`. */
export function applyTheme(theme: Theme): void {
  document.documentElement.style.colorScheme = colorSchemeFor(theme);
}

/**
 * Read/set the persisted theme. The initial paint is themed by the boot script
 * in `index.html` (before React loads, so there's no flash); this hook keeps
 * React as the source of truth thereafter and re-asserts on change.
 */
export function useTheme(): [Theme, (theme: Theme) => void] {
  const [theme, setThemeState] = useState<Theme>(getStoredTheme);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const setTheme = useCallback((next: Theme) => {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      /* persistence failed — still apply for this session via state below */
    }
    setThemeState(next);
  }, []);

  return [theme, setTheme];
}
