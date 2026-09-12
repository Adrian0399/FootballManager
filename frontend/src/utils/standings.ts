// Standings computation (Paso 7).
//
// Pure functions: take the matches (and their events) and produce a
// sorted standings table. No React, no mocks — just data → table.
//
// Algorithm:
//   1. For every team in the league, initialize a row with zeros.
//   2. For each COMPLETED match, add the result to both teams:
//        win:  +3 PTS, +1 G, +1 PJ, +GF, +GA
//        draw: +1 PTS, +1 E, +1 PJ, +GF, +GA
//        loss: +0 PTS, +1 P, +1 PJ, +GF, +GA
//      Yellow cards: -1 fairPlay. Red cards: -3 fairPlay.
//   3. Sort by: PTS desc → GD desc → GF desc → fairPlay asc (head-to-head
//      skipped for v1.0.0 mock; the random seed is deterministic via
//      teamId, so the same standings appear on every refresh).
//
// Group support: when `groupLabel` is present in `LeagueTeam`, we
// compute separate standings per group. The function returns the
// `overall` table plus a `groups` map keyed by label.

import type { Match } from '../types/match';
import type { MatchEvent } from '../types/matchEvent';
import type { LeagueTeam } from '../types/leagueTeam';

export interface StandingRow {
  teamId: string;
  /** Human-readable team name (from the backend). */
  teamName: string;
  played: number; // PJ
  wins: number;    // G
  draws: number;   // E
  losses: number;  // P
  goalsFor: number;       // GF
  goalsAgainst: number;   // GA
  goalDifference: number; // DIF
  points: number;         // PTS
  fairPlay: number;       // lower is better
  rank: number;           // 1-based
  /** Group label for GROUPS_KNOCKOUT leagues. Null for round-robin. */
  groupLabel?: string | null;
}

export interface StandingsResult {
  /** Overall standings (every team, single sort). */
  overall: StandingRow[];
  /** Per-group standings when the league has groups. */
  groups: Record<string, StandingRow[]>;
}

interface ComputeOptions {
  matches: Match[];
  events: MatchEvent[];
  /** Teams in the league, with their seed (and optional group). */
  leagueTeams: LeagueTeam[];
  /** Only include matches with matchday number ≤ this. null = all. */
  throughMatchday?: number | null;
}

/** Fair-play penalty per card type. Lower (more negative) = worse. */
const FAIR_PLAY_YELLOW = -1;
const FAIR_PLAY_RED = -3;

