// Mock dataset for the Teams step (v1.0.0 Paso 3).
//
// Generates three connected datasets used by the team pages and hooks:
//   - MOCK_USERS        : 52 users across the 5 roles
//   - MOCK_LEAGUES      : 10 leagues (subset of the v1 catalog)
//   - MOCK_TEAMS        : 8 teams across 3 active leagues (mixed formats)
//   - MOCK_MEMBERSHIPS  : ~50 TeamMembership rows
//                        (includes the "Juan en 4 equipos" example
//                         from the roadmap §1)
//
// Data is generated once at module load, deterministically, so the user
// sees the same teams every time they refresh. The lookups below
// (`getUserById`, `getTeamById`, …) let the rest of the app consume
// the data without re-iterating arrays.
//
// Swap-to-API note: when the real backend lands, replace the call sites
// of these mocks in `hooks/teams.ts` with the corresponding `teamsApi` /
// `usersApi` calls. The shapes match the planned Prisma models so the
// UI should be a straight drop-in.

import type { User } from '../types/user';
import type { League, LeagueFormat } from '../types/league';
import type { Team, TeamMembership, Position } from '../types/team';

// ----- Leagues (subset of the v1 catalog) -----------------------------------

export const MOCK_LEAGUES: League[] = [
  {
    id: 'L1',
    name: 'Kaibil — Lunes Libre',
    description: 'Liga libre lunes por la noche.',
    season: 'Apertura 2025',
    startDate: '2025-08-04',
    endDate: '2025-12-15',
    isActive: true,
    fields: [],
    fieldIds: ['f-norte-1', 'f-norte-2'],
    createdAt: '2025-07-01T00:00:00Z',
    updatedAt: '2025-08-04T00:00:00Z',
    createdById: null,
    updatedById: null,
    format: '7V7',
    category: 'LIBRE',
    type: 'ROUND_ROBIN',
    matchdays: 14,
    homeAndAway: true,
    maxTeams: 8,
    dayOfWeek: 'MONDAY',
    timeSlot: 'EVENING',
    status: 'IN_PROGRESS',
  },
  {
    id: 'L2',
    name: 'Copa Nocturna Miércoles',
    description: 'Copa mixta nocturna, fase de grupos + eliminatorias.',
    season: '2025',
    startDate: '2025-09-03',
    endDate: '2025-12-17',
    isActive: true,
    fields: [],
    fieldIds: ['f-sur-f5a'],
    createdAt: '2025-08-15T00:00:00Z',
    updatedAt: '2025-09-03T00:00:00Z',
    createdById: null,
    updatedById: null,
    format: '5V5',
    category: 'MIXTO',
    type: 'GROUPS_KNOCKOUT',
    matchdays: 6,
    homeAndAway: false,
    maxTeams: 8,
    dayOfWeek: 'WEDNESDAY',
    timeSlot: 'NIGHT',
    status: 'IN_PROGRESS',
  },
  {
    id: 'L3',
    name: 'Kaibil — Femenil Martes',
    description: 'Liga femenil 7v7 martes por la noche.',
    season: 'Clausura 2025',
    startDate: '2025-09-02',
    endDate: '2026-01-20',
    isActive: true,
    fields: [],
    fieldIds: ['f-bombonerita'],
    createdAt: '2025-08-15T00:00:00Z',
    updatedAt: '2025-09-02T00:00:00Z',
    createdById: null,
    updatedById: null,
    format: '7V7',
    category: 'FEMENIL',
    type: 'ROUND_ROBIN',
    matchdays: 14,
    homeAndAway: true,
    maxTeams: 8,
    dayOfWeek: 'TUESDAY',
    timeSlot: 'EVENING',
    status: 'IN_PROGRESS',
  },
  {
    id: 'L4',
    name: 'Veteranos Domingo',
    description: 'Liga de veteranos +35, los domingos por la mañana.',
    season: 'Apertura 2025',
    startDate: '2025-08-10',
    endDate: '2025-12-14',
    isActive: true,
    fields: [],
    fieldIds: ['f-coloso-1'],
    createdAt: '2025-07-20T00:00:00Z',
    updatedAt: '2025-08-10T00:00:00Z',
    createdById: null,
    updatedById: null,
    format: '11V11',
    category: 'VETERANOS',
    type: 'ROUND_ROBIN',
    matchdays: 10,
    homeAndAway: true,
    maxTeams: 6,
    dayOfWeek: 'SUNDAY',
    timeSlot: 'MORNING',
    status: 'IN_PROGRESS',
  },
];

