# ⚽ Kaibil Football — League Manager

Plataforma web completa para **administrar ligas de fútbol amateur**: registro de jugadores y árbitros, creación de ligas y equipos, calendario de jornadas, captura de resultados, estadísticas, tabla de posiciones, fases de liguilla (eliminatorias) y premios.

> **MVP sólido y terminado**: backend real (API REST + PostgreSQL + Prisma) conectado a un frontend React con un sistema de diseño propio. Sin datos mock — todo viene de la base de datos.

---

## 📦 Stack tecnológico

| Capa | Tecnología | Versión |
|------|-----------|---------|
| Monorepo | pnpm workspaces | pnpm `9.12.3` |
| Runtime | Node.js | `>= 24` (`.nvmrc` = `24`) |
| Lenguaje | TypeScript | `5.6.3` |
| Backend | Express | `4.21.1` |
| ORM | Prisma | `5.22.0` |
| Base de datos | PostgreSQL | `16` (Docker) |
| Validación | Zod | `3.23.8` |
| Auth | JWT (`jsonwebtoken`) + bcrypt + refresh tokens | — |
| Frontend | React + Vite | `18.3.1` / `5.4.10` |
| Routing | React Router DOM | `6.28.0` |
| Estado | Zustand | `5.0.1` |
| Formularios | React Hook Form + Zod | `7.53.2` |
| HTTP | Axios | `1.7.7` |
| QR | `qrcode.react` | `^4.2.0` |
| Tests | Vitest (backend) | `^3` |
| Docs API | swagger-jsdoc + swagger-ui-express | — |

---

## 🗂️ Estructura del monorepo

```
kaibil-football-league-manager/
├── backend/                    # API REST (Express + Prisma)
│   ├── prisma/
│   │   ├── schema.prisma       # Modelo de datos completo (~700 líneas)
│   │   └── seed.ts             # Seed determinista (~3636 usuarios, 16 ligas)
│   └── src/
│       ├── server.ts           # Entrypoint (puerto 3000)
│       ├── app.ts              # buildApp(): middlewares + routers + swagger
│       ├── middleware/         # authenticate, authorize, validateBody, auditLogger, errorHandler
│       ├── modules/            # Un módulo por recurso (auth, users, leagues, teams, …)
│       │   └── <modulo>/       #   service.ts · controller.ts · routes.ts · validation.ts
│       └── scripts/            # generate-openapi.ts
├── frontend/                   # SPA (React + Vite, puerto 5173)
│   └── src/
│       ├── api/                # Cliente axios + serializers por recurso
│       ├── pages/              # Una página por ruta
│       ├── components/         # Componentes + ui/ (design system) + icons/ + sport/
│       ├── hooks/              # Hooks de datos (useAsync + queries por recurso)
│       ├── store/              # Zustand (auth.store, …)
│       ├── styles/             # tokens.css, base.css, sport-ui.css
│       ├── types/              # Tipos compartidos (frontend)
│       ├── utils/              # validation.ts (esquemas zod), roleChip.ts, …
│       └── router.tsx          # Definición de rutas + Shell
├── docker/                     # docker-compose (Postgres 16 + Adminer)
├── docs/                       # Documentación complementaria (ver índice abajo)
├── graphify-out/               # Grafo de conocimiento del código (opcional)
├── package.json                # Scripts del monorepo
└── pnpm-workspace.yaml
```

---

## ✅ Requisitos previos

1. **Node.js `>= 24`** (usa `nvm use` con el `.nvmrc`).
2. **pnpm `>= 9`** (recomendado `9.12.3`): `npm install -g pnpm@9`.
3. **Docker** (para levantar PostgreSQL 16 y Adminer).

---

## 🚀 Instalación y arranque (desde cero)

```bash
# 1. Instalar dependencias (genera el cliente Prisma en el postinstall)
pnpm install

# 2. Variables de entorno (backend, frontend y docker)
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
cp docker/.env.example docker/.env

# 3. Levantar la base de datos (PostgreSQL 16 + Adminer en :8080)
pnpm db:up

# 4. Aplicar migraciones y sembrar datos
pnpm db:migrate:deploy
pnpm db:seed

# 5. Arrancar backend (:3000) y frontend (:5173) en paralelo
pnpm dev
```

