// Round-robin fixture generator (Berger tables).
//
// For N teams we produce N-1 rounds of N/2 matches each, where every
// team plays every other team exactly once. With `homeAndAway=true`
// we double the rounds and swap home/away in the second half.
//
// Algorithm (Berger rotation):
//   1. Fix team[0] in place.
//   2. Rotate the remaining (N-1) teams each round.
//   3. Pair team[0] vs the last rotated team.
//   4. Pair the i-th rotated team with the (N-2-i)-th rotated team.
//
// For odd N we add a `null` BYE; pairs that include a BYE are dropped
// from the round (the team gets a rest week).

export type Pair = [string, string];

const BYE: null = null;

/** Single round-robin: returns N-1 rounds of N/2 pairs each. */
export function bergerRoundRobin(teams: readonly string[]): Pair[][] {
  if (teams.length < 2) return [];
  const working: (string | null)[] = [...teams];
  if (working.length % 2 !== 0) working.push(BYE);
  const n = working.length;

  const rounds: Pair[][] = [];
  // The "rotation" excludes the fixed team[0].
  let rotation: (string | null)[] = working.slice(1);

  for (let r = 0; r < n - 1; r += 1) {
    const round: Pair[] = [];
    const first = working[0]!;
    const last = rotation[rotation.length - 1]!;
    if (first !== BYE && last !== BYE) {
      round.push([first, last]);
    }
    for (let i = 0; i < rotation.length / 2; i += 1) {
      const home = rotation[i]!;
      const away = rotation[rotation.length - 2 - i]!;
      if (home !== BYE && away !== BYE) {
        round.push([home, away]);
      }
    }
    rounds.push(round);
    // Rotate: last element moves to the front.
    rotation = [rotation[rotation.length - 1]!, ...rotation.slice(0, -1)];
  }
  return rounds;
}

/**
 * Assigns the home side across a generated round-robin.
 *
 * The circle method always lists the first team first, so on its own it
 * hands one team every single match at home. This pass gives the home side
 * to whoever has the fewest home games so far.
 *
 * Perfect balance is impossible: with an even team count each team plays
 * N-1 games (odd), so the smallest achievable difference is 1.
 *
 * Mirrors `orientHomeAway` in `backend/src/modules/leagues/tournament.ts`.
 */
export function orientHomeAway(rounds: Pair[][]): Pair[][] {
  const homeGames = new Map<string, number>();
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

/** Double round-robin: single RR + the reverse (away/home swapped). */
export function doubleRoundRobin(teams: readonly string[]): Pair[][] {
  // Orient BEFORE mirroring: the mirror of a balanced schedule is
  // perfectly balanced, whereas orienting after makes it worse.
  const first = orientHomeAway(bergerRoundRobin(teams));
  const second = first.map((round) =>
    round.map(([h, a]) => [a, h] as Pair),
  );
  return [...first, ...second];
}

/** Single round-robin with balanced home/away assignment. */
export function singleRoundRobin(teams: readonly string[]): Pair[][] {
  return orientHomeAway(bergerRoundRobin(teams));
}

/** Distribute a "BYE" round to the team that didn't play in round r.
 *  Only meaningful for odd N — returns [] for even N. */
export function byeForRound(teams: readonly string[], roundIndex: number): string | null {
  if (teams.length % 2 === 0) return null;
  const all = new Set(teams);
  const working: (string | null)[] = [...teams, BYE];
  const n = working.length;
  let rotation: (string | null)[] = working.slice(1);
  for (let r = 0; r < roundIndex; r += 1) {
    rotation = [rotation[rotation.length - 1]!, ...rotation.slice(0, -1)];
  }
  // In the round, all `non-null` members of `rotation` + working[0]
  // are paired. Anyone not in that set is the BYE.
  const playing = new Set<string | null>([working[0], ...rotation]);
  for (const t of all) {
    if (!playing.has(t)) return t;
  }
  return null;
  // roundIndex is intentionally accepted for symmetry even when not used.
  void n;
}
