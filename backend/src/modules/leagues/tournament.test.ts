import { describe, it, expect } from 'vitest';
import {
  bergerRoundRobin,
  doubleRounds,
  orientHomeAway,
  weeklyDate,
  addDays,
  addHours,
  parseHhmm,
  withTime,
  shuffle,
  WEEKDAY_INDEX,
  TIME_SLOT_HOUR,
  EIGHT_TEAM_BRACKET,
  type Pair,
} from './tournament.js';

/** Every team index that shows up in the given rounds, with duplicates kept. */
function appearances(rounds: Pair[][]): number[] {
  return rounds.flatMap((r) => r.flat());
}

/** Unordered pair key so [0,3] and [3,0] collapse to the same fixture. */
function pairKey([h, a]: Pair): string {
  return h < a ? `${h}-${a}` : `${a}-${h}`;
}

describe('bergerRoundRobin', () => {
  it('returns no rounds for fewer than 2 teams', () => {
    expect(bergerRoundRobin(0)).toEqual([]);
    expect(bergerRoundRobin(1)).toEqual([]);
  });

  describe.each([2, 4, 6, 8, 10, 12, 16])('with %i teams', (n) => {
    const rounds = bergerRoundRobin(n);

    it('produces n-1 rounds', () => {
      expect(rounds).toHaveLength(n - 1);
    });

    it('produces n/2 pairings per round', () => {
      for (const round of rounds) expect(round).toHaveLength(n / 2);
    });

    it('uses only valid 0-based team indices', () => {
      for (const index of appearances(rounds)) {
        expect(index).toBeGreaterThanOrEqual(0);
        expect(index).toBeLessThan(n);
      }
    });

    it('never pairs a team against itself', () => {
      for (const [h, a] of rounds.flat()) expect(h).not.toBe(a);
    });

    it('plays every team exactly once per round', () => {
      for (const round of rounds) {
        const seen = round.flat();
        expect(new Set(seen).size).toBe(n);
        expect(seen).toHaveLength(n);
      }
    });

    it('meets every other team exactly once (single round-robin)', () => {
      const keys = rounds.flat().map(pairKey);
      expect(new Set(keys).size).toBe(keys.length);
      expect(keys).toHaveLength((n * (n - 1)) / 2);
    });

    it('assigns exactly one home and one away team per fixture', () => {
      // A single round-robin cannot split home/away evenly per team (with
      // even N each team plays N-1 games, an odd number), so the invariant
      // is per-fixture and per-tournament, not per-team.
      for (const round of rounds) {
        for (const [h, a] of round) {
          expect(typeof h).toBe('number');
          expect(typeof a).toBe('number');
          expect(h).not.toBe(a);
        }
      }
    });

    it('has as many home slots as away slots across the tournament', () => {
      let home = 0;
      let away = 0;
      for (const [h, a] of rounds.flat()) {
        expect(h).toBeGreaterThanOrEqual(0);
        expect(a).toBeGreaterThanOrEqual(0);
        home += 1;
        away += 1;
      }
      expect(home).toBe(away);
      expect(home).toBe((n * (n - 1)) / 2);
    });

    // The raw circle method decides *who plays whom* only; it always lists the
    // fixed team first, so it hands one team every home game. Home/away
    // assignment is `orientHomeAway`'s job (covered in its own describe).
    it('does not assign home/away — that is orientHomeAway\'s job', () => {
      let worst = 0;
      for (let team = 0; team < n; team += 1) {
        let home = 0;
        let away = 0;
        for (const [h, a] of rounds.flat()) {
          if (h === team) home += 1;
          if (a === team) away += 1;
        }
        expect(home + away).toBe(n - 1);
        worst = Math.max(worst, Math.abs(home - away));
      }
      expect(worst).toBe(n - 1);
    });
  });

  describe.each([3, 5, 7, 9, 11])('with %i teams (odd)', (n) => {
    const rounds = bergerRoundRobin(n);

    it('produces n rounds', () => {
      expect(rounds).toHaveLength(n);
    });

    it('produces (n-1)/2 pairings per round', () => {
      for (const round of rounds) expect(round).toHaveLength((n - 1) / 2);
    });

    it('gives exactly one team a bye per round', () => {
      for (const round of rounds) {
        const playing = new Set(round.flat());
        expect(playing.size).toBe(n - 1);
      }
    });

    it('never emits a null index', () => {
      for (const index of appearances(rounds)) {
        expect(index).not.toBeNull();
        expect(index).toBeGreaterThanOrEqual(0);
        expect(index).toBeLessThan(n);
      }
    });

    it('meets every other team exactly once', () => {
      const keys = rounds.flat().map(pairKey);
      expect(new Set(keys).size).toBe(keys.length);
      expect(keys).toHaveLength((n * (n - 1)) / 2);
    });

    it('gives every team at least one bye', () => {
      for (let team = 0; team < n; team += 1) {
        const byeRounds = rounds.filter((r) => !r.flat().includes(team));
        expect(byeRounds.length).toBeGreaterThanOrEqual(1);
      }
    });
  });
});

