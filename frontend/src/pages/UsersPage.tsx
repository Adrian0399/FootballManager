import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useIsAdmin } from '../hooks/useIsAdmin';
import { usersApi } from '../api/users';
import { useAuthStore } from '../store/auth.store';
import { roleLabel } from '../utils/roleChip';
import { UserForm } from '../components/UserForm';
import { Modal } from '../components/Modal';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Banner } from '../components/ui/Banner';
import { Chip } from '../components/ui/Chip';
import { PageHeader } from '../components/ui/PageHeader';
import { EmptyState } from '../components/ui/EmptyState';
import { TextField } from '../components/ui/TextField';
import { Select } from '../components/ui/Select';
import { ConfirmDialog } from '../components/ConfirmDialog';
import type { User, UserRole } from '../types/user';
import { USER_ROLES } from '../types/user';

type ModalState =
  | { kind: 'closed' }
  | { kind: 'create' }
  | { kind: 'edit'; user: User }
  | { kind: 'delete'; user: User };

/**
 * /users — Admin-only user management (Paso 10+).
 *
 *   - **Listado** de los 52 usuarios del sistema con buscador, filtro
 *     por rol y filtro por estado.
 *   - **Crear** usuarios con cualquier rol (admin: 5 roles, DT: 2).
 *   - **Editar** nombre/email/teléfono/rol/estado.
 *   - **Eliminar** (soft-delete) con confirmación.
 *
 * Los DTs NO ven esta página. Su flujo de alta de miembros está en
 * `AddTeamMemberForm` dentro del detalle de cada equipo.
 */
