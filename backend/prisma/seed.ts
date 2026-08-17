/* eslint-disable no-console */
// =====================================================================
// Kaibil Football — Seed for "Canchas las TKT" (real-world scenario)
//
// Run: pnpm db:seed
//
// Spec: docs/seed-prompt-tkt.md
//
// Volume:
//   - 1 admin
//   - 6 referees
//   - 15 DTs
//   - 30 assistants
//   - ~3360 players
//   - 4 fields
//   - 15 leagues (8 with home/away double, 7 with single)
//   - 240 teams (16 per league)
//   - ~600 matches (480 RR + 120 liguilla)
//   - ~1500 events
// =====================================================================

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { createHash } from 'crypto';

// =====================================================================
// 0. PRNG (seeded deterministic random)
// =====================================================================

function makePrng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}
function pickInt(rng: () => number, lo: number, hi: number): number {
  return Math.floor(rng() * (hi - lo + 1)) + lo;
}
function pickOne<T>(rng: () => number, arr: readonly T[]): T {
  return arr[Math.floor(rng() * arr.length)]!;
}
function shuffleInPlace<T>(rng: () => number, arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
  }
  return arr;
}
function weightedPick<T>(rng: () => number, items: Array<[T, number]>): T {
  const total = items.reduce((s, [, w]) => s + w, 0);
  let r = rng() * total;
  for (const [item, w] of items) {
    r -= w;
    if (r <= 0) return item;
  }
  return items[items.length - 1]![0];
}

const prng = makePrng(42); // deterministic

// =====================================================================
// 1. Inventories (names, team names, colors)
// =====================================================================

const FIRST_NAMES_M = [
  'José', 'Juan', 'Luis', 'Carlos', 'Miguel', 'Antonio', 'Francisco', 'Alejandro',
  'Manuel', 'Pedro', 'Ángel', 'Jesús', 'Roberto', 'Daniel', 'David', 'Javier',
  'Diego', 'Fernando', 'Ricardo', 'Eduardo', 'Rafael', 'Sergio', 'Héctor', 'José Luis',
  'Juan Carlos', 'Carlos Alberto', 'Jorge', 'Andrés', 'Santiago', 'Sebastián',
  'Maximiliano', 'Joaquín', 'Iván', 'Camilo', 'Tomás', 'Lucas', 'Emiliano', 'Bruno',
  'Mateo', 'Gael', 'Dylan', 'Iker', 'Matías', 'Giovanni', 'Esteban',
  'Rodrigo', 'César', 'Adrián', 'Mario', 'Pablo', 'Alan', 'Kevin', 'Bryan',
  'Brandon', 'Leonardo', 'Mauricio', 'Hugo', 'Gustavo', 'Enrique', 'Arturo', 'Alfonso',
  'Salvador', 'Octavio', 'Ramiro', 'Gerardo', 'Elías', 'Jaime', 'Israel', 'Omar',
  'Rubén', 'Samuel', 'Aarón', 'Josué', 'Neftalí', 'Isaí', 'Saúl', 'Efraín',
  'Ezequiel', 'Caleb', 'Joaquín', 'Elías', 'Iván', 'Gael', 'Iker', 'Matías',
];
const FIRST_NAMES_F = [
  'María', 'Guadalupe', 'Margarita', 'Verónica', 'Patricia', 'Lucía', 'Rosa', 'Martha',
  'Laura', 'Ana', 'Silvia', 'Gabriela', 'Elizabeth', 'Mónica', 'Daniela', 'Adriana',
  'Carolina', 'Fernanda', 'Sofía', 'Isabella', 'Camila', 'Valentina', 'Ximena', 'Andrea',
  'Paola', 'Mariana', 'Alejandra', 'Lourdes', 'Cristina', 'Teresa', 'Victoria',
  'Sara', 'Itzel', 'Renata', 'Romina', 'Constanza', 'Antonella', 'Fátima', 'Zoe',
  'Ana Paula', 'María José', 'Regina', 'Dulce', 'Esperanza', 'Ariadna', 'Bárbara', 'Estefanía',
  'Marisol', 'Yolanda', 'Lorena', 'Araceli', 'Concepción', 'Mireya', 'Leticia', 'Aurora',
  'Estela', 'Irma', 'Alicia', 'Eva', 'Elena', 'Cristina', 'Diana',
  'Marlene', 'Gloria', 'Rosario', 'Consuelo', 'Pilar', 'Mercedes', 'Amalia', 'Raquel',
  'Juana', 'Petra', 'Felisa', 'Sara', 'Tomasa', 'Eloísa', 'Águeda', 'Brígida',
];
const LAST_NAMES = [
  'García', 'Rodríguez', 'González', 'Hernández', 'López', 'Martínez', 'Sánchez', 'Pérez',
  'Gómez', 'Martín', 'Jiménez', 'Ruiz', 'Díaz', 'Moreno', 'Romero', 'Alonso',
  'Navarro', 'Torres', 'Domínguez', 'Vázquez', 'Ramos', 'Gil', 'Molina', 'Serrano',
  'Blanco', 'Suárez', 'Castro', 'Ortega', 'Delgado', 'Marín', 'Rubio', 'Núñez',
  'Medina', 'Castillo', 'Carmona', 'Crespo', 'Santos', 'Reyes',
  'Calvo', 'Gallego', 'Márquez', 'Vidal', 'León', 'Mora', 'Bravo',
  'Gallardo', 'Cano', 'Nieto', 'Vargas', 'Cruz', 'Leal', 'Caballero',
  'Carrillo', 'Méndez', 'Campos', 'Vela', 'Calderón', 'Fuentes', 'Aguilar', 'Pardo',
  'Soler', 'Acosta', 'Galván', 'Pacheco', 'Esteban', 'Arias',
  'Pereira', 'Bernal', 'Nieves', 'Aragón', 'Cárdenas', 'Villar', 'Esquivel', 'Garrido',
  'Robles', 'Santamaría', 'Palacios', 'Bermúdez', 'Salgado', 'Quiñones', 'Baeza', 'Casas',
];

// Team names per category.
const TEAM_NAMES_VARONIL_LIBRE = [
  'Linces FC', 'Cóndores Rojos', 'Halcones Negros', 'Águilas Plateadas',
  'Pumas de Neza', 'Tiburones del Sur', 'Lobos del Pedregal', 'Panteras Negras',
  'Tigres del Ajusco', 'Leones de Iztapalapa', 'Gladiadores del Sur', 'Volcanes del Ajusco',
  'Espartanos del Centro', 'Centinelas del Norte', 'Relámpagos Azules', 'Dragones FC',
];
const TEAM_NAMES_VARONIL_FEMENIL_MIXTO = [
  'Rosa del Sur', 'Girasoles del Centro', 'Azules de Coyoacán', 'Blancas del Pedregal',
  'Camelias del Valle', 'Lirios del Ajusco', 'Hortensias FC', 'Dalias del Sur',
  'Orquídeas de Polanco', 'Jazmines del Centro', 'Margaritas del Norte', 'Violetas del Ajusco',
  'Tulipanes de Tlalpan', 'Hortensias Blancas', 'Begonias del Valle', 'Camelias del Centro',
];
const TEAM_NAMES_JUVENIL = [
  'Fenrirs Sub17', 'Titanes Sub15', 'Centinelas Sub17', 'Espartanos Sub17',
  'Gladiadores Sub15', 'Relámpagos Sub15', 'Volcanes Sub17', 'Dragones Sub15',
  'Pumas Sub17', 'Águilas Sub15', 'Lobos Sub17', 'Halcones Sub15',
  'Cóndores Sub17', 'Panteras Sub15', 'Leones Sub17', 'Tigres Sub15',
];