describe('orientHomeAway', () => {
  /** Max |home - away| across all teams of a schedule. */
  function maxImbalance(rounds: Pair[][], n: number): number {
    const flat = rounds.flat();
    let worst = 0;
    for (let team = 0; team < n; team += 1) {
      let home = 0;
      let away = 0;
      for (const [h, a] of flat) {
        if (h === team) home += 1;
        if (a === team) away += 1;
      }
      worst = Math.max(worst, Math.abs(home - away));
    }
    return worst;
  }

  it('does not change who plays whom', () => {
    const raw = bergerRoundRobin(8);
    const oriented = orientHomeAway(raw);
    expect(oriented.flat().map(pairKey).sort()).toEqual(raw.flat().map(pairKey).sort());
  });

  it('keeps the same number of rounds and pairings', () => {
    const raw = bergerRoundRobin(10);
    const oriented = orientHomeAway(raw);
    expect(oriented).toHaveLength(raw.length);
    oriented.forEach((round, i) => expect(round).toHaveLength(raw[i]!.length));
  });

  it('stops one team from playing every match at home', () => {
    // The raw circle method hands team 0 every home game.
    expect(maxImbalance(bergerRoundRobin(8), 8)).toBe(7);
    expect(maxImbalance(orientHomeAway(bergerRoundRobin(8)), 8)).toBeLessThanOrEqual(1);
  });

  it.each([4, 6, 8, 9, 10, 12, 16])('bounds imbalance for %i teams', (n) => {
    expect(maxImbalance(orientHomeAway(bergerRoundRobin(n)), n)).toBeLessThanOrEqual(3);
  });

  it('handles an empty schedule', () => {
    expect(orientHomeAway([])).toEqual([]);
  });

  it('balances a double round-robin perfectly when applied before mirroring', () => {
    // Correct order: orient the single round-robin, THEN mirror it. The
    // mirror of a balanced schedule is perfectly balanced. Mirroring first
    // and orienting after actually makes it worse (measured: 0 -> 2).
    const n = 8;
    const correct = doubleRounds(orientHomeAway(bergerRoundRobin(n)));
    expect(maxImbalance(correct, n)).toBe(0);
  });

  it('makes a double round-robin worse if oriented after mirroring', () => {
    const n = 8;
    const tooLate = orientHomeAway(doubleRounds(bergerRoundRobin(n)));
    expect(maxImbalance(tooLate, n)).toBeGreaterThan(
      maxImbalance(doubleRounds(bergerRoundRobin(n)), n),
    );
  });
});

describe('doubleRounds', () => {
  const single = bergerRoundRobin(8);
  const double = doubleRounds(single);

  it('returns the single round-robin followed by its mirror', () => {
    expect(double.slice(0, single.length)).toEqual(single);
  });

  it('doubles the number of rounds', () => {
    expect(double).toHaveLength(single.length * 2);
  });

  it('swaps home and away in the second half', () => {
    for (let r = 0; r < single.length; r += 1) {
      expect(double[single.length + r]).toEqual(
        single[r]!.map(([h, a]) => [a, h]),
      );
    }
  });

  it('plays every ordered fixture exactly once', () => {
    const ordered = double.flat().map(([h, a]) => `${h}>${a}`);
    expect(new Set(ordered).size).toBe(ordered.length);
  });

  it('makes every team play n-1 fixtures (home and away)', () => {
    const flat = double.flat();
    for (let team = 0; team < 8; team += 1) {
      const games = flat.filter(([h, a]) => h === team || a === team).length;
      expect(games).toBe(14);
    }
  });
});

