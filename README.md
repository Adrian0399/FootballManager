# Kaibil Football League Manager

Monorepo para gestión de ligas de fútbol: canchas, ligas, equipos,
partidos y staff (árbitros, directores técnicos, auxiliares, jugadores).
Una instancia = un dueño (single-tenant por deploy).

> **Stack:** React 18 + Vite + TypeScript · Node 20/24 + Express 5 + Prisma + PostgreSQL 16 · pnpm workspaces · JWT auth · sharp para imágenes.

---

## 📚 Documentación

La documentación técnica está organizada en `docs/`. Cada doc cubre un
dominio y se referencian entre sí:

- **[`docs/README.md`](./docs/README.md)** — índice global + cómo se conectan los tres docs
- **[`docs/api.md`](./docs/api.md)** — convenciones de la API REST (envelope, errores, auth, uploads, roles)
- **[`docs/database.md`](./docs/database.md)** — convenciones de PostgreSQL (naming, auditoría, soft delete, tipos)
- **[`docs/er-diagram.md`](./docs/er-diagram.md)** — modelo entidad-relación actual
- **[`frontend/README.md`](./frontend/README.md)** — design system, tokens, componentes y patrones visuales
- `docs/seed-users.local.txt` (gitignored) — credenciales del seed local

> Si vas a tocar el backend, lee al menos `docs/database.md` y `docs/api.md`.
> Si vas a tocar el frontend, lee `frontend/README.md` y la sección de auth de `docs/api.md`.

---

## 🛠️ Quick Start

### Prerequisitos

- **Node.js 20 o 24 LTS** (gestionado con `nvm`, ver `.nvmrc`)
- **pnpm 9+** (`npm i -g pnpm` o vía Corepack)
- **Docker + Docker Compose** (para PostgreSQL)
- **DBeaver** (u otro cliente para inspeccionar la BD — opcional pero recomendado)

### Setup

```bash
# 1. Clonar e instalar
git clone <repo-url>
cd KaibilFootball
pnpm install

# 2. Variables de entorno
cp docker/.env.example docker/.env
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# 3. Levantar PostgreSQL
pnpm db:up

# 4. Migrar el schema (la primera vez te pide nombre: "init";
#    cuando agregues cambios posteriores, pon "add_<descripcion>")
pnpm db:migrate

# 5. Sembrar 32 users + 3 canchas + 2 ligas
pnpm db:seed

# 6. Arrancar backend (:3000) y frontend (:5173) en paralelo
pnpm dev
```

Abre <http://localhost:5173>, loguéate con cualquier usuario del seed
(lista completa en `docs/seed-users.local.txt`):

```
jose.lopez.admin.1@kaibil.local        → Admin123!
carlos.martinez.technicaldirector.1@kaibil.local → TechDir123!
pedro.sanchez.assistant.1@kaibil.local          → Assistant123!
diego.flores.player.1@kaibil.local             → Player123!
```

---

## 📜 Scripts disponibles

| Script | Descripción |
|---|---|
| `pnpm dev` | Arranca backend y frontend en paralelo. |
| `pnpm build` | Compila ambos workspaces para producción. |
| `pnpm lint` | Lint en ambos workspaces. |
| `pnpm test` | Tests en ambos workspaces. |
| `pnpm db:up` | Levanta los contenedores Docker (PostgreSQL + Adminer). |
| `pnpm db:down` | Para los contenedores Docker. |
| `pnpm db:logs` | Tail de logs de los contenedores. |
| `pnpm db:migrate` | Aplica migraciones Prisma (dev). |
| `pnpm db:migrate:deploy` | Aplica migraciones en modo deploy (CI/prod). |
| `pnpm db:seed` | Puebla la BD con 32 users + 3 fields + 2 ligas. |
| `pnpm db:studio` | Abre Prisma Studio (GUI web para la BD). |
| `pnpm db:reset` | **Destructivo**: drop + recreate + reseed. |

---

## 🗂️ Estructura

```
kaibil-football-league-manager/
├── README.md                  ← este archivo
├── package.json                ← pnpm workspace root
├── pnpm-workspace.yaml
├── docker/
│   ├── docker-compose.yml      ← PostgreSQL 16 + Adminer
│   └── init/01-extensions.sql
├── docs/                       ← 📚 documentación técnica
│   ├── README.md               ← índice
│   ├── api.md                  ← convenciones API
│   ├── database.md             ← convenciones DB
│   └── er-diagram.md
├── backend/                    ← API REST
│   ├── prisma/                 ← schema + migrations + seed
│   └── src/
│       ├── server.ts
│       ├── app.ts
│       ├── config/             ← env validation
│       ├── shared/             ← middlewares, utils, errors
│       └── modules/            ← auth, users, fields, leagues, …
├── frontend/                   ← React 18 + Vite
│   ├── README.md               ← design system
│   └── src/                    ← components, pages, styles, store
└── .opencode/                   ← config de OpenCode (wrappers, AGENTS.md)
```

---

## 🔌 Conexión a DBeaver

| Campo | Valor |
|---|---|
| Host | `localhost` |
| Puerto | `5432` |
| Base de datos | `kaibil_football_league_manager` |
| Usuario | `postgres` |
| Contraseña | valor de `POSTGRES_PASSWORD` en `docker/.env` |

> Para encontrar la contraseña:
> ```bash
> grep POSTGRES_PASSWORD docker/.env
> ```

Adminer también queda disponible en <http://localhost:8080> cuando
`pnpm db:up` está corriendo.

---

## 🛣️ Roadmap

- [x] **Auth**: register, login, JWT con refresh rotation
- [x] **Perfil**: edición con cálculo automático de edad desde `birth_date`, foto de perfil y cover
- [x] **Canchas (Fields)**: CRUD completo, soft delete
- [x] **Ligas (Leagues)**: CRUD completo, relación M:N con canchas
- [ ] **Equipos (Teams)**: CRUD, asignación de DT/auxiliares/jugadores
- [ ] **Partidos (Matches)**: scheduling, resultado, árbitro
- [ ] **Tabla de posiciones (Standings)**: cálculo de puntos/goles
- [ ] **Reportes**: goleadores, fair play, etc.

---

## 📄 Licencia

Privado — uso interno del dueño del proyecto.