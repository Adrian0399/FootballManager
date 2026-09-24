import { Link } from 'react-router-dom';
import type { User } from '../types/user';
import type { Team } from '../types/team';
import { TeamBadge } from './TeamBadge';

interface PlayerMiniCardProps {
  user: User;
  team?: Team | null;
  /** Optional stat label/value to show next to the name. */
  primaryStat?: { label: string; value: string | number } | null;
  /** Compact mode drops the secondary text. */
  compact?: boolean;
}

/**
 * Compact player card for lists and grids. Avatar (initials if no
 * photo), full name, team badge, and an optional primary stat.
 */
export function PlayerMiniCard({ user, team, primaryStat, compact }: PlayerMiniCardProps) {
  const fullName = `${user.firstName} ${user.paternalSurname} ${user.maternalSurname}`.trim();
  return (
    <Link to={`/players/${user.id}`} className="player-mini" title={`Ver perfil de ${fullName}`}>
      {team && <TeamBadge team={team} size="sm" />}
      <div className="player-mini__body">
        <span className="player-mini__name">
          {user.firstName} {user.paternalSurname}
          {user.nickname && <span className="player-mini__nickname"> "{user.nickname}"</span>}
        </span>
        {!compact && (
          <span className="player-mini__team">
            {team?.name ?? 'Sin equipo'} {team ? `· ${team.shortName}` : ''}
          </span>
        )}
      </div>
      {primaryStat && (
        <div className="player-mini__stat">
          <span className="player-mini__stat-value">{primaryStat.value}</span>
          <span className="player-mini__stat-label">{primaryStat.label}</span>
        </div>
      )}
    </Link>
  );
}
