# Kaibil Football — Roadmap v1.0.0

> Plan para llegar a v1.0.0 con **datos mock** en todas las pantallas.
> Después de v1.0.0: tú revisas cada pantalla, decides qué se queda y qué
> se va. Recién entonces construimos los servicios reales del API.

---

## 0. Visión y principios

- **Format-agnostic**: el sistema soporta desde 1v1 hasta 11v11 (fútbol
  rápido, sala, soccer 7, soccer 11, etc.). El `format` se configura por
  **Liga**, no es un supuesto del sistema.
- **Single-tenant**: una sola organización dueña del sistema. Todos los
  datos viven en una sola base de datos.
- **5 roles** con vistas y permisos distintos (matriz abajo).
- **Catálogo de mocks rico**: 10 ligas con formatos/categorías diferentes,
  10 canchas con distintas superficies y formatos soportados, varios
  equipos, jugadores, árbitros, DTs y asistentes.
- **Mock-first, API-ready**: cada hook de datos devuelve
  `{ data, isLoading, error }`. El cuerpo hoy es `asyncResolve(MOCK)`;
  mañana es `apiClient.get(...)`. La UI no cambia.
- **Idioma de la UI**: español. Estados, posiciones, eventos en español
  (GOLEADOR, MVP, FAIR_PLAY, etc.). El backend guardará en inglés; el
  frontend formatea.

---

## 1. Jerarquía organizacional

El sistema es **single-tenant**: hay un único dueño (uno o más usuarios
con `role = 'ADMIN'` que comparten el mismo "espacio administrativo"),
dueño de todas las canchas y todas las ligas. La jerarquía completa es:

```
ADMIN (dueño único del sistema)
│
├── N canchas                  (todas suyas)
│     • soportan ciertos formatos (F5, F7, F11…)
│     • una cancha o varias por liga
│
├── N ligas                    (todas suyas)
│     • name (ej: "Liga Kaibil — Lunes Libre")
│     • category: string       (LIBRE, SUB-17, VETERANOS, JUVENIL
│                                MATUTINA, JUVENIL VESPERTINA, MIXTO,
│                                EMPRESAS, INDIVIDUAL… libre, el admin
│                                escribe el valor)
│     • format: LeagueFormat   (1V1, 3V3, 5V5, 6V6, 7V7, 9V9, 11V11)
│     • dayOfWeek?: WeekDay    (LUN, MIE, SAB, DOM… opcional; algunas
│                                ligas como Copa no tienen día fijo)
│     • timeSlot?: TimeSlot    (MORNING, AFTERNOON, EVENING, NIGHT)
│     • maxTeams: number        (editable; tope de equipos en la liga)
│     • type: ROUND_ROBIN | GROUPS_KNOCKOUT | KNOCKOUT_ONLY
│     • homeAndAway: boolean
│     • matchdays: number
│     • fieldIds: string[]     (canchas donde se juega esta liga)
│
└── N ligas → N equipos        (cada liga tiene hasta maxTeams equipos)
      │
      ├── 1 Director Técnico   (User con TeamMembership.membershipRole = 'DT')
      ├── N Auxiliares          (… = 'ASSISTANT')
      └── N Jugadores           (… = 'PLAYER'; con jerseyNumber, position,
                                 isCaptain)
```

### Reglas clave de la jerarquía

1. **Membresía por equipo, no por liga, no por usuario.**
   `TeamMembership (userId, teamId, membershipRole)` une un usuario a un
   equipo específico. Un mismo usuario puede aparecer en N
   `TeamMembership` distintas si juega/entrena en varios equipos.

2. **Un jugador puede estar en varios equipos de distintas ligas,**
   incluso todas del mismo dueño. Ejemplo real (cancha con 4 F7 que
   funciona toda la semana):
   - Lunes 19:00 — Liga **LIBRE**, equipo *Linces FC* (dorsal 10)
   - Miércoles 20:00 — Liga **SUB-21 JUVENIL**, equipo *Halcones* (dorsal 7)
   - Sábado 09:00 — Liga **JUVENIL MATUTINA**, equipo *Linces Sub-21* (dorsal 9)
   - Sábado 17:00 — Liga **JUVENIL VESPERTINA**, equipo *Cóndores JR* (dorsal 11)
   Las 4 ligas las opera el mismo ADMIN que es dueño de las 4 canchas.

3. **`maxTeams` es por liga y editable.** Si el admin lo reduce por
   debajo del número actual de equipos asignados, el sistema **advierte
   visualmente** (banner amarillo) pero **no echa equipos
   automáticamente**. El admin ajusta manualmente.

4. **El ADMIN es un `User` con `role = 'ADMIN'`.** No hay modelo
   `Admin` separado. La pertenencia se infiere por rol. El single-tenant
   implica que "ser ADMIN" = "ser dueño del espacio".

5. **Un DT / Asistente también puede ser jugador** en otro equipo. La
   membresía se modela con `membershipRole` por equipo, así que un mismo
   userId puede tener:
   - 1 `TeamMembership` como `DT` en equipo A
   - 1 `TeamMembership` como `PLAYER` en equipo B
   - 1 `TeamMembership` como `ASSISTANT` en equipo C

6. **Un REFEREE no tiene `TeamMembership`.** El árbitro no pertenece a
   un equipo; se le asigna partido a partido (FK `Match.refereeId`).