const COLOR_PALETTES: Array<[string, string, string]> = [
  // [primary, secondary, emoji]
  ['#FFE600', '#0A0A0A', '🦁'], ['#FF3D5A', '#0A0A0A', '🦅'], ['#00D9FF', '#0A0A0A', '🦈'],
  ['#FF2E93', '#FFFFFF', '🌌'], ['#C6FF3D', '#0A0A0A', '🐆'], ['#0A0A0A', '#FFE600', '🛡'],
  ['#FFFFFF', '#0A0A0A', '⚔'],  ['#FF9500', '#0A0A0A', '🔥'],  ['#5C2D91', '#FFE600', '⚡'],
  ['#0044CC', '#FFE600', '🌋'], ['#19E68A', '#0A0A0A', '🐺'], ['#8B0000', '#FFE600', '🐅'],
];

// =====================================================================
// 2. League catalog (16 ligas)
// =====================================================================

interface LeagueDef {
  id: string;          // logical id (we'll map to generated UUIDs)
  name: string;
  description: string;
  category: 'LIBRE' | 'SUB_17' | 'SUB_15' | 'SUB_20' | 'SUB_13' | 'VETERANOS' | 'FEMENIL' | 'MIXTO_AMATEUR';
  format: 'SEVEN_V_SEVEN';
  type: 'ROUND_ROBIN';
  dayOfWeek: 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY';
  /** ISO weekday-hour-minute, e.g. '19:00'. The league plays 2 hours:
   *  this slot + the next hour (19+20, 21+22, etc.). */
  kickoffTime: string;
  homeAndAway: boolean;
  maxTeams: 16;
  /** Which team-name pool to use. */
  teamNamePool: 'LIBRE' | 'JUVENIL' | 'FLORES';
  /**
   * Estado simulado de la liga.
   *   IN_PROGRESS  → en plena temporada regular (jornada actual = currentRound)
   *   PLAYOFFS     → temporada regular terminada; liguilla en curso
   *   FINISHED     → TODO terminado, hay campeón
   */
  status: 'IN_PROGRESS' | 'PLAYOFFS' | 'FINISHED';
  /** Para IN_PROGRESS: número de jornadas RR completadas. Para PLAYOFFS/FINISHED: total de jornadas. */
  currentRound: number;
  /** Solo para PLAYOFFS: cuánto de la liguilla se ha jugado. */
  liguillaProgress?: 'QF_DONE' | 'SF_DONE' | 'FINAL_DONE';
}

const LEAGUES: LeagueDef[] = [
  // Lunes: 2 ligas
  { id: 'L-Lun-Libre',     name: 'TKT — Lunes Libre Varonil',         category: 'LIBRE',         format: 'SEVEN_V_SEVEN', type: 'ROUND_ROBIN', dayOfWeek: 'MONDAY',    kickoffTime: '19:00', homeAndAway: true,  maxTeams: 16, teamNamePool: 'LIBRE',   status: 'IN_PROGRESS', currentRound: 4 },
  { id: 'L-Lun-Sub17',     name: 'TKT — Lunes Sub-17 Varonil',        category: 'SUB_17',        format: 'SEVEN_V_SEVEN', type: 'ROUND_ROBIN', dayOfWeek: 'MONDAY',    kickoffTime: '21:00', homeAndAway: false, maxTeams: 16, teamNamePool: 'JUVENIL', status: 'IN_PROGRESS', currentRound: 8 },

  // Martes: 2 ligas
  { id: 'L-Mar-Libre',     name: 'TKT — Martes Libre Varonil',        category: 'LIBRE',         format: 'SEVEN_V_SEVEN', type: 'ROUND_ROBIN', dayOfWeek: 'TUESDAY',   kickoffTime: '19:00', homeAndAway: false, maxTeams: 16, teamNamePool: 'LIBRE',   status: 'PLAYOFFS',     currentRound: 15, liguillaProgress: 'SF_DONE' },
  { id: 'L-Mar-Sub15',     name: 'TKT — Martes Sub-15 Varonil',        category: 'SUB_15',        format: 'SEVEN_V_SEVEN', type: 'ROUND_ROBIN', dayOfWeek: 'TUESDAY',   kickoffTime: '21:00', homeAndAway: false, maxTeams: 16, teamNamePool: 'JUVENIL', status: 'FINISHED',     currentRound: 15, liguillaProgress: 'FINAL_DONE' },

  // Miércoles: 2 ligas
  { id: 'L-Mie-Veteranos', name: 'TKT — Miércoles Veteranos +35',     category: 'VETERANOS',     format: 'SEVEN_V_SEVEN', type: 'ROUND_ROBIN', dayOfWeek: 'WEDNESDAY', kickoffTime: '19:00', homeAndAway: false, maxTeams: 16, teamNamePool: 'LIBRE',   status: 'IN_PROGRESS', currentRound: 12 },
  { id: 'L-Mie-Femenil',   name: 'TKT — Miércoles Femenil',            category: 'FEMENIL',       format: 'SEVEN_V_SEVEN', type: 'ROUND_ROBIN', dayOfWeek: 'WEDNESDAY', kickoffTime: '21:00', homeAndAway: true,  maxTeams: 16, teamNamePool: 'FLORES',  status: 'IN_PROGRESS', currentRound: 4 },

  // Jueves: 2 ligas
  { id: 'L-Jue-Libre',     name: 'TKT — Jueves Libre Varonil',         category: 'LIBRE',         format: 'SEVEN_V_SEVEN', type: 'ROUND_ROBIN', dayOfWeek: 'THURSDAY',  kickoffTime: '19:00', homeAndAway: true,  maxTeams: 16, teamNamePool: 'LIBRE',   status: 'PLAYOFFS',     currentRound: 30, liguillaProgress: 'SF_DONE' },
  { id: 'L-Jue-Sub20',     name: 'TKT — Jueves Sub-20 Varonil',        category: 'SUB_20',        format: 'SEVEN_V_SEVEN', type: 'ROUND_ROBIN', dayOfWeek: 'THURSDAY',  kickoffTime: '21:00', homeAndAway: false, maxTeams: 16, teamNamePool: 'JUVENIL', status: 'IN_PROGRESS', currentRound: 8 },

  // Viernes: 3 ligas
  { id: 'L-Vie-Libre',     name: 'TKT — Viernes Libre Varonil',        category: 'LIBRE',         format: 'SEVEN_V_SEVEN', type: 'ROUND_ROBIN', dayOfWeek: 'FRIDAY',    kickoffTime: '18:00', homeAndAway: true,  maxTeams: 16, teamNamePool: 'LIBRE',   status: 'IN_PROGRESS', currentRound: 4 },
  { id: 'L-Vie-Sub17',     name: 'TKT — Viernes Sub-17 Varonil',       category: 'SUB_17',        format: 'SEVEN_V_SEVEN', type: 'ROUND_ROBIN', dayOfWeek: 'FRIDAY',    kickoffTime: '20:00', homeAndAway: false, maxTeams: 16, teamNamePool: 'JUVENIL', status: 'FINISHED',     currentRound: 15, liguillaProgress: 'FINAL_DONE' },
  { id: 'L-Vie-Femenil',   name: 'TKT — Viernes Femenil',              category: 'FEMENIL',       format: 'SEVEN_V_SEVEN', type: 'ROUND_ROBIN', dayOfWeek: 'FRIDAY',    kickoffTime: '22:00', homeAndAway: true,  maxTeams: 16, teamNamePool: 'FLORES',  status: 'PLAYOFFS',     currentRound: 30, liguillaProgress: 'SF_DONE' },

  // Sábado: 3 ligas (bloque mañana + 2 bloques tarde)
  { id: 'L-Sab-Amateur',   name: 'TKT — Sábado Amateur Mixto',         category: 'MIXTO_AMATEUR', format: 'SEVEN_V_SEVEN', type: 'ROUND_ROBIN', dayOfWeek: 'SATURDAY',  kickoffTime: '08:00', homeAndAway: true,  maxTeams: 16, teamNamePool: 'LIBRE',   status: 'IN_PROGRESS', currentRound: 4 },
  { id: 'L-Sab-Sub13',     name: 'TKT — Sábado Sub-13 Varonil',       category: 'SUB_13',        format: 'SEVEN_V_SEVEN', type: 'ROUND_ROBIN', dayOfWeek: 'SATURDAY',  kickoffTime: '18:00', homeAndAway: false, maxTeams: 16, teamNamePool: 'JUVENIL', status: 'IN_PROGRESS', currentRound: 8 },
  { id: 'L-Sab-Libre',     name: 'TKT — Sábado Libre Varonil',         category: 'LIBRE',         format: 'SEVEN_V_SEVEN', type: 'ROUND_ROBIN', dayOfWeek: 'SATURDAY',  kickoffTime: '20:00', homeAndAway: true,  maxTeams: 16, teamNamePool: 'LIBRE',   status: 'PLAYOFFS',     currentRound: 15, liguillaProgress: 'QF_DONE' },

  // Domingo: 2 ligas (bloque mañana)
  { id: 'L-Dom-Libre',     name: 'TKT — Domingo Libre Varonil',        category: 'LIBRE',         format: 'SEVEN_V_SEVEN', type: 'ROUND_ROBIN', dayOfWeek: 'SUNDAY',    kickoffTime: '08:00', homeAndAway: true,  maxTeams: 16, teamNamePool: 'LIBRE',   status: 'IN_PROGRESS', currentRound: 4 },
  { id: 'L-Dom-Femenil',   name: 'TKT — Domingo Femenil',              category: 'FEMENIL',       format: 'SEVEN_V_SEVEN', type: 'ROUND_ROBIN', dayOfWeek: 'SUNDAY',    kickoffTime: '10:00', homeAndAway: true,  maxTeams: 16, teamNamePool: 'FLORES',  status: 'IN_PROGRESS', currentRound: 12 },
];

