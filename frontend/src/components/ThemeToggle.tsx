import { useEffect, useRef, useState } from 'react';
import { useTheme, THEMES } from '../hooks/useTheme';
import { SunIcon, MoonIcon } from './icons';

/**
 * Theme picker.
 *
 * Four options: light, dark, and two wallpaper themes whose background
 * image is set in `tokens.css`. Stored in localStorage so the pick
 * survives reloads.
 */
export function ThemeToggle() {
  const { theme, setTheme, themes } = useTheme();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const isDarkish = theme !== 'light';
  const label = isDarkish ? 'Cambiar tema' : 'Cambiar tema';

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="theme-picker" ref={wrapRef}>
      <button
        type="button"
        className="theme-picker__trigger"
        onClick={() => setOpen((v) => !v)}
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        title={label}
      >
        {isDarkish ? <MoonIcon /> : <SunIcon />}
      </button>

      {open && (
        <div className="theme-picker__menu" role="menu">
          {themes.map((t) => (
            <button
              key={t.value}
              type="button"
              role="menuitemradio"
              aria-checked={theme === t.value}
              className={`theme-option ${theme === t.value ? 'is-active' : ''}`.trim()}
              onClick={() => {
                setTheme(t.value);
                setOpen(false);
              }}
            >
              <span
                className="theme-option__swatch"
                style={{ background: t.swatch }}
                aria-hidden="true"
              />
              <span className="theme-option__label">{t.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}