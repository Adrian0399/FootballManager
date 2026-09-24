import type { TeamMemberPublic, MembershipRole } from '../types/team';
import { Chip, type ChipTone } from './ui/Chip';

interface StaffBlockProps {
  /** DT and Assistant memberships for the team. */
  memberships: TeamMemberPublic[];
}

const ROLE_LABEL: Record<MembershipRole, string> = {
  DT: 'Director Técnico',
  ASSISTANT: 'Auxiliar Técnico',
  PLAYER: 'Jugador',
};

const ROLE_TONE: Record<MembershipRole, ChipTone> = {
  DT: 'td',
  ASSISTANT: 'asst',
  PLAYER: 'default',
};

/**
 * Compact "DT + Auxiliares" block for the team detail page. Renders
 * a row per staff member with their role and full name.
 */
export function StaffBlock({ memberships }: StaffBlockProps) {
  if (memberships.length === 0) {
    return (
      <p className="muted" style={{ padding: 'var(--space-3)' }}>
        Este equipo aún no tiene cuerpo técnico registrado.
      </p>
    );
  }

  // DT first, then Assistants in declared order.
  const sorted = [...memberships].sort((a, b) => {
    const order: Record<MembershipRole, number> = { DT: 0, ASSISTANT: 1, PLAYER: 2 };
    return order[a.membershipRole] - order[b.membershipRole];
  });

  return (
    <ul className="staff-list" role="list">
      {sorted.map((m) => (
        <li key={m.id} className="staff-list__row">
          <div className="staff-list__avatar" aria-hidden="true">
            {initials(m)}
          </div>
          <div className="staff-list__body">
            <span className="staff-list__name">
              {m.firstName} {m.paternalSurname} {m.maternalSurname}
            </span>
            <span className="staff-list__role">{ROLE_LABEL[m.membershipRole]}</span>
          </div>
          <Chip tone={ROLE_TONE[m.membershipRole]}>{m.membershipRole}</Chip>
        </li>
      ))}
    </ul>
  );
}

function initials(member: TeamMemberPublic): string {
  return `${member.firstName[0] ?? ''}${member.paternalSurname[0] ?? ''}`.toUpperCase();
}
