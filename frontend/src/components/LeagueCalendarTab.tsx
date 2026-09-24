import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMatches } from '../hooks/matches';
import { Card } from './ui/Card';
import { Chip } from './ui/Chip';
import { EmptyState } from './ui/EmptyState';
import type { Match, Matchday } from '../types/match';
import { STATUS_LABEL, STATUS_TONE } from '../types/match';

interface LeagueCalendarTabProps {
  leagueId: string;
}

/** The backend embeds homeTeam/awayTeam in the match response. */
type MatchWithTeams = Match & {
  homeTeam?: { id: string; name: string; shortName: string } | null;
  awayTeam?: { id: string; name: string; shortName: string } | null;
};

const MONTHS_ES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getDate()} ${MONTHS_ES[d.getMonth()]} ${d.getFullYear()}`;
}

/**
 * Full league calendar: every jornada of the round-robin (and the
 * liguilla), rendered as collapsible `<details>` sections. The first
 * jornada is open by default so the user sees something immediately.
 *
 * Works for any league state: in-progress shows completed + scheduled;
 * finished shows everything completed.
 */
export function LeagueCalendarTab({ leagueId }: LeagueCalendarTabProps) {
  const matchesQuery = useMatches(leagueId);
  const matches = (matchesQuery.data ?? []) as MatchWithTeams[];
  const [only, setOnly] = useState<'all' | 'pending' | 'completed'>('all');

  // Split RR vs knockout. The seed uses matchday ids like `ko-*` for
  // knockouts, and the match carries `knockoutStage`.
  const { jornadas, liguilla } = useMemo(() => {
    const rr = matches.filter((m) => !m.knockoutStage);
    const ko = matches.filter((m) => Boolean(m.knockoutStage));

    // Group RR by matchdayId, preserving chronological order.
    const byMatchday = new Map<string, Matchday>();
    const grouped = new Map<string, MatchWithTeams[]>();
    for (const m of rr) {
      const list = grouped.get(m.matchdayId) ?? [];
      list.push(m);
      grouped.set(m.matchdayId, list);
      if (!byMatchday.has(m.matchdayId)) {
        byMatchday.set(m.matchdayId, {
          id: m.matchdayId,
          leagueId: m.leagueId,
          number: 0,
          date: m.scheduledAt.slice(0, 10),
          status: 'PENDING',
        });
      }
    }

    // Sort matchdays by earliest scheduledAt.
    const matchdayEntries = Array.from(grouped.entries()).map(([id, list]) => {
      const sorted = [...list].sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
      return { id, date: sorted[0]!.scheduledAt, matches: sorted };
    });
    matchdayEntries.sort((a, b) => a.date.localeCompare(b.date));

    // Number them 1..N and compute status.
    const jornadas = matchdayEntries.map((entry, idx) => {
      const completed = entry.matches.filter((m) => m.status === 'COMPLETED').length;
      const inProgress = entry.matches.some((m) => m.status === 'IN_PROGRESS');
      return {
        number: idx + 1,
        date: entry.matches[0]!.scheduledAt,
        matches: entry.matches,
        completed,
        total: entry.matches.length,
        status: completed === entry.matches.length ? 'COMPLETED' : inProgress ? 'IN_PROGRESS' : 'PENDING',
      };
    });

    // Sort knockout by stage order then position.
    const stageOrder: Record<string, number> = { QUARTERS: 0, SEMIS: 1, FINAL: 2, THIRD_PLACE: 3 };
    const liguilla = [...ko].sort((a, b) => {
      const sa = stageOrder[a.knockoutStage ?? ''] ?? 9;
      const sb = stageOrder[b.knockoutStage ?? ''] ?? 9;
      if (sa !== sb) return sa - sb;
      return (a.knockoutPosition ?? 0) - (b.knockoutPosition ?? 0);
    });

    return { jornadas, liguilla };
  }, [matches]);

  // Apply the filter.
  const filteredJornadas = useMemo(() => {
    if (only === 'all') return jornadas;
    if (only === 'completed') {
      return jornadas
        .map((j) => ({ ...j, matches: j.matches.filter((m) => m.status === 'COMPLETED') }))
        .filter((j) => j.matches.length > 0);
    }
    return jornadas
      .map((j) => ({ ...j, matches: j.matches.filter((m) => m.status !== 'COMPLETED') }))
      .filter((j) => j.matches.length > 0);
  }, [jornadas, only]);

  if (matchesQuery.isLoading) {
    return <Card><p className="muted">Cargando calendario…</p></Card>;
  }

  if (matches.length === 0) {
    return (
      <EmptyState
        title="Sin partidos"
        description="Esta liga aún no tiene partidos generados."
      />
    );
  }

  const totalCompleted = jornadas.reduce((sum, j) => sum + j.completed, 0);
  const totalMatches = jornadas.reduce((sum, j) => sum + j.total, 0);

  return (
    <div className="stack-4">
      {/* Toolbar */}
      <Card>
        <div className="row-3 row-between row-wrap" style={{ alignItems: 'center' }}>
          <div className="row-3 row-wrap">
            <Chip tone="default">
              {jornadas.length} jornadas · {totalCompleted}/{totalMatches} completados
            </Chip>
            {liguilla.length > 0 && (
              <Chip tone="magenta">
                {liguilla.length} partidos de liguilla
              </Chip>
            )}
          </div>
          <div className="row-3 row-wrap">
            <FilterBtn active={only === 'all'} onClick={() => setOnly('all')}>
              Todos
            </FilterBtn>
            <FilterBtn active={only === 'completed'} onClick={() => setOnly('completed')}>
              Finalizados
            </FilterBtn>
            <FilterBtn active={only === 'pending'} onClick={() => setOnly('pending')}>
              Pendientes
            </FilterBtn>
          </div>
        </div>
      </Card>

      {/* Round-robin jornadas */}
      <div className="stack-2">
        {filteredJornadas.length === 0 ? (
          <Card>
            <p className="muted">No hay partidos con este filtro.</p>
          </Card>
        ) : (
          filteredJornadas.map((j) => (
            <details key={j.number} className="jornada" open={j.number === 1}>
              <summary className="jornada__summary">
                <span className="jornada__num">Jornada {j.number}</span>
                <span className="jornada__date">{formatDate(j.date)}</span>
                <span className="jornada__progress">
                  {j.completed}/{j.total} finalizados
                </span>
                <Chip tone={j.status === 'COMPLETED' ? 'success' : j.status === 'IN_PROGRESS' ? 'lime' : 'default'}>
                  {j.status === 'COMPLETED' ? 'Completada' : j.status === 'IN_PROGRESS' ? 'En juego' : 'Pendiente'}
                </Chip>
              </summary>
              <div className="jornada__body">
                {j.matches.map((m) => (
                  <MatchRow key={m.id} match={m} />
                ))}
              </div>
            </details>
          ))
        )}
      </div>

      {/* Liguilla */}
      {liguilla.length > 0 && (
        <div className="stack-2">
          <h3 style={{ fontSize: 'var(--text-lg)', marginTop: 'var(--space-3)' }}>
            Fase final / Liguilla
          </h3>
          {liguilla.map((m) => (
            <MatchRow key={m.id} match={m} showStage />
          ))}
        </div>
      )}
    </div>
  );
}

function FilterBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      className={`tabs__btn ${active ? 'tabs__btn--active' : ''}`.trim()}
      onClick={onClick}
      style={{ padding: '6px 12px', fontSize: 'var(--text-xs)' }}
    >
      {children}
    </button>
  );
}

const STAGE_LABEL_LOCAL: Record<string, string> = {
  QUARTERS: 'Cuartos',
  SEMIS: 'Semis',
  FINAL: 'Final',
  THIRD_PLACE: '3er lugar',
};

function MatchRow({ match, showStage }: { match: MatchWithTeams; showStage?: boolean }) {
  const homeName = match.homeTeam?.name ?? match.homeTeam?.shortName ?? match.homeTeamId;
  const awayName = match.awayTeam?.name ?? match.awayTeam?.shortName ?? match.awayTeamId;
  const date = formatDate(match.scheduledAt);
  const time = match.scheduledAt.slice(11, 16);
  const showScore = match.status === 'COMPLETED' || match.status === 'IN_PROGRESS';
  const homeWin = showScore && (match.homeScore ?? 0) > (match.awayScore ?? 0);
  const awayWin = showScore && (match.awayScore ?? 0) > (match.homeScore ?? 0);

  return (
    <Link to={`/matches/${match.id}`} className="cal-match-row">
      <div className="cal-match-row__when">
        {showStage && match.knockoutStage && (
          <span className="cal-match-row__stage">{STAGE_LABEL_LOCAL[match.knockoutStage] ?? match.knockoutStage}</span>
        )}
        <span className="cal-match-row__date">{date}</span>
        <span className="cal-match-row__time">{time}</span>
      </div>
      <div className="cal-match-row__match">
        <span className={`cal-match-row__team ${homeWin ? 'is-winner' : ''}`}>{homeName}</span>
        <span className="cal-match-row__score">
          {showScore ? `${match.homeScore} - ${match.awayScore}` : 'vs'}
        </span>
        <span className={`cal-match-row__team cal-match-row__team--away ${awayWin ? 'is-winner' : ''}`}>{awayName}</span>
      </div>
      <Chip tone={STATUS_TONE[match.status]}>{STATUS_LABEL[match.status]}</Chip>
    </Link>
  );
}