// =====================================================================
// 3. Helpers
// =====================================================================

function calculateAge(birthDate: Date, now: Date = new Date()): number {
  let age = now.getFullYear() - birthDate.getFullYear();
  const m = now.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birthDate.getDate())) age -= 1;
  return Math.max(0, age);
}

function pickBirthDate(rng: () => number, league: LeagueDef): Date {
  // Pick a plausible birth date for the role/category.
  let minAge = 18;
  let maxAge = 45;
  switch (league.category) {
    case 'SUB_13': minAge = 11; maxAge = 13; break;
    case 'SUB_15': minAge = 13; maxAge = 15; break;
    case 'SUB_17': minAge = 15; maxAge = 17; break;
    case 'SUB_20': minAge = 17; maxAge = 20; break;
    case 'VETERANOS': minAge = 35; maxAge = 50; break;
    case 'FEMENIL': minAge = 16; maxAge = 40; break;
    case 'MIXTO_AMATEUR': minAge = 20; maxAge = 50; break;
    case 'LIBRE': minAge = 18; maxAge = 45; break;
  }
  const now = new Date();
  const year = now.getFullYear() - pickInt(rng, minAge, maxAge);
  const month = pickInt(rng, 1, 12);
  const day = pickInt(rng, 1, 28);
  return new Date(Date.UTC(year, month - 1, day));
}

function buildEmail(firstName: string, paternal: string, role: string, idx: number): string {
  const slug = `${firstName}.${paternal}.${role}.${idx}`
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9.]/gi, '')
    .toLowerCase();
  return `${slug}@tkt.local`;
}