### Implicaciones para la UI

- **Selector de equipo en alineación / evento** filtra por los equipos
  en los que el usuario logueado tiene `TeamMembership` con rol
  compatible (DT/Assistant solo ven su equipo; Player ve su equipo).
- **Vista "mis partidos"** de un jugador muestra partidos de TODOS los
  equipos donde tiene `TeamMembership` activa, agrupados por liga.
- **Vista de equipo** muestra la lista de jugadores con su rol **en ese
  equipo** (un jugador puede aparecer como "Delantero, dorsal 10" en un
  equipo y "Defensa, dorsal 4" en otro).
- **El ADMIN** en el wizard de creación de liga debe poder elegir día de
  la semana y turno (para que se note visualmente que "Lunes Libre" y
  "Lunes Veteranos" son ligas distintas en el mismo horario de una
  cancha — si la cancha no soporta dos ligas en el mismo slot, el
  sistema avisa).

---

## 2. Roles y permisos

| Acción | ADMIN | REFEREE | DT | ASSISTANT | PLAYER |
|---|:-:|:-:|:-:|:-:|:-:|
| CRUD de usuarios | ✅ | ❌ | ❌ | ❌ | ❌ (sólo su perfil) |
| CRUD de canchas | ✅ | ❌ | ❌ | ❌ | ❌ |
| CRUD de ligas | ✅ | ❌ | ❌ | ❌ | ❌ |
| CRUD de equipos | ✅ | ❌ | ✅ (su equipo) | ❌ | ❌ |
| Asignar equipos a liga | ✅ | ❌ | ❌ | ❌ | ❌ |
| Generar fixture | ✅ | ❌ | ❌ | ❌ | ❌ |
| Reordenar fixture (drag&drop) | ✅ | ❌ | ❌ | ❌ | ❌ |
| Asignar árbitros a partidos | ✅ | ❌ | ❌ | ❌ | ❌ |
| Registrar resultado (live) | ✅ | ✅ (asignados) | ❌ | ❌ | ❌ |
| Registrar resultado (post) | ✅ | ✅ (asignados) | ❌ | ❌ | ❌ |
| Cargar lineup / formación | ✅ | ❌ | ✅ (su equipo) | ✅ (su equipo, read en v1) | ❌ |
| Ver tabla de posiciones | ✅ | ✅ | ✅ | ✅ | ✅ |
| Ver goleadores / asistidores | ✅ | ✅ | ✅ | ✅ | ✅ |
| Ver perfil de cualquier jugador | ✅ | ✅ | ✅ (su equipo) | ✅ (su equipo) | ✅ (público) |
| Ver perfil propio con stats | ✅ | ✅ | ✅ | ✅ | ✅ |
| Crear eliminatoria (knockout) | ✅ | ❌ | ❌ | ❌ | ❌ |

**Definición de roles:**

- **ADMIN** — Dueño del sistema. Acceso total. Único que muta estructura.
- **REFEREE** — Árbitro. Ve los partidos que le asignaron, registra
  resultados y eventos. Tiene perfil con stats de partidos arbitrados.
- **TECHNICAL_DIRECTOR (DT)** — Director técnico de un equipo. Gestiona
  su equipo, ve calendario, carga alineación, ve stats de su plantilla.
- **ASSISTANT** — Asistente del DT. Mismo equipo, permisos de lectura
  sobre el equipo. En v1.0.0 sin permisos de escritura.
- **PLAYER** — Jugador. Ve su perfil, stats, calendario de su equipo,
  tabla, goleadores. Edita su propio perfil.

**Membresía**: un usuario puede ser PLAYER en un equipo y a la vez
REFEREE de otros partidos. La membresía jugador↔equipo se modela aparte
(`TeamMembership` con `role: PLAYER | DT | ASSISTANT`).

---

## 3. Catálogo de mocks (semilla v1.0.0)

### 2.1 Canchas (10)

| # | Nombre | Formatos soportados | Superficie | Techada | Dirección | Capacidad |
|---|---|---|---|:-:|---|:-:|
| 1 | Complejo Norte — Cancha 1 | 5v5, 6v6, 7v7 | Pasto sintético | ❌ | Av. Norte 123, Col. Industrial | 200 |
| 2 | Complejo Norte — Cancha 2 | 5v5, 6v6, 7v7 | Pasto sintético | ❌ | Av. Norte 123, Col. Industrial | 200 |
| 3 | Complejo Sur — Cancha F5-A | 5v5 | Sintético sala | ✅ | Blvd. Sur 456, Col. Deportiva | 100 |
| 4 | Complejo Sur — Cancha F5-B | 5v5 | Sintético sala | ✅ | Blvd. Sur 456, Col. Deportiva | 100 |
| 5 | El Coloso — Cancha 1 | 7v7, 9v9, 11v11 | Pasto natural | ❌ | Calz. del Estadio 789 | 500 |
| 6 | La Bombonerita | 3v3, 5v5, 6v6 | Sintético sala | ✅ | Calle 8 #45, Centro | 80 |
| 7 | Indoor Downtown | 3v3, 5v5, 6v6 | Sintético indoor | ✅ | Reforma 222, Piso -1 | 60 |
| 8 | Cancha 1v1 — El Duelo | 1v1 | Cemento pulido | ❌ | Parque Hidalgo, frente a fuente | 30 |
| 9 | Polideportivo Sur — Cancha 3 | 5v5, 6v6, 7v7 | Pasto sintético | ❌ | Av. del Sol 1500 | 150 |
| 10 | Estadio Azteca Sintético | 7v7, 9v9, 11v11 | Híbrido | ❌ | Calz. Azteca 1 | 800 |

