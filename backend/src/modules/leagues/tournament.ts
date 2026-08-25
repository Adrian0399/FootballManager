// Pure tournament-scheduling helpers for Fase B (fixture + knockout).
//
// The Berger round-robin here mirrors the one used by the seed and by the
// frontend (`frontend/src/utils/roundRobin.ts`). The generated pair indices
// are 0-based and refer to positions in the seed-ordered team list.

import type { WeekDay, TimeSlot } from '@prisma/client';

/** A pairing of two 0-based team indices (home, away). */
export type Pair = [number, number];

/**
 * Berger round-robin (single rotation). For N teams produces N-1 rounds of
 * N/2 pairs. For odd N a BYE (null) is added and pairs containing it dropped.
 *
 * This only decides *who plays whom*; use `orientHomeAway` to decide who is
 * the home side.
 */
export function bergerRoundRobin(teamCount: number): Pair[][] {
  if (teamCount < 2) return [];
  const hasBye = teamCount % 2 !== 0;
  const ids: (number | null)[] = Array.from({ length: teamCount }, (_, i) => i);
  if (hasBye) ids.push(null);
  const n = ids.length;
  const rotation: (number | null)[] = ids.slice(1);
  const rounds: Pair[][] = [];
  for (let r = 0; r < n - 1; r += 1) {
    const round: Pair[] = [];
    const first = ids[0]!;
    const last = rotation[rotation.length - 1]!;
    if (first !== null && last !== null) round.push([first, last]);
    for (let i = 0; i < Math.floor(rotation.length / 2); i += 1) {
      const h = rotation[i]!;
      const a = rotation[rotation.length - 2 - i]!;
      if (h !== null && a !== null) round.push([h, a]);
    }
    rounds.push(round);
    rotation.unshift(rotation.pop()!);
  }
  return rounds;
}

/**
 * Assigns the home side across a generated round-robin.
 *
 * The circle method always lists the fixed team first, so on its own it
 * handed one team every single match at home — a real competitive imbalance
 * in the fixtures. This pass walks the fixtures and gives the home side to
 * whoever has the fewest home games so far.
 *
 * Perfect balance is impossible: with an even team count each team plays
 * N-1 games (odd), so the smallest achievable difference is 1. This keeps it
 * at 1 for up to 9 teams and at most 3 beyond that.
 */
export function orientHomeAway(rounds: Pair[][]): Pair[][] {
  const homeGames = new Map<number, number>();
  return rounds.map((round) =>
    round.map(([a, b]) => {
      const homeA = homeGames.get(a) ?? 0;
      const homeB = homeGames.get(b) ?? 0;
      const home = homeB < homeA || (homeB === homeA && b < a) ? b : a;
      homeGames.set(home, (homeGames.get(home) ?? 0) + 1);
      return [home, home === a ? b : a];
    }),
  );
}

/** Double round-robin: single RR + the reverse (home/away swapped). */
export function doubleRounds(rr: Pair[][]): Pair[][] {
  return [
    ...rr,
    ...rr.map((round) => round.map(([h, a]) => [a, h] as Pair)),
  ];
}

export const WEEKDAY_INDEX: Record<WeekDay, number> = {
  SUNDAY: 0,
  MONDAY: 1,
  TUESDAY: 2,
  WEDNESDAY: 3,
  THURSDAY: 4,
  FRIDAY: 5,
  SATURDAY: 6,
};

/** Default kickoff time per time slot, as "HH:mm". */
export const TIME_SLOT_HOUR: Record<TimeSlot, string> = {
  MORNING: '09:00',
  AFTERNOON: '14:00',
  EVENING: '19:00',
  NIGHT: '21:00',
};

/**
 * Returns a Date at `start + weekIndex weeks`, aligned (on/after) to
 * `dayOfWeek` when given, with the clock set from `hhmm`.
 */
export function weeklyDate(
  start: Date,
  weekIndex: number,
  dayOfWeek: WeekDay | null,
  hhmm: string,
): Date {
  const d = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  d.setDate(d.getDate() + weekIndex * 7);
  if (dayOfWeek) {
    const target = WEEKDAY_INDEX[dayOfWeek];
    const diff = (target - d.getDay() + 7) % 7;
    d.setDate(d.getDate() + diff);
  }
  const [hh, mm] = parseHhmm(hhmm);
  d.setHours(hh, mm, 0, 0);
  return d;
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

export function addHours(date: Date, hours: number): Date {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

export function parseHhmm(hhmm: string): [number, number] {
  const [rawHh, rawMm] = hhmm.split(':');
  const hh = Number(rawHh);
  const mm = Number(rawMm);
  // `??` would not catch NaN here, so ranges are validated explicitly.
  return [
    Number.isInteger(hh) && hh >= 0 && hh < 24 ? hh : 19,
    Number.isInteger(mm) && mm >= 0 && mm < 60 ? mm : 0,
  ];
}

export function withTime(date: Date, hhmm: string): Date {
  const [hh, mm] = parseHhmm(hhmm);
  const d = new Date(date);
  d.setHours(hh, mm, 0, 0);
  return d;
}

/** Fisher-Yates shuffle (returns a new array). */
export function shuffle<T>(items: readonly T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

/**
 * Standard 8-team single-elimination bracket. Every entry is a pair of
 * 0-based indices into the seed/standings-ranked team list.
 *
 *   Quarters: 1v8 [0,7], 4v5 [3,4], 2v7 [1,6], 3v6 [2,5]
 *   Semis:    [0,3] (winner QF1 vs winner QF2), [1,2] (winner QF3 vs QF4)
 *   Final:    [0,1]
 *   Third:    [2,3]
 *
 * The semifinal/final/third pairings are *projected* participants (the
 * higher seed path) until earlier rounds resolve, matching the seed data.
 */
export interface EightTeamBracket {
  quarters: Pair[];
  semis: Pair[];
  final: Pair;
  third: Pair;
}

export const EIGHT_TEAM_BRACKET: EightTeamBracket = {
  quarters: [
    [0, 7],
    [3, 4],
    [1, 6],
    [2, 5],
  ],
  semis: [
    [0, 3],
    [1, 2],
  ],
  final: [0, 1],
  third: [2, 3],
};