function buildCurp(firstName: string, paternal: string, maternal: string, birthDate: Date, seed: number): string {
  const letters4 = (paternal.slice(0, 2) + maternal.slice(0, 1) + firstName.slice(0, 1))
    .toUpperCase()
    .padEnd(4, 'X')
    .replace(/[^A-Z]/g, 'X');
  const yy = String(birthDate.getUTCFullYear()).slice(-2);
  const mm = String(birthDate.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(birthDate.getUTCDate()).padStart(2, '0');
  const letters6 = 'TKTKAN ';
  const letters6Clean = 'TKTKA' + (seed % 10);
  const checksum = String((seed * 17 + 42) % 100).padStart(2, '0');
  return (letters4 + yy + mm + dd + letters6Clean + checksum).padEnd(18, '0').slice(0, 18);
}

function buildPhone(idx: number): string {
  // +52 55 1234 0000..9999 — deterministic, unique.
  const last4 = String(idx).padStart(4, '0');
  const mid = String(((idx * 7) % 9000) + 1000);
  return `+52 55 1234 ${mid}${last4}`.slice(0, 16);
}

// Berger round-robin (single rotation). For N teams produces N-1
// rounds of N/2 pairs. For odd N a BYE is added.
type Pair = [number, number];

function bergerRoundRobin(teamCount: number): Pair[][] {
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

// =====================================================================
// 4. Password hashing (one hash per role, reused)
// =====================================================================

async function hashPassword(plain: string): Promise<string> {
  const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS ?? '10', 10);
  return bcrypt.hash(plain, saltRounds);
}

const PASSWORDS = {
  admin: 'TKTadmin2025!',
  referee: 'TKTref2025!',
  dt: 'TKTdt2025!',
  assistant: 'TKTasst2025!',
  player: 'TKTplayer2025!',
};

// =====================================================================
// 5. prisma client
// =====================================================================

const prisma = new PrismaClient();

// =====================================================================
// 6. Wipe in dependency order
// =====================================================================

async function wipe() {
  await prisma.matchEvent.deleteMany();
  await prisma.match.deleteMany();
  await prisma.matchday.deleteMany();
  await prisma.leagueTeam.deleteMany();
  await prisma.teamMembership.deleteMany();
  await prisma.team.deleteMany();
  await prisma.leagueField.deleteMany();
  await prisma.league.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();
  await prisma.field.deleteMany();
}

// =====================================================================
// 7. Seed fields
// =====================================================================

async function createFields(): Promise<{ id: string; name: string }[]> {
  const fields = [
    { name: 'Cancha 1', address: 'Canchas las TKT, Av. Principal 100, CDMX', description: 'Cancha sintética 60×40m, 7v7', capacity: 14 },
    { name: 'Cancha 2', address: 'Canchas las TKT, Av. Principal 100, CDMX', description: 'Cancha sintética 60×40m, 7v7', capacity: 14 },
    { name: 'Cancha 3', address: 'Canchas las TKT, Av. Principal 100, CDMX', description: 'Cancha sintética 60×40m, 7v7', capacity: 14 },
    { name: 'Cancha 4', address: 'Canchas las TKT, Av. Principal 100, CDMX', description: 'Cancha sintética 60×40m, 7v7', capacity: 14 },
  ];
  const created = await prisma.$transaction(
    fields.map((f) => prisma.field.create({ data: f })),
  );
  console.log(`  ✓ ${created.length} fields`);
  return created.map((f) => ({ id: f.id, name: f.name }));
}

// =====================================================================
// 8. Seed users (1 admin, 6 refs, 15 DTs, 30 assistants, ~3360 players)
// =====================================================================

interface SeededUser { id: string; firstName: string; paternalSurname: string; role: string; }

async function createUsers(leagues: LeagueDef[]): Promise<{
  byRole: Record<string, SeededUser[]>;
  allIds: string[];
}> {
  const adminPwd = await hashPassword(PASSWORDS.admin);
  const refPwd   = await hashPassword(PASSWORDS.referee);
  const dtPwd    = await hashPassword(PASSWORDS.dt);
  const asstPwd  = await hashPassword(PASSWORDS.assistant);
  const playerPwd = await hashPassword(PASSWORDS.player);

  // ----- 1 admin
  const admin = await prisma.user.create({
    data: {
      firstName: 'José', paternalSurname: 'Ramírez', maternalSurname: 'Herrera',
      nickname: 'El Profe', birthDate: new Date('1978-03-22'),
      age: 47, role: 'ADMIN', phoneNumber: '+52 55 0000 0001',
      email: 'jose.ramirez.admin.1@tkt.local',
      curp: 'RAHJ780322HMCMRS01',
      passwordHash: adminPwd, isActive: true,
    },
  });
  console.log(`  ✓ 1 admin`);

  // ----- 6 referees
  const refereeNames = [
    ['Roberto', 'Silva', 'Cano',  'Beto'],
    ['María',   'García', 'Pérez', 'Mari'],
    ['Sergio',  'Torres', 'Vega',  null  ],
    ['Laura',   'Domínguez', 'Castro', null],
    ['Miguel',  'Ruiz',   'Mendoza', 'Mike'],
    ['Patricia','Morales','Reyes',  'Paty'],
  ] as const;
  const referees: SeededUser[] = [];
  for (let i = 0; i < refereeNames.length; i += 1) {
    const [first, paternal, maternal, nickname] = refereeNames[i]!;
    const birthDate = new Date(1980 + i * 2, i * 2, 5 + i);
    const u = await prisma.user.create({
      data: {
        firstName: first, paternalSurname: paternal, maternalSurname: maternal,
        nickname: nickname, birthDate, age: calculateAge(birthDate),
        role: 'REFEREE', phoneNumber: buildPhone(1000 + i),
        email: buildEmail(first, paternal, 'ref', i + 1),
        curp: buildCurp(first, paternal, maternal, birthDate, 100 + i),
        passwordHash: refPwd, isActive: true,
      },
    });
    referees.push({ id: u.id, firstName: first, paternalSurname: paternal, role: 'REFEREE' });
  }
  console.log(`  ✓ 6 referees`);

  // ----- 15 DTs (1 per league). Shared across leagues when convenient.
  const dtNames = [
    ['Fernando', 'López',     'Martínez', 'DT1'],
    ['Andrés',   'Hernández', 'García',  'DT2'],
    ['Pablo',    'Ramírez',   'Torres',  'DT3'],
    ['Ricardo',  'Jiménez',   'Ruiz',    'DT4'],
    ['Eduardo',  'Moreno',    'Díaz',    'DT5'],
    ['Sergio',   'Romero',    'Vázquez', 'DT6'],
    ['Jaime',    'Alonso',    'Castro',  'DT7'],
    ['Roberto',  'Ortega',    'Delgado', 'DT8'],
    ['Mauricio', 'Núñez',     'Molina',  'DT9'],
    ['Hugo',     'Medina',    'Serrano', 'DT10'],
    ['César',    'Castillo',  'Blanco',  'DT11'],
    ['Alfonso',  'Sánchez',   'Pérez',   'DT12'],
    ['Octavio',  'Cruz',      'Reyes',   'DT13'],
    ['Esteban',  'Ramos',     'Torres',  'DT14'],
    ['Manuel',   'Gil',       'Mendoza', 'DT15'],
  ] as const;
  const dts: SeededUser[] = [];
  for (let i = 0; i < dtNames.length; i += 1) {
    const [first, paternal, maternal, nickname] = dtNames[i]!;
    const birthDate = new Date(1982 + (i % 8), (i * 3) % 12, 7 + i);
    const u = await prisma.user.create({
      data: {
        firstName: first, paternalSurname: paternal, maternalSurname: maternal,
        nickname: nickname, birthDate, age: calculateAge(birthDate),
        role: 'TECHNICAL_DIRECTOR', phoneNumber: buildPhone(2000 + i),
        email: buildEmail(first, paternal, 'dt', i + 1),
        curp: buildCurp(first, paternal, maternal, birthDate, 200 + i),
        passwordHash: dtPwd, isActive: true,
      },
    });
    dts.push({ id: u.id, firstName: first, paternalSurname: paternal, role: 'TECHNICAL_DIRECTOR' });
  }
  console.log(`  ✓ 15 DTs`);

  // ----- 30 assistants (2 per league). Pool of names.
  const assistantNames = [
    'Pedro', 'Valeria', 'Lucía', 'Laura', 'Luis', 'Diego', 'Andrés', 'María',
    'Carlos', 'Sofía', 'Fernando', 'Camila', 'Jorge', 'Valentina', 'Emiliano', 'Ximena',
    'Rodrigo', 'Renata', 'Camilo', 'Antonella', 'Matías', 'Itzel', 'Sebastián', 'Constanza',
    'Iván', 'Esperanza', 'Tomás', 'Dulce', 'Bruno', 'Ana Paula',
  ];
  const assistants: SeededUser[] = [];
  for (let i = 0; i < 30; i += 1) {
    const first = assistantNames[i % assistantNames.length]!;
    const paternal = LAST_NAMES[i % LAST_NAMES.length]!;
    const maternal = LAST_NAMES[(i + 7) % LAST_NAMES.length]!;
    const isFemale = FIRST_NAMES_F.includes(first);
    const gender = isFemale ? 'F' : 'M';
    const pool = gender === 'F' ? FIRST_NAMES_F : FIRST_NAMES_M;
    const firstName = pool[(i + (gender === 'F' ? 3 : 0)) % pool.length]!;
    const birthDate = new Date(1992 + (i % 6), (i * 4) % 12, 11 + (i % 18));
    const u = await prisma.user.create({
      data: {
        firstName, paternalSurname: paternal, maternalSurname: maternal,
        nickname: null, birthDate, age: calculateAge(birthDate),
        role: 'ASSISTANT', phoneNumber: buildPhone(3000 + i),
        email: buildEmail(firstName, paternal, 'asst', i + 1),
        curp: buildCurp(firstName, paternal, maternal, birthDate, 300 + i),
        passwordHash: asstPwd, isActive: true,
      },
    });
    assistants.push({ id: u.id, firstName, paternalSurname: paternal, role: 'ASSISTANT' });
  }
  console.log(`  ✓ 30 assistants`);

  // ----- Players: 14 per team × 16 teams × 15 leagues = 3360
  const players: SeededUser[] = [];
  let userCounter = 0;
  // Group players per league so we can match the gender distribution.
  for (const league of leagues) {
    const isVaronil = ['SUB_13', 'SUB_15', 'SUB_17', 'SUB_20', 'LIBRE'].includes(league.category);
    const isFemaleHeavy = league.category === 'FEMENIL';
    const isMixed = league.category === 'MIXTO_AMATEUR';

    for (let team = 0; team < 16; team += 1) {
      for (let dorsal = 1; dorsal <= 14; dorsal += 1) {
        userCounter += 1;
        // Pick gender based on league.
        let pool: readonly string[];
        if (isVaronil) {
          pool = FIRST_NAMES_M;
        } else if (isFemaleHeavy) {
          pool = FIRST_NAMES_F;
        } else if (isMixed) {
          // 50/50
          pool = userCounter % 2 === 0 ? FIRST_NAMES_M : FIRST_NAMES_F;
        } else {
          // Veteranos mostly male
          pool = FIRST_NAMES_M;
        }
        const firstName = pool[userCounter % pool.length]!;
        const paternal = LAST_NAMES[(userCounter * 7) % LAST_NAMES.length]!;
        const maternal = LAST_NAMES[(userCounter * 13) % LAST_NAMES.length]!;
        const birthDate = pickBirthDate(prng, league);
        const u = await prisma.user.create({
          data: {
            firstName, paternalSurname: paternal, maternalSurname: maternal,
            nickname: dorsal === 10 ? 'El 10' : null,
            birthDate, age: calculateAge(birthDate),
            role: 'PLAYER', phoneNumber: buildPhone(userCounter),
            email: buildEmail(firstName, paternal, 'player', userCounter),
            curp: buildCurp(firstName, paternal, maternal, birthDate, userCounter),
            passwordHash: playerPwd, isActive: true,
          },
        });
        players.push({ id: u.id, firstName, paternalSurname: paternal, role: 'PLAYER' });
      }
    }
  }
  console.log(`  ✓ ${players.length} players`);

  return {
    byRole: {
      ADMIN: [admin].map((u) => ({ id: u.id, firstName: u.firstName, paternalSurname: u.paternalSurname, role: u.role })),
      REFEREE: referees,
      TECHNICAL_DIRECTOR: dts,
      ASSISTANT: assistants,
      PLAYER: players,
    },
    allIds: [admin.id, ...referees.map((r) => r.id), ...dts.map((d) => d.id), ...assistants.map((a) => a.id), ...players.map((p) => p.id)],
  };
}

// =====================================================================
// 9. Seed leagues
// =====================================================================

interface SeededLeague { id: string; def: LeagueDef; }

async function createLeagues(fields: { id: string }[]): Promise<SeededLeague[]> {
  const created: SeededLeague[] = [];
  const now = new Date();
  for (const def of LEAGUES) {
    const matchdaysCount = def.homeAndAway ? 30 : 15;
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - 28);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + (def.homeAndAway ? 22 * 7 : 11 * 7));
    // Map kickoff time to TimeSlot enum
    const hh = parseInt(def.kickoffTime.split(':')[0] ?? '19', 10);
    let timeSlot: 'MORNING' | 'AFTERNOON' | 'EVENING' | 'NIGHT';
    if (hh < 12) timeSlot = 'MORNING';
    else if (hh < 17) timeSlot = 'AFTERNOON';
    else if (hh < 21) timeSlot = 'EVENING';
    else timeSlot = 'NIGHT';

    const c = await prisma.league.create({
      data: {
        name: def.name,
        description: `${def.teamNamePool === 'FLORES' ? 'Liga' : 'Liga'} ${def.category.toLowerCase()} de ${def.teamNamePool === 'JUVENIL' ? 'juveniles' : 'adultos'}.`,
        season: '2025-TKT',
        startDate, endDate, isActive: true,
        format: def.format, category: def.category, type: def.type,
        matchdaysCount, homeAndAway: def.homeAndAway, maxTeams: def.maxTeams,
        dayOfWeek: def.dayOfWeek, timeSlot,
        status: def.status === 'IN_PROGRESS' ? 'IN_PROGRESS' : def.status === 'PLAYOFFS' ? 'IN_PROGRESS' : 'FINISHED',
      },
    });
    created.push({ id: c.id, def });
  }
  console.log(`  ✓ ${created.length} leagues`);

  // ----- leagueField links (all 4 canchas for all 15 ligas = 60 links)
  const links = created.flatMap((l) =>
    fields.map((f) => ({ leagueId: l.id, fieldId: f.id })),
  );
  await prisma.leagueField.createMany({ data: links });
  console.log(`  ✓ ${links.length} league-field links`);

  return created;
}

