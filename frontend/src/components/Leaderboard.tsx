import { Link } from 'react-router-dom';
import type { LeaderboardEntry } from '../hooks/playerStats';
import { getUserById, MOCK_TEAMS } from '../mocks/teams';
import { TeamBadge } from './TeamBadge';

interface LeaderboardProps {
  title: string;
  category: 'GOALS' | 'ASSISTS' | 'MVPS' | 'FAIR_PLAY';
  entries: LeaderboardEntry[];
  /** Max value across the entries (for the progress bar). */
  maxValue?: number;
  emptyMessage?: string;
}

/**
 * Top-N leaderboard with rank, mini player card, team badge, value,
 * and a progress bar. Used on the league stats page.
 *
 * The "secondary" stat (e.g. assists for the scorers list) is shown
 * as a small subscript next to the value.
 */
export function Leaderboard({ title, category, entries, maxValue, emptyMessage }: LeaderboardProps) {
  if (entries.length === 0) {
    return (
      <div className="leaderboard leaderboard--empty">
        <h3 className="leaderboard__title">{title}</h3>
        <p className="muted" style={{ padding: 'var(--space-3)' }}>
          {emptyMessage ?? 'Sin datos todavía.'}
        </p>
      </div>
    );
  }

  const max = maxValue ?? Math.max(...entries.map((e) => e.value));

  return (
    <div className="leaderboard">
      <h3 className="leaderboard__title">
        {title}
        <span className="muted" style={{ marginLeft: 'var(--space-2)' }}>
          ({entries.length})
        </span>
      </h3>
      <ol className="leaderboard__list" role="list">
        {entries.map((e) => {
          const user = getUserById(e.playerId);
          const team = MOCK_TEAMS.find((t) => t.id === e.teamId);
          const fullName = user ? `${user.firstName} ${user.paternalSurname}` : e.playerId;
          const pct = max > 0 ? Math.round((e.value / max) * 100) : 0;
          return (
            <li key={`${e.playerId}-${e.rank}`} className="leaderboard__row">
              <span className={`leaderboard__rank leaderboard__rank--${rankBucket(e.rank)}`}>
                {e.rank}
              </span>
              <Link
                to={`/players/${e.playerId}`}
                className="leaderboard__player"
                title={`Ver perfil de ${fullName}`}
              >
                {team && <TeamBadge team={team} size="sm" />}
                <div className="leaderboard__player-body">
                  <span className="leaderboard__player-name">{fullName}</span>
                  <span className="leaderboard__player-team">
                    {team?.shortName ?? e.teamId.slice(-3)}
                  </span>
                </div>
              </Link>
              <div className="leaderboard__bar" aria-hidden="true">
                <span
                  className={`leaderboard__bar-fill leaderboard__bar-fill--${category.toLowerCase()}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className={`leaderboard__value leaderboard__value--${category.toLowerCase()}`}>
                {e.value}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function rankBucket(rank: number): 'gold' | 'silver' | 'bronze' | 'default' {
  if (rank === 1) return 'gold';
  if (rank === 2) return 'silver';
  if (rank === 3) return 'bronze';
  return 'default';
}
