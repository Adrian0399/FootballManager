import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useMatch } from '../hooks/matches';
import { useMatchEvents, useMatchEventMutations } from '../hooks/matchEvents';
import { useTeamMembers, useLeague } from '../hooks/teams';
import { useIsAdmin } from '../hooks/useIsAdmin';
import { matchesApi } from '../api/matches';
import { MatchScoreboard } from '../components/MatchScoreboard';
import { MatchTimeline } from '../components/MatchTimeline';
import { MatchClock } from '../components/MatchClock';
import { EventQuickAdd } from '../components/EventQuickAdd';
import { Modal } from '../components/Modal';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Banner } from '../components/ui/Banner';
import { PageHeader } from '../components/ui/PageHeader';
import { EmptyState } from '../components/ui/EmptyState';
import { RosterList } from '../components/RosterList';
import type { MatchEventCreateInput, MatchEventType } from '../types/matchEvent';
import type { TeamMemberPublic } from '../types/team';
import type { ErrorEnvelope } from '../types/user';

type Tab = 'overview' | 'events' | 'stats' | 'lineup';
type Mode = 'LIVE' | 'POST_MATCH';

/**
 * /matches/:id — the **star** screen of the product.
 *
 * Data comes from the real backend:
 *   - `useMatch`        → GET /matches/:id (embeds homeTeam/awayTeam)
 *   - `useMatchEvents`  → GET /matches/:id/events
 *   - `useTeamMembers`  → GET /teams/:id (roster for the lineup tab)
 *
 * Mutations (admin-only, enforced server-side):
 *   - add / remove events → POST /matches/:id/events, DELETE /events/:id
 *   - finalize            → PATCH /matches/:id/status
 *   - The match score is recomputed server-side from GOAL events.
 *
 * Roles: ADMIN edits. DTs / Assistants / Players read-only.
 */
