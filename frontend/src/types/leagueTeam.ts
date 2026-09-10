// League ↔ Team join table (per v1 roadmap §3).
//
// A League has up to `maxTeams` Teams. Each team has a `seed` (1-based
// position) that controls the home/away pairing in round-robin and the
// side of the bracket in knockout phases. Optional `groupLabel` is set
// for `GROUPS_KNOCKOUT` leagues (e.g. "A", "B", "C", "D").
//
// The model is intentionally separate from `Team.currentLeagueId`:
// `currentLeagueId` is a *display* hint ("this is the league the team
// is currently competing in"), while `LeagueTeam` is the source of
// truth for membership. They are kept in sync at write time by the
// future backend.

export interface LeagueTeam {
  leagueId: string;
  teamId: string;
  /** 1-based seed. Lower = stronger. The first team is the top seed. */
  seed: number;
  /** Group label for GROUPS_KNOCKOUT leagues (e.g. "A", "B"). Null for RR. */
  groupLabel: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Body for POST /api/v1/leagues/:id/teams. */
export type LeagueTeamAssignInput = {
  teamId: string;
  seed?: number;
  groupLabel?: string | null;
};

/** Body for PATCH /api/v1/leagues/:id/teams/:teamId (reorder / regroup). */
export type LeagueTeamUpdateInput = {
  seed?: number;
  groupLabel?: string | null;
};
