import type { Team } from '../types/team';

export type TeamBadgeSize = 'sm' | 'md' | 'lg' | 'xl';

interface TeamBadgeProps {
  team: Pick<Team, 'name' | 'shortName' | 'emoji' | 'primaryColor' | 'secondaryColor'>;
  size?: TeamBadgeSize;
  /** Show the short name as a label below the badge. */
  withLabel?: boolean;
}

const SIZE_PX: Record<TeamBadgeSize, number> = {
  sm: 36,
  md: 56,
  lg: 88,
  xl: 128,
};

const FONT_PX: Record<TeamBadgeSize, number> = {
  sm: 18,
  md: 28,
  lg: 44,
  xl: 64,
};

/**
 * Visual badge for a Team: a chunky neobrutalist square that shows the
 * team emoji on the team's primary color, with a secondary-color border.
 *
 * Used in:
 *   - The team list cards on `/teams`
 *   - The team header on `/teams/:id`
 *   - Match rows (as the home/away team marker)
 *
 * Sizes:
 *   - `sm`  — inline pill in tables, match rows.
 *   - `md`  — list cards.
 *   - `lg`  — page header on team detail.
 *   - `xl`  — hero block for a featured team.
 */
export function TeamBadge({ team, size = 'md', withLabel = false }: TeamBadgeProps) {
  const px = SIZE_PX[size];
  const fontPx = FONT_PX[size];
  return (
    <div className="team-badge-wrap">
      <div
        className="team-badge"
        aria-label={team.name}
        title={team.name}
        style={{
          width: px,
          height: px,
          background: team.primaryColor,
          color: team.secondaryColor,
          fontSize: fontPx,
        }}
      >
        <span className="team-badge__emoji" aria-hidden="true">
          {team.emoji}
        </span>
        {size === 'xl' && (
          <span className="team-badge__short">{team.shortName}</span>
        )}
      </div>
      {withLabel && size !== 'xl' && (
        <span className="team-badge__label">{team.shortName}</span>
      )}
    </div>
  );
}