### 2.2 Ligas (10)

| # | Nombre | Formato | Categoría | Día | Turno | maxTeams | Temporada | Equipos | Estado |
|---|---|---|---|---|:-:|:-:|---|:-:|---|
| L1 | Kaibil — Lunes Libre | 7v7 | LIBRE | Lunes | 19:00 (EVENING) | 8 | Apertura 2025 | 8 | Temporada regular, jornada 6/14 |
| L2 | Copa Nocturna Miércoles | 5v5 | MIXTO | Miércoles | 21:00 (NIGHT) | 8 | 2025 | 6 | Fase de grupos |
| L3 | Kaibil — Femenil Martes | 7v7 | FEMENIL | Martes | 20:00 (EVENING) | 8 | Clausura 2025 | 8 | Temporada regular, jornada 2/14 |
| L4 | Veteranos Domingo | 11v11 | VETERANOS +35 | Domingo | 09:00 (MORNING) | 6 | Apertura 2025 | 6 | Temporada regular, jornada 3/10 |
| L5 | Relámpago 1v1 Sábado | 1v1 | INDIVIDUAL | Sábado | 12:00 (MORNING) | 16 | 2025 | 16 | Round-robin cara a cara |
| L6 | Sub-17 Sábado Matutina | 6v6 | SUB-17 | Sábado | 08:00 (MORNING) | 8 | Apertura 2025 | 6 | Temporada regular, jornada 4/10 |
| L7 | Copa de Verano 2025 | 7v7 | MIXTO | — (fechas libres) | 20:00 (EVENING) | 8 | 2025 | 8 | **Finalizada** |
| L8 | Nocturna 2024 Clausura | 5v5 | LIBRE | Jueves | 22:00 (NIGHT) | 8 | Clausura 2024 | 8 | **Finalizada** |
| L9 | Copa Empresas 2025 | 5v5 | EMPRESAS | Domingo | 14:00 (AFTERNOON) | 16 | 2025 | 4×4 = 16 | Grupos + eliminatorias |
| L10 | Femenil Sábado Vespertina | 7v7 | FEMENIL | Sábado | 17:00 (AFTERNOON) | 8 | Apertura 2025 | 6 | Temporada regular, jornada 1/10 |

> **Nota sobre la operación semanal del dueño**: L1+L6+L10 son
> distintas ligas en F7 operadas por el mismo dueño. L1 usa cancha
> Norte-1 lunes 19:00, L6 usa cancha Norte-1 sábado 08:00, L10 usa
> cancha Norte-2 sábado 17:00. Un jugador del dueño (p.ej. Juan) puede
> estar en L1 con Linces FC (lunes 19:00), en L6 con Linces Sub-21
> (sábado 08:00) y en L10 con Cóndores JR (sábado 17:00), todas del
> mismo Admin.
>
> **Nota sobre 1v1 (L5)**: en formato 1v1 no hay "equipos" en el sentido
> clásico. Cada jugador es su propio "equipo" de tamaño 1. La
> `Team` model sigue siendo válida: simplemente el roster tiene 1
> miembro y el `Match.homeTeamId` / `awayTeamId` apuntan a esos
> "equipos" de 1 jugador. La tabla de posiciones rankea jugadores
> (1 G/E/P = 1 duelo ganado/empatado/perdido), y los "goleadores" son
> los jugadores con más duelos ganados.

### 2.3 Equipos (≈30)

Repartidos entre las 10 ligas (un equipo puede estar en varias).
Cada equipo tiene:

- `name`: ej. "Linces FC", "Cóndores", "Halcones United"
- `logoUrl`: emoji o imagen (en mock: emoji o color sólido)
- `primaryColor`, `secondaryColor`
- `homeFieldId` (opcional)
- `roster`: lista de `playerId`s

### 2.4 Usuarios (≈50)

- 2-3 ADMIN
- 5-6 REFEREE con stats de partidos arbitrados
- 8-10 DT / ASSISTANT
- 30-40 PLAYER repartidos en equipos
- 1 usuario de prueba para cada rol (5 cuentas demo)

### 2.5 Catálogo de avatares / escudos

Para no depender de uploads reales en v1.0.0 mock:

- **Jugadores sin foto**: avatar con iniciales sobre color derivado del `id` (hash → HSL).
- **Equipos sin escudo**: chip con emoji deportivo (🦅, 🦁, 🐺, 🐉, etc.) o color sólido.
- **Canchas sin foto**: gradiente con el formato (F5, F7, F11) estampado.

---

## 4. Modelo de datos (mock)

> El backend real partirá de este mismo modelo. El frontend lo consume
> vía hooks `useXxx()` que hoy resuelven de `MOCK_X` con `asyncResolve`.

