// Profile dashboard data shapes.
//
// These are the contracts the visual profile sections consume. They are
// intentionally decoupled from the `User` type — the dashboard asks
// `useProfileStats(id)`, `useRecentMatches(id)`, `useAwards(id)` and
// doesn't care where the data comes from (mock now, API later).
//
// Adding a real backend later is a hook swap, not a UI change.

export type MatchResult = 'WIN' | 'LOSS' | 'DRAW';

export interface ProfileStats {
  matchesPlayed: number;
  matchesWon: number;
  matchesLost: number;
  matchesDrawn: number;
  goals: number;
  assists: number;
  mvpAwards: number;
  yellowCards: number;
  redCards: number;
  cleanSheets: number;
  winRate: number; // 0-100
  currentStreak: number; // consecutive wins (positive number)
  ranking: number; // position in top scorers (1 = first)
}

export interface RecentMatch {
  id: string;
  date: string; // ISO
  competition: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  /** Result from the profile owner's perspective. */
  result: MatchResult;
  field: string;
  goals: number; // goals contributed by the profile owner
  assists: number;
}

export type AwardLevel = 'GOLD' | 'SILVER' | 'BRONZE';
export type AwardCategory =
  | 'SCORER'
  | 'MVP'
  | 'FAIR_PLAY'
  | 'CHAMPION'
  | 'BEST_DEFENSE';

export interface Award {
  id: string;
  title: string;
  category: AwardCategory;
  level: AwardLevel;
  season: string;
  competition: string;
  awardedAt: string; // ISO date
  description?: string;
}

export interface CareerSeason {
  id: string;
  season: string;
  team: string;
  matches: number;
  goals: number;
  assists: number;
  isCurrent: boolean;
}
