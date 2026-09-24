import { useEffect, useMemo, useState } from 'react';
import { Button } from './ui/Button';
import { Select } from './ui/Select';
import { TextField } from './ui/TextField';
import { Banner } from './ui/Banner';
import { teamsApi } from '../api/teams';
import { usersApi, type UserCreateInput } from '../api/users';
import { POSITION_LABEL, POSITION_SHORT } from '../types/team';
import type { Position, MembershipRole } from '../types/team';
import type { Team } from '../types/team';
import type { User, UserRole, ErrorEnvelope } from '../types/user';
import { Chip } from './ui/Chip';

type Mode = 'invite' | 'create';

interface AddTeamMemberFormProps {
  team: Team;
  /** User ids already on the team — excluded from the candidate list. */
  existingUserIds?: string[];
  /** Allowed roles for this team membership (DT typically: PLAYER, ASSISTANT). */
  allowedRoles?: MembershipRole[];
  /** Called after the membership was persisted server-side. */
  onAdded: (input: { userId: string; role: MembershipRole; jerseyNumber?: number; position?: Position }) => void;
  onCancel: () => void;
}

/**
 * Add a member to a team. Two modes:
 *
 *  - **invite** (default): search the user catalog (GET /users, admin
 *    only), choose the membership role, set jersey + position if PLAYER.
 *    Persists via POST /teams/:id/members.
 *
 *  - **create**: inline form for a brand-new user. The backend admin
 *    user-creation endpoint lands in Fase D; until then this mode shows
 *    a clear informational banner instead of faking persistence.
 */
export function AddTeamMemberForm({
  team,
  existingUserIds,
  allowedRoles = ['PLAYER', 'ASSISTANT'],
  onAdded,
  onCancel,
}: AddTeamMemberFormProps) {
  const [mode, setMode] = useState<Mode>('invite');

  return (
    <div className="form">
      <div className="row-3 row-wrap">
        <Button
          size="sm"
          variant={mode === 'invite' ? 'primary' : 'ghost'}
          onClick={() => setMode('invite')}
        >
          Invitar existente
        </Button>
        <Button
          size="sm"
          variant={mode === 'create' ? 'primary' : 'ghost'}
          onClick={() => setMode('create')}
        >
          Crear nuevo
        </Button>
        <Chip tone="default">Equipo: {team.name}</Chip>
      </div>
      {mode === 'invite' ? (
        <InviteForm
          team={team}
          existingUserIds={existingUserIds}
          allowedRoles={allowedRoles}
          onAdded={onAdded}
          onCancel={onCancel}
        />
      ) : (
        <CreateForm team={team} allowedRoles={allowedRoles} onAdded={onAdded} onCancel={onCancel} />
      )}
    </div>
  );
}

// =============================================================================
// Invite existing user
// =============================================================================

