import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useUserTeams } from '../hooks/teams';
import {
  usePlayerStatsAllLeagues,
  usePlayerRecentMatches,
  useUserById,
} from '../hooks/playerStats';
import { useAwards } from '../hooks/profile';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Banner } from '../components/ui/Banner';
import { Chip } from '../components/ui/Chip';
import { PageHeader } from '../components/ui/PageHeader';
import { EmptyState } from '../components/ui/EmptyState';
import { TeamBadge } from '../components/TeamBadge';

type Tab = 'overview' | 'stats' | 'matches' | 'awards';

/**
 * /players/:id — public player profile (Paso 8).
 *
 * Tabs:
 *   - **Resumen**: identity + current teams + total stats.
 *   - **Stats**: per-league breakdown (G, A, TA, TR, MVPs, ranking).
 *   - **Partidos**: recent matches (last 5) with result chip.
 *   - **Premios**: career awards.
 *
 * Note: in v1.0.0 mock the awards pool is global, not per-player.
 * In v1.1 the Award type gains `playerId` and the list filters.
 */
export function PlayerProfilePage() {
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('overview');
  const { data: user, isLoading, error } = useUserById(id);
  const teamsQuery = useUserTeams(id);
  const teams = teamsQuery.data;
  const { data: statsByLeague } = usePlayerStatsAllLeagues(id);
  const { data: recent } = usePlayerRecentMatches(id, 5);
  const { data: awards } = useAwards(id);

  if (isLoading && !user) {
    return (
      <div className="container section-stack">
        <p className="muted">Cargando jugador…</p>
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
  if (!user) {
    return (
      <div className="container section-stack">
        <EmptyState
          title="Jugador no encontrado"
          description="El jugador que buscas no existe."
          actions={
            <Button variant="ghost" onClick={() => navigate(-1)}>
              ← Volver
            </Button>
          }
        />
      </div>
    );
  }

  const fullName = `${user.firstName} ${user.paternalSurname} ${user.maternalSurname}`.trim();
  const initials = `${user.firstName[0] ?? ''}${user.paternalSurname[0] ?? ''}`.toUpperCase();
  const totalStats = (statsByLeague ?? []).reduce(
    (acc, { stats }) => {
      acc.goals += stats.goals;
      acc.assists += stats.assists;
      acc.yellowCards += stats.yellowCards;
      acc.redCards += stats.redCards;
      acc.mvpCount += stats.mvpCount;
      acc.matchesPlayed = Math.max(acc.matchesPlayed, stats.matchesPlayed);
      return acc;
    },
    { goals: 0, assists: 0, yellowCards: 0, redCards: 0, mvpCount: 0, matchesPlayed: 0 },
  );

  return (
    <div className="container section-stack">
      <PageHeader
        title={fullName}
        description={
          user.nickname ? `Apodo: "${user.nickname}"` : 'Perfil de jugador'
        }
        actions={
          <div className="row-3 row-wrap">
            <Button variant="ghost" onClick={() => navigate(-1)}>
              ← Volver
            </Button>
            <Chip
              tone={
                user.role === 'ADMIN' ? 'admin'
                  : user.role === 'REFEREE' ? 'ref'
                  : user.role === 'TECHNICAL_DIRECTOR' ? 'td'
                  : user.role === 'ASSISTANT' ? 'asst'
                  : 'player'
              }
            >
              {user.role}
            </Chip>
          </div>
        }
      />

      {/* Identity card */}
      <Card>
        <div className="player-profile-hero">
          <div className="player-profile-hero__avatar" aria-hidden="true">
            {user.profilePhotoUrl ? (
              <img src={user.profilePhotoUrl} alt="" />
            ) : (
              <span>{initials}</span>
            )}
          </div>
          <div className="player-profile-hero__body">
            <h2 style={{ fontSize: 'var(--text-2xl)' }}>{fullName}</h2>
            <p className="muted" style={{ margin: '4px 0 0' }}>
              {user.email}
            </p>
            <div className="row-3 row-wrap" style={{ marginTop: 'var(--space-3)' }}>
              {teams?.slice(0, 4).map((t) => (
                <Link key={t.id} to={`/teams/${t.id}`} className="player-profile-hero__team">
                  <TeamBadge team={t} size="sm" />
                  <span>{t.name}</span>
                </Link>
              ))}
              {(!teams || teams.length === 0) && (
                <span className="muted">Sin equipo activo</span>
              )}
            </div>
          </div>
          <div className="player-profile-hero__totals">
            <Stat label="Goles" value={totalStats.goals} />
            <Stat label="Asist." value={totalStats.assists} />
            <Stat label="MVPs" value={totalStats.mvpCount} />
            <Stat label="TA" value={totalStats.yellowCards} />
            <Stat label="TR" value={totalStats.redCards} />
          </div>
        </div>
      </Card>

      {/* Tabs */}
      <div className="tabs" role="tablist">
        <TabButton active={tab === 'overview'} onClick={() => setTab('overview')}>
          Resumen
        </TabButton>
        <TabButton active={tab === 'stats'} onClick={() => setTab('stats')}>
          Stats por liga
        </TabButton>
        <TabButton active={tab === 'matches'} onClick={() => setTab('matches')}>
          Partidos ({recent?.length ?? 0})
        </TabButton>
        <TabButton active={tab === 'awards'} onClick={() => setTab('awards')}>
          Premios
        </TabButton>
      </div>

      {tab === 'overview' && (
        <div className="profile-dashboard-grid">
          <Card>
            <h3 style={{ fontSize: 'var(--text-lg)' }}>Equipos</h3>
            {teams && teams.length > 0 ? (
              <ul className="staff-list" role="list">
                {teams.map((t) => (
                  <li key={t.id} className="staff-list__row">
                    <TeamBadge team={t} size="sm" />
                    <div className="staff-list__body">
                      <span className="staff-list__name">{t.name}</span>
                      <span className="staff-list__role">
                        {t.membership.membershipRole}
                        {t.membership.jerseyNumber != null
                          ? ` · #${t.membership.jerseyNumber}`
                          : ''}
                      </span>
                    </div>
                    <Chip tone="default">{t.shortName}</Chip>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted">No está en ningún equipo.</p>
            )}
          </Card>
          <Card>
            <h3 style={{ fontSize: 'var(--text-lg)' }}>Totales</h3>
            <ul className="staff-list" role="list">
              <Stat label="Partidos jugados" value={totalStats.matchesPlayed} />
              <Stat label="Goles" value={totalStats.goals} />
              <Stat label="Asistencias" value={totalStats.assists} />
              <Stat label="MVP" value={totalStats.mvpCount} />
              <Stat label="Tarjetas amarillas" value={totalStats.yellowCards} />
              <Stat label="Tarjetas rojas" value={totalStats.redCards} />
            </ul>
          </Card>
        </div>
      )}

      {tab === 'stats' && (
        <Card>
          {statsByLeague && statsByLeague.length > 0 ? (
            <table className="standings-table">
              <thead>
                <tr>
                  <th scope="col" className="standings-th standings-th--left">Liga</th>
                  <th scope="col" className="standings-th standings-th--right">PJ</th>
                  <th scope="col" className="standings-th standings-th--right">G</th>
                  <th scope="col" className="standings-th standings-th--right">A</th>
                  <th scope="col" className="standings-th standings-th--right">TA</th>
                  <th scope="col" className="standings-th standings-th--right">TR</th>
                  <th scope="col" className="standings-th standings-th--right">MVP</th>
                  <th scope="col" className="standings-th standings-th--right">Ranking</th>
                </tr>
              </thead>
              <tbody>
                {statsByLeague.map(({ league, stats }) => (
                  <tr key={league.id} className="standings-row">
                    <td className="standings-cell standings-cell--team">
                      <Link to={`/leagues/${league.id}`}>{league.name}</Link>
                    </td>
                    <td className="standings-cell standings-cell--num">{stats.matchesPlayed}</td>
                    <td className="standings-cell standings-cell--num">{stats.goals}</td>
                    <td className="standings-cell standings-cell--num">{stats.assists}</td>
                    <td className="standings-cell standings-cell--num">{stats.yellowCards}</td>
                    <td className="standings-cell standings-cell--num">{stats.redCards}</td>
                    <td className="standings-cell standings-cell--num">{stats.mvpCount}</td>
                    <td className="standings-cell standings-cell--num">
                      {stats.goalsRank != null ? `#${stats.goalsRank}` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="muted">Sin estadísticas por liga todavía.</p>
          )}
        </Card>
      )}

      {tab === 'matches' && (
        <Card>
          {recent && recent.length > 0 ? (
            <ul className="staff-list" role="list">
              {recent.map((r) => {
                const resultTone = r.result === 'WIN' ? 'success' : r.result === 'LOSS' ? 'coral' : 'warning';
                const resultLabel = r.result === 'WIN' ? 'Victoria' : r.result === 'LOSS' ? 'Derrota' : 'Empate';
                return (
                  <li key={r.id} className="staff-list__row">
                    <div className="staff-list__body">
                      <span className="staff-list__name">
                        <Link to={`/matches/${r.id}`}>
                          {r.homeTeam} {r.homeScore} - {r.awayScore} {r.awayTeam}
                        </Link>
                      </span>
                      <span className="staff-list__role">
                        {r.competition} · {r.goals} gol{r.goals === 1 ? '' : 'es'} · {r.assists} asist
                      </span>
                    </div>
                    <Chip tone={resultTone}>{resultLabel}</Chip>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="muted">Sin partidos recientes.</p>
          )}
        </Card>
      )}

      {tab === 'awards' && (
        <Card>
          {awards && awards.length > 0 ? (
            <ul className="staff-list" role="list">
              {awards.map((a) => (
                <li key={a.id} className="staff-list__row">
                  <div className="staff-list__avatar" aria-hidden="true">🏆</div>
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
            <p className="muted">Sin premios registrados.</p>
          )}
        </Card>
      )}
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