// =====================================================================
// 10. Seed teams + league_team + memberships
// =====================================================================

interface SeededTeam { id: string; leagueId: string; name: string; shortName: string; seed: number; }

const POSITIONS: ('GK' | 'DEF' | 'MID' | 'FWD')[] = ['GK', 'DEF', 'DEF', 'DEF', 'MID', 'MID', 'MID', 'FWD', 'FWD', 'MID', 'FWD', 'GK', 'MID', 'FWD'];
const POSITION_BY_DORSAL: Record<number, 'GK' | 'DEF' | 'MID' | 'FWD' | 'FIXO' | 'ALA' | 'PIVOT'> = {
  1: 'GK', 2: 'DEF', 3: 'DEF', 4: 'DEF', 5: 'MID', 6: 'MID', 7: 'MID',
  8: 'FWD', 9: 'FWD', 10: 'MID', 11: 'FWD', 12: 'GK', 13: 'MID', 14: 'FWD',
};

async function createTeamsAndMemberships(
  leagues: SeededLeague[],
  usersByRole: Record<string, SeededUser[]>,
): Promise<{ teamIds: string[]; teamMap: Map<string, { name: string; shortName: string; seed: number }> }> {
  const teamMap = new Map<string, { name: string; shortName: string; seed: number }>();
  const teamIds: string[] = [];

  let dtIdx = 0;
  let asstIdx = 0;
  let playerCursor = 0;
  const players = usersByRole.PLAYER;
  const dts = usersByRole.TECHNICAL_DIRECTOR;
  const assts = usersByRole.ASSISTANT;

  for (const { id: leagueId, def } of leagues) {
    // Pick the team-name pool
    const namePool =
      def.teamNamePool === 'LIBRE' ? TEAM_NAMES_VARONIL_LIBRE :
      def.teamNamePool === 'JUVENIL' ? TEAM_NAMES_JUVENIL :
      TEAM_NAMES_VARONIL_FEMENIL_MIXTO;

    // Shuffle and take 16 names for this league
    const pool = [...namePool];
    shuffleInPlace(prng, pool);

    for (let seed = 1; seed <= 16; seed += 1) {
      const teamName = pool[seed - 1]!;
      const [primary, secondary, emoji] = COLOR_PALETTES[(seed - 1) % COLOR_PALETTES.length]!;
      const shortName = teamName.split(' ').map((w) => w[0] ?? '').join('').slice(0, 3).toUpperCase() || teamName.slice(0, 3).toUpperCase();
      const team = await prisma.team.create({
        data: {
          name: teamName, shortName, emoji,
          primaryColor: primary!, secondaryColor: secondary!,
          homeFieldId: null, isActive: true, currentLeagueId: leagueId,
        },
      });
      teamIds.push(team.id);
      teamMap.set(team.id, { name: teamName, shortName, seed });

      // league_team
      await prisma.leagueTeam.create({
        data: { leagueId, teamId: team.id, seed, groupLabel: null },
      });

      // ----- memberships
      // 1 DT (round-robin across DTs)
      const dt = dts[dtIdx % dts.length]!;
      dtIdx += 1;
      await prisma.teamMembership.create({
        data: {
          teamId: team.id, userId: dt.id, membershipRole: 'DT',
          jerseyNumber: null, position: null, isCaptain: false,
        },
      });

      // 1 Assistant
      const asst = assts[asstIdx % assts.length]!;
      asstIdx += 1;
      await prisma.teamMembership.create({
        data: {
          teamId: team.id, userId: asst.id, membershipRole: 'ASSISTANT',
          jerseyNumber: null, position: null, isCaptain: false,
        },
      });

      // Random roster size between 7 and 20 (user said "min 7 max 20").
      const rosterSize = pickInt(prng, 10, 16);
      for (let dorsal = 1; dorsal <= rosterSize; dorsal += 1) {
        const p = players[playerCursor % players.length]!;
        playerCursor += 1;
        await prisma.teamMembership.create({
          data: {
            teamId: team.id, userId: p.id, membershipRole: 'PLAYER',
            jerseyNumber: dorsal,
            position: POSITION_BY_DORSAL[dorsal] ?? null,
            isCaptain: dorsal === 10,
          },
        });
      }
    }
  }
  console.log(`  ✓ ${teamIds.length} teams + ${teamIds.length * 17} memberships`);
  return { teamIds, teamMap };
}

// =====================================================================
// 11. Seed matchdays + matches (RR + liguilla)
// =====================================================================

const IN_PLAYERS_BY_DORSAL_FOR_GOAL = [10, 9, 8, 11, 7, 5]; // when scoring, prefer forwards + #10
const SCORE_DISTRIBUTION: Array<[[number, number], number]> = [
  [[2, 0], 10], [[2, 1], 18], [[3, 1], 12], [[3, 2], 8],
  [[1, 1], 12], [[0, 0], 5], [[2, 2], 7],
  [[1, 0], 8], [[1, 2], 8], [[0, 2], 4],
  [[4, 2], 4], [[4, 3], 2], [[3, 0], 2],
];

