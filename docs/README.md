# Kaibil Football — Documentation

> Documentación técnica del monorepo `kaibil-football-league-manager`.
> Cada documento cubre un dominio y se referencian entre sí.

---

## ¿Qué es Kaibil Football?

Plataforma SaaS para que un **dueño de ligas de fútbol** gestione su
operación: canchas donde se juega, ligas (temporadas), equipos, partidos
y staff (árbitros, directores técnicos, auxiliares, jugadores). Una
instancia = un dueño. No es multi-tenant compartido (ver
[`database.md` §2](./database.md#2-modelo-multi-tenant)).

Estado actual: v1.1 — auth, perfil, CRUD de canchas y ligas, y capa de
**lectura** del dominio deportivo (equipos, calendario, partidos, eventos,
tabla, stats, liguilla). La capa de **escritura** del dominio deportivo está
en el plan maestro [`v1.1-endpoints-db-plan.md`](./v1.1-endpoints-db-plan.md).

---

## Índice de documentos

| Doc | Cubre | Para quién |
|---|---|---|
| [`README.md`](../README.md) | Quick start, scripts, prerequisitos | **Todos** — primer archivo a leer |
| [`api.md`](./api.md) | Convenciones del backend HTTP (envelope, errores, auth, uploads) | Backend devs y frontend devs que consumen la API |
| [`api/README.md`](./api/README.md) | **Planeado** — Swagger/OpenAPI self-generated (aún no implementado) | Backend devs (futuro) |
| [`v1.1-endpoints-db-plan.md`](./v1.1-endpoints-db-plan.md) | **Plan maestro** — inventario de modelos, migraciones y todos los endpoints (existentes + faltantes) por fase | Backend y frontend devs |
| [`database.md`](./database.md) | Convenciones de PostgreSQL (naming, auditoría, soft delete, tipos) | Backend devs y DBAs |
| [`er-diagram.md`](./er-diagram.md) | Diagrama entidad-relación actual del schema | Cualquiera que necesite entender el modelo |
| [`frontend/README.md`](../frontend/README.md) | Design system operativo: tokens, componentes, patrones | Frontend devs y sesiones que toquen JSX/CSS |
| [`design-system.md`](./design-system.md) | Design system extendido: brand, voz, anti-patterns, changelog | Frontend devs y diseñadores |
| `seed-users.local.txt` (gitignored) | Credenciales reales del seed activo | Solo local — **nunca commitear datos productivos** |

Los tres docs principales (`api.md`, `database.md`, `frontend/README.md`)
**trabajan en conjunto** y se referencian entre sí. Si vas a tocar el
backend, lee `database.md` y `api.md`. Si vas a tocar el frontend,
lee `frontend/README.md` y la sección de auth/envelope de `api.md`. El
`design-system.md` (extendido) y el `api/README.md` (OpenAPI planeado)
son referencias adicionales; el primero ya existe, el segundo todavía
no está implementado.

---

## Stack en una línea

| Capa | Tech |
|---|---|
| Frontend | React 18 + TypeScript + Vite, React Router 6, Zustand, RHF + Zod, Axios |
| Backend | Node 20/24 + Express 5 + TypeScript, Prisma ORM, Zod, JWT, bcrypt, sharp, multer |
| DB | PostgreSQL 16 (Docker) |
| Monorepo | pnpm workspaces |
| Auth | JWT propio (access 15min en memoria + refresh 7d en cookie httpOnly) |

---

## Quick start

```bash
# 1. Instalar deps (raíz + workspaces)
pnpm install

# 2. Variables de entorno
cp docker/.env.example docker/.env
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# 3. Levantar PostgreSQL
pnpm db:up

# 4. Migrar + seed
pnpm db:migrate      # la primera vez te pide nombre: "init", luego "add_user_photos", "add_fields_and_leagues"
pnpm db:seed         # 32 users + 3 fields + 2 ligas

# 5. Arrancar dev (backend :3000, frontend :5173)
pnpm dev

# 6. (Opcional) Generar el knowledge graph para que graphify ayude al agente
cd ~/Desktop/KaibilFootball
export PATH="$HOME/.graphify-venv/bin:$PATH"
graphify update .
```

Login por defecto (todos los passwords son `Rolename123!`):
- `jose.lopez.admin.1@kaibil.local` / `Admin123!`
- `carlos.martinez.technicaldirector.1@kaibil.local` / `TechDir123!`
- etc. — lista completa en `docs/seed-users.local.txt` (gitignored).

---

## Cómo se conectan los tres docs

```
   ┌─────────────────────────────────────────────────────┐
   │                       README.md (raíz)               │
   │  Quick start · scripts · prerequisitos                │
   │  → apunta a los tres docs de abajo                    │
   └─────────────┬───────────────────────┬───────────────┘
                 │                       │
                 ▼                       ▼
   ┌─────────────────────┐   ┌─────────────────────────────┐
   │   docs/database.md   │   │       docs/api.md           │
   │                     │   │                             │
   │  Schema, naming,    │◄──┤  HTTP, envelope, auth,     │
   │  auditoría, soft    │   │  uploads, errores, roles    │
   │  delete, tipos      │   │                             │
   └──────────┬──────────┘   └──────────┬──────────────────┘
              │                         │
              ▼                         ▼
              └────────┬────────────────┘
                       │
                       ▼
            ┌──────────────────────┐
            │  frontend/README.md  │
            │                      │
            │  Design system,       │
            │  tokens, componentes,│
            │  patrones, anti-      │
            │  patterns             │
            └──────────────────────┘
```

**Regla práctica:** si vas a tocar código, lee los tres docs que
apliquen a tu capa. Si tienes duda sobre algo visual, el `frontend/README.md`
manda. Si tienes duda sobre algo de BD o de contrato HTTP, manda el de
`database.md` o `api.md` respectivamente.

---

## Estructura del repo

```
kaibil-football-league-manager/
├── README.md                  ← quick start (este apunta aquí)
├── package.json                ← pnpm workspace root
├── pnpm-workspace.yaml
├── docker/
│   ├── docker-compose.yml      ← PostgreSQL 16 + Adminer
│   └── init/01-extensions.sql
├── docs/                       ← 📚 este directorio
│   ├── README.md               ← este archivo
│   ├── api.md
│   ├── database.md
│   ├── er-diagram.md
│   ├── design-system.md        (pendiente)
│   └── seed-users.local.txt     (gitignored)
├── backend/                    ← API REST (Express + Prisma)
│   ├── prisma/
│   │   ├── schema.prisma        ← fuente de verdad del modelo
│   │   ├── seed.ts              ← determinista
│   │   └── migrations/
│   └── src/
│       ├── server.ts
│       ├── app.ts
│       ├── config/env.ts        ← Zod-validado
│       ├── shared/              ← middlewares, utils, errors
│       └── modules/              ← auth, users, fields, leagues, …
├── frontend/                   ← React 18 + Vite
│   ├── README.md                ← design system
│   └── src/
│       ├── App.tsx
│       ├── router.tsx
│       ├── api/axios.ts          ← interceptor de refresh
│       ├── store/auth.store.ts   ← Zustand
│       ├── types/
│       ├── utils/
│       ├── components/
│       ├── pages/
│       └── styles/
│           ├── tokens.css        ← ⭐ todos los CSS variables
│           ├── base.css
│           ├── illustrations.css
│           └── global.css
└── .opencode/                   ← config de OpenCode (wrappers, AGENTS.md, plugins)
```

---

## Convenciones globales (aplican en los 3 docs)

- **Todo en inglés**: variables, tablas, columnas, paths, mensajes de
  commit, identificadores. Solo se localizan mensajes al usuario final
  (UI).
- **Single-tenant por instancia**: no hay `owner_id`. La BD entera
  pertenece al dueño del deploy.
- **Auditoría obligatoria**: toda tabla lleva `created_at`, `created_by`,
  `updated_at`, `updated_by`. Ver `database.md` §4.
- **Envelope API obligatorio**: toda response va envuelta. Ver
  `api.md` §3.
- **Soft delete por defecto**: las entidades de negocio se borran vía
  `deleted_at`, nunca `DELETE FROM` físico.
- **Tokens visuales centralizados**: el frontend no escribe colores a
  mano. Todo viene de `tokens.css`. Ver `frontend/README.md` §5.3.

---

## Próximos pasos (orden sugerido)

1. **CRUD de Teams** (siguiente feature de fútbol)
2. **CRUD de Matches** (partidos, asignados a canchas + ligas)
3. **Roster por equipo** (asignar DT, jugadores, auxiliares)
4. **Schedule generator** (generar partidos de la liga en base a reglas)
5. **Resultados / standings** (puntos, tabla de posiciones)

Cada feature se documenta siguiendo la misma plantilla: update a
`docs/er-diagram.md` si hay cambios de modelo, update a `database.md` y
`api.md` si hay nuevos códigos de error, update a `frontend/README.md`
si hay nuevos componentes visuales.

---

## Referencias externas

- [Express docs](https://expressjs.com/)
- [Prisma docs](https://www.prisma.io/docs)
- [Zod docs](https://zod.dev/)
- [React Hook Form](https://react-hook-form.com/)
- [Vite docs](https://vitejs.dev/)
- [PostgreSQL 16](https://www.postgresql.org/docs/16/)