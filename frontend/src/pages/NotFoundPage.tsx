import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';

/**
 * 404 — ruta no encontrada. Coherente con el lenguaje visual del
 * sistema: neobrutalism, sin adornos innecesarios.
 */
export function NotFoundPage() {
  return (
    <div className="container section-stack">
      <Card>
        <div className="not-found">
          <div className="not-found__code">404</div>
          <h1 style={{ fontSize: 'var(--text-3xl)' }}>No encontramos esa página</h1>
          <p className="muted" style={{ maxWidth: 480, margin: '0 auto' }}>
            Es posible que la ruta haya cambiado o que el recurso ya no esté
            disponible. Te dejamos algunos enlaces útiles para volver al juego.
          </p>
          <div className="row-3 row-wrap" style={{ justifyContent: 'center', marginTop: 'var(--space-4)' }}>
            <Button to="/dashboard">Dashboard</Button>
            <Button to="/leagues" variant="cyan">Ligas</Button>
            <Button to="/teams" variant="ghost">Equipos</Button>
            <Button to="/fields" variant="ghost">Canchas</Button>
            <Link to="/profile" className="not-found__profile-link">
              Mi perfil
            </Link>
          </div>
        </div>
      </Card>
    </div>
  );
}