// ----- User generation ------------------------------------------------------
//
// 52 users total. Order matters: indices are referenced by the team
// presets below (dtIdx / asstIdx / playerIdxs).
//
//  [0..1]  ADMIN (2)
//  [2..5]  REFEREE (4)
//  [6..13] TECHNICAL_DIRECTOR (8) — one per team
//  [14..21] ASSISTANT (8) — one per team
//  [22..51] PLAYER (30) — distributed across teams; "Juan" is #22 and
//                          is intentionally in 4 teams (the roadmap
//                          example §1).

const FIRST_NAMES_DT = [
  'Fernando', // t-lin-libre
  'Andrés',   // t-con-libre
  'Pablo',    // t-hal-libre
  'Ricardo',  // t-agu-libre
  'Diego',    // t-tib-noct
  'Manuel',   // t-pum-noct
  'Sofía',    // t-lin-fem
  'Carmen',   // t-cat-fem
];
const FIRST_NAMES_ASSISTANT = [
  'Miguel', 'Luis', 'Javier', 'Francisco',
  'Antonio', 'David', 'Patricia', 'Marta',
];
const FIRST_NAMES_PLAYER = [
  'Juan',          // 22 — THE multi-team player
  'Carlos',        // 23
  'Miguel Ángel',  // 24
  'Luis',          // 25
  'Antonio',       // 26
  'Francisco',     // 27
  'David',         // 28
  'Diego',         // 29
  'Pedro',         // 30
  'Ángel',         // 31
  'Jesús',         // 32
  'Roberto',       // 33
  'Daniel',        // 34
  'Alejandro',     // 35
  'Manuel',        // 36
  'María',         // 37
  'Carmen',        // 38
  'Ana',           // 39
  'Laura',         // 40
  'Isabel',        // 41
  'Sofía',         // 42
  'Lucía',         // 43
  'Andrea',        // 44
  'Gabriela',      // 45
  'Valentina',     // 46
  'Camila',        // 47
  'Ximena',        // 48
  'Fernanda',      // 49
  'Daniela',       // 50
  'Paola',         // 51
];
const LAST_NAMES = [
  'García', 'Rodríguez', 'González', 'Hernández', 'López', 'Martínez',
  'Sánchez', 'Pérez', 'Gómez', 'Martín', 'Jiménez', 'Ruiz',
  'Díaz', 'Moreno', 'Romero', 'Alonso', 'Navarro', 'Torres',
  'Domínguez', 'Vázquez', 'Ramos', 'Gil', 'Molina', 'Serrano',
  'Blanco', 'Suárez', 'Castro', 'Ortega', 'Delgado', 'Marín',
];

function pickLastName(idx: number): { paternal: string; maternal: string } {
  return {
    paternal: LAST_NAMES[idx % LAST_NAMES.length]!,
    maternal: LAST_NAMES[(idx + 11) % LAST_NAMES.length]!,
  };
}

function mkUser(
  idx: number,
  firstName: string,
  role: User['role'],
  nickname: string | null = null,
): User {
  const { paternal, maternal } = pickLastName(idx);
  const roleEmail =
    role === 'PLAYER' ? 'player' :
    role === 'REFEREE' ? 'ref' :
    role === 'TECHNICAL_DIRECTOR' ? 'dt' :
    role === 'ASSISTANT' ? 'asst' :
    'admin';
  return {
    id: `u-${String(idx).padStart(3, '0')}`,
    firstName,
    paternalSurname: paternal,
    maternalSurname: maternal,
    birthDate: '1990-01-01',
    age: 30,
    role,
    nickname,
    phoneNumber: `+52 55 5${String(1000 + idx).padStart(4, '0')} ${String(1000 + idx * 7 % 9000 + 1000).padStart(4, '0')}`,
    email: `${firstName.toLowerCase().replace(/\s+/g, '.')}.${paternal.toLowerCase()}.${roleEmail}@kaibil.local`,
    curp: `KBL${String(idx).padStart(4, '0')}${paternal.slice(0, 2).toUpperCase()}970101`,
    isActive: true,
    profilePhotoUrl: null,
    coverPhotoUrl: null,
    createdAt: '2025-07-01T00:00:00Z',
    updatedAt: '2025-07-01T00:00:00Z',
  };
}

