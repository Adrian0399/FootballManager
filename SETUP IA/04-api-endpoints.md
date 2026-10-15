# 04 — API REST

## Convenciones

- **Prefijo:** `/api/v1`.
- **Envelope de éxito:** `{ "success": true, "statusCode": 200, "data": … }`.
- **Envelope de error:** `{ "success": false, "statusCode": 4xx/5xx, "error": { "code": "…", "message": "…", "issues": […] } }`.
- Helpers de respuesta: `ok(data)`, `created(data)`, `fail(error)`.
- **Middlewares:** `authenticate` (verifica access token), `authorize('ADMIN')` (solo admin), `validateBody(schema)` (zod).
- **Auth:** access token en header `Authorization: Bearer <token>`; refresh token en cookie httpOnly.
- **Swagger:** `/api/v1/docs` (UI) y `/api/v1/docs.json` (spec). **Health:** `/health`. **Estáticos:** `/uploads` (denegar `/uploads/tmp`).

## Montaje de routers (`app.ts`)

Middlewares: `helmet` (crossOriginResourcePolicy cross-origin), `cors` (origin `CORS_ORIGIN`, credentials), `express.json` (limit 1mb), `cookieParser`, `auditLogger` (registra POST/PUT/PATCH/DELETE al finalizar), estáticos `/uploads`, `/health`.

Routers:
- `/api/v1/auth` → auth
- `/api/v1/users` → users
- `/api/v1/fields` → fields
- `/api/v1/leagues` → leagues + leagueMatchdays
- `/api/v1/teams` → teams
- `/api/v1/matches` → matches
- `/api/v1/matchdays` → matchdays
- (full-path en `/api/v1`): events, standings, stats, knockout, profile, awards, audit, invites

Luego `notFoundHandler` + `errorHandler`.

## Inventario de endpoints

### Auth
| Método | Ruta | Permiso |
|--------|------|---------|
| POST | `/auth/register` | público (acepta `inviteToken`) |
| POST | `/auth/login` | público |
| POST | `/auth/refresh` | público (rate-limited) |
| POST | `/auth/logout` | auth |
| GET | `/auth/me` | auth |

### Users
| Método | Ruta | Permiso |
|--------|------|---------|
| GET | `/users` | ADMIN (listado) |
| GET | `/users/me` | self |
| PATCH | `/users/me` | self |
| GET | `/users/:id` | auth |
| POST | `/users` | ADMIN |
| PATCH | `/users/:id` | ADMIN |
| DELETE | `/users/:id` | ADMIN |
| POST | `/users/me/profile-photo` | self |
| DELETE | `/users/me/profile-photo` | self |
| POST | `/users/me/cover-photo` | self |
| DELETE | `/users/me/cover-photo` | self |

### Fields
`GET /fields`, `GET /fields/:id` (auth); `POST /fields`, `PATCH /fields/:id`, `DELETE /fields/:id` (ADMIN).

### Leagues
| Método | Ruta | Permiso | Errores |
|--------|------|---------|---------|
| GET | `/leagues` | auth | — |
| GET | `/leagues/:id` | auth | `LEAGUE_NOT_FOUND` |
| GET | `/leagues/:id/teams` | auth | — |
| POST | `/leagues` | ADMIN | `FIELD_NOT_FOUND` |
| PATCH | `/leagues/:id` | ADMIN | — |
| DELETE | `/leagues/:id` | ADMIN | — |
| POST | `/leagues/:id/fixture/generate` | ADMIN | `NOT_ENOUGH_TEAMS`, `FIXTURE_IN_PLAY` |
| POST | `/leagues/:id/knockout/generate` | ADMIN | `NOT_ENOUGH_TEAMS`, `KNOCKOUT_EXISTS` |
| POST | `/leagues/:id/teams` | ADMIN | `TEAM_NOT_FOUND`, `TEAM_ALREADY_ENROLLED`, `TEAM_IN_ANOTHER_LEAGUE` |
| PATCH | `/leagues/:id/teams/:teamId` | ADMIN | `ENROLLMENT_NOT_FOUND` |
| DELETE | `/leagues/:id/teams/:teamId` | ADMIN | — |

