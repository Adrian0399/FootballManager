import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Chip } from '../ui/Chip';
import { TrophyIcon, FieldIcon } from '../icons';
import { MatchBanner } from '../MatchBanner';
import { useLeagues, useTeams } from '../../hooks/teams';
import { apiClient } from '../../api/axios';
import type { SuccessEnvelope } from '../../types/user';
import type { Match } from '../../types/match';

interface DashboardAdminProps {
  userFullName: string;
}

/**
 * Completed matches across every league, newest first.
 *
 * The API scopes matches to a league (`GET /matches?leagueId=`), so the
 * admin dashboard fans out over the leagues and merges the results. Runs
 * only when there is at least one league to query.
 */
function useMergedCompletedMatches(leagues: Array<{ id: string }>) {
  const [matches, setMatches] = useState<Match[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (leagues.length === 0) {
      setMatches([]);
      return;
    }
    setIsLoading(true);
    Promise.all(
      leagues.map((l) =>
        apiClient
          .get<SuccessEnvelope<Match[]>>('/matches', {
            params: { leagueId: l.id, status: 'COMPLETED' },
          })
          .then((r) => r.data.data)
          .catch(() => [] as Match[]),
      ),
    )
      .then((groups) => {
        if (cancelled) return;
        // A match can be flagged COMPLETED while its kickoff date is still
        // in the future (the seed does this). Those are not "últimos
        // partidos finalizados", so drop them before sorting.
        const now = new Date().toISOString();
        const played = groups
          .flat()
          .filter((m) => m.status === 'COMPLETED' && m.scheduledAt <= now)
          .sort((a, b) => b.scheduledAt.localeCompare(a.scheduledAt));
        setTotal(played.length);
        setMatches(played.slice(0, 5));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [leagues.map((l) => l.id).join(',')]);

  return { matches, total, isLoading };
}

export function DashboardAdmin({ userFullName }: DashboardAdminProps) {
  const leagues = useLeagues();
  const teams = useTeams();

  // Teams grouped by league, so we can count enrollment per league.
  const teamsByLeague = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of teams.data ?? []) {
      if (!t.currentLeagueId) continue;
      map.set(t.currentLeagueId, (map.get(t.currentLeagueId) ?? 0) + 1);
    }
    return map;
  }, [teams.data]);

  // --- Global counters ---------------------------------------------------
  const counters = useMemo(() => {
    const leagueRows = leagues.data ?? [];
    const activeLeagues = leagueRows.filter((l) => l.isActive).length;
    const totalTeams = (teams.data ?? []).length;
    return {
      activeLeagues,
      totalTeams,
    };
  }, [leagues.data, teams.data]);

  // --- Leagues over their maxTeams (operational alerts) ------------------
  const overCapacity = useMemo(() => {
    const out: Array<{ leagueId: string; leagueName: string; count: number; max: number }> = [];
    for (const l of leagues.data ?? []) {
      if (!l.maxTeams) continue;
      const assigned = teamsByLeague.get(l.id) ?? 0;
      if (assigned > l.maxTeams) {
        out.push({ leagueId: l.id, leagueName: l.name, count: assigned, max: l.maxTeams });
      }
    }
    return out;
  }, [leagues.data, teamsByLeague]);

  // --- Recent activity: completed matches across all leagues ------------
  // Matches are per-league in the API, so we read the finished ones from
  // the leagues that have any and merge them newest-first.
  const merged = useMergedCompletedMatches(leagues.data ?? []);
  const recentMatches = merged.matches;
  // `recentMatches` is capped at 5 for display; `total` is the real count.
  const completedCount = merged.total;

  const loading = leagues.isLoading || teams.isLoading || merged.isLoading;

  return (
    <div className="stack-5">
      <header className="dashboard-greeting">
        <h2 style={{ fontSize: 'var(--text-2xl)' }}>Hola, {userFullName.split(' ')[0]}</h2>
        <p className="muted">
          Visión global del sistema. Resumen de ligas, equipos, partidos y
          alertas operativas.
        </p>
      </header>

      <div className="dashboard-counters">
        <Counter label="Ligas activas" value={counters.activeLeagues} tone="magenta" />
        <Counter label="Equipos" value={counters.totalTeams} tone="cyan" />
        <Counter label="Partidos finalizados" value={completedCount} tone="lime" />
        <Counter label="Ligas" value={(leagues.data ?? []).length} tone="default" />
      </div>

      <div className="dashboard-quick">
        <Card>
          <h3 style={{ fontSize: 'var(--text-lg)' }}>Acciones rápidas</h3>
          <div className="row-3 row-wrap" style={{ marginTop: 'var(--space-3)' }}>
            <Button to="/leagues" startIcon={<TrophyIcon />}>
              Crear liga
            </Button>
            <Button to="/teams">
              Crear equipo
            </Button>
            <Button to="/fields" startIcon={<FieldIcon />}>
              Crear cancha
            </Button>
          </div>
        </Card>

        <Card>
          <h3 style={{ fontSize: 'var(--text-lg)' }}>Estado del sistema</h3>
          <ul className="staff-list">
            <StatRow label="Equipos registrados" value={counters.totalTeams} />
            <StatRow label="Ligas activas" value={counters.activeLeagues} />
          </ul>
        </Card>
      </div>

      {overCapacity.length > 0 && (
        <Card>
          <h3 style={{ fontSize: 'var(--text-lg)' }}>Alertas operativas</h3>
          <ul className="staff-list">
            {overCapacity.map((o) => (
              <li key={o.leagueId} className="staff-list__row">
                <div className="staff-list__body">
                  <span className="staff-list__name">
                    <Link to={`/leagues/${o.leagueId}`}>{o.leagueName}</Link>
                  </span>
                  <span className="staff-list__role">Sobrepoblada: {o.count} / {o.max}</span>
                </div>
                <Chip tone="warning">Sobrepoblada</Chip>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card>
        <h3 style={{ fontSize: 'var(--text-lg)' }}>Últimos partidos finalizados</h3>
        {recentMatches.length > 0 ? (
          <ul className="match-banner-list">
            {recentMatches.map((m) => (
              <MatchBanner key={m.id} match={m} />
            ))}
          </ul>
        ) : (
          <p className="muted">
            {loading ? 'Cargando partidos…' : 'Sin partidos finalizados.'}
          </p>
        )}
      </Card>
    </div>
  );
}

function Counter({ label, value, tone }: { label: string; value: number; tone: 'magenta' | 'cyan' | 'lime' | 'default' }) {
  return (
    <div className={`dashboard-counter dashboard-counter--${tone}`}>
      <span className="dashboard-counter__value">{value}</span>
      <span className="dashboard-counter__label">{label}</span>
    </div>
  );
}

function StatRow({ label, value }: { label: string; value: number | string }) {
  return (
    <li className="staff-list__row" style={{ gridTemplateColumns: '1fr auto' }}>
      <div className="staff-list__body">
        <span className="staff-list__role">{label}</span>
      </div>
      <span style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-lg)' }}>{value}</span>
    </li>
  );
}

// silence unused-import warning for now-removed TeamBadgeCmp
// (intentionally removed: TeamBadge requires a `team` prop, so it can't be used
// as a startIcon directly.)
