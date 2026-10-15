# 03 — Lógica de negocio (motor de torneo)

Este es el archivo **más importante**. Todos los algoritmos deben replicarse **EXACTO**.

## 1. Round-robin (Berger) — `bergerRoundRobin(teamCount)`

Entrada: número de equipos `n` (0-based). Salida: lista de rondas; cada ronda es una lista de pares `[homeIdx, awayIdx]`.

```
si n < 2 → devolver []
hasBye = (n es impar)
ids = [0..n-1]
si hasBye → ids.push(null)            // descanso (bye)
rotation = ids.slice(1)               // todos menos el primero (ancla)
para r = 0 .. n-2:
  first = ids[0]
  last  = rotation[último]
  si first != null && last != null → push [first, last]
  para i = 0 .. floor(rotation.length/2)-1:
    h = rotation[i]
    a = rotation[rotation.length - 2 - i]
    si h != null && a != null → push [h, a]
  rotation.unshift(rotation.pop())    // rotar: mover último al frente
```

Con `n` impar hay una ronda con un bye (`null`); ese equipo descansa.

## 2. Balance de localía — `orientHomeAway(rounds)`

Reordena cada par para que el número de partidos como local quede lo más balanceado posible.

```
homeGames = {}   // cuenta de veces que cada equipo es local
para cada par [a, b] de cada ronda:
  home = (homeGames[b] < homeGames[a] || (homeGames[b] == homeGames[a] && b < a)) ? b : a
  homeGames[home]++
  devolver [home, el otro]
```

## 3. Ida y vuelta — `doubleRounds(rr)`

```
[...rr, ...rr.map(round => round.map(([h,a]) => [a,h]))]
```

(la segunda mitad es la primera con local/visita invertidos).

## 4. Fechas y horarios

- `WEEKDAY_INDEX`: SUNDAY=0, MONDAY=1, TUESDAY=2, WEDNESDAY=3, THURSDAY=4, FRIDAY=5, SATURDAY=6.
- `TIME_SLOT_HOUR`: `MORNING='09:00'`, `AFTERNOON='14:00'`, `EVENING='19:00'`, `NIGHT='21:00'`.
- `weeklyDate(start, weekIndex, dayOfWeek, hhmm)`:
  1. Partir de la fecha `start` (año/mes/día).
  2. Sumar `weekIndex * 7` días.
  3. Si hay `dayOfWeek`, alinear el día al `WEEKDAY_INDEX[dayOfWeek]` de esa semana.
  4. Aplicar la hora `hh:mm`.
- Helpers: `addDays`, `addHours`, `parseHhmm` (si inválido → `19:00`), `withTime`, `shuffle` (Fisher-Yates).

## 5. Generación del fixture — `generateFixture(leagueId, dto, actorId)`

Retorna `{ matchdayCount, matchCount }`.

1. Si hay **menos de 2 equipos** inscritos → 409 `NOT_ENOUGH_TEAMS`.
2. Si ya existe algún partido `IN_PROGRESS`/`COMPLETED` y `dto.force !== true` → 409 `FIXTURE_IN_PLAY`.
3. `ordered` = equipos ordenados por `seed` (si `dto.shuffle` → barajar).
4. `baseRounds = orientHomeAway(bergerRoundRobin(n))`.
5. `rounds = league.homeAndAway ? doubleRounds(baseRounds) : baseRounds`.
6. Canchas: ciclo `fieldIds[p % fieldIds.length]` (p = índice del partido).
7. `base = dto.startDate ?? league.startDate ?? fechaActual`.
8. `hhmm` = hora del `timeSlot` (default `19:00`).
9. `roundDates = weeklyDate(base, i, dayOfWeek, hhmm)` (i = índice de ronda).
10. En una transacción: borrar matches + matchdays previos; crear un `Matchday` por ronda (`number = i+1`, `PENDING`) con sus `Match` (`SCHEDULED`).
11. Actualizar `league.matchdaysCount = rounds.length`.

## 6. Generación de liguilla — `generateKnockout(leagueId, dto, actorId)`

Retorna `{ quarters, semis, final, thirdPlace, matchdayId }`.

1. Si hay **menos de 8 equipos** → 409 `NOT_ENOUGH_TEAMS`.
2. Si ya existe liguilla y `dto.force !== true` → 409 `KNOCKOUT_EXISTS`.
3. `ranked` = orden de la tabla (si hay partidos jugados) o por `seed`, luego `.slice(0, 8)`.
4. `base = dto.startDate ?? (fecha del último matchday + 7 días) ?? ahora`.
5. `twoLegs = league.knockoutHomeAndAway === true`.

