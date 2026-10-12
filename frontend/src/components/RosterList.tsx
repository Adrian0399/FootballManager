import { Link } from 'react-router-dom';
import type { TeamMemberPublic, Position } from '../types/team';
import { POSITION_LABEL } from '../types/team';

interface RosterListProps {
  /** Only PLAYER memberships are rendered. */
  memberships: TeamMemberPublic[];
}

const POSITION_ORDER: Position[] = ['GK', 'DEF', 'FIXO', 'MID', 'ALA', 'PIVOT', 'FWD'];

function initials(m: TeamMemberPublic): string {
  return `${m.firstName[0] ?? ''}${m.paternalSurname[0] ?? ''}`.toUpperCase();
}

/**
 * Grid of player cards for a team's roster, in the spirit of the classic
 * squad wall (large number + name + position) but with the app's
 * neobrutalist treatment: thick border, hard shadow, display type.
 *
 * Each card links to the player's public profile.
 */
export function RosterList({ memberships }: RosterListProps) {
  if (memberships.length === 0) {
    return (
      <p className="muted" style={{ padding: 'var(--space-3)' }}>
        Este equipo aún no tiene jugadores.
      </p>
    );
  }

  const sorted = [...memberships].sort((a, b) => {
    const ai = a.position ? POSITION_ORDER.indexOf(a.position) : 99;
    const bi = b.position ? POSITION_ORDER.indexOf(b.position) : 99;
    if (ai !== bi) return ai - bi;
    return (a.jerseyNumber ?? 99) - (b.jerseyNumber ?? 99);
  });

  return (
    <ul className="roster-grid" role="list">
      {sorted.map((m) => {
        const posClass = m.position ? m.position.toLowerCase() : '';
        return (
          <li key={m.id} className="roster-card">
            <Link
              to={`/players/${m.userId}`}
              className="roster-card__link"
              title={`Ver perfil de ${m.fullName}`}
            >
              <div className="roster-card__head">
                <span
                  className={`roster-card__avatar ${posClass ? `roster-card__avatar--${posClass}` : ''}`}
                  aria-hidden="true"
                >
                  {initials(m)}
                </span>
                <span className="roster-card__number" aria-label={`Dorsal ${m.jerseyNumber ?? 'sin dorsal'}`}>
                  {m.jerseyNumber ?? '—'}
                </span>
              </div>

              <span className="roster-card__name">{m.fullName}</span>
              {m.nickname && <span className="roster-card__nickname">"{m.nickname}"</span>}

              <div className="roster-card__meta">
                {m.position && (
                  <span className={`roster-card__pos ${posClass ? `roster-card__pos--${posClass}` : ''}`}>
                    {POSITION_LABEL[m.position]}
                  </span>
                )}
                {m.isCaptain && <span className="roster-card__captain">Capitán</span>}
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}