```
User
  id, firstName, paternalSurname, maternalSurname, birthDate, age,
  role, nickname, phoneNumber, email, curp, isActive, profilePhotoUrl,
  coverPhotoUrl, createdAt, updatedAt

Field
  id, name, address, description, capacity, isActive,
  supportedFormats: LeagueFormat[],   // ej: ["FIVE_VS_FIVE", "SEVEN_VS_SEVEN"]
  surface: 'GRASS' | 'SYNTHETIC' | 'INDOOR' | 'CONCRETE' | 'HYBRID',
  isIndoor: boolean

League
  id, name, description, season, startDate, endDate, isActive,
  format: LeagueFormat,               // 1V1, 3V3, 5V5, 6V6, 7V7, 9V9, 11V11
  category: string,                   // LIBRE, SUB-17, VETERANOS, JUVENIL
                                      // MATUTINA, JUVENIL VESPERTINA,
                                      // MIXTO, EMPRESAS, INDIVIDUAL, etc.
                                      // Texto libre definido por el admin
  type: LeagueType,                   // ROUND_ROBIN | GROUPS_KNOCKOUT | KNOCKOUT_ONLY
  matchdays: number,                  // número de jornadas (round-robin)
  homeAndAway: boolean,               // ida y vuelta
  maxTeams: number,                   // tope de equipos (editable, default 8)
  dayOfWeek?: WeekDay,                // MONDAY..SUNDAY, opcional
  timeSlot?: TimeSlot,                // MORNING, AFTERNOON, EVENING, NIGHT
  status: 'PLANNED' | 'IN_PROGRESS' | 'FINISHED',
  fieldIds: string[]                  // canchas donde se juega esta liga
  + audit cols

Team
  id, name, shortName, logoUrl,
  primaryColor, secondaryColor,
  homeFieldId, isActive
  + audit cols

TeamMembership                              // players + staff por equipo
  teamId, userId,
  membershipRole: 'PLAYER' | 'DT' | 'ASSISTANT',
  jerseyNumber?: number,                    // solo PLAYER
  position?: 'GK' | 'DEF' | 'MID' | 'FWD',  // solo PLAYER (en F5/F6 puede ser 'FIXO' etc., extensible)
  isCaptain: boolean,
  joinedAt

LeagueTeam                                  // equipo ↔ liga + seed
  leagueId, teamId, seed, groupLabel?       // groupLabel si la liga tiene grupos

Matchday
  id, leagueId, number, date, status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED'

Match
  id, matchdayId, leagueId,
  homeTeamId, awayTeamId,                    // en 1v1 son dos playerId
  fieldId, scheduledAt,
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'POSTPONED' | 'CANCELLED',
  homeScore, awayScore,
  refereeId, mvpPlayerId,
  scoringMode: 'LIVE' | 'POST_MATCH',        // cómo se capturó
  notes
  + audit cols

MatchEvent                                   // línea de tiempo del partido
  id, matchId, minute,
  type: 'GOAL' | 'ASSIST' | 'YELLOW_CARD' | 'RED_CARD' | 'SUBSTITUTION' | 'MVP' | 'NOTE',
  teamId,                                     // en 1v1 = homeTeamId/awayTeamId según jugador
  playerId,
  secondaryPlayerId?: string,                 // para GOAL+ASSIST o SUBSTITUTION (sale/entra)
  notes?

PlayerSeasonStats                            // stats agregadas por jugador por liga
  playerId, leagueId,
  matchesPlayed, goals, assists,
  yellowCards, redCards,
  mvpCount, cleanSheets,                     // porterías a cero (no aplica a F1, queda 0)
  ranking,                                    // posición en goleadores de la liga
  winRate                                     // en F1: % de duelos ganados

TeamSeasonStats                              // stats agregadas por equipo por liga
  teamId, leagueId,
  matchesPlayed, won, drawn, lost,
  goalsFor, goalsAgainst, goalDifference, points,
  ranking,                                    // posición en la tabla
  fairPlayScore                              // menos tarjetas = mejor

Award
  id, leagueId, season, type, level,          // level: GOLD/SILVER/BRONZE
  category: 'SCORER' | 'MVP' | 'FAIR_PLAY' | 'CHAMPION' | 'BEST_DEFENSE',
  playerId?, teamId?,                         // uno u otro
  awardedAt, description

KnockoutBracket                              // estructura de eliminatorias
  leagueId, stage,                            // QUARTERS, SEMIS, FINAL
  matches: Match[]                            // usa el mismo modelo Match
```

### Enums clave

```ts
type LeagueFormat = '1V1' | '3V3' | '5V5' | '6V6' | '7V7' | '9V9' | '11V11';
type LeagueType = 'ROUND_ROBIN' | 'GROUPS_KNOCKOUT' | 'KNOCKOUT_ONLY';
type WeekDay = 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY';
type TimeSlot = 'MORNING' | 'AFTERNOON' | 'EVENING' | 'NIGHT';
type MatchResult = 'WIN' | 'LOSS' | 'DRAW';
type ScoringMode = 'LIVE' | 'POST_MATCH';
type MatchEventType = 'GOAL' | 'ASSIST' | 'YELLOW_CARD' | 'RED_CARD' | 'SUBSTITUTION' | 'MVP' | 'NOTE';
type Surface = 'GRASS' | 'SYNTHETIC' | 'INDOOR' | 'CONCRETE' | 'HYBRID';
type MembershipRole = 'PLAYER' | 'DT' | 'ASSISTANT';
```

