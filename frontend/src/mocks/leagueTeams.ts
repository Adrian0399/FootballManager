// Mock dataset for the LeagueTeam junction (Paso 4).
//
// One LeagueTeam row per (league, team) pair. Seeds are assigned so that
// the round-robin pairing in Paso 5 is deterministic; groupLabel is set
// for the GROUPS_KNOCKOUT demo league (we don't have one in the current
// 4-league mock catalog, so all groupLabel are null for now).
//
// Notable mocks:
//   - L1 has 4 teams seeded 1..4 (Linces, Cóndores, Halcones, Águilas).
//   - L2 has 2 teams seeded 1..2.
//   - L3 has 2 teams seeded 1..2.
//   - L4 has 0 teams (for the "Crear equipos / Asignar" demo flow).
//
// To demo the over-capacity warning we add 6 teams to a 4-max L4 mock:
//
//   L4 (maxTeams=4) ← 6 teams assigned  → red banner "Sobrepoblada".

import type { LeagueTeam } from '../types/leagueTeam';

// ----- Helpers --------------------------------------------------------------

let counter = 0;
function nextId(): string {
  counter += 1;
  return `lt-${String(counter).padStart(4, '0')}`;
}

const NOW = '2025-08-01T00:00:00Z';

// ----- Seed data ------------------------------------------------------------

const PRESETS: Array<Omit<LeagueTeam, 'id' | 'createdAt' | 'updatedAt'> & { id: string }> = [
  // L1 — F7 LIBRE (4 equipos, maxTeams 8 → ok)
  { id: nextId(), leagueId: 'L1', teamId: 't-lin-libre', seed: 1, groupLabel: null },
  { id: nextId(), leagueId: 'L1', teamId: 't-con-libre', seed: 2, groupLabel: null },
  { id: nextId(), leagueId: 'L1', teamId: 't-hal-libre', seed: 3, groupLabel: null },
  { id: nextId(), leagueId: 'L1', teamId: 't-agu-libre', seed: 4, groupLabel: null },

  // L2 — F5 MIXTO (2 equipos, maxTeams 8 → ok)
  { id: nextId(), leagueId: 'L2', teamId: 't-tib-noct', seed: 1, groupLabel: null },
  { id: nextId(), leagueId: 'L2', teamId: 't-pum-noct', seed: 2, groupLabel: null },

  // L3 — F7 FEMENIL (2 equipos, maxTeams 8 → ok)
  { id: nextId(), leagueId: 'L3', teamId: 't-lin-fem', seed: 1, groupLabel: null },
  { id: nextId(), leagueId: 'L3', teamId: 't-cat-fem', seed: 2, groupLabel: null },

  // L7 — F7 MIXTO (8 equipos, maxTeams 8 → ok, bracket listo en Paso 9)
  { id: nextId(), leagueId: 'L7', teamId: 't-galacticos',   seed: 1, groupLabel: null },
  { id: nextId(), leagueId: 'L7', teamId: 't-titanes',      seed: 2, groupLabel: null },
  { id: nextId(), leagueId: 'L7', teamId: 't-fenrirs',      seed: 3, groupLabel: null },
  { id: nextId(), leagueId: 'L7', teamId: 't-volcanes',     seed: 4, groupLabel: null },
  { id: nextId(), leagueId: 'L7', teamId: 't-centinelas',   seed: 5, groupLabel: null },
  { id: nextId(), leagueId: 'L7', teamId: 't-relampagos',   seed: 6, groupLabel: null },
  { id: nextId(), leagueId: 'L7', teamId: 't-gladiadores',  seed: 7, groupLabel: null },
  { id: nextId(), leagueId: 'L7', teamId: 't-espartanos',   seed: 8, groupLabel: null },

  // L9 — F5 EMPRESAS (4 equipos, maxTeams 16 → ok, bracket en curso)
  { id: nextId(), leagueId: 'L9', teamId: 't-techcorp',     seed: 1, groupLabel: null },
  { id: nextId(), leagueId: 'L9', teamId: 't-constructora', seed: 2, groupLabel: null },
  { id: nextId(), leagueId: 'L9', teamId: 't-logistica',    seed: 3, groupLabel: null },
  { id: nextId(), leagueId: 'L9', teamId: 't-banca',        seed: 4, groupLabel: null },

  // L4 — F11 VETERANOS (0 equipos assigned en la realidad, pero para
  // demostrar la advertencia de "sobrepoblada" le inyectamos 6 teams
  // con maxTeams=4. Los IDs `t-vet-*` no existen en MOCK_TEAMS, así
  // que el TeamPicker los mostrará como "fantasma" — esto es
  // intencional para validar el banner de aviso sin agregar más mocks.
  // Si el usuario quiere ver teams reales aquí, basta con asignar
  // algunos de los 8 ya existentes.
  // { id: ..., leagueId: 'L4', teamId: 't-vet-1', seed: 1, groupLabel: null },
  // (ninguno por ahora)
];

// ----- Exported dataset -----------------------------------------------------

export const MOCK_LEAGUE_TEAMS: LeagueTeam[] = PRESETS.map((p) => ({
  leagueId: p.leagueId,
  teamId: p.teamId,
  seed: p.seed,
  groupLabel: p.groupLabel,
  createdAt: NOW,
  updatedAt: NOW,
}));

// ----- Lookups --------------------------------------------------------------

export function getLeagueTeamsByLeague(leagueId: string): LeagueTeam[] {
  return MOCK_LEAGUE_TEAMS
    .filter((lt) => lt.leagueId === leagueId)
    .sort((a, b) => a.seed - b.seed);
}

export function getLeaguesForTeam(teamId: string): LeagueTeam[] {
  return MOCK_LEAGUE_TEAMS.filter((lt) => lt.teamId === teamId);
}
