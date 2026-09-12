import { apiClient } from './axios';
import type { SuccessEnvelope, ErrorEnvelope } from '../types/user';

/* ------------------------------------------------------------------ *
 * Profile API (Fase C). Mirrors the DTOs from
 * `backend/src/modules/profile/profile.service.ts`.
 * ------------------------------------------------------------------ */

export interface ProfileStatsDto {
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
  winRate: number;
  currentStreak: number;
  ranking: number;
}

export interface RecentMatchDto {
  id: string;
  date: string;
  competition: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  result: 'WIN' | 'LOSS' | 'DRAW';
  field: string;
  goals: number;
  assists: number;
}

export interface AwardDto {
  id: string;
  title: string;
  category: AwardCategory;
  level: AwardLevel;
  season: string;
  competition: string;
  awardedAt: string;
  description?: string;
}

export type AwardLevel = 'GOLD' | 'SILVER' | 'BRONZE';
export type AwardCategory = 'SCORER' | 'MVP' | 'FAIR_PLAY' | 'CHAMPION' | 'BEST_DEFENSE';

export interface CareerSeasonDto {
  id: string;
  season: string;
  team: string;
  matches: number;
  goals: number;
  assists: number;
  isCurrent: boolean;
}

export interface UserTeamDto {
  teamId: string;
  teamName: string;
  teamShortName: string;
  teamEmoji: string | null;
  primaryColor: string;
  secondaryColor: string;
  membershipRole: 'PLAYER' | 'DT' | 'ASSISTANT';
  jerseyNumber: number | null;
  position: 'GK' | 'DEF' | 'MID' | 'FWD' | 'FIXO' | 'ALA' | 'PIVOT' | null;
  isCaptain: boolean;
  leagueId: string | null;
  leagueName: string | null;
}

export interface PlayerLeagueStatsDto {
  leagueId: string;
  leagueName: string;
  leagueSeason: string;
  playerId: string;
  playerName: string;
  teamId: string | null;
  teamName: string | null;
  matchesPlayed: number;
  goals: number;
  assists: number;
  yellowCards: number;
  redCards: number;
  mvpCount: number;
  cleanSheets: number;
  goalsRank: number | null;
  fairPlay: number;
}

export interface RefereeStatsDto {
  matchesOfficiated: number;
  yellowCardsGiven: number;
  redCardsGiven: number;
  mvpDesignated: number;
  leagues: { leagueId: string; leagueName: string; matches: number }[];
}

export interface RefereeMatchDto {
  id: string;
  date: string;
  competition: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number | null;
  awayScore: number | null;
  status: string;
  field: string;
}

export interface ProfileBundleDto {
  teams: UserTeamDto[];
  stats: ProfileStatsDto;
  recentMatches: RecentMatchDto[];
  awards: AwardDto[];
  career: CareerSeasonDto[];
}

export const profileApi = {
  async getProfile(id: string): Promise<ProfileBundleDto> {
    const { data } = await apiClient.get<SuccessEnvelope<ProfileBundleDto>>(
      `/users/${id}/profile`,
    );
    return data.data;
  },

  async getTeams(id: string): Promise<UserTeamDto[]> {
    const { data } = await apiClient.get<SuccessEnvelope<UserTeamDto[]>>(
      `/users/${id}/teams`,
    );
    return data.data;
  },

  async getStats(id: string): Promise<ProfileStatsDto> {
    const { data } = await apiClient.get<SuccessEnvelope<ProfileStatsDto>>(
      `/users/${id}/stats`,
    );
    return data.data;
  },

  /** Per-league breakdown for the player profile "Stats" tab. */
  async getStatsByLeague(id: string): Promise<PlayerLeagueStatsDto[]> {
    const { data } = await apiClient.get<SuccessEnvelope<PlayerLeagueStatsDto[]>>(
      `/users/${id}/stats/by-league`,
    );
    return data.data;
  },

  async getRecentMatches(id: string, limit = 4): Promise<RecentMatchDto[]> {
    const { data } = await apiClient.get<SuccessEnvelope<RecentMatchDto[]>>(
      `/users/${id}/matches`,
      { params: { limit } },
    );
    return data.data;
  },

  async getAwards(id: string): Promise<AwardDto[]> {
    const { data } = await apiClient.get<SuccessEnvelope<AwardDto[]>>(
      `/users/${id}/awards`,
    );
    return data.data;
  },

  /** Career timeline. Served by the profile bundle (no standalone route yet). */
  async getCareer(id: string): Promise<CareerSeasonDto[]> {
    const { data } = await apiClient.get<SuccessEnvelope<ProfileBundleDto>>(
      `/users/${id}/profile`,
    );
    return data.data.career;
  },

  async getRefereeStats(id: string): Promise<RefereeStatsDto> {
    const { data } = await apiClient.get<SuccessEnvelope<RefereeStatsDto>>(
      `/referees/${id}/stats`,
    );
    return data.data;
  },

  async getRefereeMatches(id: string, limit = 5): Promise<RefereeMatchDto[]> {
    const { data } = await apiClient.get<SuccessEnvelope<RefereeMatchDto[]>>(
      `/referees/${id}/matches`,
      { params: { limit } },
    );
    return data.data;
  },
};

export type ProfileApiError = ErrorEnvelope;