Abre **http://localhost:5173** (el frontend proxya `/api` → backend `:3000`).

> Adminer (GUI de BD) queda en **http://localhost:8080** (usuario/contraseña de `docker/.env`).

---

## 🔑 Variables de entorno

### `backend/.env`
| Variable | Ejemplo | Descripción |
|----------|---------|-------------|
| `NODE_ENV` | `development` | Entorno |
| `PORT` | `3000` | Puerto del API |
| `DATABASE_URL` | `postgresql://postgres:…@localhost:5432/kaibil_football_league_manager?schema=public` | Conexión Prisma |
| `JWT_ACCESS_SECRET` | *(>= 32 chars)* | Firma del access token |
| `JWT_REFRESH_SECRET` | *(>= 32 chars)* | Firma del refresh token |
| `JWT_ACCESS_EXPIRES_IN` | `15m` | Vida del access token |
| `JWT_REFRESH_EXPIRES_IN` | `7d` | Vida del refresh token |
| `CORS_ORIGIN` | `http://localhost:5173` | Origen permitido |
| `BCRYPT_SALT_ROUNDS` | `10` | Costo de bcrypt |
| `COOKIE_DOMAIN` | `localhost` | Dominio de la cookie |
| `COOKIE_SECURE` | `false` | Cookie `Secure` |
| `UPLOAD_DIR` | `uploads` | Carpeta de subidas |
| `MAX_UPLOAD_SIZE_MB` | `10` | Tamaño máx. de subida |
| `PUBLIC_BASE_URL` | `http://localhost:3000` | URL pública del API |

> Genera los secretos con: `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`

### `frontend/.env`
| Variable | Ejemplo | Descripción |
|----------|---------|-------------|
| `VITE_API_BASE_URL` | `/api/v1` | Base del API. Relativa si está en el mismo origen; **URL absoluta** si el API vive en otro dominio (entonces agrega ese origen a `CORS_ORIGIN` del backend). Solo las variables `VITE_*` se inyectan en el build. |

