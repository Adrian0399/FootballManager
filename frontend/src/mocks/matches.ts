// Mock match + matchday dataset (Paso 5).
//
// Fixtures are generated once at module load using the Berger round-robin
// algorithm (see `../utils/roundRobin`). The script is deterministic —
// refreshing the page always shows the same fixture, which makes the
// "Generate" + "Shuffle" buttons testable.
//
// Coverage:
//   L1 (4 teams, double RR)  → 6 matchdays × 2 matches = 12 matches
//   L2 (2 teams, double RR)  → 2 matchdays × 1 match  =  2 matches
//   L3 (2 teams, double RR)  → 2 matchdays × 1 match  =  2 matches
//
// Status distribution (L1, the league with the most history):
//   Matchdays 1..3 → COMPLETED, with deterministic scores.
//   Matchday 4     → IN_PROGRESS, partial scores (1-0 / 2-1).
//   Matchdays 5..6 → SCHEDULED.
// L2 / L3: matchday 1 COMPLETED, matchday 2 SCHEDULED.

import type { Match, Matchday, MatchStatus, ScoringMode } from '../types/match';
import { TIME_SLOT_HOUR } from '../types/match';
import type { TimeSlot, WeekDay } from '../types/league';
import { WEEKDAY_JS_INDEX } from '../types/match';
import { MOCK_LEAGUES, MOCK_TEAMS } from './teams';
import { getLeagueTeamsByLeague } from './leagueTeams';
import { bergerRoundRobin, doubleRoundRobin, type Pair } from '../utils/roundRobin';

// ----- Deterministic mock data ---------------------------------------------

// Anchor dates for each league (used implicitly via league.startDate
// in the mock catalog).

/**
 * Deterministic scores for L1 — chosen so the standings look believable
 * (the higher-seeded teams win more, with a couple of upsets).
 */
const L1_SCORES: Record<string, [number, number]> = {
  'm-L1-1-1': [3, 1], // Linces vs Cóndores
  'm-L1-1-2': [2, 2], // Halcones vs Águilas
  'm-L1-2-1': [1, 0], // Cóndores vs Halcones
  'm-L1-2-2': [4, 2], // Águilas vs Linces
  'm-L1-3-1': [2, 1], // Linces vs Halcones
  'm-L1-3-2': [0, 1], // Cóndores vs Águilas
  'm-L1-4-1': [1, 0], // Linces vs Cóndores  (IN_PROGRESS)
  'm-L1-4-2': [2, 1], // Halcones vs Águilas  (IN_PROGRESS)
};

const L2_SCORES: Record<string, [number, number]> = {
  'm-L2-1-1': [3, 2], // Tiburones vs Pumas
};

const L3_SCORES: Record<string, [number, number]> = {
  'm-L3-1-1': [2, 1], // Lincelas vs Catalinas
};

// ----- Generation helpers ----------------------------------------------------

let counter = 0;
function nextId(prefix: string): string {
  counter += 1;
  return `${prefix}-${String(counter).padStart(4, '0')}`;
}

