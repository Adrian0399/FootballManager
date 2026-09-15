// Knockout bracket mocks (Paso 9).
//
// Two brackets are pre-generated:
//
//   L7 — Copa de Verano 2025 (F7 MIXTO), 8 teams, fully completed.
//        Champion: Espartanos. Bracket order: 1v8, 4v5, 2v7, 3v6
//        (standard seeding: top seed plays bottom seed).
//
//   L9 — Copa Empresas 2025 (F5 EMPRESAS), 4 teams, in progress.
//        Semis: TechCorp beat Constructora 3-1. Logística vs Banca
//        still IN_PROGRESS. Final: PENDING.
//
// All bracket matches are regular `Match` records with `knockoutStage`
// and `knockoutPosition` populated, so the existing MatchDetailPage
// works for them too.

import type { Match } from '../types/match';

const NOW = '2025-08-15T19:00:00.000Z';

// ----- L7: Copa de Verano 2025 (COMPLETED) ---------------------------------
//
// 8 teams seeded 1..8. Standard 1v8, 4v5, 2v7, 3v6 bracket.
//
//  Cuartos:
//    M1:  Galácticos (1) 3 - 1 Titanes       (8) → Galácticos
//    M2:  Fenrirs     (4) 2 - 1 Volcanes     (5) → Fenrirs
//    M3:  Titanes  ← wait — need 2v7 — let me re-do this
//
// Standard bracket pairing: 1v8, 4v5, 2v7, 3v6. Winners form the
// semis as (M1 winner vs M2 winner) and (M3 winner vs M4 winner).
//
// Semis:
//    S1:  Galácticos  2 - 1 Fenrirs
//    S2:  Gladiadores 1 - 3 Espartanos
//
// Final:
//    F1:  Galácticos 1 - 2 Espartanos     → Espartanos 🏆

const L7_BRACKET: Match[] = [
  // ----- Cuartos -----
  {
    id: 'ko-l7-q-1',
    leagueId: 'L7',
    matchdayId: 'ko-quarters',
    homeTeamId: 't-galacticos',
    awayTeamId: 't-titanes',
    fieldId: 'f-coloso-1',
    scheduledAt: '2025-07-19T19:00:00.000Z',
    status: 'COMPLETED',
    homeScore: 3,
    awayScore: 1,
    refereeId: 'u-002',
    mvpPlayerId: null,
    scoringMode: 'POST_MATCH',
    notes: null,
    createdAt: NOW,
    updatedAt: NOW,
    knockoutStage: 'QUARTERS',
    knockoutPosition: 1,
    knockoutFeedsIntoMatchId: 'ko-l7-s-1',
  },
  {
    id: 'ko-l7-q-2',
    leagueId: 'L7',
    matchdayId: 'ko-quarters',
    homeTeamId: 't-fenrirs',
    awayTeamId: 't-volcanes',
    fieldId: 'f-sur-f5a',
    scheduledAt: '2025-07-19T20:30:00.000Z',
    status: 'COMPLETED',
    homeScore: 2,
    awayScore: 1,
    refereeId: 'u-003',
    mvpPlayerId: null,
    scoringMode: 'POST_MATCH',
    notes: null,
    createdAt: NOW,
    updatedAt: NOW,
    knockoutStage: 'QUARTERS',
    knockoutPosition: 2,
    knockoutFeedsIntoMatchId: 'ko-l7-s-1',
  },
  {
    id: 'ko-l7-q-3',
    leagueId: 'L7',
    matchdayId: 'ko-quarters',
    homeTeamId: 't-gladiadores',
    awayTeamId: 't-centinelas',
    fieldId: 'f-bombonerita',
    scheduledAt: '2025-07-20T19:00:00.000Z',
    status: 'COMPLETED',
    homeScore: 2,
    awayScore: 3,
    refereeId: 'u-002',
    mvpPlayerId: null,
    scoringMode: 'POST_MATCH',
    notes: null,
    createdAt: NOW,
    updatedAt: NOW,
    knockoutStage: 'QUARTERS',
    knockoutPosition: 3,
    knockoutFeedsIntoMatchId: 'ko-l7-s-2',
  },
  {
    id: 'ko-l7-q-4',
    leagueId: 'L7',
    matchdayId: 'ko-quarters',
    homeTeamId: 't-espartanos',
    awayTeamId: 't-relampagos',
    fieldId: 'f-coloso-1',
    scheduledAt: '2025-07-20T20:30:00.000Z',
    status: 'COMPLETED',
    homeScore: 1,
    awayScore: 0,
    refereeId: 'u-003',
    mvpPlayerId: null,
    scoringMode: 'POST_MATCH',
    notes: null,
    createdAt: NOW,
    updatedAt: NOW,
    knockoutStage: 'QUARTERS',
    knockoutPosition: 4,
    knockoutFeedsIntoMatchId: 'ko-l7-s-2',
  },
  // ----- Semis -----
  {
    id: 'ko-l7-s-1',
    leagueId: 'L7',
    matchdayId: 'ko-semis',
    homeTeamId: 't-galacticos',
    awayTeamId: 't-fenrirs',
    fieldId: 'f-coloso-1',
    scheduledAt: '2025-07-26T19:00:00.000Z',
    status: 'COMPLETED',
    homeScore: 2,
    awayScore: 1,
    refereeId: 'u-002',
    mvpPlayerId: null,
    scoringMode: 'POST_MATCH',
    notes: null,
    createdAt: NOW,
    updatedAt: NOW,
    knockoutStage: 'SEMIS',
    knockoutPosition: 1,
    knockoutFeedsIntoMatchId: 'ko-l7-f-1',
  },
  {
    id: 'ko-l7-s-2',
    leagueId: 'L7',
    matchdayId: 'ko-semis',
    homeTeamId: 't-centinelas',
    awayTeamId: 't-espartanos',
    fieldId: 'f-sur-f5a',
    scheduledAt: '2025-07-26T20:30:00.000Z',
    status: 'COMPLETED',
    homeScore: 1,
    awayScore: 3,
    refereeId: 'u-003',
    mvpPlayerId: null,
    scoringMode: 'POST_MATCH',
    notes: null,
    createdAt: NOW,
    updatedAt: NOW,
    knockoutStage: 'SEMIS',
    knockoutPosition: 2,
    knockoutFeedsIntoMatchId: 'ko-l7-f-1',
  },
  // ----- Final -----
  {
    id: 'ko-l7-f-1',
    leagueId: 'L7',
    matchdayId: 'ko-final',
    homeTeamId: 't-galacticos',
    awayTeamId: 't-espartanos',
    fieldId: 'f-coloso-1',
    scheduledAt: '2025-08-02T20:00:00.000Z',
    status: 'COMPLETED',
    homeScore: 1,
    awayScore: 2,
    refereeId: 'u-002',
    mvpPlayerId: null,
    scoringMode: 'POST_MATCH',
    notes: 'Final de Copa de Verano 2025. Espartanos se corona campeón.',
    createdAt: NOW,
    updatedAt: NOW,
    knockoutStage: 'FINAL',
    knockoutPosition: 1,
    knockoutFeedsIntoMatchId: null,
  },
];