export const MOCK_USERS: User[] = [
  // [0..1] ADMIN
  mkUser(0, 'José', 'ADMIN', 'El Profe'),
  mkUser(1, 'Lucía', 'ADMIN'),
  // [2..5] REFEREE
  mkUser(2, 'Roberto', 'REFEREE', 'Beto'),
  mkUser(3, 'María', 'REFEREE'),
  mkUser(4, 'Sergio', 'REFEREE'),
  mkUser(5, 'Laura', 'REFEREE'),
  // [6..13] TECHNICAL_DIRECTOR
  ...FIRST_NAMES_DT.map((n, i) => mkUser(6 + i, n, 'TECHNICAL_DIRECTOR')),
  // [14..21] ASSISTANT
  ...FIRST_NAMES_ASSISTANT.map((n, i) => mkUser(14 + i, n, 'ASSISTANT')),
  // [22..51] PLAYER
  ...FIRST_NAMES_PLAYER.map((n, i) => mkUser(22 + i, n, 'PLAYER', i === 0 ? 'El Rayo' : null)),
];

// ----- Team generation ------------------------------------------------------

interface TeamPreset {
  id: string;
  name: string;
  shortName: string;
  emoji: string;
  primaryColor: string;
  secondaryColor: string;
  leagueId: string;
  format: LeagueFormat;
  homeFieldId: string;
  /** Index into MOCK_USERS. */
  dtIdx: number;
  /** Index into MOCK_USERS. */
  asstIdx: number;
  /** Indices into MOCK_USERS for the players on this team. */
  playerIdxs: number[];
  /** Captain index (within playerIdxs, not the user list). */
  captainLocalIdx: number;
}

