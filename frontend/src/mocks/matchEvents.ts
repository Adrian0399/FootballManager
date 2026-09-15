// Mock MatchEvent dataset (Paso 6).
//
// For every COMPLETED match we synthesise a believable timeline:
//   - One GOAL event per goal (with the homeScore/awayScore from the match).
//   - 70% of goals have an associated ASSIST (same minute+1).
//   - 25% chance of one YELLOW_CARD per match (home or away).
//   - One MVP at minute 90 (the highest-seeded player of the winning team).
//
// For the single IN_PROGRESS match in L1 we emit the goals that
// already exist (per the score table in `matches.ts`) so the LIVE
// view shows a partial timeline + the running clock.
//
// The generator is deterministic per (matchId, score) pair so the
// timeline looks the same on every refresh.

import { MOCK_MATCHES } from './matches';
import { MOCK_MEMBERSHIPS } from './teams';
import { MOCK_USERS } from './teams';
import type { MatchEvent } from '../types/matchEvent';
import { MOCK_TEAMS } from './teams';

// ----- Tiny deterministic PRNG --------------------------------------------

function hashSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function rand(seed: number): () => number {
  let state = seed || 1;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0xffffffff;
  };
}

function pick<T>(arr: readonly T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)]!;
}

// ----- Helpers --------------------------------------------------------------

function playersOfTeam(teamId: string): string[] {
  return MOCK_MEMBERSHIPS
    .filter((m) => m.teamId === teamId && m.membershipRole === 'PLAYER')
    .map((m) => m.userId);
}

function playerName(userId: string): string {
  const u = MOCK_USERS.find((x) => x.id === userId);
  return u ? `${u.firstName} ${u.paternalSurname}` : userId;
}

// ----- Per-match generation -------------------------------------------------

function generateEventsForMatch(matchId: string): MatchEvent[] {
  const match = MOCK_MATCHES.find((m) => m.id === matchId);
  if (!match) return [];
  if (match.status !== 'COMPLETED' && match.status !== 'IN_PROGRESS') return [];

  const out: MatchEvent[] = [];
  const seed = hashSeed(matchId);
  const rng = rand(seed);

  const homeScore = match.homeScore ?? 0;
  const awayScore = match.awayScore ?? 0;
  const homePlayers = playersOfTeam(match.homeTeamId);
  const awayPlayers = playersOfTeam(match.awayTeamId);

  if (homePlayers.length === 0 || awayPlayers.length === 0) return [];

  // Helper: produce a goal event + (maybe) an assist at the same minute+0/1
  function pushGoal(teamId: string, minute: number, isLast: boolean) {
    const homeId = match!.homeTeamId;
    const player = pick(teamId === homeId ? homePlayers : awayPlayers, rng);
    const ev: MatchEvent = {
      id: `ev-${matchId}-${out.length + 1}`,
      matchId,
      minute,
      type: 'GOAL',
      teamId,
      playerId: player,
      createdAt: '2025-09-01T00:00:00Z',
    };
    if (rng() < 0.7 && !isLast) {
      const scorer = player;
      const assisters = (teamId === homeId ? homePlayers : awayPlayers)
        .filter((p) => p !== scorer);
      if (assisters.length > 0) {
        ev.secondaryPlayerId = pick(assisters, rng);
      }
    }
    out.push(ev);
  }

  // Distribute goals over the 90 minutes.
  const homeMinutes = distributeMinutes(homeScore, rng);
  const awayMinutes = distributeMinutes(awayScore, rng);
  const homeId = match.homeTeamId;
  const awayId = match.awayTeamId;
  // Merge and sort chronologically.
  const goalSchedule: Array<{ teamId: string; minute: number; isLast: boolean }> = [];
  for (const m of homeMinutes) goalSchedule.push({ teamId: homeId, minute: m, isLast: false });
  for (const m of awayMinutes) goalSchedule.push({ teamId: awayId, minute: m, isLast: false });
  goalSchedule.sort((a, b) => a.minute - b.minute);
  if (goalSchedule.length > 0) goalSchedule[goalSchedule.length - 1]!.isLast = true;
  for (const g of goalSchedule) pushGoal(g.teamId, g.minute, g.isLast);

  // Optional yellow card: 25% chance.
  if (rng() < 0.25) {
    const teamId = rng() < 0.5 ? homeId : awayId;
    const players = teamId === homeId ? homePlayers : awayPlayers;
    out.push({
      id: `ev-${matchId}-${out.length + 1}`,
      matchId,
      minute: 30 + Math.floor(rng() * 50),
      type: 'YELLOW_CARD',
      teamId,
      playerId: pick(players, rng),
      createdAt: '2025-09-01T00:00:00Z',
    });
  }

  // MVP at the final whistle, from the winning team (or home if draw).
  if (match.status === 'COMPLETED') {
    const winningTeamId =
      homeScore > awayScore ? homeId : awayScore > homeScore ? awayId : homeId;
    const players = winningTeamId === homeId ? homePlayers : awayPlayers;
    out.push({
      id: `ev-${matchId}-${out.length + 1}`,
      matchId,
      minute: 90,
      type: 'MVP',
      teamId: winningTeamId,
      playerId: pick(players, rng),
      createdAt: '2025-09-01T00:00:00Z',
    });
  }

  return out;
}

/** Distribute `n` goals across the 90 minutes, avoiding 0' and 90'
 *  (those would feel weird) and keeping the schedule realistic. */
function distributeMinutes(n: number, rng: () => number): number[] {
  if (n === 0) return [];
  const minutes: number[] = [];
  for (let i = 0; i < n; i += 1) {
    minutes.push(5 + Math.floor(rng() * 84));
  }
  return minutes.sort((a, b) => a - b);
}

// ----- Build the dataset ----------------------------------------------------

let counter = 0;
function nextEventId(matchId: string): string {
  counter += 1;
  return `ev-${matchId}-${String(counter).padStart(3, '0')}`;
}

export const MOCK_MATCH_EVENTS: MatchEvent[] = (() => {
  const all: MatchEvent[] = [];
  for (const m of MOCK_MATCHES) {
    const evs = generateEventsForMatch(m.id);
    // Re-id deterministically (the generator uses out.length+1; that's
    // already unique per match, so this is fine).
    for (const e of evs) {
      all.push({ ...e, id: nextEventId(m.id) });
    }
  }
  return all;
})();

// ----- Lookups --------------------------------------------------------------

export function getEventsByMatch(matchId: string): MatchEvent[] {
  return MOCK_MATCH_EVENTS
    .filter((e) => e.matchId === matchId)
    .sort((a, b) => a.minute - b.minute);
}

export function getEventsByPlayer(playerId: string): MatchEvent[] {
  return MOCK_MATCH_EVENTS.filter((e) => e.playerId === playerId);
}

export function getEventsByTeam(teamId: string): MatchEvent[] {
  return MOCK_MATCH_EVENTS.filter((e) => e.teamId === teamId);
}

// Re-export for tests.
export { playerName, MOCK_TEAMS };