> `League.category` se modela como `string` (texto libre) en vez de enum
> para permitir categorías arbitrarias por liga. La UI ofrece un
> datalist con valores comunes como sugerencia, pero el admin puede
> escribir la que quiera.

---

## 5. Los 10 pasos

> **Convención**: cada paso entrega pantallas navegables con datos
> mock. Al final de cada paso tú puedes ver, navegar y dar feedback.
> El paso N+1 se apoya en lo que ya construyó el paso N.

### Paso 1 · Auth + perfil base ✅ (ya hecho)
- Login, Register, Profile, Dashboard básico.
- Hooks `useIsAdmin`.
- Componentes UI base (Button, TextField, Card, Chip, Banner, etc.).

### Paso 2 · Canchas y ligas (CRUD) ✅ (ya hecho)
- `/fields` y `/leagues` con listar/crear/editar/eliminar.
- Modales de confirmación.

### Paso 3 · Equipos (Teams CRUD)
**Pantallas nuevas:**
- `/teams` — listado de todos los equipos con filtros (formato, categoría,
  liga). Cada card muestra escudo + colores + liga actual + DT.
- `/teams/:id` — detalle del equipo:
  - **Header**: escudo, colores, nombre, liga actual.
  - **Tabs**:
    - **Plantilla**: lista de jugadores con dorsal, posición, capitán.
      Si un jugador está en 2+ equipos, ver link a sus otros equipos.
    - **Staff**: DT, auxiliares, contacto.
    - **Partidos**: últimos y próximos del equipo en todas sus ligas.
    - **Estadísticas**: resumen agregado del equipo en la temporada.
- Modal `TeamForm` (crear/editar, ADMIN).
- Modal `RosterEditor` (ADMIN/DT): agregar/quitar miembros, asignar
  dorsal y posición. Soporta que un mismo jugador aparezca en varios
  equipos (se gestiona vía `TeamMembership`, no se duplica el User).

**Datos mock nuevos:**
- 30 equipos repartidos en las 10 ligas.
- Cada equipo con roster de tamaño acorde a su formato (F5: 8, F7: 12,
  F11: 18, F1: 1).
- ~20% de los jugadores están en 2+ equipos (caso "Juan" del ejemplo).
- Dorsales y posiciones asignadas.
- 1 DT y 1-2 auxiliares por equipo.

**Roles que ven esta pantalla:** todos (lectura). ADMIN/DT pueden editar
su plantilla.

**Componentes nuevos:**
- `TeamBadge` — chip visual con color primario y emoji de mascota.
- `RosterList` — lista de jugadores con dorsal + posición.
- `StaffBlock` — DT y asistente del equipo.

---

### Paso 4 · Configuración de torneo + asignación de equipos
**Pantallas nuevas:**
- Wizard `TournamentConfig` embebido en `LeagueForm`:
  - Paso 1: **formato** (1v1, 3v3, 5v5, 6v6, 7v7, 9v9, 11v11) + **categoría**
    (texto libre con datalist de sugerencias: LIBRE, SUB-17,
    VETERANOS, JUVENIL, MIXTO, EMPRESAS, INDIVIDUAL, FEMENIL, VARONIL).
  - Paso 2: **día de la semana** (opcional) + **turno** (MORNING,
    AFTERNOON, EVENING, NIGHT) + **maxTeams** (default 8, editable).
    Banner de advertencia si `maxTeams` se reduce por debajo del
    número actual de equipos asignados.
  - Paso 3: tipo (round-robin, grupos+ko, ko directo) + ida/vuelta +
    número de jornadas.
  - Paso 4: **asignar equipos** — picklist con drag&drop para reordenar
    (el orden define el "seed"). Opción de **orden aleatorio** (botón
    🎲 que revuelve) y de **orden manual** (drag&drop). Tope visual
    en `maxTeams`.
  - Paso 5: canchas donde se juega (multi-select filtrado por formatos
    soportados que coincidan con el `format` de la liga).
- Vista `/leagues/:id/teams` — equipos asignados con seed, drag&drop
  para reordenar, edición inline de miembros (DT, auxiliares,
  jugadores) con dorsal y posición.
- Vista `/leagues/:id/schedule` — resumen de día+turno+canchas (los
  "slots" donde se juega esta liga, derivado de la config).

**Datos mock nuevos:**
- `LeagueTeam` con `seed` y `groupLabel?` para cada liga.
- Mocks de asignación para las 10 ligas del catálogo, con `seed` 1..N
  por liga.
- Mocks de `TeamMembership` para todos los equipos, con un 20% de
  jugadores que están en 2+ equipos a la vez (el "Juan" del ejemplo).

**Roles:** solo ADMIN crea y edita. DT/Assistant/Player solo ven.

**Componentes nuevos:**
- `TeamPicker` con búsqueda + drag&drop entre "disponibles" y "asignados",
  respetando `maxTeams`.
- `SeedList` reordenable.
- `RosterEditor` (tabla inline: agregar/quitar jugador, dorsal, posición,
  capitán).

---

### Paso 5 · Generación de fixture + drag&drop de jornadas
**Pantallas nuevas:**
- `/leagues/:id/fixture` — vista principal del calendario.
  - **Vista lista** (default): agrupado por jornada, drag&drop para
    mover partidos entre jornadas o reordenar dentro de la jornada.
  - **Vista calendario** (toggle): mes con partidos por día, click en
    día abre detalle.
  - Botón **Generar fixture** (ADMIN): algoritmo round-robin
    (Berger tables) o grupos+ko según `league.type`.
  - Botón **Orden aleatorio** y **Ordenar por seed**.
  - Indicador visual de estado: pendiente / en juego / finalizado.

