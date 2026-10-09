import { useCallback, useEffect, useState } from 'react';

export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'kaibil-theme';

/**
 * Read the persisted preference. Falls back to the OS preference so a
 * visitor who never touched the toggle still gets the theme they expect.
 */
function readInitialTheme(): Theme {
  if (typeof window === 'undefined') return 'light';
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === 'light' || stored === 'dark') return stored;
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/** Applies the theme to <html> so the CSS `[data-theme]` block kicks in. */
function applyTheme(theme: Theme): void {
  document.documentElement.setAttribute('data-theme', theme);
  // Keep the browser UI (address bar on mobile) in sync.
  const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', theme === 'dark' ? '#55565C' : '#FFF8E7');
}

/**
 * Applies the saved theme BEFORE React mounts (see `main.tsx`), so the
 * first paint is already correct and there is no light flash on a dark
 * theme. Exported separately because it must run outside the component.
 */
export function bootstrapTheme(): void {
  applyTheme(readInitialTheme());
}

/**
 * Theme toggle state.
 *
 * The whole app reads CSS variables, so switching only flips one attribute
 * on `<html>` — no re-render of the tree and no component-level colors.
 */
export function useTheme(): { theme: Theme; toggleTheme: () => void; setTheme: (t: Theme) => void } {
  const [theme, setThemeState] = useState<Theme>(readInitialTheme);

  useEffect(() => {
    applyTheme(theme);
    window.localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const setTheme = useCallback((next: Theme) => setThemeState(next), []);
  const toggleTheme = useCallback(
    () => setThemeState((t) => (t === 'dark' ? 'light' : 'dark')),
    [],
  );

  return { theme, toggleTheme, setTheme };
}