### `docker/.env`
| Variable | Ejemplo |
|----------|---------|
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` | `postgres` / `changeme_in_prod` / `kaibil_football_league_manager` |
| `POSTGRES_PORT` / `ADMINER_PORT` | `5432` / `8080` |

---

## 🗄️ Modelo de datos (Prisma)

### Convenciones
- **UUID** para todas las PK (`gen_random_uuid()`).
- Columnas en `snake_case` con `@map`, tablas en plural con `@@map`.
- **Columnas de auditoría** en casi todas las tablas: `created_at`, `created_by`, `updated_at`, `updated_by`.
- **Soft delete** vía `deleted_at` (User, Award) — tablas de solo-append (MatchEvent, AuditLog) no lo tienen.

### Enums
| Enum | Valores |
|------|---------|
| `UserRole` | `ADMIN · REFEREE · TECHNICAL_DIRECTOR · ASSISTANT · PLAYER` |
| `TeamRole` | `PLAYER · DT · ASSISTANT` |
| `FieldPosition` | `GK · DEF · MID · FWD · FIXO · ALA · PIVOT` |
| `LeagueFormat` | `ONE_V_ONE · THREE_V_THREE · FIVE_V_FIVE · SIX_V_SIX · SEVEN_V_SEVEN · NINE_V_NINE · ELEVEN_V_ELEVEN` |
| `LeagueType` | `ROUND_ROBIN · GROUPS_KNOCKOUT · KNOCKOUT_ONLY` |
| `WeekDay` | `MONDAY … SUNDAY` |
| `TimeSlot` | `MORNING · AFTERNOON · EVENING · NIGHT` |
| `LeagueStatus` | `PLANNED · IN_PROGRESS · FINISHED` |
| `MatchStatus` | `SCHEDULED · IN_PROGRESS · COMPLETED · POSTPONED · CANCELLED` |
| `MatchdayStatus` | `PENDING · IN_PROGRESS · COMPLETED` |
| `EventType` | `GOAL · ASSIST · YELLOW_CARD · RED_CARD · SUBSTITUTION · MVP · NOTE` |
| `ScoringMode` | `LIVE · POST_MATCH` |
| `KnockoutStage` | `ROUND_OF_16 · QUARTERS · SEMIS · FINAL · THIRD_PLACE` |
| `AwardCategory` | `SCORER · MVP · FAIR_PLAY · CHAMPION · BEST_DEFENSE` |
| `AwardLevel` | `GOLD · SILVER · BRONZE` |

### Modelos (resumen)
| Modelo | Tabla | Propósito |
|--------|-------|-----------|
| `User` | `users` | Usuarios con `role`, email/curp únicos, fotos, soft delete |
| `RefreshToken` | `refresh_tokens` | Refresh tokens (hash) con rotación |
| `Field` | `fields` | Canchas |
| `League` | `leagues` | Ligas (formato, tipo, cupo, jornadas, fechas, modalidad) |
| `LeagueField` | `league_fields` | Canchas asignadas a una liga (N:M) |
| `Team` | `teams` | Equipos (nombre, siglas, colores, emoji) |
| `TeamMembership` | `team_memberships` | Jugadores/cuerpo técnico por equipo |
| `LeagueTeam` | `league_teams` | Inscripción de equipo en liga (seed, grupo) |
| `Matchday` | `matchdays` | Jornadas por liga |
| `Match` | `matches` | Partidos (incluye etapa/leg de liguilla) |
| `MatchEvent` | `match_events` | Eventos del partido (append-only) |
| `Award` | `awards` | Premios individuales/colectivos |
| `AuditLog` | `audit_logs` | Bitácora de mutaciones (append-only) |
| `TeamInvite` | `team_invites` | Invitaciones a equipos (token único, 7 días) |

**Campos clave de `League`:** `format` (LeagueFormat), `category` (texto libre: LIBRE, JUVENIL, SUB_13, …), `type` (LeagueType), `matchdaysCount` (`@map("matchdays")`), `homeAndAway` (fase regular ida/vuelta), `knockoutHomeAndAway` (eliminatorias ida/vuelta), `maxTeams`, `dayOfWeek`, `timeSlot`, `startDate`/`endDate`, `status`.

**Campos clave de `Match`:** `homeTeamId`, `awayTeamId`, `matchdayId`, `fieldId`, `scheduledAt`, `status`, `homeScore`/`awayScore`, `refereeId`, `mvpUserId`, `scoringMode`, y para liguilla `knockoutStage`, `knockoutPosition`, `knockoutLeg` (1 o 2), `knockoutFeedsIntoMatchId` (autoreferencia para enlazar llaves).

---

## 🌐 API REST

- **Prefijo:** `/api/v1`
- **Envelope estándar:**
  - Éxito: `{ "success": true, "statusCode": 200, "data": … }`
  - Error: `{ "success": false, "statusCode": 4xx, "error": { "code": "…", "message": "…", "issues": […] } }`
- **Swagger UI:** `http://localhost:3000/api/v1/docs` · **Spec JSON:** `/api/v1/docs.json`
- **Health:** `/health` · **Subidas estáticas:** `/uploads`
- **Auth:** access token vía header `Authorization: Bearer <token>` + refresh token en cookie `httpOnly`. Se refresca en `POST /auth/refresh`.

### Modelo de roles (seguridad)
- **`ADMIN`** — muta todo (crear/editar/eliminar).
- **`REFEREE`, `TECHNICAL_DIRECTOR`, `ASSISTANT`, `PLAYER`** — solo lectura en la mayoría de recursos; perfil propio editable.
- Middlewares: `authenticate` (verifica token) y `authorize('ADMIN')` (restringe rutas de escritura).

### Inventario de endpoints