const TEAM_PRESETS: TeamPreset[] = [
  // L1 — F7 LIBRE (4 teams)
  {
    id: 't-lin-libre',
    name: 'Linces FC',
    shortName: 'LIN',
    emoji: '🦁',
    primaryColor: '#FFE600',
    secondaryColor: '#0A0A0A',
    leagueId: 'L1',
    format: '7V7',
    homeFieldId: 'f-norte-1',
    dtIdx: 6,
    asstIdx: 14,
    // "Juan" (22) is in 4 teams — start with him.
    playerIdxs: [22, 23, 24, 25, 26, 27, 28, 29, 30, 31],
    captainLocalIdx: 0,
  },
  {
    id: 't-con-libre',
    name: 'Cóndores',
    shortName: 'CON',
    emoji: '🦅',
    primaryColor: '#FF3D5A',
    secondaryColor: '#0A0A0A',
    leagueId: 'L1',
    format: '7V7',
    homeFieldId: 'f-norte-1',
    dtIdx: 7,
    asstIdx: 15,
    playerIdxs: [32, 33, 34, 35, 36, 37, 38, 39, 40, 41],
    captainLocalIdx: 0,
  },
  {
    id: 't-hal-libre',
    name: 'Halcones United',
    shortName: 'HAL',
    emoji: '🦅',
    primaryColor: '#00D9FF',
    secondaryColor: '#0A0A0A',
    leagueId: 'L1',
    format: '7V7',
    homeFieldId: 'f-norte-2',
    dtIdx: 8,
    asstIdx: 16,
    playerIdxs: [42, 43, 44, 45, 46, 47, 48, 49, 50, 51],
    captainLocalIdx: 0,
  },
  {
    id: 't-agu-libre',
    name: 'Águilas del Sur',
    shortName: 'AGU',
    emoji: '🔥',
    primaryColor: '#FF2E93',
    secondaryColor: '#FFFFFF',
    leagueId: 'L1',
    format: '7V7',
    homeFieldId: 'f-norte-2',
    dtIdx: 9,
    asstIdx: 17,
    // Includes "Juan" (22) — his 2nd team.
    playerIdxs: [22, 24, 26, 28, 30, 32, 34, 36, 38, 40],
    captainLocalIdx: 1,
  },

  // L2 — F5 MIXTO (2 teams)
  {
    id: 't-tib-noct',
    name: 'Tiburones FC',
    shortName: 'TIB',
    emoji: '🦈',
    primaryColor: '#0E0F1A',
    secondaryColor: '#C6FF3D',
    leagueId: 'L2',
    format: '5V5',
    homeFieldId: 'f-sur-f5a',
    dtIdx: 10,
    asstIdx: 18,
    // Includes "Juan" — his 3rd team.
    playerIdxs: [22, 25, 27, 29, 31, 33, 35, 37],
    captainLocalIdx: 0,
  },
  {
    id: 't-pum-noct',
    name: 'Pumas Nocturnos',
    shortName: 'PUM',
    emoji: '🐆',
    primaryColor: '#0E0F1A',
    secondaryColor: '#FFFFFF',
    leagueId: 'L2',
    format: '5V5',
    homeFieldId: 'f-sur-f5a',
    dtIdx: 11,
    asstIdx: 19,
    playerIdxs: [39, 41, 43, 45, 47, 49, 51, 23],
    captainLocalIdx: 0,
  },

  // L3 — F7 FEMENIL (2 teams)
  {
    id: 't-lin-fem',
    name: 'Lincelas FC',
    shortName: 'LFL',
    emoji: '🦁',
    primaryColor: '#FF2E93',
    secondaryColor: '#FFFFFF',
    leagueId: 'L3',
    format: '7V7',
    homeFieldId: 'f-bombonerita',
    dtIdx: 12,
    asstIdx: 20,
    // Includes "Juan" — his 4th team. (Yes, Juan is on a women's team.
    // It's a Mixto-friendly league in our mock world; remove if you
    // want to enforce gender.)
    playerIdxs: [22, 37, 39, 41, 43, 45, 47, 49, 51, 38],
    captainLocalIdx: 1,
  },
  {
    id: 't-cat-fem',
    name: 'Catalinas',
    shortName: 'CAT',
    emoji: '🐈',
    primaryColor: '#00D9FF',
    secondaryColor: '#0A0A0A',
    leagueId: 'L3',
    format: '7V7',
    homeFieldId: 'f-bombonerita',
    dtIdx: 13,
    asstIdx: 21,
    playerIdxs: [40, 42, 44, 46, 48, 50, 38, 36, 34, 32],
    captainLocalIdx: 0,
  },

  // ----- L7 Copa de Verano 2025 (F7 MIXTO, 8 equipos, bracket completo) ----
  {
    id: 't-galacticos',
    name: 'Galácticos',
    shortName: 'GAL',
    emoji: '🌌',
    primaryColor: '#0E0F1A',
    secondaryColor: '#FFE600',
    leagueId: 'L7',
    format: '7V7',
    homeFieldId: 'f-coloso-1',
    dtIdx: 6,
    asstIdx: 14,
    playerIdxs: [22, 24, 26, 28, 30, 32, 34, 36],
    captainLocalIdx: 0,
  },
  {
    id: 't-titanes',
    name: 'Titanes',
    shortName: 'TIT',
    emoji: '⚡',
    primaryColor: '#5C2D91',
    secondaryColor: '#FFE600',
    leagueId: 'L7',
    format: '7V7',
    homeFieldId: 'f-coloso-1',
    dtIdx: 7,
    asstIdx: 15,
    playerIdxs: [23, 25, 27, 29, 31, 33, 35, 37],
    captainLocalIdx: 0,
  },
  {
    id: 't-fenrirs',
    name: 'Fenrirs',
    shortName: 'FEN',
    emoji: '🐺',
    primaryColor: '#1B1E2E',
    secondaryColor: '#C6FF3D',
    leagueId: 'L7',
    format: '7V7',
    homeFieldId: 'f-sur-f5a',
    dtIdx: 8,
    asstIdx: 16,
    playerIdxs: [24, 26, 28, 30, 32, 34, 36, 38],
    captainLocalIdx: 0,
  },
  {
    id: 't-volcanes',
    name: 'Volcanes',
    shortName: 'VOL',
    emoji: '🌋',
    primaryColor: '#FF3D1A',
    secondaryColor: '#FFE600',
    leagueId: 'L7',
    format: '7V7',
    homeFieldId: 'f-sur-f5a',
    dtIdx: 9,
    asstIdx: 17,
    playerIdxs: [25, 27, 29, 31, 33, 35, 37, 39],
    captainLocalIdx: 0,
  },
  {
    id: 't-centinelas',
    name: 'Centinelas',
    shortName: 'CEN',
    emoji: '🛡',
    primaryColor: '#0044CC',
    secondaryColor: '#FFFFFF',
    leagueId: 'L7',
    format: '7V7',
    homeFieldId: 'f-bombonerita',
    dtIdx: 10,
    asstIdx: 18,
    playerIdxs: [26, 28, 30, 32, 34, 36, 38, 40],
    captainLocalIdx: 0,
  },
  {
    id: 't-relampagos',
    name: 'Relámpagos',
    shortName: 'REL',
    emoji: '⚡',
    primaryColor: '#FFE600',
    secondaryColor: '#FF2E93',
    leagueId: 'L7',
    format: '7V7',
    homeFieldId: 'f-coloso-1',
    dtIdx: 11,
    asstIdx: 19,
    playerIdxs: [27, 29, 31, 33, 35, 37, 39, 41],
    captainLocalIdx: 0,
  },
  {
    id: 't-gladiadores',
    name: 'Gladiadores',
    shortName: 'GLA',
    emoji: '⚔',
    primaryColor: '#8B0000',
    secondaryColor: '#FFE600',
    leagueId: 'L7',
    format: '7V7',
    homeFieldId: 'f-bombonerita',
    dtIdx: 12,
    asstIdx: 20,
    playerIdxs: [28, 30, 32, 34, 36, 38, 40, 42],
    captainLocalIdx: 0,
  },
  {
    id: 't-espartanos',
    name: 'Espartanos',
    shortName: 'ESP',
    emoji: '🛡',
    primaryColor: '#0A0A0A',
    secondaryColor: '#FF3D5A',
    leagueId: 'L7',
    format: '7V7',
    homeFieldId: 'f-sur-f5a',
    dtIdx: 13,
    asstIdx: 21,
    playerIdxs: [29, 31, 33, 35, 37, 39, 41, 43],
    captainLocalIdx: 0,
  },

  // ----- L9 Copa Empresas 2025 (F5 EMPRESAS, 4 equipos, bracket en curso) ----
  {
    id: 't-techcorp',
    name: 'TechCorp United',
    shortName: 'TEC',
    emoji: '💼',
    primaryColor: '#0E0F1A',
    secondaryColor: '#00D9FF',
    leagueId: 'L9',
    format: '5V5',
    homeFieldId: 'f-indoor-downtown',
    dtIdx: 6,
    asstIdx: 14,
    playerIdxs: [22, 24, 26, 28, 30, 32, 34],
    captainLocalIdx: 0,
  },
  {
    id: 't-constructora',
    name: 'Constructora FC',
    shortName: 'CON',
    emoji: '🏗',
    primaryColor: '#FF9500',
    secondaryColor: '#0A0A0A',
    leagueId: 'L9',
    format: '5V5',
    homeFieldId: 'f-indoor-downtown',
    dtIdx: 7,
    asstIdx: 15,
    playerIdxs: [23, 25, 27, 29, 31, 33, 35],
    captainLocalIdx: 0,
  },
  {
    id: 't-logistica',
    name: 'Logística Azteca',
    shortName: 'LOG',
    emoji: '🚚',
    primaryColor: '#0044CC',
    secondaryColor: '#FFE600',
    leagueId: 'L9',
    format: '5V5',
    homeFieldId: 'f-indoor-downtown',
    dtIdx: 8,
    asstIdx: 16,
    playerIdxs: [24, 26, 28, 30, 32, 34, 36],
    captainLocalIdx: 0,
  },
  {
    id: 't-banca',
    name: 'Banca Sports',
    shortName: 'BAN',
    emoji: '💰',
    primaryColor: '#19E68A',
    secondaryColor: '#0A0A0A',
    leagueId: 'L9',
    format: '5V5',
    homeFieldId: 'f-indoor-downtown',
    dtIdx: 9,
    asstIdx: 17,
    playerIdxs: [25, 27, 29, 31, 33, 35, 37],
    captainLocalIdx: 0,
  },
];

