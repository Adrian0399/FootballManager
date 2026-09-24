import type { TeamMemberPublic, Position } from '../types/team';
import { POSITION_LABEL, POSITION_SHORT } from '../types/team';
import { Chip } from './ui/Chip';

interface RosterListProps {
  /** Only PLAYER memberships are rendered. */
  memberships: TeamMemberPublic[];
}

/**
 * Vertical list of players for a team. Renders one row per player with
 * jersey number, position abbreviation, name, and a captain badge when
 * applicable. Empty state is handled by the parent.
 */
export function RosterList({ memberships }: RosterListProps) {
  if (memberships.length === 0) {
    return (
      <p className="muted" style={{ padding: 'var(--space-3)' }}>
        Este equipo aún no tiene jugadores.
      </p>
    );
  }

  // Sort: by position order, then jersey number.
  const POSITION_ORDER: Position[] = ['GK', 'DEF', 'FIXO', 'MID', 'ALA', 'PIVOT', 'FWD'];
  const sorted = [...memberships].sort((a, b) => {
    const ai = a.position ? POSITION_ORDER.indexOf(a.position) : 99;
    const bi = b.position ? POSITION_ORDER.indexOf(b.position) : 99;
    if (ai !== bi) return ai - bi;
    return (a.jerseyNumber ?? 99) - (b.jerseyNumber ?? 99);
  });

  return (
    <ul className="roster-list" role="list">
      {sorted.map((m) => {
        const fullName = `${m.firstName} ${m.paternalSurname}`;
        return (
          <li key={m.id} className="roster-list__row">
            <span className="roster-list__jersey" aria-label={`Dorsal ${m.jerseyNumber ?? '—'}`}>
              {m.jerseyNumber ?? '—'}
            </span>
            {m.position && (
              <span
                className={`roster-list__pos roster-list__pos--${m.position.toLowerCase()}`}
                title={POSITION_LABEL[m.position]}
              >
                {POSITION_SHORT[m.position]}
              </span>
            )}
            <span className="roster-list__name">{fullName}</span>
            {m.nickname && (
              <span className="roster-list__nickname">"{m.nickname}"</span>
            )}
            {m.isCaptain && <Chip tone="magenta">Capitán</Chip>}
          </li>
        );
      })}
    </ul>
  );
}