function nextMatchdayDate(league: LeagueDef, jornadaNumber: number, baseDate: Date): Date {
  // Each jornada is 1 week after the previous.
  const d = new Date(baseDate);
  d.setDate(d.getDate() + (jornadaNumber - 1) * 7);
  // Ensure the day-of-week matches the league's dayOfWeek
  const target = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'].indexOf(league.dayOfWeek);
  const current = d.getDay();
  const diff = (target - current + 7) % 7;
  d.setDate(d.getDate() + diff);
  return d;
}

async function seedMatchdaysAndMatches(
  leagues: SeededLeague[],
  fields: { id: string; name: string }[],
  referees: { id: string }[],
  teamMap: Map<string, { name: string; shortName: string; seed: number }>,
): Promise<{ matchCount: number; liguillaCount: number; completedCount: number }> {
  let matchCount = 0;
  let liguillaCount = 0;
  let completedCount = 0;

  for (const { id: leagueId, def } of leagues) {
    // 1. Build team order by seed
    const teamEntries = Array.from(teamMap.entries())
      .filter(([tid]) => true)
      .filter(([_, meta]) => true);
    // Get team ids for this league
    const ltList = await prisma.leagueTeam.findMany({
      where: { leagueId },
      orderBy: { seed: 'asc' },
    });
    const teamIds = ltList.map((lt) => lt.teamId);

    // 2. Generate Berger round-robin (1 vuelta) o doble
    const rrRounds = bergerRoundRobin(teamIds.length);
    const rounds = def.homeAndAway
      ? [...rrRounds, ...rrRounds.map((r) => r.map(([h, a]) => [a, h] as [number, number]))]
      : rrRounds;

    const baseDate = new Date();
    baseDate.setDate(baseDate.getDate() - 28);

    // 3. Create matchdays
    const matchdayIds: string[] = [];
    for (let i = 0; i < rounds.length; i += 1) {
      const mdDate = nextMatchdayDate(def, i + 1, baseDate);
      const md = await prisma.matchday.create({
        data: { leagueId, number: i + 1, date: mdDate, status: 'PENDING' },
      });
      matchdayIds.push(md.id);
    }

    // 4. For each RR match, decide status based on the league's state.
    //
    //   IN_PROGRESS  → matchdays 0..currentRound-1 = COMPLETED, currentRound = mixed
    //                 (first match IN_PROGRESS, rest SCHEDULED), > currentRound = SCHEDULED
    //   PLAYOFFS / FINISHED → all RR matches COMPLETED
    for (let roundIdx = 0; roundIdx < rounds.length; roundIdx += 1) {
      const round = rounds[roundIdx]!;
      const mdId = matchdayIds[roundIdx]!;
      const mdDate = nextMatchdayDate(def, roundIdx + 1, baseDate);

      const allRrCompleted = def.status === 'PLAYOFFS' || def.status === 'FINISHED';
      const currentRound0 = def.currentRound - 1; // 0-based last completed round

      for (let pairIdx = 0; pairIdx < round.length; pairIdx += 1) {
        const pair = round[pairIdx]!;
        // Berger produces 0-based seeds, ltList.seed is 1-based.
        const [homeTeamSeed, awayTeamSeed] = [pair[0]! + 1, pair[1]! + 1];
        const homeTeam = ltList.find((lt) => lt.seed === homeTeamSeed);
        const awayTeam = ltList.find((lt) => lt.seed === awayTeamSeed);
        if (!homeTeam || !awayTeam) continue;
        const isFirstMatch = roundIdx === 0 && pairIdx === 0;
        let status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' = 'SCHEDULED';
        if (allRrCompleted) {
          status = 'COMPLETED';
        } else if (roundIdx < currentRound0) {
          status = 'COMPLETED';
        } else if (roundIdx === currentRound0 && isFirstMatch) {
          status = 'IN_PROGRESS';
        } else if (roundIdx === currentRound0 && prng() < 0.5) {
          status = 'COMPLETED';
        }
        if (status !== 'SCHEDULED') completedCount += 1;

        const matchDate = new Date(mdDate);
        const [hh, mm] = def.kickoffTime.split(':').map(Number);
        matchDate.setHours(hh ?? 19, mm ?? 0, 0, 0);
        const field = fields[pairIdx % fields.length]!;
        const referee = referees[pairIdx % referees.length]!;

        // Generate score if COMPLETED or IN_PROGRESS
        let homeScore: number | null = null;
        let awayScore: number | null = null;
        if (status === 'COMPLETED') {
          const [h, a] = weightedPick(prng, SCORE_DISTRIBUTION);
          homeScore = h!;
          awayScore = a!;
        } else if (status === 'IN_PROGRESS') {
          // Partial: 1-0
          homeScore = 1;
          awayScore = 0;
        }

        await prisma.match.create({
          data: {
            leagueId,
            matchdayId: mdId,
            homeTeamId: homeTeam.teamId,
            awayTeamId: awayTeam.teamId,
            fieldId: field.id,
            scheduledAt: matchDate,
            status, homeScore, awayScore,
            refereeId: referee.id,
            mvpUserId: null,
            scoringMode: status === 'IN_PROGRESS' ? 'LIVE' : status === 'COMPLETED' ? 'POST_MATCH' : null,
            notes: null,
            knockoutStage: null, knockoutPosition: null, knockoutFeedsIntoMatchId: null,
          },
        });
        matchCount += 1;
      }
    }

    // 5. Liguilla (8 clasificados, sembrados por standings parcial al momento del seed)
    const leagueMatches = await prisma.match.findMany({
      where: { leagueId, status: 'COMPLETED' },
    });

    // Compute partial standings
    const stats = new Map<string, { p: number; w: number; d: number; l: number; gf: number; ga: number }>();
    for (const tid of teamIds) stats.set(tid, { p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0 });
    for (const m of leagueMatches) {
      const h = stats.get(m.homeTeamId)!;
      const a = stats.get(m.awayTeamId)!;
      h.p += 1; a.p += 1;
      h.gf += m.homeScore ?? 0; h.ga += m.awayScore ?? 0;
      a.gf += m.awayScore ?? 0; a.ga += m.homeScore ?? 0;
      if ((m.homeScore ?? 0) > (m.awayScore ?? 0)) { h.w += 1; a.l += 1; }
      else if ((m.homeScore ?? 0) < (m.awayScore ?? 0)) { a.w += 1; h.l += 1; }
      else { h.d += 1; a.d += 1; }
    }
    const ranked = teamIds
      .map((tid) => ({ tid, ...stats.get(tid)! }))
      .sort((a, b) => {
        const aPts = a.w * 3 + a.d;
        const bPts = b.w * 3 + b.d;
        if (aPts !== bPts) return bPts - aPts;
        const aGD = a.gf - a.ga;
        const bGD = b.gf - b.ga;
        if (aGD !== bGD) return bGD - aGD;
        return b.gf - a.gf;
      })
      .slice(0, 8);

    // 6. Build liguilla matches
    // Bracket positions: 1v8, 4v5, 2v7, 3v6 (cuartos)
    const quarterMatchIds: string[] = [];
    const pairs = [
      [ranked[0]!.tid, ranked[7]!.tid], // 1v8
      [ranked[3]!.tid, ranked[4]!.tid], // 4v5
      [ranked[1]!.tid, ranked[6]!.tid], // 2v7
      [ranked[2]!.tid, ranked[5]!.tid], // 3v6
    ];

    // Playoff start: 1 week after the last RR jornada
    const lastRrDate = nextMatchdayDate(def, rounds.length, baseDate);
    const playoffStart = new Date(lastRrDate);
    playoffStart.setDate(playoffStart.getDate() + 7);

    // ---- Determine per-stage status from liguillaProgress
    const lp = def.liguillaProgress ?? null;
    const qfDone = lp === 'QF_DONE' || lp === 'SF_DONE' || lp === 'FINAL_DONE';
    const sfDone = lp === 'SF_DONE' || lp === 'FINAL_DONE';
    const finalDone = lp === 'FINAL_DONE';
    const thirdDone = finalDone; // 3rd place is played alongside the final

    // Quarter dates: 4 dates over 1 week
    const qfDates = [
      new Date(playoffStart),
      new Date(playoffStart.getTime() + 2 * 24 * 60 * 60 * 1000),
      new Date(playoffStart.getTime() + 4 * 24 * 60 * 60 * 1000),
      new Date(playoffStart.getTime() + 6 * 24 * 60 * 60 * 1000),
    ];

    // Quarterfinals
    for (let i = 0; i < 4; i += 1) {
      const [homeT, awayT] = pairs[i]!;
      const date = new Date(qfDates[i]!);
      const [hh, mm] = def.kickoffTime.split(':').map(Number);
      date.setHours(hh ?? 19, mm ?? 0, 0, 0);
      let qfStatus: 'SCHEDULED' | 'COMPLETED' = qfDone ? 'COMPLETED' : 'SCHEDULED';
      let qfHomeScore: number | null = null;
      let qfAwayScore: number | null = null;
      if (qfDone) {
        const [h, a] = weightedPick(prng, SCORE_DISTRIBUTION);
        qfHomeScore = h!;
        qfAwayScore = a!;
      }
      const qf = await prisma.match.create({
        data: {
          leagueId,
          matchdayId: matchdayIds[matchdayIds.length - 1]!,
          homeTeamId: homeT!,
          awayTeamId: awayT!,
          fieldId: fields[i % fields.length]!.id,
          scheduledAt: date,
          status: qfStatus,
          homeScore: qfHomeScore,
          awayScore: qfAwayScore,
          refereeId: referees[i % referees.length]!.id,
          mvpUserId: null,
          scoringMode: qfDone ? 'POST_MATCH' : null,
          notes: null,
          knockoutStage: 'QUARTERS', knockoutPosition: i + 1,
          knockoutFeedsIntoMatchId: null,
        },
      });
      quarterMatchIds.push(qf.id);
      liguillaCount += 1;
    }

    // ---- Compute SF participants (winners of QF or placeholders)
    // In a real SF: QF[i] winner vs QF[i+1] winner. For simplicity we use
    // the original seed rank (1v8 winner = ranked[0], 4v5 winner = ranked[3]).
    // The frontend will display the home/away as configured.
    const sfHomePlaceholders = [ranked[0]!.tid, ranked[1]!.tid];
    const sfAwayPlaceholders = [ranked[3]!.tid, ranked[2]!.tid];

    // Semifinals
    const sfDates = [
      new Date(playoffStart.getTime() + 9 * 24 * 60 * 60 * 1000),
      new Date(playoffStart.getTime() + 10 * 24 * 60 * 60 * 1000),
    ];
    const semiMatchIds: string[] = [];
    for (let i = 0; i < 2; i += 1) {
      const [hh, mm] = def.kickoffTime.split(':').map(Number);
      const date = new Date(sfDates[i]!);
      date.setHours(hh ?? 19, mm ?? 0, 0, 0);
      let sfStatus: 'SCHEDULED' | 'COMPLETED' = sfDone ? 'COMPLETED' : 'SCHEDULED';
      let sfHomeScore: number | null = null;
      let sfAwayScore: number | null = null;
      if (sfDone) {
        const [h, a] = weightedPick(prng, SCORE_DISTRIBUTION);
        sfHomeScore = h!;
        sfAwayScore = a!;
      }
      const sf = await prisma.match.create({
        data: {
          leagueId,
          matchdayId: matchdayIds[matchdayIds.length - 1]!,
          homeTeamId: sfHomePlaceholders[i]!,
          awayTeamId: sfAwayPlaceholders[i]!,
          fieldId: fields[i % fields.length]!.id,
          scheduledAt: date,
          status: sfStatus,
          homeScore: sfHomeScore,
          awayScore: sfAwayScore,
          refereeId: referees[(i + 2) % referees.length]!.id,
          mvpUserId: null,
          scoringMode: sfDone ? 'POST_MATCH' : null,
          notes: null,
          knockoutStage: 'SEMIS', knockoutPosition: i + 1,
          knockoutFeedsIntoMatchId: null,
        },
      });
      semiMatchIds.push(sf.id);
      liguillaCount += 1;
    }

    // Update QF to point to the SF they feed
    await prisma.match.update({ where: { id: quarterMatchIds[0]! }, data: { knockoutFeedsIntoMatchId: semiMatchIds[0]! } });
    await prisma.match.update({ where: { id: quarterMatchIds[1]! }, data: { knockoutFeedsIntoMatchId: semiMatchIds[0]! } });
    await prisma.match.update({ where: { id: quarterMatchIds[2]! }, data: { knockoutFeedsIntoMatchId: semiMatchIds[1]! } });
    await prisma.match.update({ where: { id: quarterMatchIds[3]! }, data: { knockoutFeedsIntoMatchId: semiMatchIds[1]! } });

    // Final + 3rd place (same day, 2 hours apart)
    const finalDate = new Date(playoffStart.getTime() + 12 * 24 * 60 * 60 * 1000);
    const [hhF, mmF] = def.kickoffTime.split(':').map(Number);
    finalDate.setHours(hhF ?? 19, mmF ?? 0, 0, 0);
    const thirdDate = new Date(finalDate.getTime() + 2 * 60 * 60 * 1000);

    let finalStatus: 'SCHEDULED' | 'COMPLETED' = finalDone ? 'COMPLETED' : 'SCHEDULED';
    let finalHomeScore: number | null = null;
    let finalAwayScore: number | null = null;
    if (finalDone) {
      const [h, a] = weightedPick(prng, SCORE_DISTRIBUTION);
      finalHomeScore = h!;
      finalAwayScore = a!;
    }

    const finalMatch = await prisma.match.create({
      data: {
        leagueId,
        matchdayId: matchdayIds[matchdayIds.length - 1]!,
        homeTeamId: ranked[0]!.tid,
        awayTeamId: ranked[1]!.tid,
        fieldId: fields[0]!.id,
        scheduledAt: finalDate,
        status: finalStatus,
        homeScore: finalHomeScore,
        awayScore: finalAwayScore,
        refereeId: referees[0]!.id,
        mvpUserId: null,
        scoringMode: finalDone ? 'POST_MATCH' : null,
        notes: null,
        knockoutStage: 'FINAL', knockoutPosition: 1,
        knockoutFeedsIntoMatchId: null,
      },
    });
    liguillaCount += 1;

    let thirdStatus: 'SCHEDULED' | 'COMPLETED' = thirdDone ? 'COMPLETED' : 'SCHEDULED';
    let thirdHomeScore: number | null = null;
    let thirdAwayScore: number | null = null;
    if (thirdDone) {
      const [h, a] = weightedPick(prng, SCORE_DISTRIBUTION);
      thirdHomeScore = h!;
      thirdAwayScore = a!;
    }

    const thirdMatch = await prisma.match.create({
      data: {
        leagueId,
        matchdayId: matchdayIds[matchdayIds.length - 1]!,
        homeTeamId: ranked[2]!.tid,
        awayTeamId: ranked[3]!.tid,
        fieldId: fields[1]!.id,
        scheduledAt: thirdDate,
        status: thirdStatus,
        homeScore: thirdHomeScore,
        awayScore: thirdAwayScore,
        refereeId: referees[1]!.id,
        mvpUserId: null,
        scoringMode: thirdDone ? 'POST_MATCH' : null,
        notes: null,
        knockoutStage: 'THIRD_PLACE', knockoutPosition: 1,
        knockoutFeedsIntoMatchId: null,
      },
    });
    liguillaCount += 1;

    // Wire SF to Final/3rd place
    await prisma.match.update({ where: { id: semiMatchIds[0]! }, data: { knockoutFeedsIntoMatchId: finalMatch.id } });
    await prisma.match.update({ where: { id: semiMatchIds[1]! }, data: { knockoutFeedsIntoMatchId: finalMatch.id } });
    void thirdMatch;
  }

  return { matchCount, liguillaCount, completedCount };
}