**Auth**
| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/auth/register` | Registro (acepta `inviteToken` para bloquear rol y crear membresía) |
| POST | `/auth/login` | Login → access + refresh |
| POST | `/auth/refresh` | Refrescar access token (rate-limited) |
| POST | `/auth/logout` | Logout |
| GET | `/auth/me` | Usuario autenticado |

**Users**
| Método | Ruta | Permiso |
|--------|------|---------|
| GET | `/users` | ADMIN (listado) |
| GET | `/users/me` · PATCH `/users/me` | self |
| GET | `/users/:id` | auth |
| POST | `/users` · PATCH `/users/:id` · DELETE `/users/:id` | ADMIN |
| POST/DELETE | `/users/me/profile-photo` · `/users/me/cover-photo` | self |

**Fields** — `GET /fields`, `GET /fields/:id` (auth); `POST /fields`, `PATCH /fields/:id`, `DELETE /fields/:id` (ADMIN).

**Leagues**
| Método | Ruta | Permiso |
|--------|------|---------|
| GET | `/leagues` · `/leagues/:id` · `/leagues/:id/teams` | auth |
| POST | `/leagues` · PATCH `/leagues/:id` · DELETE `/leagues/:id` | ADMIN |
| POST | `/leagues/:id/fixture/generate` | ADMIN (409 `FIXTURE_IN_PLAY` si ya hay) |
| POST | `/leagues/:id/knockout/generate` | ADMIN (409 `KNOCKOUT_EXISTS`) |
| POST | `/leagues/:id/teams` | ADMIN (409 `TEAM_ALREADY_ENROLLED`) |
| PATCH | `/leagues/:id/teams/:teamId` | ADMIN (seed/grupo; 404 `ENROLLMENT_NOT_FOUND`) |
| DELETE | `/leagues/:id/teams/:teamId` | ADMIN |

**Teams**
| Método | Ruta | Permiso |
|--------|------|---------|
| GET | `/teams` (`?leagueId=`) · `/teams/:id` · `/teams/:id/members` | auth |
| POST | `/teams` (acepta `currentLeagueId` para crear + inscribir) | ADMIN |
| PATCH/DELETE | `/teams/:id` | ADMIN |
| POST | `/teams/:id/members` | ADMIN (409 si ya es miembro) |
| PATCH/DELETE | `/teams/:id/members/:userId` | ADMIN |

**Matches / Matchdays**
| Método | Ruta | Permiso |
|--------|------|---------|
| GET | `/matches` (`?leagueId=&matchdayId=`) · `/matches/:id` | auth |
| POST | `/matches` · PATCH `/matches/:id` · PATCH `/matches/:id/score` · PATCH `/matches/:id/status` · DELETE `/matches/:id` | ADMIN |
| GET | `/leagues/:id/matchdays` · POST `/leagues/:id/matchdays` (ADMIN) | — |
| GET | `/matchdays/:id` · PATCH `/matchdays/:id` (ADMIN) · DELETE `/matchdays/:id` (ADMIN) | — |

**Eventos** — `GET/POST /matches/:matchId/events`, `PATCH/DELETE /matches/:matchId/events/:eventId`.

**Consultas de liga**
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/leagues/:id/standings` | Tabla de posiciones |
| GET | `/leagues/:id/stats` | Estadísticas de la liga |
| GET | `/leagues/:id/knockout` | Llave de liguilla |

**Perfiles / estadísticas**
| Método | Ruta |
|--------|------|
| GET | `/users/:id/profile` · `/users/:id/teams` · `/users/:id/stats` · `/users/:id/stats/by-league` · `/users/:id/matches` · `/users/:id/awards` |
| GET | `/referees/:id/stats` · `/referees/:id/matches` |

**Premios**
| Método | Ruta | Permiso |
|--------|------|---------|
| GET | `/awards` | auth |
| POST | `/awards` · PATCH `/awards/:id` · DELETE `/awards/:id` | ADMIN |
| POST | `/leagues/:id/awards/seed` | ADMIN |

**Auditoría** — `GET /audit` · `GET /audit/summary` (ADMIN).

**Invitaciones** — `POST /teams/:teamId/invites` (ADMIN) · `GET /teams/:teamId/invites` · `GET /invites/:token` (público, resuelve el token).

---

## 🎨 Frontend

### Rutas
**Públicas:** `/` (redirige a `/dashboard`), `/login`, `/register`, `/design` (playground de tokens), `/components` (galería de componentes), `/sport-kit` (kit visual premium), `/404`.