export function UsersPage() {
  const isAdmin = useIsAdmin();
  const currentUser = useAuthStore((s) => s.user);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<UserRole | ''>('');
  const [modal, setModal] = useState<ModalState>({ kind: 'closed' });

  // Server-side search + role filter (GET /users, admin only).
  const load = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const params: Parameters<typeof usersApi.search>[0] = { size: 100 };
      if (search.trim()) params.q = search.trim();
      if (roleFilter) params.role = roleFilter;
      const result = await usersApi.search(params);
      setUsers(result.items);
    } catch {
      setLoadError('No se pudo cargar el listado de usuarios.');
    } finally {
      setIsLoading(false);
    }
  }, [search, roleFilter]);

  useEffect(() => {
    if (!isAdmin) return;
    void load();
  }, [isAdmin, load]);

  // The API already applies the search and role filter.
  const filtered = useMemo(() => users, [users]);

  if (!isAdmin) {
    return (
      <div className="container section-stack">
        <EmptyState
          title="Acceso restringido"
          description="La gestión de usuarios es solo para administradores."
          actions={
            <Button to="/dashboard">Volver al dashboard</Button>
          }
        />
      </div>
    );
  }

  const closeModal = () => setModal({ kind: 'closed' });
  const handleSaved = (saved: User) => {
    setUsers((prev) => {
      const exists = prev.find((u) => u.id === saved.id);
      if (exists) return prev.map((u) => (u.id === saved.id ? saved : u));
      return [saved, ...prev];
    });
    closeModal();
  };
  const handleDelete = async () => {
    if (modal.kind !== 'delete') return;
    try {
      await usersApi.remove(modal.user.id);
      setUsers((prev) => prev.filter((u) => u.id !== modal.user.id));
      closeModal();
    } catch {
      setLoadError('No se pudo eliminar el usuario.');
      closeModal();
    }
  };

  const roleTone = (role: UserRole) => {
    switch (role) {
      case 'ADMIN': return 'admin' as const;
      case 'REFEREE': return 'ref' as const;
      case 'TECHNICAL_DIRECTOR': return 'td' as const;
      case 'ASSISTANT': return 'asst' as const;
      case 'PLAYER': return 'player' as const;
    }
  };

  return (
    <div className="container section-stack">
      <PageHeader
        title="Usuarios"
        description="Crea, edita y administra los usuarios del sistema. Los DTs también pueden dar de alta miembros para sus equipos desde el detalle del equipo."
        actions={
          <Button onClick={() => setModal({ kind: 'create' })}>
            + Crear usuario
          </Button>
        }
      />

      {/* Filters */}
      <Card variant="cream">
        <div className="row-4 row-wrap" style={{ alignItems: 'flex-end' }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <TextField
              id="users-search"
              label="Buscar"
              placeholder="Nombre, apellido o email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div style={{ minWidth: 200 }}>
            <Select
              id="users-role-filter"
              label="Rol"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as UserRole | '')}
            >
              <option value="">Todos</option>
              {USER_ROLES.map((r) => (
                <option key={r} value={r}>{roleLabel(r)}</option>
              ))}
            </Select>
          </div>
          <Button variant="ghost" size="sm" onClick={() => { setSearch(''); setRoleFilter(''); }} disabled={!search && !roleFilter}>
            Limpiar
          </Button>
        </div>
      </Card>

      {/* Counter */}
      <div className="muted" style={{ fontSize: 'var(--text-sm)' }}>
        {filtered.length} usuario{filtered.length === 1 ? '' : 's'}
      </div>

      {loadError && <Banner tone="error">{loadError}</Banner>}

      {/* List */}
      {isLoading ? (
        <Card>
          <p className="muted">Cargando usuarios…</p>
        </Card>
      ) : filtered.length === 0 ? (
        <EmptyState
          title="Sin resultados"
          description="Ningún usuario coincide con los filtros."
        />
      ) : (
        <Card>
          <ul className="staff-list" role="list">
            {filtered.map((u) => {
              const fullName = `${u.firstName} ${u.paternalSurname} ${u.maternalSurname}`.trim();
              const initials = `${u.firstName[0] ?? ''}${u.paternalSurname[0] ?? ''}`.toUpperCase();
              return (
                <li key={u.id} className="staff-list__row" style={{ gridTemplateColumns: '48px 1fr auto auto auto' }}>
                  <div className="staff-list__avatar" aria-hidden="true">
                    {u.profilePhotoUrl ? (
                      <img src={u.profilePhotoUrl} alt="" />
                    ) : (
                      <span style={{ fontSize: '0.875rem' }}>{initials}</span>
                    )}
                  </div>
                  <div className="staff-list__body">
                    <span className="staff-list__name">
                      {u.id === currentUser?.id ? (
                        <strong>{fullName} (tú)</strong>
                      ) : (
                        fullName
                      )}
                      {u.nickname && <span className="muted"> "{u.nickname}"</span>}
                    </span>
                    <span className="staff-list__role">
                      {u.email} · {u.phoneNumber}
                    </span>
                  </div>
                  <Chip tone={roleTone(u.role)}>{roleLabel(u.role)}</Chip>
                  {u.isActive ? (
                    <Chip tone="success">Activo</Chip>
                  ) : (
                    <Chip tone="warning">Inactivo</Chip>
                  )}
                  <div className="row-3" style={{ gap: 4 }}>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setModal({ kind: 'edit', user: u })}
                    >
                      Editar
                    </Button>
                    {u.id !== currentUser?.id && (
                      <Button
                        size="sm"
                        variant="coral"
                        onClick={() => setModal({ kind: 'delete', user: u })}
                      >
                        Eliminar
                      </Button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      <Banner tone="info">
        Los DTs pueden agregar jugadores y auxiliares a sus propios
        equipos desde la pestaña "Plantilla" de cada equipo (no
        necesitan acceso a esta página).
      </Banner>

      <Modal
        open={modal.kind === 'create'}
        onClose={closeModal}
        title="Crear usuario"
        description="Da de alta un nuevo usuario en el sistema. Puedes asignar cualquier rol."
      >
        <UserForm onSaved={handleSaved} onCancel={closeModal} />
      </Modal>

      <Modal
        open={modal.kind === 'edit'}
        onClose={closeModal}
        title="Editar usuario"
        description={modal.kind === 'edit' ? `${modal.user.firstName} ${modal.user.paternalSurname}` : ''}
      >
        {modal.kind === 'edit' && (
          <UserForm user={modal.user} onSaved={handleSaved} onCancel={closeModal} />
        )}
      </Modal>

      <ConfirmDialog
        open={modal.kind === 'delete'}
        title="¿Eliminar usuario?"
        message={
          modal.kind === 'delete'
            ? `Vas a hacer soft-delete de "${modal.user.firstName} ${modal.user.paternalSurname}". El usuario no podrá iniciar sesión pero sus memberships históricas se mantienen.`
            : ''
        }
        confirmLabel="Eliminar"
        onConfirm={handleDelete}
        onClose={closeModal}
      />

      <p className="muted" style={{ fontSize: 'var(--text-sm)' }}>
        <Link to="/dashboard">← Volver al dashboard</Link>
      </p>
    </div>
  );
}
