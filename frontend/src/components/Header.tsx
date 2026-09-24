import { Link, useNavigate } from 'react-router-dom';
import { apiClient } from '../api/axios';
import { useAuthStore } from '../store/auth.store';
import { BallIcon } from './icons';
import { roleLabel } from '../utils/roleChip';
import { Button } from './ui/Button';
import { Chip } from './ui/Chip';

export function Header() {
  const user = useAuthStore((s) => s.user);
  const clear = useAuthStore((s) => s.clear);
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await apiClient.post('/auth/logout');
    } catch {
      // ignore — we still clear local state
    } finally {
      clear();
      navigate('/login');
    }
  };

  const initials = user
    ? `${user.firstName[0] ?? ''}${user.paternalSurname[0] ?? ''}`.toUpperCase()
    : '';

  return (
    <header className="app-header">
      <Link to="/dashboard" className="app-header__brand">
        <BallIcon />
        Kaibil Football
      </Link>

      {user && (
        <nav>
          <Link to="/dashboard">Dashboard</Link>
          <Link to="/leagues">Ligas</Link>
          <Link to="/teams">Equipos</Link>
          <Link to="/fields">Canchas</Link>
          {user.role === 'ADMIN' && <Link to="/users">Usuarios</Link>}
          <Link to="/profile">Profile</Link>

          <span className="app-header__user">
            {user.profilePhotoUrl ? (
              <img
                src={user.profilePhotoUrl}
                alt=""
                className="avatar avatar--sm"
              />
            ) : (
              <span
                className="avatar avatar--sm"
                style={{ background: 'var(--color-cyan)' }}
                aria-hidden="true"
              >
                {initials}
              </span>
            )}
            <span style={{ color: 'var(--color-ink)', fontWeight: 600 }}>
              {user.firstName} {user.paternalSurname}
            </span>
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
          </span>

          <Button size="sm" variant="coral" onClick={handleLogout}>
            Salir
          </Button>
        </nav>
      )}
    </header>
  );
}