**Privadas** (requieren sesión): `/dashboard`, `/profile`, `/fields`, `/leagues`, `/leagues/:id` (+ `/teams`, `/fixture`, `/standings`, `/stats`, `/knockout`), `/teams`, `/teams/:id`, `/users`, `/audit`, `/calendar`, `/matches/:id`, `/players/:id`, `/referees/:id`.

### Sistema de diseño
**Neobrutalismo** (bordes negros de 3px + sombras duras rectangulares) mezclado con **pop-art latino** y estética **esports**.

- **Tipografía:** Bungee (display, uppercase), Inter (cuerpo), JetBrains Mono.
- **Tokens** (`styles/tokens.css`): paleta completa (`--color-vamos #FFE600`, `--color-coral #FF3D5A`, `--color-cyan #00D9FF`, `--color-magenta #FF2E93`, `--color-ink #0A0A0A`, `--color-bg #FFF8E7`, …), espaciado `--space-1..9`, radios `--radius-sm..pill`, sombras `--shadow-sm..xl`, motion.
- **4 temas** (light/dark/wp1/wp2) vía `useTheme` + `ThemeToggle`.
- **Kit `ui/`:** `Button`, `Chip`, `Card`, `Banner`, `TextField`, `TextArea`, `Select`, `FieldError`, `PageHeader`, `EmptyState` (+ `Modal`, `ConfirmDialog`, `Stepper` como archivos separados).
- **Kit `sport/`** (premium/broadcast, aislado bajo `.sport-ui`): `SportButton`, `PlayerCard`, `FormGuide` — demo en `/sport-kit`.

---

## 👥 Roles y flujo completo

El flujo completo del producto:

1. **Admin crea una liga** (`/leagues` → wizard de 3 pasos: datos básicos → formato/calendario → canchas). El formulario sugiere jornadas y **calcula la fecha final automáticamente** (incluyendo fase de liguilla).
2. **Decisión del campeón:** por **tabla** (round-robin) o por **liguilla** (fase regular + cuartos/semifinal/final). En ambos hay 1º, 2º y 3º lugar, y cada fase puede ser a una vuelta o ida/vuelta.
3. **Equipos:** el admin crea equipos (`/teams`) o usa el botón **"Añadir equipos default"** para generar los `N` equipos faltantes de la liga en un clic.
4. **Inscripción:** se asigna equipos a la liga (`/leagues/:id/teams`). **Regla de dominio:** un equipo solo puede estar en una liga a la vez (el backend rechaza con 409 `TEAM_IN_ANOTHER_LEAGUE`).
5. **Plantillas:** dentro de un equipo (`/teams/:id`) se agregan jugadores (PLAYER) y cuerpo técnico (DT/ASSISTANT) — por creación directa o por **invitación** (QR + enlace + token de 7 días que bloquea el rol al registrarse).
6. **Calendario:** se genera el fixture (jornadas round-robin) y, si aplica, la liguilla.
7. **Captura:** en cada partido se registran marcador, eventos (goles, tarjetas, sustituciones, MVP) y estado.
8. **Resultados:** tabla de posiciones, estadísticas, llave de liguilla y premios.

### Matriz de permisos (resumen)
| Acción | ADMIN | REFEREE | DT / ASST | PLAYER |
|--------|:-----:|:-------:|:---------:|:------:|
| Crear/editar/eliminar ligas, equipos, canchas, partidos, premios | ✅ | ❌ | ❌ | ❌ |
| Generar fixture / liguilla | ✅ | ❌ | ❌ | ❌ |
| Capturar marcador/eventos | ✅ | ❌ | ❌ | ❌ |
| Ver calendario/tabla/stats | ✅ | ✅ | ✅ | ✅ |
| Editar su propio perfil | ✅ | ✅ | ✅ | ✅ |
| Invitar a su equipo | ✅ | ❌ | ❌ | ❌ |

---

## 🌱 Seed (datos de prueba)

El seed es **determinista** y crea:

