import { useAuthStore } from '../store/auth.store';
import {
  BallIcon,
  TrophyIcon,
  FieldIcon,
} from '../components/icons';
import { roleLabel } from '../utils/roleChip';
import { useIsAdmin } from '../hooks/useIsAdmin';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Chip } from '../components/ui/Chip';
import { RoleDashboard } from './RoleDashboard';

/**
 * Dashboard landing page.
 *
 * The page keeps the old welcome hero for guesty visual flavor, but the
 * actionable content below is delegated to `RoleDashboard` which
 * picks a view based on `user.role`. The cards in the hero adapt
 * slightly to the role (admin sees "create" CTAs, others see "view").
 */
export function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const isAdmin = useIsAdmin();
  if (!user) return null;

  return (
    <>
      {/* Hero — cartel-style welcome */}
      <section className="hero">
        <div style={{ position: 'relative', zIndex: 1 }}>
          <span className="sticker">Bienvenido</span>
          <h1 className="hero__title" style={{ marginTop: 'var(--space-4)' }}>
            ¡A la cancha,
            <br />
            <span style={{ color: 'var(--color-coral)' }}>{user.firstName}!</span>
          </h1>
          <p className="hero__sub">
            {user.role === 'ADMIN'
              ? 'Visión global del sistema. Crea ligas, equipos y asigna árbitros.'
              : user.role === 'REFEREE'
                ? 'Consulta tus partidos asignados y captura resultados en vivo.'
                : user.role === 'TECHNICAL_DIRECTOR' || user.role === 'ASSISTANT'
                  ? 'Gestiona tu equipo: alineación, próximos partidos y stats.'
                  : 'Tu perfil, tu próximo partido, tus stats de la temporada.'}
          </p>
          <div className="row-3 row-wrap">
            <Button to="/profile" size="lg">
              Mi perfil
            </Button>
            <Button to="/leagues" size="lg" variant="cyan" startIcon={<TrophyIcon />}>
              {isAdmin ? 'Mis ligas' : 'Ligas'}
            </Button>
            <Button to="/teams" size="lg" variant="ghost">
              Equipos
            </Button>
            <Button to="/fields" size="lg" variant="dark" startIcon={<FieldIcon />}>
              Canchas
            </Button>
          </div>
        </div>

        <div className="hero__art">
          <div className="hero__blob">
            <div
              style={{
                width: 280,
                height: 280,
                border: 'var(--border-heavy)',
                borderRadius: '50%',
                background: 'var(--color-cyan)',
                display: 'grid',
                placeItems: 'center',
                boxShadow: 'var(--shadow-xl)',
              }}
            >
              <span style={{ fontSize: 180, lineHeight: 1 }}>
                <BallIcon style={{ fontSize: 'inherit', color: 'var(--color-ink)' }} />
              </span>
            </div>
          </div>
        </div>
      </section>

      <div className="container section-stack">
        <Card>
          <div
            className="row-3 row-between row-wrap"
            style={{ alignItems: 'flex-start' }}
          >
            <div className="stack-2">
              <h2>Tu cuenta</h2>
              <p className="muted">
                Sesión iniciada como <strong>{user.firstName} {user.paternalSurname}</strong>{' '}
                · <code className="mono">{user.email}</code>
              </p>
            </div>
            <Chip
              tone={
                user.role === 'ADMIN' ? 'admin'
                  : user.role === 'REFEREE' ? 'ref'
                  : user.role === 'TECHNICAL_DIRECTOR' ? 'td'
                  : user.role === 'ASSISTANT' ? 'asst'
                  : 'player'
              }
            >
              {roleLabel(user.role)}
            </Chip>
          </div>
        </Card>

        {/* Role-specific dashboard */}
        <RoleDashboard />
      </div>
    </>
  );
}