**Lógica del algoritmo (mock):**
- Round-robin: 1v1 → N*(N-1)/2 duelos; N equipos → N pares por jornada
  si N par, o BYE si impar.
- Grupos+KO: 4 grupos × 4 → octavos → cuartos → semis → final.
- KO directo: bracket de 4 / 8 / 16.

**Datos mock nuevos:**
- Para L1 (Apertura 2025, 8 equipos 7v7): 14 jornadas × 4 partidos = 56
  partidos, primeros 6 jornadas con resultados, jornada 7 en juego,
  resto pendiente.
- Misma lógica para las otras ligas activas.

**Roles:** solo ADMIN genera fixture. Todos pueden verlo.

**Componentes nuevos:**
- `FixtureList` con drag&drop.
- `MatchdayColumn`.
- `MatchPill` (resumen de un partido: equipos + score + estado).
- `CalendarView` (mes).

---

### Paso 6 · Partido (Match Card) + modo live / post-match
**Pantallas nuevas:**
- `/matches/:id` — la pantalla **estrella** del producto.
  - Header: equipos, score grande, formato (F7), cancha, árbitro, hora.
  - Tabs: **Resumen** · **Eventos** · **Estadísticas** · **Alineación**.
  - **Modo LIVE** (referee/admin durante el partido):
    - Botón "Iniciar" → arranca reloj (en mock: timer virtual).
    - Botones rápidos: `+ Gol local` / `+ Gol visita` → modal para
      anotar jugador, asistidor, minuto.
    - Tap jugador en la alineación → menú: Tarjeta amarilla / roja /
      Sustitución / MVP.
    - Línea de tiempo visual con todos los eventos.
    - Botón "Finalizar partido".
  - **Modo POST_MATCH** (referee/admin después):
    - Formulario consolidado: score final + todos los eventos en una
      sola pasada, sin reloj.
  - Toggle entre modos según el estado del partido y los permisos.

**Datos mock nuevos:**
- Para los partidos de L1 jornadas 1-6: 24 partidos ya finalizados con
  scores, eventos (goles, asistidores, tarjetas, MVP), modo = POST_MATCH.
- 1 partido de L1 jornada 7 en IN_PROGRESS para demostrar el modo LIVE.
- Partidos de las otras ligas con diversa combinación de estados.

**Roles:**
- REFEREE asignado: editar (LIVE/POST).
- ADMIN: editar cualquier partido.
- DTs/Assistants/Players: solo lectura.

**Componentes nuevos:**
- `MatchScoreboard` (gigante, neobrutalist, equipos + score).
- `MatchTimeline` (eventos en orden cronológico).
- `EventQuickAdd` (modal para gol/asistencia/tarjeta).
- `RosterPicker` (elige jugador de la plantilla).
- `MatchClock` (timer virtual con start/pause/finish).

---

### Paso 7 · Tabla de posiciones (Standings)
**Pantallas nuevas:**
- `/leagues/:id/standings` — tabla principal de la liga.
  - Columnas: `#`, Equipo, PJ, G, E, P, GF, GA, DIF, PTS, Fair play.
  - Ordenable (click en header).
  - Filtros: por grupo (si la liga tiene grupos), por jornada (mostrar
    estado hasta la jornada N).
  - Click en equipo → drill-down a `/teams/:id` filtrado por liga.
- `/leagues/:id/standings/print` — vista limpia para imprimir/PDF.

**Lógica (mock):**
- Calculada a partir de los `Match` finalizados.
- 3 PTS por ganado, 1 por empate, 0 por perdido.
- Fair play: -1 por amarilla, -3 por roja, ordenado ascendente.
- Desempate: 1) puntos, 2) GD, 3) GF, 4) head-to-head (mock: aleatorio).

**Roles:** todos pueden ver.

**Componentes nuevos:**
- `StandingsTable`.
- `StandingsRow` con badge de posición (1-3 destacado, descensos en rojo).

---

### Paso 8 · Stats individuales y leaderboards
**Pantallas nuevas:**
- `/leagues/:id/stats` — leaderboards de la liga.
  - Tabs: **Goleadores** · **Asistidores** · **MVPs** · **Fair play**.
  - Cada uno: top 20 con foto, equipo, contador.
- `/players/:id` — perfil público de cualquier jugador.
  - (Reutiliza el `ProfilePage` actual pero con tabs por temporada.)
  - **Stats por liga** (G, A, TA, TR, MVPs, ranking).
  - **Partidos recientes** con la tarjeta del partido (link al detail).
  - **Premios** de su carrera.
- `/referees/:id` — perfil del árbitro.
  - Stats: partidos arbitrados, tarjetas dadas, MVP designados.

**Datos mock nuevos:**
- Para L1, L4, L6, L10: completar `PlayerSeasonStats` de todos los jugadores.
- Top scorer de L1: 14 goles, 8 asist, 3 MVPs, 2 amarillas.
- Etc.

**Roles:** todos ven, nadie edita (en v1.0.0).

