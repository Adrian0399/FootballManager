# 07 — Seed (datos de prueba)

El seed es **determinista** (mismos datos en cada ejecución). Se ejecuta con `pnpm db:seed` (`tsx prisma/seed.ts`).

## Ligas (16)

- Todas con `format = SEVEN_V_SEVEN` (7v7).
- Categorías: `LIBRE`, `JUVENIL`, `SUB_13`, `SUB_15`, `SUB_17`, `SUB_20`, `VETERANOS`, `FEMENIL`, `MIXTO_AMATEUR`, `FLORES`.
- Nombre: `TKT — {día} {categoría} {Varonil|Femenil|Mixto}`.
- `maxTeams = 16`. `homeAndAway` varía por liga.
- Estados: `IN_PROGRESS`, `FINISHED`, y ligas en fase de liguilla con `liguillaProgress` (`SF_DONE`/`QF_DONE`/`FINAL_DONE`).
- Algunas con `kickoffTime` (19:00, 21:00, etc.).

## Usuarios (~3636, deterministas)

| Rol | Cantidad | Contraseña | Patrón de email |
|-----|----------|-----------|-----------------|
| ADMIN | 1 | `TKTadmin2025!` | `jose.ramirez.admin.1@tkt.local` |
| REFEREE | 6 | `TKTref2025!` | `<nombre>.<apellido>.ref.<n>@tkt.local` |
| TECHNICAL_DIRECTOR | 15 | `TKTdt2025!` | `<nombre>.<apellido>.dt.<n>@tkt.local` |
| ASSISTANT | 30 | `TKTasst2025!` | `<nombre>.<apellido>.asst.<n>@tkt.local` |
| PLAYER | ~3360 | `TKTplayer2025!` | `<nombre>.<apellido>.player.<n>@tkt.local` |

- Formato de email: `<firstName>.<paternalSurname>.<rol>.<índice>@tkt.local` (rol = `admin`|`ref`|`dt`|`asst`|`player`).
- Los nombres/apellidos salen de pools deterministas.
- **Credenciales de acceso de ejemplo:**
  - Admin: `jose.ramirez.admin.1@tkt.local` / `TKTadmin2025!`
  - Árbitro: `roberto.silva.ref.1@tkt.local` / `TKTref2025!`

## Equipos y jornadas

- Pools de nombres de equipo: `LIBRE`, `JUVENIL`, `FLORES`.
- Emojis y paletas de colores se ciclan.
- `LeagueTeam.seed` de 1..N por liga.
- Se generan jornadas y partidos de ejemplo (incluyendo partidos completados con marcador, para que la tabla/stats tengan datos).

## Reglas de generación a replicar

1. Generar usuarios por rol en el orden: ADMIN → REFEREE → DT → ASSISTANT → PLAYER.
2. Generar ligas con sus canchas (`LeagueField`).
3. Generar equipos e inscribirlos (`LeagueTeam` + `Team.currentLeagueId`).
4. Generar fixture (round-robin) y, en ligas de liguilla, la fase de eliminación.
5. Completar una porción de partidos con marcadores y eventos para poblar tabla/stats/premios.
6. Sembrar premios por liga (`POST /leagues/:id/awards/seed`).
