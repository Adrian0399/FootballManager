import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Chip } from '../ui/Chip';
import { TeamBadge } from '../TeamBadge';
import { useUserTeams } from '../../hooks/teams';
import { useLeagueLeaderboards } from '../../hooks/playerStats';
import { useMatches } from '../../hooks/matches';
import type { Match } from '../../types/match';
import type { Team } from '../../types/team';

interface DashboardTeamProps {
  /** "DT" or "ASSISTANT" — both see the same view, only the actions differ. */
  role: 'TECHNICAL_DIRECTOR' | 'ASSISTANT';
  userId: string;
  userFullName: string;
}

/** One card per team under the user's direction. */
function TeamBlock({ team }: { team: Team }) {
  const matches = useMatches(team.currentLeagueId);
  const scorers = useLeagueLeaderboards(team.currentLeagueId);

  const { next, last } = useMemo(() => {
    const rows = (matches.data ?? [])
      .filter((m) => m.homeTeamId === team.id || m.awayTeamId === team.id)
      .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
    return {
      next:
        rows.find((m) => m.status === 'SCHEDULED' || m.status === 'IN_PROGRESS') ?? null,
      last: [...rows].reverse().find((m) => m.status === 'COMPLETED') ?? null,
    };
  }, [matches.data, team.id]);

  const topScorers = useMemo(() => {
    const goals = scorers.data?.goals ?? [];
    return goals
      .filter((s) => s.teamId === team.id)
      .sort((a, b) => b.value - a.value || b.secondary - a.secondary)
      .slice(0, 3)
      .map((s) => ({
        name: s.playerName && !s.playerName.includes('Jugador')
          ? s.playerName
          : `Jugador ${s.playerId.slice(-3)}`,
        goals: s.value,
      }));
  }, [scorers.data, team.id]);

  return (
    <>
      <div className="profile-dashboard-grid" style={{ marginTop: 'var(--space-3)' }}>
        <div>
          <h4 style={{ fontSize: 'var(--text-sm)' }} className="muted">
            Próximo partido
          </h4>
          {next ? (
            <MatchRow match={next} />
          ) : (
            <p className="muted">Sin partidos próximos.</p>
          )}
        </div>
        <div>
          <h4 style={{ fontSize: 'var(--text-sm)' }} className="muted">
            Último resultado
          </h4>
          {last ? (
            <MatchRow match={last} />
          ) : (
            <p className="muted">Sin resultados aún.</p>
          )}
        </div>
      </div>

      {topScorers.length > 0 && (
        <div style={{ marginTop: 'var(--space-3)' }}>
          <h4 style={{ fontSize: 'var(--text-sm)' }} className="muted">
            Top scorers del equipo
          </h4>
          <ul className="staff-list" style={{ marginTop: 'var(--space-2)' }}>
            {topScorers.map((s, i) => (
              <li key={i} className="staff-list__row" style={{ gridTemplateColumns: '1fr auto' }}>
                <div className="staff-list__body">
                  <span className="staff-list__name">{s.name}</span>
                </div>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-lg)' }}>
                  {s.goals} goles
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}

export function DashboardDT({ role, userId, userFullName }: DashboardTeamProps) {
  // Teams where the user is DT/ASSISTANT.
  const teams = useUserTeams(userId);
  const myTeams = useMemo(
    () =>
      (teams.data ?? []).filter(
        (t) =>
          t.membership.membershipRole === 'DT' ||
          t.membership.membershipRole === 'ASSISTANT',
      ),
    [teams.data],
  );

  return (
    <div className="stack-5">
      <header className="dashboard-greeting">
        <Chip tone="td">{role === 'TECHNICAL_DIRECTOR' ? 'Director Técnico' : 'Auxiliar Técnico'}</Chip>
        <h2 style={{ fontSize: 'var(--text-2xl)' }}>Hola, {userFullName.split(' ')[0]}</h2>
        <p className="muted">
          {myTeams.length} equipo{myTeams.length === 1 ? '' : 's'} bajo tu dirección.
        </p>
      </header>

      {myTeams.length === 0 ? (
        <Card>
          <h3 style={{ fontSize: 'var(--text-lg)' }}>
            {teams.isLoading ? 'Cargando equipos…' : 'Sin equipo asignado'}
          </h3>
          <p className="muted">
            Aún no tienes un equipo como {role === 'TECHNICAL_DIRECTOR' ? 'DT' : 'Auxiliar'}. Pídele a un
            admin que te agregue a un equipo en la lista de miembros.
          </p>
        </Card>
      ) : (
        myTeams.map((team) => (
          <Card key={team.id}>
            <div className="row-3 row-between row-wrap" style={{ alignItems: 'flex-start' }}>
              <div className="row-3">
                <TeamBadge team={team} size="lg" />
                <div>
                  <h3 style={{ fontSize: 'var(--text-lg)' }}>
                    <Link to={`/teams/${team.id}`}>{team.name}</Link>
                  </h3>
                  <div className="row-3 row-wrap" style={{ marginTop: 4 }}>
                    {team.currentLeagueId && (
                      <Chip tone="default">{team.currentLeagueId}</Chip>
                    )}
                    {team.currentLeagueFormat && <Chip tone="lime">{team.currentLeagueFormat}</Chip>}
                  </div>
                </div>
              </div>
              <div className="row-3 row-wrap">
                {role === 'TECHNICAL_DIRECTOR' && (
                  <Button size="sm" to={`/leagues/${team.currentLeagueId}/fixture`} variant="cyan">
                    Ver fixture
                  </Button>
                )}
              </div>
            </div>

            <TeamBlock team={team} />
          </Card>
        ))
      )}
    </div>
  );
}

function MatchRow({ match }: { match: Match }) {
  return (
    <Link to={`/matches/${match.id}`} className="dashboard-mini-match">
      <span className="dashboard-mini-match__name">
        {match.homeTeam?.shortName ?? '?'}
      </span>
      <span className="dashboard-mini-match__score">
        {match.status === 'COMPLETED' || match.status === 'IN_PROGRESS'
          ? `${match.homeScore} - ${match.awayScore}`
          : '—'}
      </span>
      <span className="dashboard-mini-match__name">
        {match.awayTeam?.shortName ?? '?'}
      </span>
      <Chip
        tone={
          match.status === 'COMPLETED' ? 'success' :
          match.status === 'IN_PROGRESS' ? 'lime' :
          match.status === 'POSTPONED' ? 'warning' :
          match.status === 'CANCELLED' ? 'coral' : 'default'
        }
      >
        {match.status === 'COMPLETED' ? 'Final' :
         match.status === 'IN_PROGRESS' ? 'En juego' :
         match.status === 'SCHEDULED' ? match.scheduledAt.slice(11, 16) : 'Pospuesto'}
      </Chip>
    </Link>
  );
}