### Teams
| Método | Ruta | Permiso | Errores |
|--------|------|---------|---------|
| GET | `/teams` (`?leagueId=`) | auth | — |
| GET | `/teams/:id` (incluye members) | auth | `TEAM_NOT_FOUND` |
| GET | `/teams/:id/members` | auth | — |
| POST | `/teams` (acepta `currentLeagueId` para crear+inscribir) | ADMIN | — |
| PATCH | `/teams/:id` | ADMIN | — |
| DELETE | `/teams/:id` | ADMIN | — |
| POST | `/teams/:id/members` | ADMIN | 409 si ya es miembro |
| PATCH | `/teams/:id/members/:userId` | ADMIN | — |
| DELETE | `/teams/:id/members/:userId` | ADMIN | — |

### Matches / Matchdays
| Método | Ruta | Permiso |
|--------|------|---------|
| GET | `/matches` (`?leagueId=&matchdayId=`) | auth |
| GET | `/matches/:id` | auth |
| POST | `/matches` | ADMIN |
| PATCH | `/matches/:id` | ADMIN |
| PATCH | `/matches/:id/score` | ADMIN |
| PATCH | `/matches/:id/status` | ADMIN |
| DELETE | `/matches/:id` | ADMIN |
| GET | `/leagues/:id/matchdays` | auth |
| POST | `/leagues/:id/matchdays` | ADMIN |
| GET | `/matchdays/:id` | auth |
| PATCH | `/matchdays/:id` | ADMIN |
| DELETE | `/matchdays/:id` | ADMIN |

### Eventos
| Método | Ruta |
|--------|------|
| GET | `/matches/:matchId/events` |
| POST | `/matches/:matchId/events` |
| PATCH | `/matches/:matchId/events/:eventId` |
| DELETE | `/matches/:matchId/events/:eventId` |

### Consultas de liga
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/leagues/:id/standings` | tabla de posiciones |
| GET | `/leagues/:id/stats` | estadísticas |
| GET | `/leagues/:id/knockout` | llave de liguilla |

### Perfiles / estadísticas
| Método | Ruta |
|--------|------|
| GET | `/users/:id/profile` |
| GET | `/users/:id/teams` |
| GET | `/users/:id/stats` |
| GET | `/users/:id/stats/by-league` |
| GET | `/users/:id/matches` |
| GET | `/users/:id/awards` |
| GET | `/referees/:id/stats` |
| GET | `/referees/:id/matches` |

### Premios
| Método | Ruta | Permiso |
|--------|------|---------|
| GET | `/awards` | auth |
| POST | `/awards` | ADMIN |
| PATCH | `/awards/:id` | ADMIN |
| DELETE | `/awards/:id` | ADMIN |
| POST | `/leagues/:id/awards/seed` | ADMIN |

### Auditoría
| Método | Ruta | Permiso |
|--------|------|---------|
| GET | `/audit` | ADMIN |
| GET | `/audit/summary` | ADMIN |

### Invitaciones
| Método | Ruta | Permiso |
|--------|------|---------|
| POST | `/teams/:teamId/invites` | ADMIN |
| GET | `/teams/:teamId/invites` | auth |
| GET | `/invites/:token` | público (resuelve el token) |

## Modelo de permisos (resumen)

- **ADMIN**: muta todo.
- **Otros roles**: solo lectura en la mayoría de recursos + perfil propio editable.

> Convención de implementación: cada módulo expone `controller` (parsea req/res), `service` (lógica), `routes` (registro de rutas) y `validation` (zod). Los errores se lanzan con `ApiError` (`badRequest/unauthorized/forbidden/notFound/conflict/internal`) y el `errorHandler` los serializa.