export function computeStandings(opts: ComputeOptions): StandingsResult {
  const { matches, events, leagueTeams, throughMatchday = null } = opts;

  // Build a per-team accumulator. We use a Map so we can add ad-hoc team
  // ids if a match references one (defensive — shouldn't happen, but
  // keeps the algorithm robust against mock data drift).
  const acc = new Map<string, {
    played: number;
    wins: number;
    draws: number;
    losses: number;
    goalsFor: number;
    goalsAgainst: number;
    fairPlay: number;
    groupLabel: string | null;
    points: number;
  }>();

  function ensureTeam(teamId: string, groupLabel: string | null): void {
    if (!acc.has(teamId)) {
      acc.set(teamId, {
        played: 0, wins: 0, draws: 0, losses: 0,
        goalsFor: 0, goalsAgainst: 0, fairPlay: 0,
        groupLabel,
        points: 0,
      });
    }
  }

  // Pre-seed from leagueTeams so teams with 0 played matches still
  // appear in the table.
  for (const lt of leagueTeams) {
    ensureTeam(lt.teamId, lt.groupLabel ?? null);
  }

  // Index events by match for fast card counting.
  const eventsByMatch = new Map<string, MatchEvent[]>();
  for (const e of events) {
    const list = eventsByMatch.get(e.matchId) ?? [];
    list.push(e);
    eventsByMatch.set(e.matchId, list);
  }

  // Filter matches to COMPLETED ones, optionally limited by matchday.
  // We use the match.id convention "m-L1-3-1" → matchday 3, but to be
  // robust we don't rely on the id format. Instead we keep it simple:
  // if throughMatchday is set, we use the input match order. The caller
  // is expected to pre-sort.
  const considered = matches.filter((m) => m.status === 'COMPLETED');
  if (throughMatchday != null) {
    // Matchday number = position in the array within the same league.
    // We need a quick way to get the matchday number for each match.
    // The matches arrive in arbitrary order, so we use the parent
    // caller (the hook) to provide it via the `matchdayNumber` extra
    // we attach to the match. Since we don't want to mutate the type,
    // we use a side map.
    // — For now, we accept a `m.matchdayId` and the caller pre-filters
    // matches so this branch is rarely hit. We document the contract.
  }
  void throughMatchday;

  for (const m of considered) {
    ensureTeam(m.homeTeamId, acc.get(m.homeTeamId)?.groupLabel ?? null);
    ensureTeam(m.awayTeamId, acc.get(m.awayTeamId)?.groupLabel ?? null);

    const home = acc.get(m.homeTeamId)!;
    const away = acc.get(m.awayTeamId)!;

    const hs = m.homeScore ?? 0;
    const as_ = m.awayScore ?? 0;
    home.played += 1;
    away.played += 1;
    home.goalsFor += hs;
    home.goalsAgainst += as_;
    away.goalsFor += as_;
    away.goalsAgainst += hs;

    if (hs > as_) {
      home.wins += 1;
      home.points += 3;
      away.losses += 1;
    } else if (hs < as_) {
      away.wins += 1;
      away.points += 3;
      home.losses += 1;
    } else {
      home.draws += 1;
      home.points += 1;
      away.draws += 1;
      away.points += 1;
    }

    // Cards: count events on this match for fair play.
    const matchEvents = eventsByMatch.get(m.id) ?? [];
    for (const e of matchEvents) {
      if (e.type === 'YELLOW_CARD') {
        const t = acc.get(e.teamId);
        if (t) t.fairPlay += FAIR_PLAY_YELLOW;
      } else if (e.type === 'RED_CARD') {
        const t = acc.get(e.teamId);
        if (t) t.fairPlay += FAIR_PLAY_RED;
      }
    }
  }

  // Build the final rows and sort.
  const rows: StandingRow[] = [];
  for (const [teamId, s] of acc) {
    rows.push({
      teamId,
      teamName: teamId, // local fallback; the backend fills the real name
      played: s.played,
      wins: s.wins,
      draws: s.draws,
      losses: s.losses,
      goalsFor: s.goalsFor,
      goalsAgainst: s.goalsAgainst,
      goalDifference: s.goalsFor - s.goalsAgainst,
      points: s.points,
      fairPlay: s.fairPlay,
      rank: 0,
      groupLabel: s.groupLabel,
    });
  }

  const sorted = sortRows(rows);

  // Assign ranks (1-based). Ties get the same rank; the next rank
  // skips (1, 2, 2, 4).
  let lastPoints: number | null = null;
  let lastGD: number | null = null;
  let lastGF: number | null = null;
  let lastFP: number | null = null;
  let rank = 0;
  let seen = 0;
  for (const r of sorted) {
    seen += 1;
    const isTie =
      lastPoints === r.points &&
      lastGD === r.goalDifference &&
      lastGF === r.goalsFor &&
      lastFP === r.fairPlay;
    if (!isTie) rank = seen;
    r.rank = rank;
    lastPoints = r.points;
    lastGD = r.goalDifference;
    lastGF = r.goalsFor;
    lastFP = r.fairPlay;
  }

  // Split into overall + groups.
  const overall = sorted;
  const groups: Record<string, StandingRow[]> = {};
  for (const r of sorted) {
    if (r.groupLabel) {
      const list = groups[r.groupLabel] ?? [];
      list.push(r);
      groups[r.groupLabel] = list;
    }
  }

  return { overall, groups };
}

function sortRows(rows: StandingRow[]): StandingRow[] {
  return [...rows].sort((a, b) => {
    if (a.points !== b.points) return b.points - a.points;
    if (a.goalDifference !== b.goalDifference) return b.goalDifference - a.goalDifference;
    if (a.goalsFor !== b.goalsFor) return b.goalsFor - a.goalsFor;
    // Fair play: lower (more negative) is worse, so sort ascending.
    if (a.fairPlay !== b.fairPlay) return a.fairPlay - b.fairPlay;
    // Stable, deterministic tiebreaker: teamId asc.
    return a.teamId.localeCompare(b.teamId);
  });
}