// =====================================================================
// 12. Seed events (goals, assists, cards, MVP)
// =====================================================================

async function seedEvents(): Promise<number> {
  const completedMatches = await prisma.match.findMany({
    where: { status: 'COMPLETED' },
    include: { /* nothing extra needed */ },
  });
  const events: Array<{
    matchId: string; minute: number; type: 'GOAL' | 'ASSIST' | 'YELLOW_CARD' | 'RED_CARD' | 'MVP' | 'NOTE' | 'SUBSTITUTION';
    teamId: string; userId: string; secondaryUserId: string | null; notes: string | null;
  }> = [];

  for (const m of completedMatches) {
    // Get the roster of both teams
    const homeRoster = await prisma.teamMembership.findMany({
      where: { teamId: m.homeTeamId, membershipRole: 'PLAYER' },
    });
    const awayRoster = await prisma.teamMembership.findMany({
      where: { teamId: m.awayTeamId, membershipRole: 'PLAYER' },
    });
    const allPlayers = [
      ...homeRoster.map((r) => ({ ...r, teamId: m.homeTeamId })),
      ...awayRoster.map((r) => ({ ...r, teamId: m.awayTeamId })),
    ];

    const homeGoals = m.homeScore ?? 0;
    const awayGoals = m.awayScore ?? 0;

    // Generate goals
    const goalTimes: number[] = [];
    for (let g = 0; g < homeGoals + awayGoals; g += 1) {
      goalTimes.push(5 + Math.floor(prng() * 84));
    }
    goalTimes.sort((a, b) => a - b);

    for (let g = 0; g < homeGoals + awayGoals; g += 1) {
      const isHomeGoal = g < homeGoals;
      const teamId = isHomeGoal ? m.homeTeamId : m.awayTeamId;
      const roster = isHomeGoal ? homeRoster : awayRoster;
      // Prefer forwards (#8, #9, #11, #10)
      const preferred = roster.filter((r) => r.jerseyNumber !== null && [8, 9, 10, 11].includes(r.jerseyNumber));
      const scorer = preferred.length > 0
        ? pickOne(prng, preferred)
        : pickOne(prng, roster);
      const ev: typeof events[number] = {
        matchId: m.id,
        minute: goalTimes[g]!,
        type: 'GOAL',
        teamId,
        userId: scorer.userId,
        secondaryUserId: null,
        notes: null,
      };
      // 70% chance of assist
      if (prng() < 0.7 && roster.length > 1) {
        const assisters = roster.filter((r) => r.userId !== scorer.userId);
        if (assisters.length > 0) {
          ev.secondaryUserId = pickOne(prng, assisters).userId;
        }
      }
      events.push(ev);
    }

    // 25% chance of yellow card
    if (prng() < 0.25) {
      const teamId = prng() < 0.5 ? m.homeTeamId : m.awayTeamId;
      const roster = teamId === m.homeTeamId ? homeRoster : awayRoster;
      if (roster.length > 0) {
        events.push({
          matchId: m.id,
          minute: 30 + Math.floor(prng() * 50),
          type: 'YELLOW_CARD',
          teamId,
          userId: pickOne(prng, roster).userId,
          secondaryUserId: null,
          notes: null,
        });
      }
    }

    // MVP at minute 90 — pick the player with most goals+assists in this match
    const stats = new Map<string, number>();
    for (const e of events.filter((x) => x.matchId === m.id)) {
      if (e.type === 'GOAL') {
        stats.set(e.userId, (stats.get(e.userId) ?? 0) + 1);
        if (e.secondaryUserId) stats.set(e.secondaryUserId, (stats.get(e.secondaryUserId) ?? 0) + 1);
      }
    }
    let mvpUserId: string | null = null;
    let max = -1;
    for (const [uid, count] of stats) {
      if (count > max) { max = count; mvpUserId = uid; }
    }
    if (mvpUserId) {
      // Determine team of the MVP
      const mvpUser = allPlayers.find((r) => r.userId === mvpUserId);
      events.push({
        matchId: m.id,
        minute: 90,
        type: 'MVP',
        teamId: mvpUser?.teamId ?? m.homeTeamId,
        userId: mvpUserId,
        secondaryUserId: null,
        notes: null,
      });
    }
  }

  // Bulk insert
  if (events.length > 0) {
    // Map fields to Prisma's expected types (using enum values)
    await prisma.matchEvent.createMany({
      data: events.map((e) => ({
        matchId: e.matchId,
        minute: e.minute,
        type: e.type as 'GOAL' | 'ASSIST' | 'YELLOW_CARD' | 'MVP' | 'NOTE' | 'RED_CARD' | 'SUBSTITUTION',
        teamId: e.teamId,
        userId: e.userId,
        secondaryUserId: e.secondaryUserId,
        notes: e.notes,
      })),
    });
  }
  return events.length;
}

