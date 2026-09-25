import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLeague } from '../hooks/teams';
import { useLeagueLeaderboards } from '../hooks/playerStats';
import { Leaderboard } from '../components/Leaderboard';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Banner } from '../components/ui/Banner';
import { Chip } from '../components/ui/Chip';
import { PageHeader } from '../components/ui/PageHeader';
import { EmptyState } from '../components/ui/EmptyState';
import {
  FORMAT_LABEL,
  TIME_SLOT_LABEL,
  WEEK_DAY_SHORT,
} from '../types/league';
import type { LeagueFormat, TimeSlot, WeekDay } from '../types/league';

type StatTab = 'GOALS' | 'ASSISTS' | 'MVPS' | 'FAIR_PLAY';

const TAB_LABEL: Record<StatTab, string> = {
  GOALS: 'Goleadores',
  ASSISTS: 'Asistidores',
  MVPS: 'MVPs',
  FAIR_PLAY: 'Fair play',
};

/**
 * /leagues/:id/stats — league leaderboards (Paso 8).
 *
 * Four tabs, one per stat category. All values are computed live from
 * the match events (in v1.1 the body is a server call to
 * `GET /leagues/:id/stats`).
 */
export function LeagueStatsPage() {
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: league } = useLeague(id);
  const { data, isLoading, error } = useLeagueLeaderboards(id, 20);
  const [tab, setTab] = useState<StatTab>('GOALS');

  if (isLoading && !league) {
    return (
      <div className="container section-stack">
        <p className="muted">Cargando estadísticas…</p>
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
        title={league ? `Stats — ${league.name}` : 'Estadísticas'}
        description={
          league
            ? 'Líderes por categoría. Datos calculados en vivo desde los eventos de los partidos.'
            : undefined
        }
        actions={
          <div className="row-3 row-wrap">
            <Button variant="ghost" onClick={() => navigate(`/leagues/${id}`)}>
              ← Liga
            </Button>
            <Button variant="cyan" onClick={() => navigate(`/leagues/${id}/standings`)}>
              Tabla
            </Button>
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
              {league.timeSlot ? ` · ${TIME_SLOT_LABEL[league.timeSlot as TimeSlot]}` : ''}
            </Chip>
          )}
          {data && (
            <Chip tone="default">
              {data.totalPlayers} jugador{data.totalPlayers === 1 ? '' : 'es'} con stats
            </Chip>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="tabs" role="tablist">
        {(Object.keys(TAB_LABEL) as StatTab[]).map((t) => (
          <TabButton key={t} active={tab === t} onClick={() => setTab(t)}>
            {TAB_LABEL[t]}
          </TabButton>
        ))}
      </div>

      {data && data.totalPlayers === 0 ? (
        <EmptyState
          title="Sin datos estadísticos"
          description="Esta liga aún no tiene partidos finalizados con eventos. Captura resultados desde el detalle del partido para empezar a ver estadísticas."
        />
      ) : (
        <Card>
          {tab === 'GOALS' && (
            <Leaderboard
              title="Goleadores"
              category="GOALS"
              entries={data?.goals ?? []}
              emptyMessage="Ningún gol registrado todavía."
            />
          )}
          {tab === 'ASSISTS' && (
            <Leaderboard
              title="Asistidores"
              category="ASSISTS"
              entries={data?.assists ?? []}
              emptyMessage="Ninguna asistencia registrada todavía."
            />
          )}
          {tab === 'MVPS' && (
            <Leaderboard
              title="MVP de la jornada"
              category="MVPS"
              entries={data?.mvps ?? []}
              emptyMessage="Ningún MVP designado todavía."
            />
          )}
          {tab === 'FAIR_PLAY' && (
            <Leaderboard
              title="Fair play (menos tarjetas = mejor)"
              category="FAIR_PLAY"
              entries={data?.fairPlay ?? []}
              emptyMessage="Sin tarjetas registradas todavía."
            />
          )}
        </Card>
      )}

      <p className="muted" style={{ fontSize: 'var(--text-sm)' }}>
        Click en un jugador para ver su perfil completo.{' '}
        <span onClick={() => navigate(`/leagues/${id}`)} style={{ cursor: 'pointer' }}>
          ← Volver a la liga
        </span>
      </p>
    </div>
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
