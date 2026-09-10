// Stats types shared between the stats endpoint and the frontend.
//
// These mirror the backend response from `GET /leagues/:id/stats`.
// Leaderboard entries carry the player/team *names* (not just ids) so
// the UI doesn't need a second lookup.

export interface LeaderboardEntry {
  rank: number;
  playerId: string;
  playerName: string;
  teamId: string;
  teamName: string;
  value: number;
  secondary: number;
  /** Pretty label for the value (filled by the frontend). */
  label?: string;
}

export interface LeagueHighlights {
  topScorer: { playerId: string; playerName: string; teamName: string; goals: number; assists: number } | null;
  topAssister: { playerId: string; playerName: string; teamName: string; assists: number; goals: number } | null;
  bestGoalkeeper: { playerId: string; playerName: string; teamName: string; cleanSheets: number; matchesPlayed: number } | null;
  bestAttackingTeam: { teamId: string; teamName: string; goals: number } | null;
  bestDefensiveTeam: { teamId: string; teamName: string; conceded: number } | null;
}

export interface LeagueStats {
  goals: LeaderboardEntry[];
  assists: LeaderboardEntry[];
  mvps: LeaderboardEntry[];
  fairPlay: LeaderboardEntry[];
  highlights: LeagueHighlights;
}