function addDays(ymd: string, days: number): string {
  const d = new Date(`${ymd}T00:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function firstOccurrenceOfWeekday(startYmd: string, dayOfWeek: WeekDay): string {
  const start = new Date(`${startYmd}T00:00:00`);
  const startDow = start.getDay();
  const targetDow = WEEKDAY_JS_INDEX[dayOfWeek];
  const diff = (targetDow - startDow + 7) % 7;
  return addDays(startYmd, diff);
}

function scheduledAt(dateYmd: string, timeSlot: TimeSlot | null): string {
  const hhmm = timeSlot ? TIME_SLOT_HOUR[timeSlot] : '19:00';
  return `${dateYmd}T${hhmm}:00.000Z`;
}

function homeFieldFor(teamId: string): string | null {
  return MOCK_TEAMS.find((t) => t.id === teamId)?.homeFieldId ?? null;
}

// ----- Build the dataset ---------------------------------------------------

interface BuildResult {
  matchdays: Matchday[];
  matches: Match[];
}

function buildLeagueFixture(leagueId: string): BuildResult {
  const league = MOCK_LEAGUES.find((l) => l.id === leagueId);
  if (!league) return { matchdays: [], matches: [] };

  const assigned = getLeagueTeamsByLeague(leagueId);
  if (assigned.length < 2) {
    // Not enough teams for a round-robin — return empty fixture.
    return { matchdays: [], matches: [] };
  }

  const teamIds = assigned.map((lt: { teamId: string }) => lt.teamId);
  const homeAndAway = league.homeAndAway ?? false;
  const rounds: Pair[][] = homeAndAway ? doubleRoundRobin(teamIds) : bergerRoundRobin(teamIds);

  // Anchor the schedule to the league's startDate, snapped to its
  // configured dayOfWeek.
  const baseStart = league.startDate ?? `${new Date().toISOString().slice(0, 10)}`;
  const firstMatchdayDate = league.dayOfWeek
    ? firstOccurrenceOfWeekday(baseStart, league.dayOfWeek)
    : baseStart;

  // First N-1 rounds COMPLETED, then the rest split between
  // IN_PROGRESS and SCHEDULED. We use a per-league override.
  const config = leagueFixtureConfig(leagueId);
  const totalRoundsCompleted = config.completedRounds;
  const inProgressRound = totalRoundsCompleted + 1;

  const matchdays: Matchday[] = [];
  const matches: Match[] = [];

  rounds.forEach((round, roundIdx) => {
    const roundNumber = roundIdx + 1;
    const date = addDays(firstMatchdayDate, roundIdx * 7);
    const roundStatus =
      roundNumber <= totalRoundsCompleted
        ? 'COMPLETED'
        : roundNumber === inProgressRound
          ? 'IN_PROGRESS'
          : 'PENDING';

    const md: Matchday = {
      id: `md-${leagueId}-${roundNumber}`,
      leagueId,
      number: roundNumber,
      date,
      status: roundStatus,
    };
    matchdays.push(md);

    round.forEach(([homeId, awayId], matchIdx) => {
      const matchId = `m-${leagueId}-${roundNumber}-${matchIdx + 1}`;
      let status: MatchStatus = 'SCHEDULED';
      let homeScore: number | null = null;
      let awayScore: number | null = null;
      let scoringMode: ScoringMode | null = null;
      const scoreTable =
        leagueId === 'L1' ? L1_SCORES :
        leagueId === 'L2' ? L2_SCORES :
        L3_SCORES;
      const score = scoreTable[matchId];

      if (roundStatus === 'COMPLETED' && score) {
        status = 'COMPLETED';
        homeScore = score[0];
        awayScore = score[1];
        scoringMode = 'POST_MATCH';
      } else if (roundStatus === 'IN_PROGRESS' && score) {
        status = 'IN_PROGRESS';
        homeScore = score[0];
        awayScore = score[1];
        scoringMode = 'LIVE';
      }

      matches.push({
        id: matchId,
        leagueId,
        matchdayId: md.id,
        homeTeamId: homeId,
        awayTeamId: awayId,
        fieldId: homeFieldFor(homeId) ?? homeFieldFor(awayId),
        scheduledAt: scheduledAt(date, league.timeSlot ?? null),
        status,
        homeScore,
        awayScore,
        refereeId: null,
        mvpPlayerId: null,
        scoringMode,
        notes: null,
        createdAt: '2025-08-01T00:00:00Z',
        updatedAt: '2025-08-01T00:00:00Z',
      });
    });
  });
  return { matchdays, matches };
}

function leagueFixtureConfig(leagueId: string): { completedRounds: number } {
  switch (leagueId) {
    case 'L1': return { completedRounds: 3 };
    case 'L2': return { completedRounds: 1 };
    case 'L3': return { completedRounds: 1 };
    default:   return { completedRounds: 0 };
  }
}

const ALL_LEAGUES = ['L1', 'L2', 'L3'] as const;
const RESULTS = ALL_LEAGUES.map(buildLeagueFixture);
const mdList = RESULTS.flatMap((r) => r.matchdays);
const mList = RESULTS.flatMap((r) => r.matches);

// ----- Exports --------------------------------------------------------------

export const MOCK_MATCHDAYS: Matchday[] = mdList;
export const MOCK_MATCHES: Match[] = mList;

// ----- Lookups --------------------------------------------------------------

export function getMatchdaysByLeague(leagueId: string): Matchday[] {
  return MOCK_MATCHDAYS
    .filter((md) => md.leagueId === leagueId)
    .sort((a, b) => a.number - b.number);
}

export function getMatchesByMatchday(matchdayId: string): Match[] {
  return MOCK_MATCHES
    .filter((m) => m.matchdayId === matchdayId)
    .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
}

export function getMatchesByLeague(leagueId: string): Match[] {
  return MOCK_MATCHES.filter((m) => m.leagueId === leagueId);
}

export function getMatchById(id: string): Match | null {
  return MOCK_MATCHES.find((m) => m.id === id) ?? null;
}

export function getMatchdayById(id: string): Matchday | null {
  return MOCK_MATCHDAYS.find((md) => md.id === id) ?? null;
}

// Re-export the algorithm so callers can re-generate.
export { bergerRoundRobin, doubleRoundRobin };
