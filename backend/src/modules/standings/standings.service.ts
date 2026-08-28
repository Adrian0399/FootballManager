// Standings computation — moved from frontend/src/utils/standings.ts.
//
// Server-side version of the pure function. The frontend's
// `useStandings` will swap from local to a fetch against this endpoint.

import { prisma } from '../../shared/prisma/prisma.client.js';

export interface StandingRow {
  teamId: string;
  teamName: string;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  fairPlay: number;
  rank: number;
  groupLabel: string | null;
}

export interface StandingsResult {
  overall: StandingRow[];
  groups: Record<string, StandingRow[]>;
}

interface ComputeOptions {
  matches: Array<{
    homeTeamId: string;
    awayTeamId: string;
    homeScore: number | null;
    awayScore: number | null;
    status: string;
  }>;
  leagueTeams: Array<{ teamId: string; groupLabel: string | null }>;
  /** Map teamId → team name (so the response has a name column too). */
  teamNames?: Map<string, string>;
}

function applyFilters(opts: ComputeOptions): StandingsResult {
  const acc = new Map<string, {
    teamId: string;
    teamName: string;
    played: number;
    wins: number;
    draws: number;
    losses: number;
    goalsFor: number;
    goalsAgainst: number;
    points: number;
    fairPlay: number;
    groupLabel: string | null;
  }>();
  type AccRow = {
    teamId: string;
    teamName: string;
    played: number;
    wins: number;
    draws: number;
    losses: number;
    goalsFor: number;
    goalsAgainst: number;
    points: number;
    fairPlay: number;
    groupLabel: string | null;
  };

  for (const lt of opts.leagueTeams) {
    const row: AccRow = {
      teamId: lt.teamId,
      teamName: opts.teamNames?.get(lt.teamId) ?? lt.teamId,
      played: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      points: 0,
      fairPlay: 0,
      groupLabel: lt.groupLabel,
    };
    acc.set(lt.teamId, row);
  }

  const completed = opts.matches.filter(
    (m) => m.status === 'COMPLETED' && m.homeScore != null && m.awayScore != null,
  );

  for (const m of completed) {
    const h = acc.get(m.homeTeamId);
    const a = acc.get(m.awayTeamId);
    if (!h || !a) continue;
    const hs = m.homeScore ?? 0;
    const as_ = m.awayScore ?? 0;
    h.played += 1;
    a.played += 1;
    h.goalsFor += hs;
    h.goalsAgainst += as_;
    a.goalsFor += as_;
    a.goalsAgainst += hs;
    if (hs > as_) { h.wins += 1; h.points = (h.points ?? 0) + 3; a.losses += 1; }
    else if (hs < as_) { a.wins += 1; a.points = (a.points ?? 0) + 3; h.losses += 1; }
    else { h.draws += 1; h.points = (h.points ?? 0) + 1; a.draws += 1; a.points = (a.points ?? 0) + 1; }
  }

  const rows: StandingRow[] = [];
  for (const v of acc.values()) {
    rows.push({
      teamId: v.teamId,
      teamName: v.teamName,
      played: v.played,
      wins: v.wins,
      draws: v.draws,
      losses: v.losses,
      goalsFor: v.goalsFor,
      goalsAgainst: v.goalsAgainst,
      goalDifference: v.goalsFor - v.goalsAgainst,
      points: v.points,
      fairPlay: v.fairPlay,
      rank: 0,
      groupLabel: v.groupLabel,
    });
  }
  void rows; // satisfy unused-var checker in strict mode

  const sortFn = (a: StandingRow, b: StandingRow): number => {
    if (a.points !== b.points) return b.points - a.points;
    const aGD = a.goalDifference;
    const bGD = b.goalDifference;
    if (aGD !== bGD) return bGD - aGD;
    if (a.goalsFor !== b.goalsFor) return b.goalsFor - a.goalsFor;
    if (a.fairPlay !== b.fairPlay) return a.fairPlay - b.fairPlay;
    return a.teamId.localeCompare(b.teamId);
  };
  const sorted = [...rows].sort(sortFn);

  // Assign ranks (1, 2, 2, 4 tie logic).
  let lastKey: string | null = null;
  let rank = 0;
  let seen = 0;
  for (const r of sorted) {
    seen += 1;
    const key = `${r.points}|${r.goalDifference}|${r.goalsFor}|${r.fairPlay}`;
    if (key !== lastKey) {
      rank = seen;
      lastKey = key;
    }
    r.rank = rank;
  }

  void sortFn; // satisfy unused-var checker in strict mode

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

export const standingsService = {
  async computeForLeague(leagueId: string): Promise<StandingsResult> {
    const matchesPromise = prisma.match.findMany({
      where: { leagueId, status: 'COMPLETED' },
      select: {
        homeTeamId: true,
        awayTeamId: true,
        homeScore: true,
        awayScore: true,
        status: true,
      },
    });
    const leagueTeamsPromise = prisma.leagueTeam.findMany({
      where: { leagueId },
      select: { teamId: true, groupLabel: true },
    });
    const [matches, leagueTeamsRaw, teams] = await Promise.all([
      matchesPromise,
      leagueTeamsPromise,
      prisma.team.findMany({
        where: { id: { in: (await leagueTeamsPromise).map((lt) => lt.teamId) } },
        select: { id: true, name: true },
      }),
    ]);
    const leagueTeams = leagueTeamsRaw;

    const teamNames = new Map(teams.map((t) => [t.id, t.name]));
    return applyFilters({
      matches: matches.map((m) => ({
        homeTeamId: m.homeTeamId,
        awayTeamId: m.awayTeamId,
        homeScore: m.homeScore,
        awayScore: m.awayScore,
        status: m.status,
      })),
      leagueTeams,
      teamNames,
    });
  },
};

export { applyFilters as computeStandings };
