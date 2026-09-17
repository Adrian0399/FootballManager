import type { CSSProperties, ReactNode } from 'react';

export type ChipTone =
  | 'default'
  | 'admin'
  | 'ref'
  | 'td'
  | 'asst'
  | 'player'
  | 'cyan'
  | 'magenta'
  | 'lime'
  | 'coral'
  | 'success'
  | 'warning';

interface ChipProps {
  /** Color tone — maps to `.chip--<tone>` modifiers. */
  tone?: ChipTone;
  /** Optional inline styles (escape hatch for one-off colors, e.g. inactive). */
  style?: CSSProperties;
  /** Optional className passthrough. */
  className?: string;
  children: ReactNode;
}

const toneClass: Record<ChipTone, string> = {
  default: '',
  admin: 'chip--admin',
  ref: 'chip--ref',
  td: 'chip--td',
  asst: 'chip--asst',
  player: 'chip--player',
  cyan: 'chip--cyan',
  magenta: 'chip--magenta',
  lime: 'chip--lime',
  coral: 'chip--coral',
  success: 'chip--success',
  warning: 'chip--warning',
};

/**
 * Small pill / chip used for role labels, tags, etc.
 *
 * @example
 *   <Chip tone="admin">ADMIN</Chip>
 *   <Chip tone="ref">Cancha Norte</Chip>
 *   <Chip style={{ background: 'var(--color-fog)' }}>Inactiva</Chip>
 */
export function Chip({ tone = 'default', style, className, children }: ChipProps) {
  const classes = ['chip', toneClass[tone], className ?? '']
    .filter(Boolean)
    .join(' ');
  return (
    <span className={classes} style={style}>
      {children}
    </span>
  );
}
