import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLeague } from '../hooks/teams';
import { useBracket } from '../hooks/knockout';
import { useIsAdmin } from '../hooks/useIsAdmin';
import { leaguesApi } from '../api/leagues';
import { Bracket } from '../components/Bracket';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Banner } from '../components/ui/Banner';
import { Chip } from '../components/ui/Chip';
import { PageHeader } from '../components/ui/PageHeader';
import { EmptyState } from '../components/ui/EmptyState';
import { Modal } from '../components/Modal';
import {
  FORMAT_LABEL,
  TIME_SLOT_LABEL,
  WEEK_DAY_SHORT,
} from '../types/league';
import type { LeagueFormat, TimeSlot, WeekDay } from '../types/league';
import { STATUS_LABEL, STATUS_TONE, STAGE_LABEL } from '../types/match';
import type { Match } from '../types/match';

/**
 * /leagues/:id/knockout — bracket view (Paso 9).
 *
 * Rounds laid out left-to-right (Cuartos → Semis → Final). The
 * champion card sits below the bracket once the final is COMPLETED.
 *
 * Click a completed match → opens a small modal with summary info
 * (in v1.1 this will navigate to the MatchDetailPage once knockout
 * matches are first-class `Match` records).
 */
export function LeagueKnockoutPage() {
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: league } = useLeague(id);
  const { data, isLoading, error, refetch } = useBracket(id);
  const isAdmin = useIsAdmin();

  const [selected, setSelected] = useState<Match | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const onGenerateKo = async () => {
    setActionError(null);
    setFlash(null);
    setIsSaving(true);
    try {
      await leaguesApi.generateKnockout(id, { force: true });
      refetch();
      setFlash('Liguilla generada correctamente.');
    } catch (err) {
      const message =
        (err as { response?: { data?: { error?: { message?: string } } } }).response?.data?.error
          ?.message ?? 'No se pudo generar la liguilla.';
      setActionError(message);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading && !league) {
    return (
      <div className="container section-stack">
        <p className="muted">Cargando eliminatorias…</p>
      </div>
    );
  }
  if (error) {
    return (
      <div className="container section-stack">
        <Banner tone="error">{error.message}</Banner>
      </div>
    );
  }
  if (!league) {
    return (
      <div className="container section-stack">
        <EmptyState
          title="Liga no encontrada"
          description="La liga que buscas no existe o fue eliminada."
          actions={
            <Button variant="ghost" onClick={() => navigate('/leagues')}>
              ← Ligas
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="container section-stack">
      <PageHeader
        title={league ? `Eliminatorias — ${league.name}` : 'Eliminatorias'}
        description={
          league
            ? 'Bracket de la fase final. Click en un partido finalizado para ver el resumen.'
            : undefined
        }
        actions={
          <div className="row-3 row-wrap">
            <Button variant="ghost" onClick={() => navigate(`/leagues/${id}`)}>
              ← Liga
            </Button>
            <Button variant="cyan" onClick={() => navigate(`/leagues/${id}/fixture`)}>
              Fixture
            </Button>
            {isAdmin && (
              <Button
                variant="magenta"
                onClick={onGenerateKo}
                disabled={isSaving}
              >
                {isSaving ? 'Generando…' : 'Generar liguilla'}
              </Button>
            )}
          </div>
        }
      />

      {flash && <Banner tone="success">{flash}</Banner>}
      {actionError && <Banner tone="error">{actionError}</Banner>}

      {league && (
        <div className="row-3 row-wrap" style={{ alignItems: 'center' }}>
          {league.format && (
            <Chip tone="lime">{FORMAT_LABEL[league.format as LeagueFormat]}</Chip>
          )}
          {league.category && <Chip tone="magenta">{league.category}</Chip>}
          {league.dayOfWeek && (
            <Chip tone="cyan">
              {WEEK_DAY_SHORT[league.dayOfWeek as WeekDay]}
              {league.timeSlot ? ` · ${TIME_SLOT_LABEL[league.timeSlot as TimeSlot]}` : ''}
            </Chip>
          )}
          {data && data.byStage.length > 0 && (
            <Chip tone="default">
              {data.byStage.length} rondas · {data.all.length} partidos
            </Chip>
          )}
        </div>
      )}

      {data && data.byStage.length > 0 ? (
        <Card>
          <Bracket byStage={data.byStage} onMatchClick={setSelected} />
        </Card>
      ) : (
        <EmptyState
          title="Sin fase de eliminatorias"
          description="Esta liga aún no tiene un bracket generado. La fase de liguilla se habilita cuando la temporada regular termina y el admin configura los clasificados."
          actions={
            isAdmin ? (
              <Button
                variant="magenta"
                onClick={onGenerateKo}
                disabled={isSaving}
              >
                {isSaving ? 'Generando…' : '+ Generar liguilla'}
              </Button>
            ) : undefined
          }
        />
      )}

      <p className="muted" style={{ fontSize: 'var(--text-sm)' }}>
        El bracket se construye a partir de los partidos marcados con{' '}
        <code className="mono">knockoutStage</code>.{' '}
        <span onClick={() => navigate(`/leagues/${id}`)} style={{ cursor: 'pointer' }}>
          ← Volver a la liga
        </span>
      </p>

      <Modal
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title="Detalle del partido"
        description={selected ? `${STAGE_LABEL[selected.knockoutStage ?? 'QUARTERS']} · #${selected.knockoutPosition ?? '-'}` : ''}
      >
        {selected && <MatchSummary match={selected} teams={data?.teams} />}
      </Modal>
    </div>
  );
}

interface BracketTeamLike {
  id: string;
  name: string;
  shortName?: string;
  emoji?: string | null;
}

function MatchSummary({
  match,
  teams,
}: {
  match: Match;
  teams?: Record<string, BracketTeamLike>;
}) {
  const resolve = (teamId: string): BracketTeamLike | undefined => {
    if (teams?.[teamId]) return teams[teamId];
    if (match.homeTeam?.id === teamId) return match.homeTeam;
    if (match.awayTeam?.id === teamId) return match.awayTeam;
    // Placeholder for teams whose slot is still TBD in the bracket.
    return teamId ? { id: teamId, name: teamId, shortName: teamId, emoji: '' } : undefined;
  };
  const home = resolve(match.homeTeamId);
  const away = resolve(match.awayTeamId);
  return (
    <div className="stack-3">
      <div className="bracket-match__teams" style={{ background: 'var(--color-bg)', borderRadius: 'var(--radius-md)', padding: 'var(--space-3)' }}>
        <div className="bracket-match__side">
          {home && <span style={{ fontSize: '1.5rem' }}>{home.emoji}</span>}
          <span className="bracket-match__name">{home?.name ?? 'TBD'}</span>
          <span className="bracket-match__score">{match.homeScore ?? '—'}</span>
        </div>
        <div className="bracket-match__side">
          {away && <span style={{ fontSize: '1.5rem' }}>{away.emoji}</span>}
          <span className="bracket-match__name">{away?.name ?? 'TBD'}</span>
          <span className="bracket-match__score">{match.awayScore ?? '—'}</span>
        </div>
      </div>
      <div className="row-3 row-wrap">
        <Chip tone={STATUS_TONE[match.status]}>{STATUS_LABEL[match.status]}</Chip>
        <Chip tone="default">
          {match.scheduledAt.slice(0, 10)} · {match.scheduledAt.slice(11, 16)}
        </Chip>
        {match.fieldId && <Chip tone="ref">🏟 {match.fieldId}</Chip>}
        {match.referee?.fullName && (
          <Chip tone="ref">Árbitro: {match.referee.fullName}</Chip>
        )}
        {match.scoringMode && <Chip tone="default">Modo {match.scoringMode}</Chip>}
      </div>
      {match.notes && (
        <p className="muted" style={{ fontSize: 'var(--text-sm)' }}>
          {match.notes}
        </p>
      )}
    </div>
  );
}
