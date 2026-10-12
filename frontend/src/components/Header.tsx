import { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { apiClient } from '../api/axios';
import { useAuthStore } from '../store/auth.store';
import { BallIcon, MenuIcon, CloseIcon } from './icons';
import { ThemeToggle } from './ThemeToggle';
import { roleLabel } from '../utils/roleChip';
import { Button } from './ui/Button';
import { Chip } from './ui/Chip';

export function Header() {
  const user = useAuthStore((s) => s.user);
  const clear = useAuthStore((s) => s.clear);
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  // Close the mobile menu whenever the route changes (after tapping a link).
  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

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
        <>
          <button
            type="button"
            className="app-header__burger"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
            aria-expanded={menuOpen}
          >
            {menuOpen ? <CloseIcon /> : <MenuIcon />}
          </button>

          <nav className={menuOpen ? 'is-open' : ''}>
            <Link to="/dashboard">Dashboard</Link>
            <Link to="/leagues">Ligas</Link>
            <Link to="/teams">Equipos</Link>
            <Link to="/fields">Canchas</Link>
            <Link to="/calendar">Calendario</Link>
            {user.role === 'ADMIN' && <Link to="/users">Usuarios</Link>}
            {user.role === 'ADMIN' && <Link to="/audit">Monitoreo</Link>}
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

            <ThemeToggle />

            <Button size="sm" variant="coral" onClick={handleLogout}>
              Salir
            </Button>
          </nav>
        </>
      )}
    </header>
  );
}