**Componentes nuevos:**
- `Leaderboard` (lista con ranking + barra de progreso).
- `StatBar` (visualización de stat numérico).
- `PlayerMiniCard` (avatar + nombre + equipo + stat principal).

---

### Paso 9 · Eliminatorias / Liguilla
**Pantallas nuevas:**
- `/leagues/:id/knockout` — bracket de la fase final.
  - Visualización de bracket (estilo "mapa de torneo").
  - Octavos / Cuartos / Semis / Final con sus resultados.
  - Click en un partido del bracket → abre el Match Card del paso 6
    (reutiliza, no duplica).
  - Animación: el ganador "avanza" visualmente al siguiente slot
    (solo CSS, sin lógica compleja).
- `/leagues/:id/knockout/setup` (ADMIN) — configurar fase final:
  - "¿Cuántos equipos clasifican?" (4, 8, 16).
  - "¿Ida y vuelta?" (sí/no, o solo final).
  - "Orden de sembrado" (por tabla, aleatorio, manual).
  - Genera automáticamente las llaves.

**Datos mock nuevos:**
- L9 (Copa Empresas 2025) en fase de grupos: 16 equipos en 4 grupos.
  Mostrar bracket con cuartos ya definidos (3 de 4 listos, 1 TBD).
- L7 (Copa de Verano 2025) finalizada: bracket completo con resultados,
  campeón designado (mostrar trofeo en `/leagues/:id`).

**Roles:** solo ADMIN configura y genera. Todos ven.

**Componentes nuevos:**
- `Bracket` (SVG o CSS grid con líneas conectoras).
- `BracketMatch` (slot vacío o con resultado).
- `KnockoutConfig` (form de configuración).

---

### Paso 10 · Dashboards por rol + pulido final → v1.0.0
**Pantallas nuevas / modificadas:**
- `/dashboard` — se vuelve **role-aware**:
  - **ADMIN**: contadores globales (ligas activas, equipos, partidos
    esta semana, usuarios), accesos rápidos, alertas.
  - **REFEREE**: "Tus partidos hoy" (próximos 3), "Pendientes de
    capturar" (partidos sin resultado), stats personales.
  - **DT**: "Próximo partido de tu equipo", resultado del último,
    lesionados/sancionados, top stats de tu plantilla.
  - **ASSISTANT**: mismo que DT pero read-only.
  - **PLAYER**: "Tu próximo partido", "Tus stats esta temporada",
    "Logros recientes", "Calendario de tu equipo".
- `Header` con navegación condicional por rol (DT no ve CRUD de ligas,
  PLAYER no ve admin links, etc.).
- Página `/profile` con tabs "Perfil | Stats | Premios | Carrera" (ya
  iniciada — completar).
- Empty states en todas las páginas (diseñados, no placeholders rotos).
- Loading states (skeletons) consistentes.
- Manejo de errores visible pero no intrusivo (Banner).
- 404 / 403 / 500.
- Verificación responsive (mobile ≥ 360px).
- Verificación accesibilidad básica (contrastes, focus visible, labels).

**Datos mock nuevos:**
- Para cada rol, los hooks `useMyDashboard(role, userId)` devuelven
  data distinta.

**Roles:** todos.

**Componentes nuevos:**
- `DashboardAdmin`, `DashboardReferee`, `DashboardDT`, `DashboardAssistant`,
  `DashboardPlayer` (uno por rol, comparten layout).
- `RoleNav` (navegación filtrada).
- `EmptyState` (ya existe, refinarlo por pantalla).

---

## 6. Criterios de éxito v1.0.0

Al terminar el paso 10, TODAS estas pantallas funcionan con mocks:

- [ ] `/login` y `/register` con auth.
- [ ] `/profile` con stats, partidos y premios.
- [ ] `/dashboard` adaptado a cada rol.
- [ ] `/fields` y `/fields/:id`.
- [ ] `/leagues`, `/leagues/:id`, `/leagues/:id/teams`,
  `/leagues/:id/fixture`, `/leagues/:id/standings`,
  `/leagues/:id/stats`, `/leagues/:id/knockout`.
- [ ] `/teams`, `/teams/:id`.
- [ ] `/matches`, `/matches/:id` (con modos LIVE y POST_MATCH).
- [ ] `/players/:id`.
- [ ] `/referees/:id`.
- [ ] Estados: loading (skeleton), error (banner), empty (empty state),
        success.
- [ ] Responsive mobile.
- [ ] Las 10 ligas del catálogo son navegables.
- [ ] Las 10 canchas del catálogo son navegables.
- [ ] Los 5 roles tienen vistas distintas y datos distintos.

**Lo que NO está en v1.0.0:**
- Backend real, base de datos real, autenticación real (eso es post-v1).
- Notificaciones push, emails, recordatorios.
- Pagos, inscripciones, cuotas.
- Chat, comentarios, redes sociales.
- Multi-tenant (es single-tenant por diseño).
- App móvil nativa (es web responsive).

---

## 7. Después de v1.0.0 — checklist para el backend

Cuando tú digas "esto se queda, esto se va", seguimos con:

1. **Prisma schema** alineado al modelo del punto 3.
2. **Migración + seed**: cargar el catálogo de mocks (10 ligas, 10
   canchas, 30 equipos, 50 usuarios, partidos generados) como datos
   semilla.