// ----- L9: Copa Empresas 2025 (EN CURSO) ----------------------------------
//
// 4 teams → 2 semis + 1 final. Semis in progress (1 done, 1 in
// progress). Final still pending.

const L9_BRACKET: Match[] = [
  // ----- Semis -----
  {
    id: 'ko-l9-s-1',
    leagueId: 'L9',
    matchdayId: 'ko-semis',
    homeTeamId: 't-techcorp',
    awayTeamId: 't-constructora',
    fieldId: 'f-indoor-downtown',
    scheduledAt: '2025-11-09T19:00:00.000Z',
    status: 'COMPLETED',
    homeScore: 3,
    awayScore: 1,
    refereeId: 'u-004',
    mvpPlayerId: null,
    scoringMode: 'POST_MATCH',
    notes: null,
    createdAt: NOW,
    updatedAt: NOW,
    knockoutStage: 'SEMIS',
    knockoutPosition: 1,
    knockoutFeedsIntoMatchId: 'ko-l9-f-1',
  },
  {
    id: 'ko-l9-s-2',
    leagueId: 'L9',
    matchdayId: 'ko-semis',
    homeTeamId: 't-logistica',
    awayTeamId: 't-banca',
    fieldId: 'f-indoor-downtown',
    scheduledAt: '2025-11-09T20:30:00.000Z',
    status: 'IN_PROGRESS',
    homeScore: 1,
    awayScore: 1,
    refereeId: 'u-005',
    mvpPlayerId: null,
    scoringMode: 'LIVE',
    notes: null,
    createdAt: NOW,
    updatedAt: NOW,
    knockoutStage: 'SEMIS',
    knockoutPosition: 2,
    knockoutFeedsIntoMatchId: 'ko-l9-f-1',
  },
  // ----- Final (pending) -----
  {
    id: 'ko-l9-f-1',
    leagueId: 'L9',
    matchdayId: 'ko-final',
    homeTeamId: 't-techcorp',
    awayTeamId: 'TBD', // TBD — winner of S2
    fieldId: 'f-indoor-downtown',
    scheduledAt: '2025-11-16T20:00:00.000Z',
    status: 'SCHEDULED',
    homeScore: null,
    awayScore: null,
    refereeId: null,
    mvpPlayerId: null,
    scoringMode: null,
    notes: null,
    createdAt: NOW,
    updatedAt: NOW,
    knockoutStage: 'FINAL',
    knockoutPosition: 1,
    knockoutFeedsIntoMatchId: null,
  },
];

export const MOCK_KNOCKOUT_MATCHES: Match[] = [...L7_BRACKET, ...L9_BRACKET];

// ----- Lookups --------------------------------------------------------------

export function getKnockoutMatchesByLeague(leagueId: string): Match[] {
  return MOCK_KNOCKOUT_MATCHES.filter((m) => m.leagueId === leagueId);
}

/** Returns the champion of a league's bracket, or null if not finalized. */
export function getChampion(leagueId: string): Match | null {
  const finals = MOCK_KNOCKOUT_MATCHES.filter(
    (m) => m.leagueId === leagueId && m.knockoutStage === 'FINAL' && m.status === 'COMPLETED',
  );
  if (finals.length === 0) return null;
  // The first completed final is the champion match.
  return finals[0]!;
}
