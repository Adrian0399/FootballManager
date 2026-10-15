import { useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { Modal } from '../components/Modal';
import { useLeagueTeams } from '../hooks/leagueTeams';
import { useLeague } from '../hooks/teams';
import { useIsAdmin } from '../hooks/useIsAdmin';
import { TrophyIcon } from '../components/icons';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Banner } from '../components/ui/Banner';
import { Chip } from '../components/ui/Chip';
import { PageHeader } from '../components/ui/PageHeader';
import { EmptyState } from '../components/ui/EmptyState';
import { TeamBadge } from '../components/TeamBadge';
import { LeagueForm } from '../components/LeagueForm';
import { DefaultTeamsButton, nextPlaceholderStart } from '../components/DefaultTeamsButton';
import { LeagueHighlightsPanel } from '../components/LeagueHighlightsPanel';
import { LeagueCalendarTab } from '../components/LeagueCalendarTab';
import { StandingsTable } from '../components/StandingsTable';
import { Leaderboard } from '../components/Leaderboard';
import { Bracket } from '../components/Bracket';
import { useStandings } from '../hooks/standings';
import { useLeagueLeaderboards, useLeagueHighlights } from '../hooks/playerStats';
import { useBracket } from '../hooks/knockout';
import {
  FORMAT_LABEL,
  TIME_SLOT_LABEL,
  WEEK_DAY_SHORT,
  FORMAT_PLAYERS_ON_FIELD,
} from '../types/league';
import type { League, LeagueFormat, LeagueType, TimeSlot, WeekDay } from '../types/league';

type Tab = 'overview' | 'highlights' | 'teams' | 'calendar' | 'standings' | 'stats' | 'knockout' | 'fields';

const TYPE_LABEL: Record<LeagueType, string> = {
  ROUND_ROBIN: 'Round-robin',
  GROUPS_KNOCKOUT: 'Grupos + eliminatorias',
  KNOCKOUT_ONLY: 'Eliminatorias directas',
};

/**
 * /leagues/:id — league detail with ALL content rendered inline.
 *
 * Every tab renders its full content directly within the page. No
 * navigation to separate routes. The user stays inside the league and
 * scrolls through all the data.
 *
 * Tabs:
 *   - Resumen: format, category, day, time, maxTeams, type, structure.
 *   - Destacados: top scorer, best GK, best attack, best defense.
 *   - Equipos: 16 teams with full rosters (players, DT, assistant).
 *   - Calendario: fixture with all jornadas and matches.
 *   - Tabla: standings table (computed server-side).
 *   - Stats: 4 leaderboards (goleadores, asistidores, MVPs, fair play).
 *   - Eliminatorias: bracket with quarters, semis, final, 3rd place.
 *   - Canchas: list of fields associated with the league.
 *
 * Admin can edit the league via the in-page LeagueForm modal.
 */