export const MOCK_TEAMS: Team[] = TEAM_PRESETS.map((p) => ({
  id: p.id,
  name: p.name,
  shortName: p.shortName,
  logoUrl: null,
  emoji: p.emoji,
  primaryColor: p.primaryColor,
  secondaryColor: p.secondaryColor,
  homeFieldId: p.homeFieldId,
  currentLeagueId: p.leagueId,
  currentLeagueFormat: p.format,
  isActive: true,
  createdAt: '2025-07-15T00:00:00Z',
  updatedAt: '2025-08-01T00:00:00Z',
}));

// ----- Memberships ----------------------------------------------------------

const F7_POSITIONS: Position[] = ['GK', 'DEF', 'DEF', 'MID', 'MID', 'FWD', 'FWD'];
const F5_POSITIONS: Position[] = ['GK', 'FIXO', 'ALA', 'PIVOT', 'ALA'];
// Default to F7 (10 player slots, 2 might not have a position).
const DEFAULT_POSITIONS: Position[] = ['GK', 'DEF', 'DEF', 'MID', 'MID', 'FWD', 'FWD', 'MID', 'DEF', 'FWD'];

function positionsForFormat(format: LeagueFormat): Position[] {
  switch (format) {
    case '5V5': return F5_POSITIONS;
    case '6V6': return ['GK', 'DEF', 'DEF', 'MID', 'MID', 'FWD'];
    case '7V7': return F7_POSITIONS;
    case '11V11': return ['GK', 'DEF', 'DEF', 'DEF', 'DEF', 'MID', 'MID', 'MID', 'FWD', 'FWD', 'FWD'];
    case '1V1': return ['GK'];
    case '3V3': return ['GK', 'MID', 'FWD'];
    case '9V9': return ['GK', 'DEF', 'DEF', 'DEF', 'MID', 'MID', 'MID', 'FWD', 'FWD'];
    default: return DEFAULT_POSITIONS;
  }
}

