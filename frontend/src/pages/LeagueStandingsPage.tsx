import { useParams, useNavigate } from 'react-router-dom';
import { useLeague } from '../hooks/teams';
import { useStandings } from '../hooks/standings';
import { StandingsTable } from '../components/StandingsTable';
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

/**
 * /leagues/:id/standings — league standings table (Paso 7).
 *
 * Renders the live standings table with all the columns from the
 * roadmap: #, Equipo, PJ, G, E, P, GF, GC, DIF, PTS, Fair play.
 *
 * Toolbar:
 *   - **Hasta la jornada N**: filter dropdown to show partial standings
 *     (as of the end of matchday N).
 *   - **Imprimir / PDF**: triggers the browser print dialog; in v1.1
 *     this will call a /standings/print endpoint for a server-rendered
 *     PDF.
 *
 * Rules:
 *   - 3 PTS per win, 1 per draw, 0 per loss.
 *   - Tiebreakers: GD, GF, fair play (asc), then teamId (stable).
 *   - Top-3 rows get a subtle visual highlight (rank badge + cream tint).
 */
export function LeagueStandingsPage() {
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: league } = useLeague(id);

  const {
    overall,
    groups,
    throughMatchday,
    setThroughMatchday,
    totalMatchdays,
    isLoading,
    error,
  } = useStandings(id);

  if (isLoading && !league) {
    return (
      <div className="container section-stack">
        <p className="muted">Cargando tabla…</p>
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

  const hasGroups = Object.keys(groups).length > 0;

  return (
    <div className="container section-stack">
      <PageHeader
        title={league ? `Tabla — ${league.name}` : 'Tabla de posiciones'}
        description={
          league
            ? '3 PTS por victoria · 1 por empate · desempate por GD, GF y fair play.'
            : undefined
        }
        actions={
          <div className="row-3 row-wrap">
            <Button variant="ghost" onClick={() => navigate(`/leagues/${id}`)}>
              ← Liga
            </Button>
            <Button variant="cyan" onClick={() => window.print()}>
              Imprimir / PDF
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
          <Chip tone="default">
            {throughMatchday != null
              ? `Hasta la jornada ${throughMatchday}`
              : `Todas las jornadas (${totalMatchdays})`}
          </Chip>
        </div>
      )}

      {/* Filter toolbar */}
      <Card>
        <div className="row-3 row-between row-wrap" style={{ alignItems: 'center' }}>
          <div className="row-3 row-wrap">
            <span className="input-label" style={{ margin: 0 }}>
              Hasta la jornada:
            </span>
            <select
              className="input"
              style={{ width: 'auto' }}
              value={throughMatchday ?? ''}
              onChange={(e) => {
                const v = e.target.value;
                setThroughMatchday(v === '' ? null : Number(v));
              }}
              aria-label="Filtrar standings hasta la jornada"
            >
              <option value="">Todas ({totalMatchdays})</option>
              {Array.from({ length: totalMatchdays }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>
                  Jornada {n}
                </option>
              ))}
            </select>
          </div>
          <div className="muted" style={{ fontSize: 'var(--text-sm)' }}>
            Top-3 resaltado · click en una columna para reordenar
          </div>
        </div>
      </Card>

      {/* Tables: one per group when present, else just overall */}
      {hasGroups ? (
        <div className="stack-5">
          {Object.entries(groups).map(([label, rows]) => (
            <Card key={label}>
              <StandingsTable rows={rows} leagueId={id} groupLabel={label} />
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <StandingsTable rows={overall} leagueId={id} />
        </Card>
      )}

      <p className="muted" style={{ fontSize: 'var(--text-sm)' }}>
        3 PTS victoria · 1 PTS empate · 0 PTS derrota · desempate: DIF →
        GF → fair play (ascendente) → teamId. Click en un equipo para ver
        su detalle.{' '}
        <span onClick={() => navigate(`/leagues/${id}`)} style={{ cursor: 'pointer' }}>
          ← Volver a la liga
        </span>
      </p>
    </div>
  );
}
