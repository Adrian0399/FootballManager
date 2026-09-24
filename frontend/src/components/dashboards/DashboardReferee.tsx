import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Chip } from '../ui/Chip';
import { WhistleIcon } from '../icons';
import { useRefereeStats, useRefereeMatches } from '../../hooks/playerStats';

interface DashboardRefereeProps {
  userId: string;
  userFullName: string;
}

export function DashboardReferee({ userId, userFullName }: DashboardRefereeProps) {
  const stats = useRefereeStats(userId);
  const matches = useRefereeMatches(userId, 6);

  // The feed is date-ordered; upcoming ones come after now.
  const { upcoming, past } = useMemo(() => {
    const now = new Date().toISOString();
    const rows = matches.data ?? [];
    return {
      upcoming: rows.filter((m) => m.date >= now).slice(0, 3),
      past: rows.filter((m) => m.date < now).slice(0, 3),
    };
  }, [matches.data]);

  const counters = stats.data ?? {
    matchesOfficiated: 0,
    yellowCardsGiven: 0,
    redCardsGiven: 0,
    mvpDesignated: 0,
    leagues: 0,
  };

  return (
    <div className="stack-5">
      <header className="dashboard-greeting">
        <Chip tone="ref">Árbitro</Chip>
        <h2 style={{ fontSize: 'var(--text-2xl)' }}>Hola, {userFullName.split(' ')[0]}</h2>
        <p className="muted">Tus partidos asignados y tus estadísticas de arbitraje.</p>
      </header>

      <div className="dashboard-counters">
        <Counter label="Partidos arbitrados" value={counters.matchesOfficiated} />
        <Counter label="Tarjetas amarillas" value={counters.yellowCardsGiven} tone="warning" />
        <Counter label="Tarjetas rojas" value={counters.redCardsGiven} tone="coral" />
        <Counter
          label="MVP designados"
          value={counters.mvpDesignated}
          tone="magenta"
        />
      </div>

      <Card>
        <h3 style={{ fontSize: 'var(--text-lg)' }}>
          <WhistleIcon style={{ verticalAlign: '-4px', marginRight: 'var(--space-2)' }} />
          Tus próximos partidos
        </h3>
        {matches.isLoading ? (
          <p className="muted">Cargando partidos…</p>
        ) : upcoming.length > 0 || past.length > 0 ? (
          <ul className="staff-list">
            {[...upcoming, ...past].slice(0, 3).map((m) => (
              <li key={m.id} className="staff-list__row">
                <div className="staff-list__body">
                  <span className="staff-list__name">
                    <Link to={`/matches/${m.id}`}>
                      {m.homeTeam} vs {m.awayTeam}
                    </Link>
                  </span>
                  <span className="staff-list__role">
                    {m.date.slice(0, 16).replace('T', ' ')} · {m.competition}
                  </span>
                </div>
                <Chip tone={m.status === 'COMPLETED' ? 'default' : 'lime'}>
                  {m.status === 'COMPLETED' ? 'Finalizado' : 'Pendiente'}
                </Chip>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">
            No tienes partidos asignados todavía. En cuanto un administrador te
            asigne a un partido, aparecerá aquí.
          </p>
        )}
      </Card>

      <Card>
        <h3 style={{ fontSize: 'var(--text-lg)' }}>Acciones rápidas</h3>
        <div className="row-3 row-wrap" style={{ marginTop: 'var(--space-3)' }}>
          <Button to="/leagues" variant="cyan">
            Ver ligas
          </Button>
          <Button to="/teams" variant="ghost">
            Ver equipos
          </Button>
        </div>
      </Card>
    </div>
  );
}

function Counter({ label, value, tone = 'default' }: { label: string; value: number; tone?: 'default' | 'warning' | 'coral' | 'magenta' }) {
  return (
    <div className={`dashboard-counter dashboard-counter--${tone}`}>
      <span className="dashboard-counter__value">{value}</span>
      <span className="dashboard-counter__label">{label}</span>
    </div>
  );
}
