// Profile dashboard data hooks.
//
// All hooks return `{ data, isLoading, error }`. They currently resolve
// from in-memory mock data, but the contract is identical to a real
// API call — swap the `delay(...)` body for `apiClient.get(...)` and
// nothing in the UI needs to change.

import { useAsync, type AsyncState } from './useAsync';
import { profileApi } from '../api/profile';
import type {
  Award,
  CareerSeason,
  ProfileStats,
  RecentMatch,
} from '../types/profile';

// ----- Mock dataset ----------------------------------------------------------

const MOCK_STATS: ProfileStats = {
  matchesPlayed: 24,
  matchesWon: 17,
  matchesLost: 5,
  matchesDrawn: 2,
  goals: 12,
  assists: 8,
  mvpAwards: 4,
  yellowCards: 3,
  redCards: 0,
  cleanSheets: 6,
  winRate: 71,
  currentStreak: 3,
  ranking: 3,
};

const MOCK_MATCHES: RecentMatch[] = [
  {
    id: 'm-2025-12-04',
    date: '2025-12-04T19:00:00Z',
    competition: 'Liga Kaibil — Apertura 2025',
    homeTeam: 'Linces',
    awayTeam: 'Cóndores',
    homeScore: 3,
    awayScore: 1,
    result: 'WIN',
    field: 'Estadio Azteca — Cancha 2',
    goals: 1,
    assists: 0,
  },
  {
    id: 'm-2025-11-28',
    date: '2025-11-28T20:30:00Z',
    competition: 'Copa Kaibil 2025',
    homeTeam: 'Tiburones',
    awayTeam: 'Linces',
    homeScore: 2,
    awayScore: 1,
    result: 'LOSS',
    field: 'Complejo Norte — Cancha 1',
    goals: 1,
    assists: 0,
  },
  {
    id: 'm-2025-11-21',
    date: '2025-11-21T18:00:00Z',
    competition: 'Liga Kaibil — Apertura 2025',
    homeTeam: 'Linces',
    awayTeam: 'Halcones',
    homeScore: 2,
    awayScore: 0,
    result: 'WIN',
    field: 'Estadio Azteca — Cancha 2',
    goals: 0,
    assists: 2,
  },
  {
    id: 'm-2025-11-14',
    date: '2025-11-14T19:30:00Z',
    competition: 'Liga Kaibil — Apertura 2025',
    homeTeam: 'Linces',
    awayTeam: 'Lobos',
    homeScore: 4,
    awayScore: 1,
    result: 'WIN',
    field: 'Complejo Sur — Cancha 3',
    goals: 2,
    assists: 1,
  },
  {
    id: 'm-2025-11-07',
    date: '2025-11-07T20:00:00Z',
    competition: 'Copa Kaibil 2025',
    homeTeam: 'Águilas',
    awayTeam: 'Linces',
    homeScore: 1,
    awayScore: 1,
    result: 'DRAW',
    field: 'Estadio Azteca — Cancha 1',
    goals: 0,
    assists: 1,
  },
];

const MOCK_AWARDS: Award[] = [
  {
    id: 'a-scorer-2025',
    title: 'Goleador del torneo',
    category: 'SCORER',
    level: 'GOLD',
    season: 'Apertura 2025',
    competition: 'Liga Kaibil',
    awardedAt: '2025-12-10',
    description: 'Máximo anotador de la temporada con 12 goles en 8 partidos.',
  },
  {
    id: 'a-mvp-2025',
    title: 'MVP de la jornada',
    category: 'MVP',
    level: 'GOLD',
    season: 'Apertura 2025',
    competition: 'Liga Kaibil',
    awardedAt: '2025-11-14',
    description: 'Mejor jugador de la jornada 14 con 2 goles y 1 asistencia.',
  },
  {
    id: 'a-fairplay-2024',
    title: 'Juego limpio',
    category: 'FAIR_PLAY',
    level: 'SILVER',
    season: 'Clausura 2024',
    competition: 'Copa Kaibil',
    awardedAt: '2024-07-22',
  },
  {
    id: 'a-champion-2024',
    title: 'Campeón de copa',
    category: 'CHAMPION',
    level: 'GOLD',
    season: 'Clausura 2024',
    competition: 'Copa Kaibil',
    awardedAt: '2024-07-30',
  },
];

const MOCK_CAREER: CareerSeason[] = [
  {
    id: 'c-2025-ape',
    season: 'Apertura 2025',
    team: 'Linces FC',
    matches: 12,
    goals: 8,
    assists: 5,
    isCurrent: true,
  },
  {
    id: 'c-2025-cop',
    season: 'Copa 2025',
    team: 'Linces FC',
    matches: 4,
    goals: 2,
    assists: 1,
    isCurrent: true,
  },
  {
    id: 'c-2024-cla',
    season: 'Clausura 2024',
    team: 'Linces FC',
    matches: 14,
    goals: 6,
    assists: 4,
    isCurrent: false,
  },
  {
    id: 'c-2024-ape',
    season: 'Apertura 2024',
    team: 'Cóndores',
    matches: 10,
    goals: 3,
    assists: 2,
    isCurrent: false,
  },
];

// ----- Generic async hook ---------------------------------------------------

// Re-exported from `./useAsync` so existing call sites can keep importing
// it as before. The implementation moved out because the same hook is
// shared by every data hook in the app (teams, leagues, matches, …).
export { useAsync, asyncResolve } from './useAsync';
export type { AsyncState } from './useAsync';

// ----- Re-exports for cross-page use ----------------------------------------
//
// The awards pool is global in v1.0.0 mock (no per-player ownership).
// Pages like PlayerProfilePage render the same list until the Award
// type gains `playerId` in v1.1.
export { MOCK_AWARDS };

// ----- Public hooks ---------------------------------------------------------
//
// All hooks are keyed by `userId` so swapping to a real backend is trivial:
//   loader: (id) => apiClient.get<ProfileStats>(`/users/${id}/stats`).then(r => r.data.data)

export function useProfileStats(userId: string): AsyncState<ProfileStats> {
  const loader = (id: string) => profileApi.getStats(id);
  return useAsync<ProfileStats>(loader, userId);
}

export function useRecentMatches(
  userId: string,
  limit = 4,
): AsyncState<RecentMatch[]> {
  const loader = (id: string) => profileApi.getRecentMatches(id, limit);
  return useAsync<RecentMatch[]>(loader, userId);
}

export function useAwards(userId: string): AsyncState<Award[]> {
  const loader = (id: string) => profileApi.getAwards(id);
  return useAsync<Award[]>(loader, userId);
}

export function useCareer(userId: string): AsyncState<CareerSeason[]> {
  const loader = (id: string) => profileApi.getCareer(id);
  return useAsync<CareerSeason[]>(loader, userId);
}