export function LeagueDetailPage() {
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isAdmin = useIsAdmin();
  const [tab, setTab] = useState<Tab>('overview');
  const [editOpen, setEditOpen] = useState(false);

  const { data: league, isLoading, error } = useLeague(id);
  const { data: assignedRaw, refetch: refetchTeams } = useLeagueTeams(id);
  const assigned = assignedRaw ?? [];

  // How many slots are still empty, and the next "Equipo NN" number.
  const missingTeams = Math.max(0, (league?.maxTeams ?? 0) - assigned.length);
  const defaultStartAt = nextPlaceholderStart(assigned.map((t) => t.name));

  // Standings from backend.
  const standingsQuery = useStandings(id);

  // Leaderboards + highlights from backend.
  const leaderboardsQuery = useLeagueLeaderboards(id);
  const highlightsQuery = useLeagueHighlights(id);

  // Bracket from backend.
  const bracketQuery = useBracket(id);

  if (isLoading && !league) {
    return (
      <div className="container section-stack">
        <p className="muted">Cargando liga…</p>
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

  return (
    <div className="container section-stack">
      <PageHeader
        title={league.name}
        description={
          league.season ? `Temporada ${league.season}` : 'Liga'
        }
        actions={
          <div className="row-3 row-wrap">
            <Button variant="ghost" onClick={() => navigate('/leagues')}>
              ← Ligas
            </Button>
            {isAdmin && (
              <Button variant="cyan" onClick={() => setEditOpen(true)}>
                Editar
              </Button>
            )}
          </div>
        }
      />

      {/* Hero with key chips */}
      <Card>
        <div className="league-hero">
          <div className="league-hero__icon" aria-hidden="true">
            <TrophyIcon style={{ fontSize: '3rem', color: 'var(--color-magenta)' }} />
          </div>
          <div className="league-hero__body">
            <div className="row-3 row-wrap">
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
              {league.maxTeams !== undefined && (
                <Chip tone="default">
                  {assigned.length} / {league.maxTeams} equipos
                </Chip>
              )}
              {league.status && (
                <Chip
                  style={{
                    background:
                      league.status === 'IN_PROGRESS'
                        ? 'var(--color-success)'
                        : league.status === 'FINISHED'
                          ? 'var(--color-fog)'
                          : 'var(--color-cyan)',
                    color: 'var(--color-text-dark)',
                  }}
                >
                  {league.status === 'IN_PROGRESS' ? 'En curso' : league.status === 'FINISHED' ? 'Finalizada' : 'Planificada'}
                </Chip>
              )}
            </div>
            {league.description && (
              <p className="muted" style={{ marginTop: 'var(--space-2)' }}>
                {league.description}
              </p>
            )}
          </div>
        </div>
      </Card>

      {/* Tabs */}
      <div className="tabs" role="tablist">
        <TabButton active={tab === 'overview'} onClick={() => setTab('overview')}>
          Resumen
        </TabButton>
        <TabButton active={tab === 'highlights'} onClick={() => setTab('highlights')}>
          Destacados
        </TabButton>
        <TabButton active={tab === 'teams'} onClick={() => setTab('teams')}>
          Equipos ({assigned.length})
        </TabButton>
        <TabButton active={tab === 'calendar'} onClick={() => setTab('calendar')}>
          Calendario
        </TabButton>
        <TabButton active={tab === 'standings'} onClick={() => setTab('standings')}>
          Tabla
        </TabButton>
        <TabButton active={tab === 'stats'} onClick={() => setTab('stats')}>
          Stats
        </TabButton>
        <TabButton active={tab === 'knockout'} onClick={() => setTab('knockout')}>
          Eliminatorias
        </TabButton>
        <TabButton active={tab === 'fields'} onClick={() => setTab('fields')}>
          Canchas ({league.fields.length})
        </TabButton>
      </div>

      {tab === 'overview' && <OverviewTab league={league} />}

      {tab === 'highlights' && (
        <LeagueHighlightsPanel
          leagueId={league.id}
        />
      )}

      {tab === 'teams' && (
        <div className="stack-3">
          <div className="row-3 row-between row-wrap">
            <h3 style={{ fontSize: 'var(--text-lg)' }}>Equipos participantes</h3>
            <div className="row-3 row-wrap" style={{ alignItems: 'center' }}>
              <span className="muted" style={{ fontSize: 'var(--text-sm)' }}>
                {assigned.length} / {league.maxTeams} equipos
              </span>
              {isAdmin && (
                <>
                  <Button variant="ghost" onClick={() => navigate('/teams')}>
                    Catálogo de equipos
                  </Button>
                  {missingTeams > 0 && (
                    <DefaultTeamsButton
                      leagueId={id}
                      count={missingTeams}
                      startAt={defaultStartAt}
                      onDone={refetchTeams}
                    />
                  )}
                  <Button onClick={() => navigate(`/leagues/${id}/teams`)}>
                    Gestionar equipos
                  </Button>
                </>
              )}
            </div>
          </div>
          {assigned.length === 0 ? (
            <Card>
              <EmptyState
                title="Sin equipos asignados"
                description={
                  isAdmin
                    ? 'Inscribe los equipos que participarán en esta liga. Si aún no existen, créalos desde el catálogo o genera equipos de relleno para armar el calendario ya.'
                    : 'Pídele a un admin que asigne los equipos.'
                }
                actions={
                  isAdmin ? (
                    <div className="row-3 row-wrap">
                      {missingTeams > 0 && (
                        <DefaultTeamsButton
                          leagueId={id}
                          count={missingTeams}
                          startAt={defaultStartAt}
                          onDone={refetchTeams}
                        />
                      )}
                      <Button variant="ghost" onClick={() => navigate(`/leagues/${id}/teams`)}>
                        Inscribir equipos existentes
                      </Button>
                      <Button variant="ghost" onClick={() => navigate('/teams')}>
                        Crear equipo
                      </Button>
                    </div>
                  ) : undefined
                }
              />
            </Card>
          ) : (
            <div className="league-teams-grid">
              {assigned.map((t) => {
                const members = (t as { members?: Array<{ membershipRole: string }> }).members ?? [];
                const players = members.filter((m) => m.membershipRole === 'PLAYER').length;
                const staff = members.filter((m) => m.membershipRole !== 'PLAYER').length;
                const dt = members.find((m) => m.membershipRole === 'DT');
                return (
                  <Link
                    key={t.id}
                    to={`/teams/${t.id}`}
                    className="league-team-card"
                    style={{ borderTopColor: t.primaryColor }}
                  >
                    <div className="league-team-card__header">
                      <TeamBadge team={t} size="lg" />
                      <div className="league-team-card__info">
                        <span className="league-team-card__seed">Seed #{t.seed}</span>
                        <span className="league-team-card__name">{t.name}</span>
                        <span className="league-team-card__short">
                          {t.shortName} · {t.emoji}
                        </span>
                      </div>
                    </div>
                    <div className="league-team-card__stats">
                      <span className="league-team-card__stat">
                        <strong>{players}</strong> jugadores
                      </span>
                      <span className="league-team-card__stat">
                        <strong>{staff}</strong> cuerpo técnico
                      </span>
                      {dt && (
                        <span className="league-team-card__dt">
                          DT asignado
                        </span>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
          {assigned.length > 0 && (
            <p className="muted" style={{ fontSize: 'var(--text-sm)' }}>
              Haz clic en un equipo para gestionar su plantilla (jugadores y cuerpo técnico).
            </p>
          )}
        </div>
      )}

      {tab === 'calendar' && <LeagueCalendarTab leagueId={id} />}

      {tab === 'standings' && (
        <Card>
          <div className="stack-3">
            <div className="row-3 row-between row-wrap">
              <h3 style={{ fontSize: 'var(--text-lg)' }}>Tabla de posiciones</h3>
              <span className="muted" style={{ fontSize: 'var(--text-sm)' }}>
                {standingsQuery.overall.length} equipos
              </span>
            </div>
            {standingsQuery.isLoading ? (
              <p className="muted">Cargando tabla…</p>
            ) : standingsQuery.error ? (
              <Banner tone="error">{standingsQuery.error.message}</Banner>
            ) : (
              <StandingsTable rows={standingsQuery.overall} leagueId={id} />
            )}
          </div>
        </Card>
      )}

      {tab === 'stats' && (
        <div className="stack-4">
          {/* Highlights row */}
          <Card>
            <h3 style={{ fontSize: 'var(--text-lg)', marginBottom: 'var(--space-3)' }}>
              Destacados de la liga
            </h3>
            {highlightsQuery.isLoading ? (
              <p className="muted">Cargando destacados…</p>
            ) : highlightsQuery.error ? (
              <Banner tone="error">{highlightsQuery.error.message}</Banner>
            ) : (
              <LeagueHighlightsPanel
                leagueId={league.id}
              />
            )}
          </Card>

          {/* Leaderboards */}
          <Card>
            <div className="stack-3">
              <h3 style={{ fontSize: 'var(--text-lg)' }}>Leaderboards</h3>
              {leaderboardsQuery.isLoading ? (
                <p className="muted">Cargando leaderboards…</p>
              ) : leaderboardsQuery.error ? (
                <Banner tone="error">{leaderboardsQuery.error.message}</Banner>
              ) : (
                <div className="stack-4">
                  <Leaderboard
                    title="Goleadores"
                    category="GOALS"
                    entries={leaderboardsQuery.data?.goals ?? []}
                  />
                  <Leaderboard
                    title="Asistidores"
                    category="ASSISTS"
                    entries={leaderboardsQuery.data?.assists ?? []}
                  />
                  <Leaderboard
                    title="MVPs"
                    category="MVPS"
                    entries={leaderboardsQuery.data?.mvps ?? []}
                  />
                  <Leaderboard
                    title="Fair play (menos tarjetas = mejor)"
                    category="FAIR_PLAY"
                    entries={leaderboardsQuery.data?.fairPlay ?? []}
                  />
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      {tab === 'knockout' && (
        <Card>
          <div className="stack-3">
            <h3 style={{ fontSize: 'var(--text-lg)' }}>Fase final / Liguilla</h3>
            {bracketQuery.isLoading ? (
              <p className="muted">Cargando bracket…</p>
            ) : bracketQuery.error ? (
              <Banner tone="error">{bracketQuery.error.message}</Banner>
            ) : (
              <Bracket byStage={bracketQuery.data?.byStage ?? []} teams={bracketQuery.data?.teams ? new Map(Object.entries(bracketQuery.data.teams)) : undefined} showChampion />
            )}
          </div>
        </Card>
      )}

      {tab === 'fields' && (
        <Card>
          {league.fields.length === 0 ? (
            <p className="muted">Esta liga no tiene canchas asignadas.</p>
          ) : (
            <ul className="staff-list" role="list">
              {league.fields.map((f: { id: string; name: string; address: string | null; capacity: number | null }) => (
                <li key={f.id} className="staff-list__row">
                  <div className="staff-list__avatar" aria-hidden="true">🏟</div>
                  <div className="staff-list__body">
                    <span className="staff-list__name">{f.name}</span>
                    <span className="staff-list__role">
                      {f.address ?? 'Sin dirección'}
                      {f.capacity !== null ? ` · Capacidad ${f.capacity}` : ''}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      <Modal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title="Editar liga"
        description={league.name}
      >
        <LeagueForm
          league={league}
          onSaved={() => setEditOpen(false)}
          onCancel={() => setEditOpen(false)}
        />
      </Modal>
    </div>
  );
}

function OverviewTab({ league }: { league: League }) {
  const rows: Array<[string, string]> = [];
  if (league.format) rows.push(['Formato', FORMAT_LABEL[league.format]]);
  if (league.category) rows.push(['Categoría', league.category]);
  if (league.type) rows.push(['Estructura', TYPE_LABEL[league.type as LeagueType]]);
  if (league.format && league.matchdays) {
    const po = FORMAT_PLAYERS_ON_FIELD[league.format];
    rows.push([
      'Jugadores en cancha',
      `${po} por equipo · ${po * 2} en juego`,
    ]);
    rows.push(['Jornadas', String(league.matchdays)]);
  }
  if (league.homeAndAway !== undefined) {
    rows.push(['Ida y vuelta', league.homeAndAway ? 'Sí' : 'No']);
  }
  if (league.dayOfWeek) {
    rows.push(['Día', WEEK_DAY_SHORT[league.dayOfWeek]]);
  }
  if (league.timeSlot) {
    rows.push(['Turno', TIME_SLOT_LABEL[league.timeSlot]]);
  }
  if (league.maxTeams !== undefined) {
    rows.push(['Cupo máximo', `${league.maxTeams} equipos`]);
  }
  if (league.season) rows.push(['Temporada', league.season]);
  if (league.startDate) rows.push(['Inicio', league.startDate]);
  if (league.endDate) rows.push(['Fin', league.endDate]);

  return (
    <Card>
      <dl className="league-overview">
        {rows.map(([k, v]) => (
          <div key={k} className="league-overview__row">
            <dt className="league-overview__key">{k}</dt>
            <dd className="league-overview__val">{v}</dd>
          </div>
        ))}
      </dl>
    </Card>
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