### Llave de 8 equipos (índices sobre `ranked`) — `EIGHT_TEAM_BRACKET`

| Ronda | Pares (índices) |
|-------|-----------------|
| Cuartos | `[0,7]` `[3,4]` `[1,6]` `[2,5]` (= 1v8, 4v5, 2v7, 3v6) |
| Semis | `[0,3]` `[1,2]` |
| Final | `[0,1]` |
| Tercer lugar | `[2,3]` |

### Fechas (offsets en días desde `base`)

| Ronda | Solo ida | Ida y vuelta (2 legs) |
|-------|----------|----------------------|
| Cuartos | `+0, +2, +4, +6` | `[+0,+7] [+2,+9] [+4,+11] [+6,+13]` |
| Semis | `+9, +10` | `[+14,+21] [+15,+22]` |
| Final | `+12` | `[+28,+35]` |
| 3er lugar | final + 2 horas | legs de final + 2 horas |

- Con **ida y vuelta**, cada llave crea 2 partidos con local/visita **invertidos** en el leg 2.
- Cada `Match` de liguilla escribe `knockoutStage`, `knockoutPosition`, `knockoutLeg` (1 o 2) y `fieldId = null`.
- `linkTie(fromTie, into)`: enlaza `knockoutFeedsIntoMatchId` de cada partido de una llave al **primer leg** de la ronda siguiente. Cuartos `i` → semifinal `floor(i/2)`; semifinal `i` → ancla de la final.
- Conteos devueltos: `twoLegs ? {quarters:8, semis:4, final:2, thirdPlace:2} : {4,2,1,1}`.

## 7. Fórmula de fecha final (frontend, en el formulario de liga)

El `endDate` de la liga se calcula automáticamente:

```
últimaJornada = startDate + (matchdays - 1) semanas
si no hay liguilla:              endDate = últimaJornada
si liguilla solo ida:            endDate = últimaJornada + 19 días
si liguilla ida y vuelta:        endDate = últimaJornada + 42 días
```

`matchdays` = las jornadas explícitas, o la estimación round-robin si es 0:
`roundRobinMatchdays(teams, homeAndAway)` = `(teams par ? teams-1 : teams)`, ×2 si `homeAndAway`.

## 8. Decisión del campeón (modelo de liga)

Dos modos (campo `type` de `League`):

1. **Por tabla** (`type = ROUND_ROBIN`): el campeón es el 1º de la fase regular.
2. **Por liguilla** (`type = GROUPS_KNOCKOUT`): fase regular + cuartos/semifinal/final (a 8 equipos).

En ambos casos hay **1º, 2º y 3º lugar**, y cada fase puede ser a una vuelta o ida/vuelta:
- `homeAndAway` = fase regular ida/vuelta.
- `knockoutHomeAndAway` = eliminatorias ida/vuelta (solo relevante en modo liguilla).

> `KNOCKOUT_ONLY` es un tipo legacy (liguilla sin fase regular). No se ofrece en el formulario actual.

## 9. Tabla de posiciones — `standings.service.ts`

`StandingRow`: `teamId, teamName, played, wins, draws, losses, goalsFor, goalsAgainst, goalDifference, points, fairPlay, rank, groupLabel`.

- Puntos: victoria **3**, empate **1**, derrota **0**.
- Solo cuentan partidos `COMPLETED` con ambos marcadores no-nulos.
- Orden (desc): `points` → `goalDifference` → `goalsFor` → luego `fairPlay` **asc** → luego `teamId` (localeCompare).
- **Desempate de rank:** si dos filas tienen la misma clave `points|goalDifference|goalsFor|fairPlay`, comparten rank (produce `1,2,2,4`).
- Las filas se agrupan por `groupLabel` si existe.

## 10. Estadísticas — `stats.service.ts`

`LeaderboardEntry`: `{rank, playerId, playerName, teamId, teamName, value, secondary}`.
`LeagueStats`: `{goals, assists, mvps, fairPlay, highlights}`.
`LeagueHighlights`: `{topScorer, topAssister, bestGoalkeeper{cleanSheets,matchesPlayed}, bestAttackingTeam{goals}, bestDefensiveTeam{conceded}}`.

Agregación de eventos (solo partidos `COMPLETED`):
- `GOAL` → goles +1 (si hay `secondaryUserId`, cuenta también como asistencia).
- `ASSIST` → asistencias +1.
- `MVP` → mvps +1.
- `YELLOW_CARD` / `RED_CARD` → tarjetas.
- Fair play = `-(amarillas + rojas)` (menos tarjetas = mejor).
- Valla invicta (clean sheet) = equipo que recibió 0 goles en un partido.
- Leaderboards ordenan `value desc, secondary desc`; rank = índice + 1.