let membershipCounter = 0;
function nextMembershipId(): string {
  membershipCounter += 1;
  return `tm-${String(membershipCounter).padStart(4, '0')}`;
}

export const MOCK_MEMBERSHIPS: TeamMembership[] = (() => {
  const out: TeamMembership[] = [];
  for (const preset of TEAM_PRESETS) {
    // 1 DT
    out.push({
      id: nextMembershipId(),
      teamId: preset.id,
      userId: MOCK_USERS[preset.dtIdx]!.id,
      membershipRole: 'DT',
      jerseyNumber: null,
      position: null,
      isCaptain: false,
      joinedAt: '2025-07-15T00:00:00Z',
    });
    // 1 Assistant
    out.push({
      id: nextMembershipId(),
      teamId: preset.id,
      userId: MOCK_USERS[preset.asstIdx]!.id,
      membershipRole: 'ASSISTANT',
      jerseyNumber: null,
      position: null,
      isCaptain: false,
      joinedAt: '2025-07-15T00:00:00Z',
    });
    // N players
    const positions = positionsForFormat(preset.format);
    preset.playerIdxs.forEach((userIdx, localIdx) => {
      const jerseyNumber = localIdx + 1;
      out.push({
        id: nextMembershipId(),
        teamId: preset.id,
        userId: MOCK_USERS[userIdx]!.id,
        membershipRole: 'PLAYER',
        jerseyNumber,
        position: positions[localIdx] ?? null,
        isCaptain: localIdx === preset.captainLocalIdx,
        joinedAt: '2025-07-15T00:00:00Z',
      });
    });
  }
  return out;
})();

// ----- Lookup helpers -------------------------------------------------------
//
// Idempotent accessors consumed by the hooks. Keep them O(N) — the
// dataset is small (8 teams, 52 users) and a memoization pass is not
// worth the cognitive overhead.

export function getUserById(id: string): User | null {
  return MOCK_USERS.find((u) => u.id === id) ?? null;
}

export function getTeamById(id: string): Team | null {
  return MOCK_TEAMS.find((t) => t.id === id) ?? null;
}

export function getLeagueById(id: string): League | null {
  return MOCK_LEAGUES.find((l) => l.id === id) ?? null;
}

export function getMembershipsByTeam(teamId: string): TeamMembership[] {
  return MOCK_MEMBERSHIPS.filter((m) => m.teamId === teamId);
}

export function getMembershipsByUser(userId: string): TeamMembership[] {
  return MOCK_MEMBERSHIPS.filter((m) => m.userId === userId);
}

export function getTeamsForUser(userId: string): Array<Team & { membership: TeamMembership }> {
  return MOCK_MEMBERSHIPS
    .filter((m) => m.userId === userId)
    .map((m) => {
      const team = getTeamById(m.teamId);
      return team ? { ...team, membership: m } : null;
    })
    .filter((t): t is Team & { membership: TeamMembership } => t !== null);
}