describe('parseHhmm', () => {
  it('parses a zero-padded time', () => {
    expect(parseHhmm('09:00')).toEqual([9, 0]);
    expect(parseHhmm('18:30')).toEqual([18, 30]);
    expect(parseHhmm('21:00')).toEqual([21, 0]);
  });

  it('parses an unpadded time', () => {
    expect(parseHhmm('9:05')).toEqual([9, 5]);
  });

  it('falls back to 19:00 for an unparseable hour', () => {
    expect(parseHhmm('bad')).toEqual([19, 0]);
  });
});

describe('withTime', () => {
  it('sets the clock without mutating the source date', () => {
    const original = new Date(2026, 0, 5, 8, 15);
    const result = withTime(original, '18:30');
    expect(result.getHours()).toBe(18);
    expect(result.getMinutes()).toBe(30);
    expect(result.getSeconds()).toBe(0);
    expect(result.getMilliseconds()).toBe(0);
    expect(original.getHours()).toBe(8);
  });

  it('keeps the calendar day', () => {
    const result = withTime(new Date(2026, 5, 17, 23, 59), '06:15');
    expect(result.getFullYear()).toBe(2026);
    expect(result.getMonth()).toBe(5);
    expect(result.getDate()).toBe(17);
  });
});

describe('weeklyDate', () => {
  // 2026-01-05 is a Monday.
  const start = new Date(2026, 0, 5, 10, 0);

  it('lands on the requested weekday', () => {
    const result = weeklyDate(start, 0, 'MONDAY', '18:30');
    expect(result.getDay()).toBe(1);
  });

  it('advances 7 days per week index', () => {
    const w0 = weeklyDate(start, 0, 'MONDAY', '18:30');
    const w1 = weeklyDate(start, 1, 'MONDAY', '18:30');
    const w3 = weeklyDate(start, 3, 'MONDAY', '18:30');
    expect(w1.getTime() - w0.getTime()).toBe(7 * 24 * 60 * 60 * 1000);
    expect(w3.getTime() - w1.getTime()).toBe(14 * 24 * 60 * 60 * 1000);
  });

  it('rolls forward to the next occurrence of the weekday', () => {
    // Start is Monday; the next Saturday is 5 days later.
    const result = weeklyDate(start, 0, 'SATURDAY', '09:00');
    expect(result.getDay()).toBe(6);
    expect(result.getDate()).toBe(10);
  });

  it('does not roll back when the weekday already matches', () => {
    const result = weeklyDate(start, 0, 'MONDAY', '09:00');
    expect(result.getDate()).toBe(5);
  });

  it('applies the kickoff time', () => {
    const result = weeklyDate(start, 0, 'MONDAY', '21:00');
    expect(result.getHours()).toBe(21);
    expect(result.getMinutes()).toBe(0);
  });

  it('keeps the start date when no weekday is given', () => {
    const result = weeklyDate(start, 0, null, '14:00');
    expect(result.getDate()).toBe(5);
    expect(result.getHours()).toBe(14);
  });

  it('drops the clock of the start date', () => {
    const result = weeklyDate(start, 0, 'MONDAY', '18:30');
    expect(result.getMinutes()).toBe(30);
  });
});

describe('addDays / addHours', () => {
  it('adds days', () => {
    const base = new Date(2026, 0, 5, 12, 0);
    expect(addDays(base, 3).getDate()).toBe(8);
  });

  it('returns the same instant for zero days', () => {
    const base = new Date(2026, 0, 5, 12, 0);
    expect(addDays(base, 0).getTime()).toBe(base.getTime());
  });

  it('adds hours', () => {
    const base = new Date(2026, 0, 5, 12, 0);
    expect(addHours(base, 5).getHours()).toBe(17);
  });

  it('does not mutate the source date', () => {
    const base = new Date(2026, 0, 5, 12, 0);
    addDays(base, 10);
    addHours(base, 10);
    expect(base.getDate()).toBe(5);
    expect(base.getHours()).toBe(12);
  });
});

