import { useParams, useNavigate, Link } from 'react-router-dom';
import { useUserById } from '../hooks/playerStats';
import { useRefereeStats, useRefereeMatches } from '../hooks/playerStats';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Banner } from '../components/ui/Banner';
import { Chip } from '../components/ui/Chip';
import { PageHeader } from '../components/ui/PageHeader';
import { EmptyState } from '../components/ui/EmptyState';
import { WhistleIcon } from '../components/icons';

/**
 * /referees/:id — referee profile (Paso 8).
 *
 * Shows the referee's identity + aggregated stats (matches officiated,
 * cards given, MVPs designated). In v1.0.0 mock the matches have
 * `refereeId: null`, so the stats default to zeros. The page is
 * fully wired — wire `refereeId` on the matches and the page will
 * populate automatically.
 */
export function RefereeProfilePage() {
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: user, isLoading, error } = useUserById(id);
  const { data: stats } = useRefereeStats(id);
  const { data: recentMatches } = useRefereeMatches(id, 5);

  if (isLoading && !user) {
    return (
      <div className="container section-stack">
        <p className="muted">Cargando árbitro…</p>
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
          title="Árbitro no encontrado"
          description="El árbitro que buscas no existe."
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

  return (
    <div className="container section-stack">
      <PageHeader
        title={fullName}
        description="Perfil de árbitro"
        actions={
          <div className="row-3 row-wrap">
            <Button variant="ghost" onClick={() => navigate(-1)}>
              ← Volver
            </Button>
            <Chip tone="ref">Árbitro</Chip>
          </div>
        }
      />

      <Card>
        <div className="referee-hero">
          <div className="referee-hero__icon" aria-hidden="true">
            <WhistleIcon style={{ fontSize: '3rem', color: 'var(--color-magenta)' }} />
          </div>
          <div className="referee-hero__body">
            <h2 style={{ fontSize: 'var(--text-2xl)' }}>{fullName}</h2>
            <p className="muted" style={{ margin: '4px 0 0' }}>
              {user.email}
            </p>
            {user.nickname && (
              <Chip tone="ref">"{user.nickname}"</Chip>
            )}
          </div>
          <div className="referee-hero__avatar" aria-hidden="true">
            {initials}
          </div>
        </div>
      </Card>

      <div className="profile-dashboard-grid">
        <Card>
          <h3 style={{ fontSize: 'var(--text-lg)' }}>Estadísticas</h3>
          <ul className="staff-list" role="list">
            <Stat label="Partidos arbitrados" value={stats?.matchesOfficiated ?? 0} />
            <Stat label="Tarjetas amarillas" value={stats?.yellowCardsGiven ?? 0} />
            <Stat label="Tarjetas rojas" value={stats?.redCardsGiven ?? 0} />
            <Stat label="MVP designados" value={stats?.mvpDesignated ?? 0} />
            <Stat label="Ligas distintas" value={stats?.leagues ?? 0} />
          </ul>
        </Card>
        <Card>
          <h3 style={{ fontSize: 'var(--text-lg)' }}>Partidos recientes</h3>
          {recentMatches && recentMatches.length > 0 ? (
            <ul className="staff-list" role="list">
              {recentMatches.map((m) => (
                <li key={m.id} className="staff-list__row">
                  <div className="staff-list__body">
                    <span className="staff-list__name">
                      <Link to={`/matches/${m.id}`}>
                        {m.homeTeam} {m.homeScore ?? '—'} - {m.awayScore ?? '—'} {m.awayTeam}
                      </Link>
                    </span>
                    <span className="staff-list__role">{m.competition} · {m.date.slice(0, 10)}</span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">Sin partidos asignados.</p>
          )}
        </Card>
      </div>
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