3. **Endpoints REST** con la convención del `docs/api.md`:
   - `GET /users`, `GET /users/me`, `PATCH /users/me`,
     `POST /users/me/profile-photo`, `POST /users/me/cover-photo`.
   - `GET /fields`, `POST /fields`, `PATCH /fields/:id`, `DELETE /fields/:id`.
   - `GET /leagues`, `POST /leagues`, `PATCH /leagues/:id`, `DELETE /leagues/:id`.
   - `GET /leagues/:id/teams`, `POST /leagues/:id/teams`,
     `PATCH /leagues/:id/teams/:teamId` (cambiar seed).
   - `POST /leagues/:id/fixture/generate`, `PATCH /leagues/:id/fixture`
     (drag&drop = reasignar matchday/order).
   - `GET /matches/:id`, `PATCH /matches/:id` (score, status, mode),
     `POST /matches/:id/events`, `DELETE /matches/:id/events/:eventId`.
   - `GET /leagues/:id/standings` (computado server-side o client-side).
   - `GET /leagues/:id/stats` (leaderboards).
   - `GET /leagues/:id/knockout`, `POST /leagues/:id/knockout/generate`.
   - `GET /players/:id/stats`, `GET /referees/:id/stats`.
4. **Auth + roles**: middleware de rol en cada endpoint (matriz del
   punto 1). El JWT ya tiene `role` en el payload; solo falta el guard.
5. **Algoritmo de fixture**: round-robin puro (Berger) y grupos+KO.
   Esto es la única pieza algorítmica no trivial; va al backend para
   que todos los clientes vean el mismo calendario.
6. **Cálculo de standings**: server-side, derivado de los partidos
   finalizados. Cachear por jornada completada.
7. **Storage de fotos**: ya hay endpoint; falta confirmar el storage
   provider (local en dev, S3-compatible en prod).
8. **Tests**: los hooks del frontend ya están escritos de forma
   contract-first. Cuando llegue el backend, los tests del frontend
   siguen pasando sin cambio (mocks idénticos al response shape).

---

## 8. Estructura final de archivos (post-paso 10)

```
frontend/src/
  api/                          # axios + endpoints
  components/
    ui/                         # 10 componentes base (ya hecho)
    icons/                      # SVG inline
    profile-sections.tsx        # ya hecho
    TeamBadge.tsx               # nuevo
    RosterList.tsx              # nuevo
    StaffBlock.tsx              # nuevo
    TeamPicker.tsx              # nuevo
    SeedList.tsx                # nuevo
    FixtureList.tsx             # nuevo
    MatchdayColumn.tsx          # nuevo
    MatchPill.tsx               # nuevo
    CalendarView.tsx            # nuevo
    MatchScoreboard.tsx         # nuevo
    MatchTimeline.tsx           # nuevo
    EventQuickAdd.tsx           # nuevo
    RosterPicker.tsx            # nuevo
    MatchClock.tsx              # nuevo
    StandingsTable.tsx          # nuevo
    Leaderboard.tsx             # nuevo
    PlayerMiniCard.tsx          # nuevo
    Bracket.tsx                 # nuevo
    BracketMatch.tsx            # nuevo
    KnockoutConfig.tsx          # nuevo
    dashboards/                 # nuevos
      DashboardAdmin.tsx
      DashboardReferee.tsx
      DashboardDT.tsx
      DashboardAssistant.tsx
      DashboardPlayer.tsx
  hooks/
    useAsync.ts                 # ya existe (en profile.ts)
    useIsAdmin.ts               # ya existe
    profile.ts                  # ya existe
    fields.ts                   # ya existe
    leagues.ts                  # ya existe
    teams.ts                    # nuevo
    tournament.ts               # nuevo (config + asignación)
    fixture.ts                  # nuevo
    matches.ts                  # nuevo (incluye LIVE/POST)
    standings.ts                # nuevo
    stats.ts                    # nuevo
    knockout.ts                 # nuevo
    dashboard.ts                # nuevo (role-aware)
  pages/
    LoginPage, RegisterPage, ProfilePage, DashboardPage   # ya
    FieldsPage, LeaguesPage                              # ya
    TeamsPage, TeamDetailPage                            # nuevos
    LeagueDetailPage                                     # nuevo
    TournamentConfigPage                                 # nuevo
    FixturePage                                          # nuevo
    StandingsPage                                        # nuevo
    StatsPage                                            # nuevo
    MatchListPage, MatchDetailPage                       # nuevos
    PlayerProfilePage, RefereeProfilePage                # nuevos
    KnockoutPage                                         # nuevo
  mocks/
    leagues.ts                  # 10 ligas
    fields.ts                   # 10 canchas
    teams.ts                    # 30 equipos
    users.ts                    # 50 usuarios
    matches.ts                  # ~200 partidos generados
    events.ts                   # eventos
    stats.ts                    # stats agregadas
    awards.ts                   # premios
  types/
    user.ts                     # ya existe
    profile.ts                  # ya existe
    field.ts                    # ya existe
    league.ts                   # ya existe
    team.ts                     # nuevo
    match.ts                    # nuevo
    standings.ts                # nuevo
    stats.ts                    # nuevo
    knockout.ts                 # nuevo
    common.ts                   # enums compartidos (LeagueFormat, etc.)
  styles/
    tokens.css, base.css        # ya existen (extender gradualmente)
```