describe('shuffle', () => {
  const input = Array.from({ length: 50 }, (_, i) => `t-${i}`);

  it('keeps the same length', () => {
    expect(shuffle(input)).toHaveLength(input.length);
  });

  it('keeps the same multiset of items', () => {
    expect([...shuffle(input)].sort()).toEqual([...input].sort());
  });

  it('does not mutate the input', () => {
    const snapshot = [...input];
    shuffle(input);
    expect(input).toEqual(snapshot);
  });

  it('returns a new array reference', () => {
    expect(shuffle(input)).not.toBe(input);
  });

  it('actually reorders across many runs', () => {
    const identical = Array.from({ length: 20 }, () =>
      shuffle(input).join() === input.join(),
    ).filter(Boolean).length;
    expect(identical).toBeLessThan(20);
  });

  it('handles empty and single-item arrays', () => {
    expect(shuffle([])).toEqual([]);
    expect(shuffle(['only'])).toEqual(['only']);
  });
});

describe('schedule constants', () => {
  it('maps weekdays to the JS Date.getDay() index', () => {
    expect(WEEKDAY_INDEX.SUNDAY).toBe(0);
    expect(WEEKDAY_INDEX.SATURDAY).toBe(6);
    expect(Object.values(WEEKDAY_INDEX).sort((a, b) => a - b)).toEqual([
      0, 1, 2, 3, 4, 5, 6,
    ]);
  });

  it('covers every day of the week', () => {
    expect(Object.keys(WEEKDAY_INDEX)).toHaveLength(7);
  });

  it('defines a valid kickoff time per time slot', () => {
    for (const slot of Object.keys(TIME_SLOT_HOUR)) {
      const [hh, mm] = parseHhmm(TIME_SLOT_HOUR[slot as keyof typeof TIME_SLOT_HOUR]);
      expect(hh).toBeGreaterThanOrEqual(0);
      expect(hh).toBeLessThan(24);
      expect(mm).toBeGreaterThanOrEqual(0);
      expect(mm).toBeLessThan(60);
    }
  });
});

describe('EIGHT_TEAM_BRACKET', () => {
  it('has 4 quarter-finals covering seeds 0..7 exactly once', () => {
    expect(EIGHT_TEAM_BRACKET.quarters).toHaveLength(4);
    expect(EIGHT_TEAM_BRACKET.quarters.flat().sort((a, b) => a - b)).toEqual([
      0, 1, 2, 3, 4, 5, 6, 7,
    ]);
  });

  it('seeds the quarters 1v8, 4v5, 2v7, 3v6', () => {
    expect(EIGHT_TEAM_BRACKET.quarters).toEqual([
      [0, 7],
      [3, 4],
      [1, 6],
      [2, 5],
    ]);
  });

  it('has 2 semi-finals referencing quarter winners 0..3', () => {
    expect(EIGHT_TEAM_BRACKET.semis).toHaveLength(2);
    expect(EIGHT_TEAM_BRACKET.semis.flat().sort((a, b) => a - b)).toEqual([
      0, 1, 2, 3,
    ]);
  });

  it('pairs semi winners in the final', () => {
    expect(EIGHT_TEAM_BRACKET.final).toEqual([0, 1]);
  });

  it('pairs the two semi losers for third place', () => {
    expect(EIGHT_TEAM_BRACKET.third).toEqual([2, 3]);
  });

  it('never pairs a team against itself', () => {
    for (const [h, a] of [
      ...EIGHT_TEAM_BRACKET.quarters,
      ...EIGHT_TEAM_BRACKET.semis,
      EIGHT_TEAM_BRACKET.final,
      EIGHT_TEAM_BRACKET.third,
    ]) {
      expect(h).not.toBe(a);
    }
  });
});