function InviteForm({
  team,
  existingUserIds,
  allowedRoles = ['PLAYER', 'ASSISTANT'],
  onAdded,
  onCancel,
}: AddTeamMemberFormProps) {
  const [search, setSearch] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string>('');
  const [role, setRole] = useState<MembershipRole>(allowedRoles[0] ?? 'PLAYER');
  const [jerseyNumber, setJerseyNumber] = useState<string>('');
  const [position, setPosition] = useState<Position | ''>('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Debounced search against GET /users (admin only).
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const handle = setTimeout(async () => {
      try {
        const result = await usersApi.search({ q: search || undefined, size: 50 });
        if (!cancelled) setUsers(result.items);
      } catch (err) {
        const apiError = (err as { response?: { data?: ErrorEnvelope } }).response?.data;
        if (!cancelled) {
          setError(apiError?.error?.message ?? 'No se pudieron cargar los usuarios.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [search]);

  const candidates = useMemo(() => {
    const memberIds = new Set(existingUserIds ?? []);
    return users.filter((u) => !memberIds.has(u.id));
  }, [users, existingUserIds]);

  async function submit() {
    setError(null);
    if (!userId) {
      setError('Selecciona un usuario.');
      return;
    }
    if (role === 'PLAYER' && (jerseyNumber === '' || position === '')) {
      setError('Para un jugador, dorsal y posición son obligatorios.');
      return;
    }
    setSubmitting(true);
    try {
      await teamsApi.addMember(team.id, {
        userId,
        membershipRole: role,
        jerseyNumber: jerseyNumber ? Number(jerseyNumber) : undefined,
        position: position || undefined,
      });
      onAdded({
        userId,
        role,
        jerseyNumber: jerseyNumber ? Number(jerseyNumber) : undefined,
        position: position || undefined,
      });
    } catch (err) {
      const apiError = (err as { response?: { data?: ErrorEnvelope } }).response?.data;
      setError(apiError?.error?.message ?? 'No se pudo agregar al equipo.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="form">
      <TextField
        id="addmember-search"
        label="Buscar usuario"
        placeholder="Nombre, apellido o email…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <Select
        id="addmember-user"
        label="Usuario *"
        value={userId}
        onChange={(e) => setUserId(e.target.value)}
      >
        <option value="">— Selecciona —</option>
        {candidates.map((u) => (
          <option key={u.id} value={u.id}>
            {u.firstName} {u.paternalSurname} {u.maternalSurname} · {u.email} · {u.role}
          </option>
        ))}
      </Select>
      {loading && (
        <p className="muted" style={{ fontSize: 'var(--text-sm)' }}>
          Buscando…
        </p>
      )}
      {!loading && candidates.length === 0 && (
        <p className="muted" style={{ fontSize: 'var(--text-sm)' }}>
          No hay usuarios que coincidan con la búsqueda.
        </p>
      )}
      <Select
        id="addmember-role"
        label="Rol en el equipo *"
        value={role}
        onChange={(e) => setRole(e.target.value as MembershipRole)}
      >
        {allowedRoles.map((r) => (
          <option key={r} value={r}>
            {r === 'PLAYER' ? 'Jugador' : r === 'ASSISTANT' ? 'Auxiliar Técnico' : r === 'DT' ? 'Director Técnico' : r}
          </option>
        ))}
      </Select>
      {role === 'PLAYER' && (
        <div className="form-grid-2">
          <TextField
            id="addmember-jersey"
            label="Dorsal *"
            type="number"
            inputMode="numeric"
            min={1}
            max={99}
            placeholder="10"
            value={jerseyNumber}
            onChange={(e) => setJerseyNumber(e.target.value)}
          />
          <Select
            id="addmember-position"
            label="Posición *"
            value={position}
            onChange={(e) => setPosition(e.target.value as Position)}
          >
            <option value="">— Selecciona —</option>
            {(Object.keys(POSITION_LABEL) as Position[]).map((p) => (
              <option key={p} value={p}>
                {POSITION_SHORT[p]} · {POSITION_LABEL[p]}
              </option>
            ))}
          </Select>
        </div>
      )}
      {error && <Banner tone="error">{error}</Banner>}
      <div className="row-3 row-end row-wrap">
        <Button variant="ghost" size="sm" onClick={onCancel}>Cancelar</Button>
        <Button size="sm" onClick={submit} disabled={!userId || submitting}>
          {submitting ? 'Agregando…' : 'Agregar al equipo'}
        </Button>
      </div>
    </div>
  );
}

// =============================================================================
// Create new user inline (Fase D — real admin user-creation endpoint)
// =============================================================================

const USER_ROLE_FROM_MEMBERSHIP: Record<MembershipRole, UserRole> = {
  PLAYER: 'PLAYER',
  ASSISTANT: 'ASSISTANT',
  DT: 'TECHNICAL_DIRECTOR',
};

function CreateForm({ team, allowedRoles = ['PLAYER', 'ASSISTANT'], onAdded, onCancel }: AddTeamMemberFormProps) {
  const [firstName, setFirstName] = useState('');
  const [paternal, setPaternal] = useState('');
  const [maternal, setMaternal] = useState('');
  const [birthDate, setBirthDate] = useState('2000-01-01');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [curp, setCurp] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<MembershipRole>(allowedRoles[0] ?? 'PLAYER');
  const [jerseyNumber, setJerseyNumber] = useState<string>('');
  const [position, setPosition] = useState<Position | ''>('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    setError(null);
    if (!firstName || !paternal || !maternal) {
      setError('Nombre y apellidos son obligatorios.');
      return;
    }
    if (!email.includes('@')) {
      setError('Email inválido.');
      return;
    }
    if (curp.trim().length !== 18) {
      setError('La CURP debe tener 18 caracteres.');
      return;
    }
    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }
    if (!/^\+?[0-9]{10,15}$/.test(phone.trim())) {
      setError('Teléfono inválido (10 a 15 dígitos).');
      return;
    }
    if (role === 'PLAYER' && (jerseyNumber === '' || position === '')) {
      setError('Para un jugador, dorsal y posición son obligatorios.');
      return;
    }
    setSubmitting(true);
    try {
      const payload: UserCreateInput = {
        firstName: firstName.trim(),
        paternalSurname: paternal.trim(),
        maternalSurname: maternal.trim(),
        birthDate,
        role: USER_ROLE_FROM_MEMBERSHIP[role],
        nickname: null,
        phoneNumber: phone.trim(),
        email: email.trim(),
        curp: curp.trim().toUpperCase(),
        password,
      };
      const created = await usersApi.create(payload);
      await teamsApi.addMember(team.id, {
        userId: created.id,
        membershipRole: role,
        jerseyNumber: jerseyNumber ? Number(jerseyNumber) : undefined,
        position: position || undefined,
      });
      onAdded({
        userId: created.id,
        role,
        jerseyNumber: jerseyNumber ? Number(jerseyNumber) : undefined,
        position: position || undefined,
      });
    } catch (err) {
      const apiError = (err as { response?: { data?: ErrorEnvelope } }).response?.data;
      setError(apiError?.error?.message ?? 'No se pudo crear el usuario.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="form">
      <div className="form-grid-2">
        <TextField id="cm-firstName" label="Nombre *" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
        <TextField id="cm-paternal" label="Apellido paterno *" value={paternal} onChange={(e) => setPaternal(e.target.value)} />
      </div>
      <TextField id="cm-maternal" label="Apellido materno *" value={maternal} onChange={(e) => setMaternal(e.target.value)} />
      <div className="form-grid-2">
        <TextField id="cm-birthDate" label="Fecha de nacimiento *" type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} />
        <TextField id="cm-curp" label="CURP *" value={curp} onChange={(e) => setCurp(e.target.value.toUpperCase())} maxLength={18} />
      </div>
      <div className="form-grid-2">
        <TextField id="cm-email" label="Email *" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <TextField id="cm-phone" label="Teléfono *" value={phone} onChange={(e) => setPhone(e.target.value)} />
      </div>
      <TextField id="cm-password" label="Contraseña *" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
      <Select
        id="cm-role"
        label="Rol en el equipo *"
        value={role}
        onChange={(e) => setRole(e.target.value as MembershipRole)}
      >
        {allowedRoles.map((r) => (
          <option key={r} value={r}>
            {r === 'PLAYER' ? 'Jugador' : r === 'ASSISTANT' ? 'Auxiliar Técnico' : r === 'DT' ? 'Director Técnico' : r}
          </option>
        ))}
      </Select>
      {role === 'PLAYER' && (
        <div className="form-grid-2">
          <TextField
            id="cm-jersey"
            label="Dorsal *"
            type="number"
            inputMode="numeric"
            min={1}
            max={99}
            value={jerseyNumber}
            onChange={(e) => setJerseyNumber(e.target.value)}
          />
          <Select
            id="cm-position"
            label="Posición *"
            value={position}
            onChange={(e) => setPosition(e.target.value as Position)}
          >
            <option value="">— Selecciona —</option>
            {(Object.keys(POSITION_LABEL) as Position[]).map((p) => (
              <option key={p} value={p}>
                {POSITION_SHORT[p]} · {POSITION_LABEL[p]}
              </option>
            ))}
          </Select>
        </div>
      )}
      {error && <Banner tone="error">{error}</Banner>}
      <div className="row-3 row-end row-wrap">
        <Button variant="ghost" size="sm" onClick={onCancel}>Cancelar</Button>
        <Button size="sm" onClick={submit} disabled={submitting}>
          {submitting ? 'Creando…' : 'Crear y agregar'}
        </Button>
      </div>
    </div>
  );
}
