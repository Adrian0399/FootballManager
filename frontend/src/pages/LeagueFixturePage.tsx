import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useFixtureState } from '../hooks/matches';
import { useLeague } from '../hooks/teams';
import { useIsAdmin } from '../hooks/useIsAdmin';
import { MatchdayColumn } from '../components/MatchdayColumn';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Banner } from '../components/ui/Banner';
import { Chip } from '../components/ui/Chip';
import { PageHeader } from '../components/ui/PageHeader';
import { EmptyState } from '../components/ui/EmptyState';
import { CalendarView } from '../components/CalendarView';
import {
  FORMAT_LABEL,
  TIME_SLOT_LABEL,
  WEEK_DAY_SHORT,
} from '../types/league';
import type { LeagueFormat, TimeSlot, WeekDay } from '../types/league';

type ViewMode = 'list' | 'calendar';

/**
 * /leagues/:id/fixture — main fixture page (Paso 5).
 *
 * Two views (toggleable):
 *   - **Lista** (default): matchdays as columns, drag&drop matches
 *     between them to reschedule. The columns show date + status.
 *   - **Calendario**: a month grid where each day with matches is
 *     a clickable cell that opens the list view scrolled to that date.
 *
 * Admin toolbar:
 *   - **Generar fixture**: replaces the current fixture with a fresh
 *     round-robin generated from the current seed order.
 *   - **Orden aleatorio**: same, but shuffles the teams first.
 *   - **Restablecer**: revert to the server fixture.
 *
 * v1.0.0 mock note: the dataset is immutable, so "Generar" lives in
 * component state. In v1.1 the same call hits the real
 * `POST /leagues/:id/fixture/generate` endpoint.
 */
export function LeagueFixturePage() {
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isAdmin = useIsAdmin();
  const [view, setView] = useState<ViewMode>('list');
  const [flash, setFlash] = useState<string | null>(null);

  const { data: league } = useLeague(id);
  const {
    matchdays,
    matches,
    matchesByMatchday,
    isLoading,
    error,
    actionError,
    isSaving,
    regenerate,
    resetToServer,
    reassignMatch,
  } = useFixtureState(id);

  if (isLoading && !league) {
    return (
      <div className="container section-stack">
        <p className="muted">Cargando fixture…</p>
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
              ← Volver a ligas
            </Button>
          }
        />
      </div>
    );
  }

  const onGenerate = async () => {
    setFlash(null);
    try {
      await regenerate({ force: true });
      setFlash('Fixture generado correctamente.');
    } catch {
      /* error surfaced via actionError */
    }
  };

  const onShuffleAndGenerate = async () => {
    setFlash(null);
    try {
      await regenerate({ shuffle: true, force: true });
      setFlash('Fixture generado con orden aleatorio.');
    } catch {
      /* error surfaced via actionError */
    }
  };

  const onReset = () => {
    resetToServer();
    setFlash('Fixture restablecido desde el servidor.');
  };

  const onDropMatch = async (matchId: string, matchdayId: string) => {
    setFlash(null);
    try {
      await reassignMatch(matchId, matchdayId);
      setFlash('Partido reasignado.');
    } catch {
      /* error surfaced via actionError */
    }
  };

  return (
    <div className="container section-stack">
      <PageHeader
        title={league ? `Fixture — ${league.name}` : 'Fixture'}
        description={
          league
            ? 'Calendario de partidos. Arrastra entre jornadas para reprogramar.'
            : undefined
        }
        actions={
          <div className="row-3 row-wrap">
            <Button variant="ghost" onClick={() => navigate(`/leagues/${id}`)}>
              ← Liga
            </Button>
            {!isAdmin && <Chip tone="ref">Solo lectura</Chip>}
          </div>
        }
      />

      {league && (
        <div className="row-3 row-wrap" style={{ alignItems: 'center' }}>
          {league.format && (
            <Chip tone="lime">{FORMAT_LABEL[league.format as LeagueFormat]}</Chip>
          )}
          {league.category && <Chip tone="magenta">{league.category}</Chip>}
          {league.dayOfWeek && (
            <Chip tone="cyan">
              {WEEK_DAY_SHORT[league.dayOfWeek as WeekDay]}
              {league.timeSlot
                ? ` · ${TIME_SLOT_LABEL[league.timeSlot as TimeSlot]}`
                : ''}
            </Chip>
          )}
          <Chip tone="default">
            {matchdays.length} jornadas · {matches.length} partidos
          </Chip>
        </div>
      )}

      {flash && <Banner tone="success">{flash}</Banner>}
      {actionError && <Banner tone="error">{actionError}</Banner>}

      {/* Toolbar */}
      <Card>
        <div
          className="row-3 row-between row-wrap"
          style={{ alignItems: 'center' }}
        >
          <div className="row-3 row-wrap">
            <Button
              size="sm"
              variant={view === 'list' ? 'primary' : 'ghost'}
              onClick={() => setView('list')}
            >
              Lista
            </Button>
            <Button
              size="sm"
              variant={view === 'calendar' ? 'primary' : 'ghost'}
              onClick={() => setView('calendar')}
            >
              Calendario
            </Button>
          </div>
          {isAdmin && (
            <div className="row-3 row-wrap">
              <Button
                size="sm"
                variant="cyan"
                onClick={onGenerate}
                disabled={isSaving}
              >
                {isSaving ? 'Generando…' : 'Generar fixture'}
              </Button>
              <Button
                size="sm"
                variant="magenta"
                onClick={onShuffleAndGenerate}
                disabled={isSaving}
              >
                Orden aleatorio
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={onReset}
                disabled={isSaving}
              >
                Restablecer
              </Button>
            </div>
          )}
        </div>
      </Card>

      {/* Body */}
      {matchdays.length === 0 ? (
        <EmptyState
          title="Fixture vacío"
          description={
            isAdmin
              ? 'La liga no tiene equipos asignados o no se ha generado el fixture. Asigna al menos 2 equipos y presiona "Generar fixture".'
              : 'La liga aún no tiene partidos programados.'
          }
          actions={
            isAdmin && (
              <Button onClick={onGenerate}>+ Generar fixture</Button>
            )
          }
        />
      ) : view === 'list' ? (
        <div className="fixture-list">
          {matchdays.map((md) => (
            <MatchdayColumn
              key={md.id}
              matchday={md}
              matches={matchesByMatchday.get(md.id) ?? []}
              onDropMatch={onDropMatch}
              readOnly={!isAdmin}
            />
          ))}
        </div>
      ) : (
        <CalendarView
          matchdays={matchdays}
          matchesByMatchday={matchesByMatchday}
        />
      )}

      <p className="muted" style={{ fontSize: 'var(--text-sm)' }}>
        Algoritmo: Berger round-robin ({league?.homeAndAway ? 'ida y vuelta' : 'una vuelta'}).{' '}
        <Link to={`/leagues/${id}`}>← Volver al detalle de la liga</Link>
      </p>
    </div>
  );
}
