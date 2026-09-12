import type { UserRole } from '../types/user';

/**
 * Maps a UserRole to the corresponding `.chip--<variant>` modifier class.
 * Returns just the modifier (e.g. "chip--admin"), not the full className,
 * so consumers can compose it as `chip ${roleChipClass(role)}`.
 *
 * Unknown roles fall back to the default neutral chip.
 */
export function roleChipClass(role: UserRole): string {
  switch (role) {
    case 'ADMIN':
      return 'chip--admin';
    case 'REFEREE':
      return 'chip--ref';
    case 'TECHNICAL_DIRECTOR':
      return 'chip--td';
    case 'ASSISTANT':
      return 'chip--asst';
    case 'PLAYER':
      return 'chip--player';
    default:
      return '';
  }
}

/**
 * Human-readable role label. Keeps the raw UserRole for the chip text
 * (uppercase via CSS) but provides a friendly fallback if we ever want
 * to soften the screen reader copy.
 */
export function roleLabel(role: UserRole): string {
  return role;
}
