import { useAuthStore } from '../store/auth.store';
import { DashboardAdmin } from '../components/dashboards/DashboardAdmin';
import { DashboardReferee } from '../components/dashboards/DashboardReferee';
import { DashboardDT } from '../components/dashboards/DashboardDT';
import { DashboardPlayer } from '../components/dashboards/DashboardPlayer';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

/**
 * Role-aware dashboard dispatcher.
 *
 * Renders a different view per `UserRole`:
 *   - ADMIN              → global counters, alerts, recent activity
 *   - REFEREE            → assigned matches, personal stats
 *   - TECHNICAL_DIRECTOR → teams under management
 *   - ASSISTANT          → same as DT, no edit actions
 *   - PLAYER             → personal stats, next match, awards
 */
export function RoleDashboard() {
  const user = useAuthStore((s) => s.user);
  if (!user) return null;
  const fullName = `${user.firstName} ${user.paternalSurname}`;

  switch (user.role) {
    case 'ADMIN':
      return <DashboardAdmin userFullName={fullName} />;
    case 'REFEREE':
      return <DashboardReferee userId={user.id} userFullName={fullName} />;
    case 'TECHNICAL_DIRECTOR':
      return <DashboardDT role="TECHNICAL_DIRECTOR" userId={user.id} userFullName={fullName} />;
    case 'ASSISTANT':
      return <DashboardDT role="ASSISTANT" userId={user.id} userFullName={fullName} />;
    case 'PLAYER':
      return <DashboardPlayer userId={user.id} userFullName={fullName} />;
    default: {
      // Exhaustiveness fallback.
      const _exhaustive: never = user.role;
      void _exhaustive;
      return (
        <Card>
          <p className="muted">Rol desconocido.</p>
          <Button to="/profile">Volver al perfil</Button>
        </Card>
      );
    }
  }
}
