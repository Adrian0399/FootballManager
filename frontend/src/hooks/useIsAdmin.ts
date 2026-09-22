import { useAuthStore } from '../store/auth.store';

/**
 * Returns `true` only when the current user has the `ADMIN` role.
 *
 * Use this to gate mutating UI (Create / Edit / Delete buttons). The
 * backend independently enforces `authorize('ADMIN')` on every mutation
 * endpoint, so this hook is purely a UX nicety — never the security
 * boundary.
 *
 * @example
 *   const isAdmin = useIsAdmin();
 *   {isAdmin && <button onClick={openCreate}>Crear cancha</button>}
 */
export function useIsAdmin(): boolean {
  return useAuthStore((s) => s.user?.role === 'ADMIN');
}
