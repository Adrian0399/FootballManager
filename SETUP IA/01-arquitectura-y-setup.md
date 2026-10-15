# 01 — Arquitectura y setup

## Stack tecnológico (versiones exactas)

| Capa | Tecnología | Versión |
|------|-----------|---------|
| Monorepo | pnpm workspaces | pnpm `9.12.3` |
| Runtime | Node.js | `>= 24` (`.nvmrc` = `24`) |
| Lenguaje | TypeScript | `5.6.3` |
| Backend | Express | `4.21.1` (NO 5.x) |
| ORM | Prisma | `5.22.0` |
| Base de datos | PostgreSQL | `16` |
| Validación | Zod | `3.23.8` |
| Auth | `jsonwebtoken` + `bcrypt` + refresh tokens en BD | `9.0.2` / `5.1.1` |
| Subida de imágenes | `multer` + `sharp` | `1.4.5-lts.1` / `0.33.5` |
| Docs API | `swagger-jsdoc` + `swagger-ui-express` | `^6.3.0` / `^5.0.1` |
| Frontend | React + Vite | `18.3.1` / `5.4.10` |
| Routing | React Router DOM | `6.28.0` |
| Estado | Zustand | `5.0.1` |
| Formularios | React Hook Form + `@hookform/resolvers` (zod) | `7.53.2` / `3.9.1` |
| HTTP | Axios | `1.7.7` |
| QR | `qrcode.react` | `^4.2.0` |
| Tests backend | Vitest | `^3` |
| Rate limiting | `express-rate-limit` | `7.4.1` |
| Seguridad headers | `helmet` | `8.0.0` |

Dependencias backend adicionales: `cookie-parser`, `cors`, `dotenv`, `swagger-ui-express`. DevDeps backend: `tsx`, `prisma`, `vitest`, `@types/*`, `eslint ^9`, `typescript-eslint ^8`.
DevDeps frontend: `vite`, `@vitejs/plugin-react`, `eslint ^9`, `eslint-plugin-react-hooks ^7.1.1`, `typescript-eslint ^8`.

## Estructura del monorepo

```
backend/
  prisma/schema.prisma        # modelo de datos (ver reference/schema.prisma)
  prisma/seed.ts              # seed determinista
  src/server.ts               # entrypoint (puerto 3000)
  src/app.ts                  # buildApp(): middlewares + routers + swagger
  src/middleware/             # authenticate, authorize, validateBody, auditLogger, errorHandler
  src/modules/<m>/            # por recurso: controller.ts / routes.ts / service.ts / validation.ts
    leagues/tournament.ts     # motor de torneo (puro, sin I/O)
    leagues/tournament.test.ts
  src/scripts/generate-openapi.ts
frontend/
  src/api/                    # cliente axios + serializers por recurso
  src/pages/                  # una página por ruta
  src/components/             # componentes + ui/ + icons/ + sport/
  src/hooks/                  # hooks de datos
  src/store/                  # Zustand (auth.store)
  src/styles/                 # tokens + base + (diseño libre de la IA)
  src/types/                  # tipos compartidos
  src/utils/                  # validation.ts (zod), roleChip.ts, roundRobin.ts, shuffle.ts, standings.ts
  src/router.tsx              # rutas + Shell
docker/docker-compose.yml     # postgres:16-alpine + adminer
docs/                         # documentación complementaria
```

Los módulos backend son: `auth, users, fields, leagues, matches, matchdays, teams, events, standings, stats, knockout, profile, awards, audit, invites`.

## Requisitos previos

1. Node.js `>= 24` (usar `nvm` con `.nvmrc`).
2. pnpm `>= 9` (`npm i -g pnpm@9`).
3. Docker (para PostgreSQL 16).

## Puesta en marcha (desde cero)

```bash
pnpm install                 # postinstall ejecuta `prisma generate`
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
cp docker/.env.example docker/.env

pnpm db:up                   # levanta PostgreSQL 16 + Adminer (:8080)
pnpm db:migrate:deploy       # aplica migraciones
pnpm db:seed                 # datos de prueba

pnpm dev                     # backend (:3000) + frontend (:5173)
```

## Variables de entorno

### backend/.env
| Variable | Valor de ejemplo | Notas |
|----------|------------------|-------|
| `NODE_ENV` | `development` | |
| `PORT` | `3000` | |
| `DATABASE_URL` | `postgresql://postgres:changeme_in_prod@localhost:5432/kaibil_football_league_manager?schema=public` | |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | *(≥32 chars)* | generar con `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"` |
| `JWT_ACCESS_EXPIRES_IN` | `15m` | |
| `JWT_REFRESH_EXPIRES_IN` | `7d` | |
| `CORS_ORIGIN` | `http://localhost:5173` | |
| `BCRYPT_SALT_ROUNDS` | `10` | |
| `COOKIE_DOMAIN` | `localhost` | |
| `COOKIE_SECURE` | `false` | |
| `UPLOAD_DIR` | `uploads` | |
| `MAX_UPLOAD_SIZE_MB` | `10` | |
| `PUBLIC_BASE_URL` | `http://localhost:3000` | |

### frontend/.env
| Variable | Valor | Notas |
|----------|-------|-------|
| `VITE_API_BASE_URL` | `/api/v1` | relativa si mismo origen; **absoluta** si el API está en otro dominio (agregar ese origen a `CORS_ORIGIN`). Solo `VITE_*` se inyecta en el build. |

### docker/.env
`POSTGRES_USER=postgres`, `POSTGRES_PASSWORD=changeme_in_prod`, `POSTGRES_DB=kaibil_football_league_manager`, `POSTGRES_PORT=5432`, `ADMINER_PORT=8080`.

## Scripts (package.json raíz)

| Script | Acción |
|--------|--------|
| `dev` | `pnpm -r --parallel --stream run dev` |
| `build` / `lint` / `test` | build / lint / tests en ambos paquetes |
| `db:up` / `db:down` / `db:logs` | `docker compose -f docker/docker-compose.yml --env-file docker/.env …` |
| `db:migrate` / `db:migrate:deploy` / `db:seed` / `db:studio` / `db:reset` | `pnpm --filter backend run …` |

Backend scripts: `dev` (`tsx watch src/server.ts`), `build` (`tsc -p tsconfig.json`), `start` (`node dist/server.js`), `lint`, `typecheck` (`tsc --noEmit`), `test` (`vitest run`), `postinstall` (`prisma generate --no-hints`), `docs:export` (`tsx scripts/generate-openapi.ts`).
Frontend scripts: `dev` (vite), `build` (`tsc --noEmit && vite build`), `typecheck`, `lint` (`eslint src`), `build:uat`/`build:prod` (`--mode`).

> El frontend proxya `/api` al backend `:3000` en desarrollo (config Vite).
