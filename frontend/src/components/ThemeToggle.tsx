import { useTheme } from '../hooks/useTheme';
import { SunIcon, MoonIcon } from './icons';

/**
 * Light / dark theme switch.
 *
 * Sits in the header next to the profile. It uses the same neobrutalist
 * recipe as the rest of the UI (thick border + hard offset shadow) so it
 * does not look foreign next to the other header controls.
 *
 * The label is hidden visually but kept for screen readers, so the
 * control announces what it will do rather than the current state.
 */
export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';
  const label = isDark ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro';

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={toggleTheme}
      aria-label={label}
      title={label}
      data-theme-state={theme}
    >
      <span className="theme-toggle__track" aria-hidden="true">
        <span className="theme-toggle__thumb">
          {isDark ? <MoonIcon /> : <SunIcon />}
        </span>
      </span>
    </button>
  );
}