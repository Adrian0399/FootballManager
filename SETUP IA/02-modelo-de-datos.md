# 02 — Modelo de datos

**Fuente de verdad:** `reference/schema.prisma` (copia exacta del original, 700 líneas). Usa ese archivo directamente para generar la base de datos. Aquí está el resumen interpretado.

## Convenciones

- **PK:** UUID en todas las tablas (`gen_random_uuid()`).
- **Nombres:** columnas en `snake_case` con `@map`, tablas en plural con `@@map`.
- **Auditoría:** casi todas las tablas tienen `created_at`, `created_by`, `updated_at`, `updated_by`.
- **Soft delete:** `deleted_at` en `User` y `Award`. Tablas append-only (`MatchEvent`, `AuditLog`) no tienen `updated_at`/`deleted_at`.
- **Datasource:** `postgresql`, `env("DATABASE_URL")`. Generator: `prisma-client-js`.

## Enums

| Enum | Valores |
|------|---------|
| `UserRole` | `ADMIN` `REFEREE` `TECHNICAL_DIRECTOR` `ASSISTANT` `PLAYER` |
| `TeamRole` | `PLAYER` `DT` `ASSISTANT` |
| `FieldPosition` | `GK` `DEF` `MID` `FWD` `FIXO` `ALA` `PIVOT` |
| `LeagueFormat` | `ONE_V_ONE` `THREE_V_THREE` `FIVE_V_FIVE` `SIX_V_SIX` `SEVEN_V_SEVEN` `NINE_V_NINE` `ELEVEN_V_ELEVEN` |
| `LeagueType` | `ROUND_ROBIN` `GROUPS_KNOCKOUT` `KNOCKOUT_ONLY` |
| `WeekDay` | `MONDAY` … `SUNDAY` |
| `TimeSlot` | `MORNING` `AFTERNOON` `EVENING` `NIGHT` |
| `LeagueStatus` | `PLANNED` `IN_PROGRESS` `FINISHED` |
| `MatchStatus` | `SCHEDULED` `IN_PROGRESS` `COMPLETED` `POSTPONED` `CANCELLED` |
| `MatchdayStatus` | `PENDING` `IN_PROGRESS` `COMPLETED` |
| `EventType` | `GOAL` `ASSIST` `YELLOW_CARD` `RED_CARD` `SUBSTITUTION` `MVP` `NOTE` |
| `ScoringMode` | `LIVE` `POST_MATCH` |
| `KnockoutStage` | `ROUND_OF_16` `QUARTERS` `SEMIS` `FINAL` `THIRD_PLACE` |
| `AwardCategory` | `SCORER` `MVP` `FAIR_PLAY` `CHAMPION` `BEST_DEFENSE` |
| `AwardLevel` | `GOLD` `SILVER` `BRONZE` |

## Modelos (resumen)

| Modelo | Tabla | Campos clave | Relaciones |
|--------|-------|--------------|------------|
| `User` | `users` | `firstName`, `paternalSurname`, `maternalSurname`, `birthDate @db.Date`, `age` (calculada), `role`, `nickname?`, `phoneNumber`, `email @unique`, `curp @unique VarChar(18)`, `passwordHash`, `isActive`, `profilePhotoPath?`, `coverPhotoPath?`, `deletedAt` | self-rels `UserCreatedBy`/`UserUpdatedBy`; refreshTokens, fields, leagues, teamMemberships, teams, leagueTeams, matchdays, matches (referee/mvp), matchEvents, awardsWon, teamInvites |
| `RefreshToken` | `refresh_tokens` | `userId`, `tokenHash @unique`, `expiresAt`, `revokedAt?`, `replacedBy?` | user |
| `Field` | `fields` | `name`, `address?`, `description?`, `capacity?`, `isActive` | leagueFields, teamsAsHomeField, matches |
| `League` | `leagues` | `name`, `description?`, `season?`, `startDate? @db.Date`, `endDate? @db.Date`, `isActive`, `format LeagueFormat?`, `category String?`, `type LeagueType?`, `matchdaysCount @map("matchdays")`, `homeAndAway Boolean?`, `knockoutHomeAndAway Boolean? @map("knockout_home_and_away")`, `maxTeams Int?`, `dayOfWeek WeekDay?`, `timeSlot TimeSlot?`, `status LeagueStatus?` | matchdays, matches, leagueTeams, teamsAsCurrentLeague, awards |
| `LeagueField` | `league_fields` | PK compuesta `(leagueId, fieldId)` | league, field |
| `Team` | `teams` | `name`, `shortName`, `emoji?` (logo placeholder), `primaryColor`, `secondaryColor` (VarChar 20), `homeFieldId?`, `isActive`, `currentLeagueId?` (solo display; la verdad = LeagueTeam) | memberships, leagueEntries, homeMatches, awayMatches, events, awards, invites |
| `TeamMembership` | `team_memberships` | `teamId`+`userId` `@@unique`, `membershipRole TeamRole`, `jerseyNumber?`, `position FieldPosition?`, `isCaptain`, `joinedAt` | team, user |
| `LeagueTeam` | `league_teams` | PK compuesta `(leagueId, teamId)`, `seed Int`, `groupLabel?` | league, team |
| `Matchday` | `matchdays` | `leagueId`, `number Int`, `date @db.Date`, `status`; `@@unique([leagueId, number])` | league, matches |
| `Match` | `matches` | `leagueId`, `matchdayId`, `homeTeamId`, `awayTeamId`, `fieldId?`, `scheduledAt`, `status`, `homeScore?`, `awayScore?`, `refereeId?`, `mvpUserId?`, `scoringMode?`, `notes?`, `knockoutStage?`, `knockoutPosition?`, `knockoutLeg Int?`, `knockoutFeedsIntoMatchId?` (self-FK) | league, matchday, homeTeam, awayTeam, field, referee, mvp, events, feedsInto |
| `MatchEvent` | `match_events` | `matchId`, `minute`, `type`, `teamId`, `userId`, `secondaryUserId?`, `notes?` (solo `created_*`) | match, team, user |
| `Award` | `awards` | `userId`, `leagueId?`, `teamId?`, `category`, `level`, `title`, `description?`, `awardedAt`, `deletedAt` | user, league, team |
| `AuditLog` | `audit_logs` | `userId?`, `actorRole?`, `method`, `path`, `action`, `statusCode`, `details Json?`, `ip?`, `userAgent?`, `createdAt` (append-only) | user |
| `TeamInvite` | `team_invites` | `teamId`, `role TeamRole`, `token @unique VarChar(64)`, `expiresAt`, `usedAt?`, `usedById?` | team, usedBy |

## Campos clave a respetar (lógica de negocio)

- `League.matchdaysCount` se mapea a la columna `matchdays`.
- `League.knockoutHomeAndAway` controla si las eliminatorias son a ida y vuelta (dos legs).
- `Match.knockoutStage`, `knockoutPosition`, `knockoutLeg` (1 o 2) y `knockoutFeedsIntoMatchId` describen la llave de liguilla y sus enlaces entre rondas.
- `Team.currentLeagueId` es un campo **de conveniencia** para mostrar la liga actual; la relación real de inscripción es `LeagueTeam` (histórica, con `seed`).
- `LeagueField` es la tabla N:M entre ligas y canchas.
