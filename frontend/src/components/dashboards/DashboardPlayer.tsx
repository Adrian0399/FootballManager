import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Chip } from '../ui/Chip';
import { TeamBadge } from '../TeamBadge';
import { TrophyIcon } from '../icons';
import { useUserTeams } from '../../hooks/teams';
import { usePlayerStatsAllLeagues, usePlayerRecentMatches } from '../../hooks/playerStats';
import { useAwards } from '../../hooks/profile';
import { useUserById } from '../../hooks/playerStats';
import type { RecentMatchDto } from '../../api/profile';

interface DashboardPlayerProps {
  userId: string;
  userFullName: string;
}

export function DashboardPlayer({ userId, userFullName }: DashboardPlayerProps) {
  // Teams where the user is a PLAYER.
  const teams = useUserTeams(userId);
  const myTeams = useMemo(
    () => (teams.data ?? []).filter((t) => t.membership.membershipRole === 'PLAYER'),
    [teams.data],
  );

  // Per-league stats for this player (real aggregation from the backend).
  const allLeagues = usePlayerStatsAllLeagues(userId);
  const statsByLeague = useMemo(
    () =>
      (allLeagues.data ?? []).map(({ league, stats }) => ({
        leagueId: league.id,
        leagueName: league.name,
        stats,
      })),
    [allLeagues.data],
  );

  // Total stats across all leagues.
  const totals = useMemo(
    () =>
      statsByLeague.reduce(
        (acc, s) => ({
          goals: acc.goals + s.stats.goals,
          assists: acc.assists + s.stats.assists,
          mvp: acc.mvp + s.stats.mvpCount,
          ta: acc.ta + s.stats.yellowCards,
          tr: acc.tr + s.stats.redCards,
        }),
        { goals: 0, assists: 0, mvp: 0, ta: 0, tr: 0 },
      ),
    [statsByLeague],
  );

  // Next match: the most recent upcoming one from the real feed.
  const recent = usePlayerRecentMatches(userId, 5);
  const nextMatch = useMemo(() => {
    const upcoming = (recent.data ?? []).filter((m) => m.date > new Date().toISOString());
    return upcoming[0] ?? null;
  }, [recent.data]);

  const awards = useAwards(userId);
  const me = useUserById(userId);
  const loading = teams.isLoading || allLeagues.isLoading;

  return (
    <div className="stack-5">
      <header className="dashboard-greeting">
        <Chip tone="player">Jugador</Chip>
        <h2 style={{ fontSize: 'var(--text-2xl)' }}>Hola, {userFullName.split(' ')[0]}</h2>
        {me.data?.nickname && (
          <p className="muted">Apodo: "{me.data.nickname}"</p>
        )}
      </header>

      <div className="dashboard-counters">
        <Counter label="Goles" value={totals.goals} tone="success" />
        <Counter label="Asistencias" value={totals.assists} tone="cyan" />
        <Counter label="MVP" value={totals.mvp} tone="magenta" />
        <Counter label="TA" value={totals.ta} tone="warning" />
      </div>

      {nextMatch ? (
        <Card>
          <h3 style={{ fontSize: 'var(--text-lg)' }}>Tu próximo partido</h3>
          <NextMatch match={nextMatch} />
        </Card>
      ) : (
        <Card>
          <h3 style={{ fontSize: 'var(--text-lg)' }}>Tu próximo partido</h3>
          <p className="muted">No tienes partidos próximos asignados.</p>
        </Card>
      )}

      <Card>
        <h3 style={{ fontSize: 'var(--text-lg)' }}>Tus equipos</h3>
        {myTeams.length > 0 ? (
          <ul className="staff-list">
            {myTeams.map((team) => (
              <li key={team.id} className="staff-list__row">
                <TeamBadge team={team} size="sm" />
                <div className="staff-list__body">
                  <span className="staff-list__name">
                    <Link to={`/teams/${team.id}`}>{team.name}</Link>
                  </span>
                  <span className="staff-list__role">
                    {team.membership.jerseyNumber != null
                      ? `#${team.membership.jerseyNumber} · `
                      : ''}
                    {team.membership.position ?? '—'}
                    {team.membership.isCaptain ? ' · Capitán' : ''}
                  </span>
                </div>
                {team.currentLeagueId && (
                  <Chip tone="default">{team.currentLeagueId}</Chip>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">
            {loading ? 'Cargando equipos…' : 'No estás en ningún equipo.'}
          </p>
        )}
      </Card>

      {statsByLeague.length > 0 && (
        <Card>
          <h3 style={{ fontSize: 'var(--text-lg)' }}>Tus stats por liga</h3>
          <table className="standings-table">
            <thead>
              <tr>
                <th className="standings-th standings-th--left">Liga</th>
                <th className="standings-th standings-th--right">PJ</th>
                <th className="standings-th standings-th--right">G</th>
                <th className="standings-th standings-th--right">A</th>
                <th className="standings-th standings-th--right">MVP</th>
                <th className="standings-th standings-th--right">TA</th>
                <th className="standings-th standings-th--right">TR</th>
              </tr>
            </thead>
            <tbody>
              {statsByLeague.map((s) => (
                <tr key={s.leagueId} className="standings-row">
                  <td className="standings-cell standings-cell--team">
                    <Link to={`/leagues/${s.leagueId}`}>{s.leagueName}</Link>
                  </td>
                  <td className="standings-cell standings-cell--num">{s.stats.matchesPlayed}</td>
                  <td className="standings-cell standings-cell--num">{s.stats.goals}</td>
                  <td className="standings-cell standings-cell--num">{s.stats.assists}</td>
                  <td className="standings-cell standings-cell--num">{s.stats.mvpCount}</td>
                  <td className="standings-cell standings-cell--num">{s.stats.yellowCards}</td>
                  <td className="standings-cell standings-cell--num">{s.stats.redCards}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <Card>
        <h3 style={{ fontSize: 'var(--text-lg)' }}>Logros recientes</h3>
        {(awards.data ?? []).length > 0 ? (
          <ul className="staff-list">
            {(awards.data ?? []).slice(0, 3).map((a) => (
              <li key={a.id} className="staff-list__row">
                <div className="staff-list__avatar" aria-hidden="true">
                  <TrophyIcon />
                </div>
                <div className="staff-list__body">
                  <span className="staff-list__name">{a.title}</span>
                  <span className="staff-list__role">{a.season} · {a.competition}</span>
                </div>
                <Chip tone={a.level === 'GOLD' ? 'warning' : a.level === 'SILVER' ? 'default' : 'coral'}>
                  {a.level}
                </Chip>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">Sin logros registrados.</p>
        )}
        <div className="row-3 row-end" style={{ marginTop: 'var(--space-3)' }}>
          <Button to="/profile" size="sm" variant="ghost">
            Ver perfil completo
          </Button>
        </div>
      </Card>
    </div>
  );
}

function NextMatch({ match }: { match: RecentMatchDto }) {
  return (
    <Link to={`/matches/${match.id}`} className="dashboard-mini-match">
      <span className="dashboard-mini-match__name">{match.homeTeam}</span>
      <span className="dashboard-mini-match__score">
        {match.homeScore} - {match.awayScore}
      </span>
      <span className="dashboard-mini-match__name">{match.awayTeam}</span>
      <Chip tone={match.result === 'WIN' ? 'lime' : 'default'}>
        {match.date.slice(0, 10)}
      </Chip>
    </Link>
  );
}

function Counter({ label, value, tone = 'default' }: { label: string; value: number; tone?: 'default' | 'success' | 'cyan' | 'magenta' | 'warning' }) {
  return (
    <div className={`dashboard-counter dashboard-counter--${tone}`}>
      <span className="dashboard-counter__value">{value}</span>
      <span className="dashboard-counter__label">{label}</span>
    </div>
  );
}