export function MatchDetailPage() {
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isAdmin = useIsAdmin();
  const [tab, setTab] = useState<Tab>('overview');
  const [actionError, setActionError] = useState<string | null>(null);

  const { data: match, isLoading, error, refetch: refetchMatch } = useMatch(id);
  const { data: league } = useLeague(match?.leagueId ?? null);
  const { data: events, isLoading: eventsLoading, refetch: refetchEvents } = useMatchEvents(id);
  const { addEvent, removeEvent } = useMatchEventMutations(id);

  const homeTeamId = match?.homeTeamId ?? '';
  const awayTeamId = match?.awayTeamId ?? '';
  const { data: homeMembers } = useTeamMembers(homeTeamId || null);
  const { data: awayMembers } = useTeamMembers(awayTeamId || null);

  const rosterMap = useMemo(() => {
    const map = new Map<string, TeamMemberPublic[]>();
    if (homeTeamId) map.set(homeTeamId, homeMembers ?? []);
    if (awayTeamId) map.set(awayTeamId, awayMembers ?? []);
    return map;
  }, [homeTeamId, awayTeamId, homeMembers, awayMembers]);

  const homeRoster = (rosterMap.get(homeTeamId) ?? []).filter(
    (m) => m.membershipRole === 'PLAYER',
  );
  const awayRoster = (rosterMap.get(awayTeamId) ?? []).filter(
    (m) => m.membershipRole === 'PLAYER',
  );

  // ----- Mode (LIVE / POST_MATCH) --------------------------------------
  const [mode, setMode] = useState<Mode>('POST_MATCH');
  useEffect(() => {
    if (match) {
      setMode(
        match.scoringMode === 'LIVE' && match.status === 'IN_PROGRESS'
          ? 'LIVE'
          : 'POST_MATCH',
      );
    }
  }, [match?.id, match?.status, match?.scoringMode]);

  // ----- LIVE-mode virtual clock ---------------------------------------
  const [clockMinute, setClockMinute] = useState<number>(0);
  const [running, setRunning] = useState<boolean>(false);
  useEffect(() => {
    if (!running) return;
    const t = window.setInterval(() => {
      setClockMinute((m) => (m < 95 ? m + 1 : m));
    }, 1500);
    return () => window.clearInterval(t);
  }, [running]);

  useEffect(() => {
    setClockMinute(0);
    setRunning(false);
  }, [id]);

  // ----- Quick-add modal state -----------------------------------------
  const [addingEvent, setAddingEvent] = useState<{ open: boolean; forcedTeamId?: string }>({
    open: false,
  });
  const openQuickAdd = (forcedTeamId?: string) => setAddingEvent({ open: true, forcedTeamId });
  const closeQuickAdd = () => setAddingEvent({ open: false });

  const handleError = (err: unknown) => {
    const apiError = (err as { response?: { data?: ErrorEnvelope } }).response?.data?.error;
    setActionError(apiError?.message ?? 'No se pudo completar la acción.');
  };

  const handleAddEvent = async (input: MatchEventCreateInput) => {
    setActionError(null);
    try {
      await addEvent(input);
      refetchEvents();
      refetchMatch(); // GOAL events recompute the score server-side.
    } catch (err) {
      handleError(err);
    }
  };

  const handleRemoveEvent = async (eventId: string) => {
    setActionError(null);
    try {
      await removeEvent(eventId);
      refetchEvents();
      refetchMatch();
    } catch (err) {
      handleError(err);
    }
  };

  const handleFinalize = async () => {
    setActionError(null);
    try {
      await matchesApi.setStatus(id, { status: 'COMPLETED' });
      setRunning(false);
      refetchMatch();
    } catch (err) {
      handleError(err);
    }
  };

  if (isLoading && !match) {
    return (
      <div className="container section-stack">
        <p className="muted">Cargando partido…</p>
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
  if (!match) {
    return (
      <div className="container section-stack">
        <EmptyState
          title="Partido no encontrado"
          description="El partido que buscas no existe o fue eliminado."
          actions={
            <Button variant="ghost" onClick={() => navigate(-1)}>
              ← Volver
            </Button>
          }
        />
      </div>
    );
  }

  const home = match.homeTeam ?? null;
  const away = match.awayTeam ?? null;
  const isLive = mode === 'LIVE' && match.status === 'IN_PROGRESS';
  const canEdit = isAdmin;
  const eventList = events ?? [];

  const counts: Record<MatchEventType, number> = {
    GOAL: 0,
    ASSIST: 0,
    YELLOW_CARD: 0,
    RED_CARD: 0,
    SUBSTITUTION: 0,
    MVP: 0,
    NOTE: 0,
  };
  for (const e of eventList) counts[e.type] += 1;

  return (
    <div className="container section-stack">
      <PageHeader
        title={home && away ? `${home.shortName} vs ${away.shortName}` : match.id}
        description={
          match.scoringMode === 'LIVE' || isLive
            ? 'Modo en vivo · Actualiza los eventos mientras juega.'
            : 'Modo post-partido · Captura todo en una pasada.'
        }
        actions={
          <div className="row-3 row-wrap">
            <Button variant="ghost" onClick={() => navigate(`/leagues/${match.leagueId}/fixture`)}>
              ← Fixture
            </Button>
            {isAdmin && match.status !== 'COMPLETED' && (
              <div className="row-3" style={{ gap: 0 }}>
                <Button
                  size="sm"
                  variant={mode === 'LIVE' ? 'primary' : 'ghost'}
                  onClick={() => setMode('LIVE')}
                >
                  LIVE
                </Button>
                <Button
                  size="sm"
                  variant={mode === 'POST_MATCH' ? 'primary' : 'ghost'}
                  onClick={() => setMode('POST_MATCH')}
                >
                  POST_MATCH
                </Button>
              </div>
            )}
          </div>
        }
      />

      {actionError && <Banner tone="error">{actionError}</Banner>}

      <MatchScoreboard
        match={match}
        homeTeam={home}
        awayTeam={away}
        league={league ?? null}
        runningMinute={isLive ? clockMinute : null}
      />

      {/* Tabs */}
      <div className="tabs" role="tablist">
        <TabButton active={tab === 'overview'} onClick={() => setTab('overview')}>
          Resumen
        </TabButton>
        <TabButton active={tab === 'events'} onClick={() => setTab('events')}>
          Eventos ({eventList.length})
        </TabButton>
        <TabButton active={tab === 'stats'} onClick={() => setTab('stats')}>
          Estadísticas
        </TabButton>
        <TabButton active={tab === 'lineup'} onClick={() => setTab('lineup')}>
          Alineación
        </TabButton>
      </div>

      {/* ----- Overview tab ----- */}
      {tab === 'overview' && (
        <div className="stack-4">
          {canEdit && match.status === 'SCHEDULED' && mode === 'LIVE' && (
            <Card>
              <h3 style={{ fontSize: 'var(--text-lg)' }}>Iniciar el partido</h3>
              <p className="muted">
                Cuando el árbitro pita el inicio, pulsa "Iniciar" para arrancar
                el reloj virtual. Los eventos que agregues se registrarán con
                el minuto actual.
              </p>
              <div className="row-3" style={{ marginTop: 'var(--space-3)' }}>
                <Button onClick={() => {
                  setRunning(true);
                  setClockMinute(1);
                }}>
                  ▶ Iniciar partido
                </Button>
              </div>
            </Card>
          )}

          {isLive && (
            <Card>
              <h3 style={{ fontSize: 'var(--text-lg)' }}>Reloj del partido</h3>
              <p className="muted" style={{ marginBottom: 'var(--space-3)' }}>
                Modo LIVE activo. El minuto avanza en tiempo "rápido" para
                efectos de demo.
              </p>
              <MatchClock
                running={running}
                minute={clockMinute}
                onStart={() => { setRunning(true); if (clockMinute === 0) setClockMinute(1); }}
                onPause={() => setRunning(false)}
                onResume={() => setRunning(true)}
                onFinish={() => {
                  setRunning(false);
                  setClockMinute(90);
                  void handleFinalize();
                }}
                canFinish={eventList.length > 0}
              />
            </Card>
          )}

          {match.status === 'COMPLETED' && (
            <Card>
              <h3 style={{ fontSize: 'var(--text-lg)' }}>Partido finalizado</h3>
              <p className="muted">
                Resultado final: {match.homeScore} - {match.awayScore}. Los
                eventos quedan en el timeline y la tabla de posiciones se
                actualiza automáticamente.
              </p>
            </Card>
          )}

          <div className="profile-dashboard-grid">
            <Card>
              <h3 style={{ fontSize: 'var(--text-lg)' }}>Resumen</h3>
              <ul className="staff-list">
                <Stat label="Goles" value={counts.GOAL} />
                <Stat label="Asistencias" value={counts.ASSIST} />
                <Stat label="Tarjetas amarillas" value={counts.YELLOW_CARD} />
                <Stat label="Tarjetas rojas" value={counts.RED_CARD} />
                <Stat label="MVP" value={counts.MVP} />
                <Stat label="Sustituciones" value={counts.SUBSTITUTION} />
              </ul>
            </Card>
            <Card>
              <h3 style={{ fontSize: 'var(--text-lg)' }}>Notas</h3>
              <p className="muted">
                Próximamente: notas del árbitro, reportes de incidentes y
                adjuntar fotos del partido.
              </p>
            </Card>
          </div>
        </div>
      )}

      {/* ----- Events tab ----- */}
      {tab === 'events' && (
        <Card>
          {canEdit && (
            <div className="row-3 row-end" style={{ marginBottom: 'var(--space-3)' }}>
              {isLive && (
                <>
                  <Button variant="lime" onClick={() => openQuickAdd(match.homeTeamId)}>
                    + Gol local
                  </Button>
                  <Button variant="cyan" onClick={() => openQuickAdd(match.awayTeamId)}>
                    + Gol visita
                  </Button>
                  <Button variant="coral" onClick={() => openQuickAdd()}>
                    + Evento
                  </Button>
                </>
              )}
              {!isLive && (
                <Button variant="cyan" onClick={() => openQuickAdd()}>
                  + Agregar evento
                </Button>
              )}
            </div>
          )}
          {eventsLoading && !eventList.length ? (
            <p className="muted">Cargando eventos…</p>
          ) : (
            <MatchTimeline
              events={eventList}
              homeTeamId={match.homeTeamId}
              awayTeamId={match.awayTeamId}
              homeTeamName={home?.name}
              awayTeamName={away?.name}
              onRemove={canEdit ? (eventId) => void handleRemoveEvent(eventId) : undefined}
            />
          )}
        </Card>
      )}

      {/* ----- Stats tab ----- */}
      {tab === 'stats' && (
        <div className="profile-dashboard-grid">
          <Card>
            <h3 style={{ fontSize: 'var(--text-lg)' }}>{home?.shortName ?? 'Local'}</h3>
            <ul className="staff-list">
              <Stat
                label="Goles"
                value={eventList.filter((e) => e.teamId === match.homeTeamId && e.type === 'GOAL').length}
              />
              <Stat
                label="Tarjetas amarillas"
                value={eventList.filter((e) => e.teamId === match.homeTeamId && e.type === 'YELLOW_CARD').length}
              />
              <Stat
                label="Tarjetas rojas"
                value={eventList.filter((e) => e.teamId === match.homeTeamId && e.type === 'RED_CARD').length}
              />
            </ul>
          </Card>
          <Card>
            <h3 style={{ fontSize: 'var(--text-lg)' }}>{away?.shortName ?? 'Visita'}</h3>
            <ul className="staff-list">
              <Stat
                label="Goles"
                value={eventList.filter((e) => e.teamId === match.awayTeamId && e.type === 'GOAL').length}
              />
              <Stat
                label="Tarjetas amarillas"
                value={eventList.filter((e) => e.teamId === match.awayTeamId && e.type === 'YELLOW_CARD').length}
              />
              <Stat
                label="Tarjetas rojas"
                value={eventList.filter((e) => e.teamId === match.awayTeamId && e.type === 'RED_CARD').length}
              />
            </ul>
          </Card>
        </div>
      )}

      {/* ----- Lineup tab ----- */}
      {tab === 'lineup' && (
        <div className="profile-dashboard-grid">
          <Card>
            <h3 style={{ fontSize: 'var(--text-lg)' }}>{home?.name ?? 'Local'}</h3>
            <RosterList memberships={homeRoster} />
          </Card>
          <Card>
            <h3 style={{ fontSize: 'var(--text-lg)' }}>{away?.name ?? 'Visita'}</h3>
            <RosterList memberships={awayRoster} />
          </Card>
        </div>
      )}

      <Modal
        open={addingEvent.open}
        onClose={closeQuickAdd}
        title="Agregar evento"
        description={`${home?.shortName ?? '?'} vs ${away?.shortName ?? '?'} · min ${clockMinute}'`}
      >
        <EventQuickAdd
          homeTeamId={match.homeTeamId}
          awayTeamId={match.awayTeamId}
          defaultMinute={clockMinute > 0 ? clockMinute : 45}
          defaultType="GOAL"
          forcedTeamId={addingEvent.forcedTeamId}
          homeTeam={home}
          awayTeam={away}
          rosterFor={(teamId) => rosterMap.get(teamId) ?? []}
          onSubmit={(input) => {
            void handleAddEvent(input);
            closeQuickAdd();
          }}
          onCancel={closeQuickAdd}
        />
      </Modal>

      <p className="muted" style={{ fontSize: 'var(--text-sm)' }}>
        Modo {mode} · Los eventos se guardan en el servidor.{' '}
        <Link to={`/leagues/${match.leagueId}/fixture`}>
          ← Volver al fixture
        </Link>
      </p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <li className="staff-list__row" style={{ gridTemplateColumns: '1fr auto' }}>
      <div className="staff-list__body">
        <span className="staff-list__role">{label}</span>
      </div>
      <span style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-lg)' }}>
        {value}
      </span>
    </li>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      className={`tabs__btn ${active ? 'tabs__btn--active' : ''}`.trim()}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