## 11. Regla de una liga a la vez — `addLeagueTeam`

Al inscribir un equipo en una liga:
1. Validar liga (`LEAGUE_NOT_FOUND`) y equipo (`TEAM_NOT_FOUND`).
2. Si ya está inscrito → 409 `TEAM_ALREADY_ENROLLED`.
3. **Si el equipo está en OTRA liga** → 409 `TEAM_IN_ANOTHER_LEAGUE` (mensaje: `El equipo ya pertenece a la liga "X". Un equipo solo puede estar en una liga a la vez.`).
4. `seed` = máximo seed de esa liga + 1.
5. Transacción: `leagueTeam.create` + `team.update { currentLeagueId }`.

`removeLeagueTeam`: borra el `LeagueTeam` y limpia `currentLeagueId` solo si aún apunta a esa liga.

## 12. Reglas de validación (backend, zod)

### League (`leagueCreateSchema`)
- `name`: 2–100 chars · `description`: máx 1000 · `season`: máx 50.
- `startDate` / `endDate`: `z.coerce.date()` opcional/null.
- `fieldIds`: array de UUIDs, mínimo 1.
- `format`: enum `ONE_V_ONE..ELEVEN_V_ELEVEN` · `category`: máx 50 · `type`: enum `ROUND_ROBIN/GROUPS_KNOCKOUT/KNOCKOUT_ONLY`.
- `matchdaysCount`: entero positivo · `homeAndAway` / `knockoutHomeAndAway`: boolean.
- `maxTeams`: entero positivo · `dayOfWeek`: enum · `timeSlot`: enum · `status`: enum.
- `leagueUpdateSchema` = mismos campos opcionales + `.refine(startDate <= endDate)`.

### Otros
- `fixtureGenerateSchema`: `shuffle?`, `startDate?`, `force?`.
- `knockoutGenerateSchema`: `force?`, `startDate?`.
- `leagueTeamAddSchema`: `teamId` uuid, `seed` int positivo opcional, `groupLabel` máx 5.
- `leagueTeamUpdateSchema`: `seed?`, `groupLabel?`.
- `matchdayCreateSchema`: `number` int positivo opcional, `date`, `status?`.

### Register (auth) — `registerSchema`
- `firstName` / `paternalSurname` / `maternalSurname`: 2–100 chars.
- `birthDate`: fecha pasada.
- `role`: enum, default `PLAYER`; el registro público solo permite `PLAYER`/`ASSISTANT` (refine).
- `nickname`: máx 80 · `phoneNumber`: regex `^\+?[0-9]{10,15}$`.
- `email`: email · `curp`: regex `^[A-Z]{4}[0-9]{6}[A-Z]{6}[0-9]{2}$` (18 chars).
- `password`: mín 8 + una letra + un dígito · `inviteToken`: máx 64.
- `loginSchema`: `email`, `password` mín 1.

## 13. Códigos de error (catálogo completo)

| Código | HTTP | Contexto |
|--------|------|----------|
| `AUTH_MISSING` / `AUTH_INVALID` / `AUTH_REQUIRED` / `AUTH_FORBIDDEN` | 401/403 | middlewares |
| `RATE_LIMITED` | 429 | rate limiter |
| `NOT_FOUND` | 404 | recurso genérico |
| `EMAIL_TAKEN` / `CURP_TAKEN` | 409 | register |
| `INVALID_CREDENTIALS` | 401 | login |
| `INVALID_REFRESH` / `REFRESH_REUSE` / `REFRESH_EXPIRED` | 401 | refresh |
| `USER_INACTIVE` | 401/403 | usuario inactivo |
| `LEAGUE_NOT_FOUND` / `FIELD_NOT_FOUND` | 404 | liga / cancha |
| `NOT_ENOUGH_TEAMS` | 409 | fixture/liguilla |
| `FIXTURE_IN_PLAY` / `KNOCKOUT_EXISTS` | 409 | regeneración |
| `TEAM_NOT_FOUND` | 404 | equipos/invitaciones |
| `TEAM_ALREADY_ENROLLED` / `TEAM_IN_ANOTHER_LEAGUE` / `ENROLLMENT_NOT_FOUND` | 409/404 | inscripción |
| `INVALID_INVITE_ROLE` / `INVITE_NOT_FOUND` / `INVITE_USED` / `INVITE_EXPIRED` | 400/404/409 | invitaciones |

Formato del error: `{ success:false, statusCode, error: { code, message, issues? } }`.
