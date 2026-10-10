import { useCallback, useEffect, useState } from 'react';

export type Theme = 'light' | 'dark' | 'wp1' | 'wp2';

export const THEMES: Array<{ value: Theme; label: string; swatch: string }> = [
  { value: 'light', label: 'Claro', swatch: '#FFF8E7' },
  { value: 'dark', label: 'Oscuro', swatch: '#55565C' },
  { value: 'wp1', label: 'Wallpaper 1', swatch: 'url(/wallpaper-01.jpg)' },
  { value: 'wp2', label: 'Wallpaper 2', swatch: 'url(/wallpaper-02.jpg)' },
];

const STORAGE_KEY = 'kaibil-theme';

function isTheme(v: string | null): v is Theme {
  return v === 'light' || v === 'dark' || v === 'wp1' || v === 'wp2';
}

/**
 * Read the persisted preference. Falls back to the OS preference so a
 * visitor who never touched the toggle still gets the theme they expect.
 */
function readInitialTheme(): Theme {
  if (typeof window === 'undefined') return 'light';
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (isTheme(stored)) return stored;
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/** Maps a theme to a single color string for the browser chrome. */
function metaColorFor(theme: Theme): string {
  switch (theme) {
    case 'light':
      return '#FFF8E7';
    case 'dark':
    case 'wp1':
    case 'wp2':
      return '#1F202A';
  }
}

/** Applies the theme to <html> so the CSS `[data-theme]` block kicks in. */
function applyTheme(theme: Theme): void {
  document.documentElement.setAttribute('data-theme', theme);
  const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', metaColorFor(theme));
}

/**
 * Runs before the first paint (see `main.tsx`) so dark/wp users don't see
 * a flash of the light background while React mounts.
 */
export function bootstrapTheme(): void {
  applyTheme(readInitialTheme());
}

/**
 * Theme state. Switching only flips the `data-theme` attribute on <html>;
 * the whole app reads CSS variables so no component-level re-render
 * is needed and no per-component colors change.
 */
export function useTheme(): {
  theme: Theme;
  setTheme: (t: Theme) => void;
  cycleTheme: () => void;
  themes: typeof THEMES;
} {
  const [theme, setThemeState] = useState<Theme>(readInitialTheme);

  useEffect(() => {
    applyTheme(theme);
    window.localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const setTheme = useCallback((next: Theme) => setThemeState(next), []);
  const cycleTheme = useCallback(() => {
    setThemeState((t) => {
      const i = THEMES.findIndex((x) => x.value === t);
      return THEMES[(i + 1) % THEMES.length]!.value;
    });
  }, []);

  return { theme, setTheme, cycleTheme, themes: THEMES };
}