// =====================================================================
// 13. Awards de la temporada pasada (4 ligas históricas)
// =====================================================================

async function seedAwards() {
  // 4 awards de ligas finalizadas la temporada anterior. Como referencia.
  // No están vinculados a ligas activas.
  void prisma;
  // No-op por ahora (la temporada anterior no está modelada en el seed).
}

// =====================================================================
// 14. Main orchestrator
// =====================================================================

async function main() {
  console.log('🌱 Seeding Canchas las TKT…\n');

  console.log('🧹 Wiping existing data…');
  await wipe();

  console.log('\n🏟️  Fields:');
  const fields = await createFields();

  console.log('\n👥 Users:');
  const { byRole: usersByRole } = await createUsers(LEAGUES);

  console.log('\n🏆 Leagues + league-field links:');
  const leagues = await createLeagues(fields);

  console.log('\n🛡️  Teams + memberships:');
  const { teamMap } = await createTeamsAndMemberships(leagues, usersByRole);

  console.log('\n📅 Matchdays + matches (RR + liguilla):');
  const { matchCount, liguillaCount, completedCount } = await seedMatchdaysAndMatches(
    leagues, fields, usersByRole.REFEREE.map((r) => ({ id: r.id })), teamMap,
  );

  console.log('\n⚽ Events (goals, assists, cards, MVP):');
  const eventCount = await seedEvents();

  console.log('\n🏅 Awards:');
  await seedAwards();

  console.log('\n✅ Seed completed:');
  console.log(`   Users   : ${Object.values(usersByRole).reduce((a, b) => a + b.length, 0)}`);
  console.log(`   Fields  : ${fields.length}`);
  console.log(`   Leagues : ${leagues.length}`);
  console.log(`   Matches : ${matchCount} (${completedCount} completed, ${liguillaCount} liguilla)`);
  console.log(`   Events  : ${eventCount}`);
  console.log('\n🔑 Default passwords:');
  console.log(`   ADMIN     → ${PASSWORDS.admin}`);
  console.log(`   REFEREE   → ${PASSWORDS.referee}`);
  console.log(`   DT        → ${PASSWORDS.dt}`);
  console.log(`   ASSISTANT → ${PASSWORDS.assistant}`);
  console.log(`   PLAYER    → ${PASSWORDS.player}`);
}

main()
  .catch(async (e) => {
    console.error('❌ Seed failed:', e);
    await prisma.$disconnect();
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
