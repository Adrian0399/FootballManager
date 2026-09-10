// Team & TeamMembership domain types.
//
// The Team is the unit that plays in a League. Per the v1 roadmap (§3):
//   - A Team belongs to a League (currentLeagueId), but can be re-assigned.
//   - A Team has a roster of Users (via TeamMembership) with per-team roles:
//     PLAYER (with jerseyNumber + position) | DT | ASSISTANT.
//   - A single User can be in N TeamMemberships (different teams, different
//     roles). The classic case: a player on Monday's "Libre" team and
//     Wednesday's "Sub-21" team, both leagues owned by the same admin.
//
// For 1v1 format: a "team" has exactly 1 player in its roster. The
// homeTeamId/awayTeamId on a Match still reference these 1-person teams.
// The standings rank players by their individual duel record.

import type { LeagueFormat } from './league';

/** Position on the field. Includes futsal-specific roles (FIXO/ALA/PIVOT)
 *  for F5/F6, and standard football roles (GK/DEF/MID/FWD) for F7+ and
 *  the goalkeeper role for F1. */
export type Position =
  | 'GK'
  | 'DEF'
  | 'MID'
  | 'FWD'
  | 'FIXO'
  | 'ALA'
  | 'PIVOT';

/** Human-readable Spanish labels for the Position enum. */
export const POSITION_LABEL: Record<Position, string> = {
  GK: 'Portero',
  DEF: 'Defensa',
  MID: 'Mediocampista',
  FWD: 'Delantero',
  FIXO: 'Fixo',
  ALA: 'Ala',
  PIVOT: 'Pívot',
};

/** Short abbrev used in the roster pill UI (3 chars max). */
export const POSITION_SHORT: Record<Position, string> = {
  GK: 'POR',
  DEF: 'DEF',
  MID: 'MED',
  FWD: 'DEL',
  FIXO: 'FIX',
  ALA: 'ALA',
  PIVOT: 'PIV',
};

/** Role of a User on a specific Team. Separate from the global
 *  `User.role` (which is for permissions/navigation). */
export type MembershipRole = 'PLAYER' | 'DT' | 'ASSISTANT';

/** Public Team shape. Mirrors the planned `teams` table in Prisma. */
export interface Team {
  id: string;
  name: string;
  shortName: string;
  logoUrl: string | null;
  /** Sports emoji used as a placeholder logo in v1.0.0 mocks. */
  emoji: string;
  primaryColor: string;
  secondaryColor: string;
  homeFieldId: string | null;
  currentLeagueId: string | null;
  currentLeagueFormat: LeagueFormat | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Join row: User ↔ Team, with the per-team role. */
export interface TeamMembership {
  id: string;
  teamId: string;
  userId: string;
  membershipRole: MembershipRole;
  /** Only meaningful when membershipRole === 'PLAYER'. */
  jerseyNumber: number | null;
  position: Position | null;
  isCaptain: boolean;
  joinedAt: string;
}

/** Body for POST /api/v1/teams. Mirrors `teamCreateSchema` (planned). */
export type TeamCreateInput = {
  name: string;
  shortName: string;
  emoji?: string;
  primaryColor?: string;
  secondaryColor?: string;
  homeFieldId?: string | null;
  currentLeagueId?: string | null;
};

/** Body for PATCH /api/v1/teams/:id. All keys optional. */
export type TeamUpdateInput = Partial<TeamCreateInput> & {
  isActive?: boolean;
};

// ----- Server member shape (v1.1) -------------------------------------------
//
// The backend's `PublicTeamMember` (see
// `backend/src/modules/teams/teams.service.ts`) flattens the user name into
// the membership row and omits `teamId`/`joinedAt`. Kept separate from the
// local `TeamMembership` type so the mock-era components keep their shape.

export interface TeamMemberPublic {
  id: string;
  userId: string;
  firstName: string;
  paternalSurname: string;
  maternalSurname: string;
  fullName: string;
  membershipRole: MembershipRole;
  jerseyNumber: number | null;
  position: Position | null;
  isCaptain: boolean;
  /** Optional: the backend does not always return it. */
  nickname?: string | null;
}

/** Body for POST /api/v1/teams/:id/members. Mirrors `membershipCreateSchema`. */
export interface MembershipCreateInput {
  userId: string;
  membershipRole: MembershipRole;
  jerseyNumber?: number | null;
  position?: Position | null;
  isCaptain?: boolean;
}

/** Body for PATCH /api/v1/teams/:id/members/:userId. */
export interface MembershipUpdateInput {
  membershipRole?: MembershipRole;
  jerseyNumber?: number | null;
  position?: Position | null;
  isCaptain?: boolean;
}
