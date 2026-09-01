// Knockout / bracket service.
//
// Returns all knockout-stage matches for a league, organized by stage.
// The frontend renders this as a bracket visualization.

import { prisma } from '../../shared/prisma/prisma.client.js';

export interface KnockoutMatch {
  id: string;
  stage: 'QUARTERS' | 'SEMIS' | 'FINAL' | 'THIRD_PLACE';
  position: number;
  homeTeamId: string | null;
  homeTeamName: string | null;
  awayTeamId: string | null;
  awayTeamName: string | null;
  homeScore: number | null;
  awayScore: number | null;
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED';
  scheduledAt: string;
  feedsIntoMatchId: string | null;
}

export interface KnockoutBracket {
  quarters: KnockoutMatch[];
  semis: KnockoutMatch[];
  final: KnockoutMatch | null;
  thirdPlace: KnockoutMatch | null;
  champion: { teamId: string; teamName: string } | null;
  /** Map of teamId → minimal team data for frontend name/badge lookup. */
  teams: Record<string, {
    id: string;
    name: string;
    shortName: string;
    emoji: string | null;
    primaryColor: string;
    secondaryColor: string;
  }>;
}

export const knockoutService = {
  async getBracket(leagueId: string): Promise<KnockoutBracket> {
    const matches = await prisma.match.findMany({
      where: { leagueId, knockoutStage: { not: null } },
      include: { homeTeam: true, awayTeam: true },
      orderBy: [{ knockoutStage: 'asc' }, { knockoutPosition: 'asc' }],
    });

    const toKnockout = (m: typeof matches[number]): KnockoutMatch => ({
      id: m.id,
      stage: m.knockoutStage as 'QUARTERS' | 'SEMIS' | 'FINAL' | 'THIRD_PLACE',
      position: m.knockoutPosition ?? 0,
      homeTeamId: m.homeTeamId,
      homeTeamName: m.homeTeam?.name ?? null,
      awayTeamId: m.awayTeamId,
      awayTeamName: m.awayTeam?.name ?? null,
      homeScore: m.homeScore,
      awayScore: m.awayScore,
      status: m.status as 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED',
      scheduledAt: m.scheduledAt.toISOString(),
      feedsIntoMatchId: m.knockoutFeedsIntoMatchId,
    });

    const quarters = matches
      .filter((m) => m.knockoutStage === 'QUARTERS')
      .map(toKnockout);
    const semis = matches
      .filter((m) => m.knockoutStage === 'SEMIS')
      .map(toKnockout);
    const finalMatch = matches.find((m) => m.knockoutStage === 'FINAL');
    const thirdPlaceMatch = matches.find((m) => m.knockoutStage === 'THIRD_PLACE');

    // Champion = winner of the final.
    let champion: { teamId: string; teamName: string } | null = null;
    if (finalMatch && finalMatch.status === 'COMPLETED') {
      const winnerId = (finalMatch.homeScore ?? 0) > (finalMatch.awayScore ?? 0)
        ? finalMatch.homeTeamId
        : finalMatch.awayTeamId;
      const winnerTeam = winnerId === finalMatch.homeTeamId
        ? finalMatch.homeTeam
        : finalMatch.awayTeam;
      champion = { teamId: winnerId, teamName: winnerTeam.name };
    }

    // Build a teams map for the frontend to look up names/badges.
    const teamsMap = new Map<string, { id: string; name: string; shortName: string; emoji: string | null; primaryColor: string; secondaryColor: string }>();
    for (const m of matches) {
      if (m.homeTeam) teamsMap.set(m.homeTeam.id, { id: m.homeTeam.id, name: m.homeTeam.name, shortName: m.homeTeam.shortName, emoji: m.homeTeam.emoji, primaryColor: m.homeTeam.primaryColor, secondaryColor: m.homeTeam.secondaryColor });
      if (m.awayTeam) teamsMap.set(m.awayTeam.id, { id: m.awayTeam.id, name: m.awayTeam.name, shortName: m.awayTeam.shortName, emoji: m.awayTeam.emoji, primaryColor: m.awayTeam.primaryColor, secondaryColor: m.awayTeam.secondaryColor });
    }

    return {
      quarters,
      semis,
      final: finalMatch ? toKnockout(finalMatch) : null,
      thirdPlace: thirdPlaceMatch ? toKnockout(thirdPlaceMatch) : null,
      champion,
      teams: Object.fromEntries(teamsMap),
    };
  },
};
