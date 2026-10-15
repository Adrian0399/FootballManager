import type { CSSProperties } from 'react';

export type PositionGroup = 'GK' | 'DEF' | 'MID' | 'FWD';

export interface PlayerCardProps {
  /** Display name, e.g. "E. Militão". */
  name: string;
  /** Position label shown over the portrait, e.g. "Defensa". */
  position: string;
  /** Jersey number. */
  number: number | string;
  /** Position line — drives the pill colour + short label. Derived from `position` if omitted. */
  positionGroup?: PositionGroup;
  /** Overall rating 0–99. Renders a floating badge when provided. */
  rating?: number;
  /** Micro-stats shown in the bottom strip. */
  stats?: { apps?: number; goals?: number; assists?: number };
  /** Club accent colour (hex) tinting the top of the card. */
  accent?: string;
  /** Club crest image. Falls back to the club initials. */
  clubLogoUrl?: string;
  /** Club short name — used for the crest fallback. */
  clubName?: string;
  /** Cut-out portrait (transparent PNG). Falls back to a silhouette. */
  photoUrl?: string;
  className?: string;
}

const GROUP_LABEL: Record<PositionGroup, string> = {
  GK: 'POR',
  DEF: 'DEF',
  MID: 'MED',
  FWD: 'DEL',
};

function deriveGroup(position: string): PositionGroup {
  const p = position.toLowerCase();
  if (p.includes('porter') || p.includes('arquero') || p === 'gk') return 'GK';
  if (p.includes('defens') || p.includes('lateral') || p.includes('central') || p === 'def') return 'DEF';
  if (p.includes('centro') || p.includes('medio') || p.includes('volante') || p === 'mid') return 'MID';
  return 'FWD';
}

/**
 * Broadcast / FUT-style player portrait card.
 *
 * - Studio periwinkle gradient with a per-club accent glow.
 * - Floating rating badge, club crest chip and position pill.
 * - Jersey number + name + micro-stats over a bottom scrim.
 *
 * Without a cut-out `photoUrl` a stylized silhouette is shown, so the card
 * still reads as intentional before real portraits are wired in.
 *
 * @example
 *   <PlayerCard
 *     name="Bellingham" position="Centrocampista" number={5}
 *     rating={89} accent="#FEBE10"
 *     stats={{ apps: 12, goals: 8, assists: 4 }}
 *   />
 */
export function PlayerCard({
  name,
  position,
  number,
  positionGroup,
  rating,
  stats,
  accent,
  clubLogoUrl,
  clubName,
  photoUrl,
  className,
}: PlayerCardProps) {
  const group = positionGroup ?? deriveGroup(position);
  const hasStats = Boolean(stats && (stats.apps != null || stats.goals != null || stats.assists != null));
  const classes = ['sp-player', hasStats ? 'sp-player--stats' : '', className ?? ''].filter(Boolean).join(' ');
  const style = accent ? ({ '--sp-accent': accent } as CSSProperties) : undefined;

  return (
    <article className={classes} style={style}>
      <span className="sp-player__accent" aria-hidden="true" />
      <span className="sp-player__watermark" aria-hidden="true">{number}</span>
      <span className="sp-player__glow" aria-hidden="true" />
      <span className="sp-player__sheen" aria-hidden="true" />

      {clubLogoUrl || clubName ? (
        <span className="sp-club">
          {clubLogoUrl ? (
            <img src={clubLogoUrl} alt="" />
          ) : (
            <span className="sp-club__fallback">{clubName?.slice(0, 2).toUpperCase()}</span>
          )}
        </span>
      ) : null}

      {rating != null && (
        <span className="sp-rating" aria-label={`Valoración ${rating}`}>
          <span className="sp-rating__num">{rating}</span>
          <span className="sp-rating__label">VAL</span>
        </span>
      )}

      <div className="sp-player__photo">
        {photoUrl ? (
          <img src={photoUrl} alt={name} loading="lazy" />
        ) : (
          /* Stylized head + shoulders silhouette while there's no cut-out. */
          <svg
            className="sp-player__silhouette"
            viewBox="0 0 200 250"
            fill="currentColor"
            preserveAspectRatio="xMidYMax meet"
            aria-hidden="true"
          >
            <circle cx="100" cy="68" r="46" />
            <path d="M18 250c0-50 34-86 82-86s82 36 82 86H18z" />
          </svg>
        )}
      </div>

      <span className="sp-player__scrim" aria-hidden="true" />

      <div className="sp-player__meta">
        <span className="sp-player__num">{number}</span>
        <span className="sp-player__id">
          <span className="sp-player__name">{name}</span>
          <span className={`sp-pos sp-pos--${group}`}>{GROUP_LABEL[group]} · {position}</span>
        </span>
      </div>

      {hasStats && (
        <div className="sp-player__stats">
          {stats!.apps != null && (
            <span className="sp-stat"><span className="sp-stat__val">{stats!.apps}</span><span className="sp-stat__lbl">PJ</span></span>
          )}
          {stats!.goals != null && (
            <span className="sp-stat"><span className="sp-stat__val">{stats!.goals}</span><span className="sp-stat__lbl">GOL</span></span>
          )}
          {stats!.assists != null && (
            <span className="sp-stat"><span className="sp-stat__val">{stats!.assists}</span><span className="sp-stat__lbl">AST</span></span>
          )}
        </div>
      )}
    </article>
  );
}
