// Knockout / bracket hooks (Paso 9).
//
// v1.1: `useBracket` now reads from the backend (`GET /leagues/:id/knockout`).

import { asyncResolve, useAsync, type AsyncState } from './useAsync';
import { apiClient } from '../api/axios';
import type { SuccessEnvelope } from '../types/user';
import {
  MOCK_KNOCKOUT_MATCHES,
  getChampion,
  getKnockoutMatchesByLeague,
} from '../mocks/knockout';
import { MOCK_TEAMS } from '../mocks/teams';
import type { Match, KnockoutStage } from '../types/match';
import { STAGE_LABEL, STAGE_SHORT } from '../types/match';

export interface BracketByStage {
  stage: KnockoutStage;
  label: string;
  short: string;
  matches: Match[];
}

interface UseBracketResult {
  /** Bracket organized by stage, in chronological order. */
  byStage: BracketByStage[];
  /** All matches (flat list, ordered). */
  all: Match[];
  /** Champion (the team that won the final) or null. */
  champion: { teamId: string; teamName: string } | null;
  /** Map of teamId → team data for name/badge lookup. */
  teams: Record<string, { id: string; name: string; shortName: string; emoji: string | null; primaryColor: string; secondaryColor: string }>;
  isLoading: boolean;
  error: Error | null;
}

const STAGE_ORDER: KnockoutStage[] = ['QUARTERS', 'SEMIS', 'FINAL'];

export function useBracket(leagueId: string | null | undefined): AsyncState<UseBracketResult> {
  const key = leagueId ?? '__none__';
  const loader = (_k: string) => {
    if (!leagueId) {
      return asyncResolve<UseBracketResult>({
        byStage: [],
        all: [],
        champion: null,
        teams: {},
        isLoading: false,
        error: null,
      });
    }
    return apiClient
      .get<SuccessEnvelope<{
        quarters: Match[];
        semis: Match[];
        final: Match | null;
        thirdPlace: Match | null;
        champion: { teamId: string; teamName: string } | null;
        teams: Record<string, { id: string; name: string; shortName: string; emoji: string | null; primaryColor: string; secondaryColor: string }>;
      }>>(`/leagues/${leagueId}/knockout`)
      .then((r) => {
        const d = r.data.data;
        const quarters = d.quarters;
        const semis = d.semis;
        const finalMatch = d.final;
        const thirdPlace = d.thirdPlace;

        const byStage: BracketByStage[] = STAGE_ORDER.map((stage) => {
          const list =
            stage === 'QUARTERS' ? quarters :
            stage === 'SEMIS' ? semis :
            stage === 'FINAL' && finalMatch ? [finalMatch] : [];
          return {
            stage,
            label: STAGE_LABEL[stage],
            short: STAGE_SHORT[stage],
            matches: list,
          };
        }).filter((s) => s.matches.length > 0);

        const all = [...quarters, ...semis, ...(finalMatch ? [finalMatch] : []), ...(thirdPlace ? [thirdPlace] : [])];
        all.sort((a, b) => {
          const stageCmp =
            STAGE_ORDER.indexOf(a.knockoutStage ?? 'FINAL') - STAGE_ORDER.indexOf(b.knockoutStage ?? 'FINAL');
          return stageCmp !== 0
            ? stageCmp
            : (a.knockoutPosition ?? 0) - (b.knockoutPosition ?? 0);
        });

        return {
          byStage,
          all,
          champion: d.champion,
          teams: d.teams ?? {},
          isLoading: false,
          error: null,
        };
      });
  };
  return useAsync<UseBracketResult>(loader, key);
}

function emptyResult(): UseBracketResult {
  return { byStage: [], all: [], champion: null, teams: {}, isLoading: false, error: null } as UseBracketResult;
}

// ----- Helpers --------------------------------------------------------------

/** Returns the winner team id of a match, or null. */
export function getWinnerTeamId(match: Match): string | null {
  if (match.status !== 'COMPLETED') return null;
  if (match.homeScore == null || match.awayScore == null) return null;
  if (match.homeScore > match.awayScore) return match.homeTeamId;
  if (match.awayScore > match.homeScore) return match.awayTeamId;
  return null; // draw — knockouts need a winner, this would go to penalties
}

/** Returns the team name (or "TBD" for not-yet-decided). */
export function getBracketTeamName(teamId: string | null | undefined): string {
  if (!teamId || teamId === 'TBD') return 'TBD';
  return MOCK_TEAMS.find((t) => t.id === teamId)?.name ?? teamId;
}

/** Returns the team short name (or "TBD"). */
export function getBracketTeamShort(teamId: string | null | undefined): string {
  if (!teamId || teamId === 'TBD') return 'TBD';
  return MOCK_TEAMS.find((t) => t.id === teamId)?.shortName ?? teamId.slice(-3);
}

export { MOCK_KNOCKOUT_MATCHES, STAGE_LABEL, STAGE_SHORT };