- **16 ligas** (formato 7v7), categorías: LIBRE, JUVENIL, SUB_13, SUB_15, SUB_17, SUB_20, VETERANOS, FEMENIL, MIXTO_AMATEUR, FLORES.
- **~3636 usuarios**: 1 ADMIN, 6 árbitros, 15 DTs, 30 asistentes y ~3360 jugadores.
- Equipos y jornadas/partidos de ejemplo (incluye ligas en fase de liguilla).

### Credenciales de prueba
| Rol | Email (patrón) | Contraseña |
|-----|----------------|------------|
| Admin | `jose.ramirez.admin.1@tkt.local` | `TKTadmin2025!` |
| Árbitro | `<nombre>.<apellido>.ref.<n>@tkt.local` | `TKTref2025!` |
| DT | `<nombre>.<apellido>.dt.<n>@tkt.local` | `TKTdt2025!` |
| Asistente | `<nombre>.<apellido>.asst.<n>@tkt.local` | `TKTasst2025!` |
| Jugador | `<nombre>.<apellido>.player.<n>@tkt.local` | `TKTplayer2025!` |

> Ejemplo: `roberto.silva.ref.1@tkt.local` / `TKTref2025!`. Lista completa en `docs/seed-users.local.txt` (gitignored).
> Las credenciales antiguas `@kaibil.local / Admin123!` están **obsoletas**.

---

## 🧪 Scripts útiles

```bash
# Desarrollo
pnpm dev                # backend + frontend en paralelo
pnpm build              # build de ambos paquetes
pnpm lint               # eslint en ambos paquetes
pnpm test               # tests (vitest, backend: 156 tests)

# Base de datos
pnpm db:up              # levantar Postgres + Adminer
pnpm db:down            # detener
pnpm db:logs            # logs de la BD
pnpm db:migrate         # crear migración
pnpm db:migrate:deploy  # aplicar migraciones
pnpm db:seed            # sembrar datos
pnpm db:reset           # resetear BD (migra + seed)
pnpm db:studio          # abrir Prisma Studio
```

Dentro de cada paquete:
```bash
cd backend   && pnpm dev        # tsx watch (puerto 3000)
cd backend   && pnpm test       # vitest run
cd backend   && pnpm build      # tsc → dist/server.js
cd backend   && pnpm docs:export # generar OpenAPI

cd frontend  && pnpm dev        # vite (puerto 5173)
cd frontend  && pnpm build      # tsc --noEmit && vite build
cd frontend  && pnpm typecheck  # solo tsc --noEmit
cd frontend  && pnpm lint       # eslint src
```

---

## 📚 Documentación complementaria (`docs/`)

| Archivo | Contenido |
|---------|-----------|
| `README.md` | Índice de documentación |
| `api.md` | Envelope, errores, auth, subidas, roles |
| `database.md` | Convenciones de PostgreSQL |
| `er-diagram.md` | Diagrama entidad-relación |
| `design-system.md` | Sistema de diseño extendido |
| `v1-roadmap.md` | Roadmap original (10 pasos + matriz de roles) |
| `v1.1-endpoints-db-plan.md` | Plan maestro (modelos/endpoints por fase) |
| `v1.1-data-plan.md` · `v1.1-fase-3-plan.md` | Planes de datos / fase 3 |
| `workflow-and-deploy.md` | Flujo de trabajo y despliegue |
| `graphify.md` | Grafo de conocimiento del código |

---

## 🧭 Grafo de conocimiento (graphify)

El proyecto mantiene un grafo en `graphify-out/` (nodos, comunidades y relaciones entre archivos).

```bash
graphify query "¿cómo funciona X?"   # subgrafo enfocado
graphify path "A" "B"                # relación entre archivos
graphify explain "concepto"          # concepto específico
graphify update .                    # regenerar el grafo tras cambios
```

---

## 📝 Convenciones del repo

- **Sin emojis como iconos de UI** — usar el set de iconos propio (`components/icons`).
- **Convenciones de commits/entorno:** consulta `AGENTS.md` (reglas de git y browser).
- Los cambios de código se verifican con `pnpm typecheck` + `pnpm build` (frontend) y `npx tsc --noEmit` + `pnpm test` (backend).
