# 06 — Frontend (lógica, sin diseño)

> **Importante:** aquí NO hay CSS/estilos. La IA decide su propio sistema de diseño. Solo se documenta la **estructura lógica** (rutas, estado, validaciones, props de componentes, hooks, cliente HTTP).

## Rutas (`router.tsx`)

- `basename` = `BASE_URL` sin barra final.
- `Shell` = wrapper local que envuelve `.kaibil-app` + `<Header/>` + `RouteBoundary` (Suspense + fallback de carga/error).

**Públicas:**
| Ruta | Componente | Notas |
|------|-----------|-------|
| `/` | — | redirige a `/dashboard` |
| `/login` | LoginPage | PublicOnly |
| `/register` | RegisterPage | PublicOnly (acepta `inviteToken` por query/URL) |
| `/design` | DesignPlayground | playground de tokens |
| `/components` | ComponentGallery | galería de componentes |
| `/sport-kit` | SportKitPage | kit visual premium |
| `/404` | NotFoundPage | |

**Privadas** (envueltas en `RequireAuth` → `Shell`):
`/dashboard`, `/profile`, `/fields`, `/leagues`, `/leagues/:id`, `/leagues/:id/teams`, `/leagues/:id/fixture`, `/leagues/:id/standings`, `/leagues/:id/stats`, `/leagues/:id/knockout`, `/teams`, `/teams/:id`, `/users`, `/audit`, `/calendar`, `/matches/:id`, `/players/:id`, `/referees/:id`.

## Páginas (`src/pages/`)

`AuditPage`, `CalendarPage`, `ComponentGallery`, `DashboardPage`, `FieldsPage`, `LeagueDetailPage`, `LeagueFixturePage`, `LeagueKnockoutPage`, `LeagueStandingsPage`, `LeagueStatsPage`, `LeagueTeamsPage`, `LeaguesPage`, `LoginPage`, `MatchDetailPage`, `NotFoundPage`, `PlayerProfilePage`, `ProfilePage`, `RefereeProfilePage`, `RegisterPage`, `RoleDashboard` (vistas por rol), `SportKitPage`, `TeamDetailPage`, `TeamsPage`, `UsersPage`.

## Cliente HTTP (`api/axios.ts`)

Ver `05-flujos-y-seguridad.md` → sección "Frontend — silent refresh". Adicionalmente hay un módulo `api/` por recurso: `audit`, `awards`, `axios`, `fields`, `invites`, `leagues`, `matches`, `profile`, `teams`, `users`. Cada uno expone funciones tipadas (p. ej. `leaguesApi.create/update/remove/generateFixture/generateKnockout/addTeam/updateTeam/removeTeam`, `teamsApi.create/update/remove/addMember/updateMember/removeMember`, `usersApi.search/create/update/remove`).

> `serializeLeagueInput()` traduce `format` entre `1V1↔ONE_V_ONE`, etc., y `matchdays↔matchdaysCount`; el resto de campos pasa tal cual.

## Estado (Zustand)

- `store/auth.store.ts`: `{ user, accessToken, setAuth(user, accessToken), clear() }`. Persistido para mantener la sesión.

## Validación (frontend, `utils/validation.ts`)

Esquemas zod (paralelos a los del backend, con formatos cortos en frontend):

- `curpRegex = /^[A-Z]{4}[0-9]{6}[A-Z]{6}[0-9]{2}$/`
- `phoneRegex = /^\+?[0-9]{10,15}$/`
- `passwordRegex = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/`
- `loginSchema`: `{ email, password }`.
- `registerSchema`: nombres (2–100), `birthDate` (string, fecha pasada), `role` enum default `PLAYER`, `nickname` (máx 80, opcional), `phoneNumber`, `email`, `curp`, `password`, `confirmPassword` + refine que coincidan.
- `updateProfileSchema`.
- `fieldCreateSchema`: `name` 2–100, `address` máx 255 opcional, `description` máx 1000 opcional, `capacity` string→int positivo. `fieldUpdateSchema = partial`.
- `leagueBaseSchema`: `name` 2–100, `description` máx 1000, `season` máx 50, `startDate`/`endDate` string opcional, `fieldIds` min 1 (uuid), **`format` enum `['1V1','3V3','5V5','6V6','7V7','9V9','11V11']`**, `category` máx 50, `type` enum (`ROUND_ROBIN/GROUPS_KNOCKOUT/KNOCKOUT_ONLY`), `matchdays` string→int positivo, `homeAndAway`/`knockoutHomeAndAway` `z.union([bool,string]).transform(v => v===true || v==='true' || v==='on')`, `maxTeams` string→int positivo, `dayOfWeek`/`timeSlot` enums.
- `leagueCreateSchema`: `leagueBaseSchema` + refine `startDate <= endDate`. `leagueUpdateSchema = partial`.

## Hooks (`src/hooks/`)

`useAsync.ts` (genérico: estado `data/error/loading` + `run`/`refetch`), `useIsAdmin.ts`, `useTheme.ts`, y por recurso: `knockout.ts`, `leagueTeams.ts`, `matchEvents.ts`, `matches.ts`, `playerStats.ts`, `profile.ts`, `standings.ts`, `teams.ts`.

## Componentes y sus props (lógica, NO CSS)

### Kit base (`components/ui/`)
- **`Button`** — props: `variant` (`primary`|`cyan`|`coral`|`magenta`|`lime`|`ghost`|`dark`), `size` (`sm`|`md`|`lg`), `startIcon`, `endIcon`, `block`, `to` (si se pasa `to`, renderiza un `<Link>`). También acepta props nativas de botón.
- **`Chip`** — props: `tone` (`default`|`admin`|`ref`|`td`|`asst`|`player`|`cyan`|`magenta`|`lime`|`coral`|`success`|`warning`), `style`, `className`, children.
- **`Card`** — props: `variant` (`default`|`rare`|`legend`|`dark`|`cream`), `scanlines`, `as` (elemento), children.
- **`Banner`** — props: `tone` (`error`|`success`|`info`|`warning`), children.
- **`TextField`** — props: `id`, `label`, `error?`, `hint?` + props de `<input>` (por ref).
- **`TextArea`**, **`Select`**, **`FieldError`** (`message`).
- **`PageHeader`** — props: `title`, `description?`, `actions?`.
- **`EmptyState`** — props: `title`, `description?`, `actions?` (ReactNode).

### Overlays (archivos separados, NO en `ui/`)
- **`Modal`** — props: `open`, `onClose`, `title`, `description?`, `children`, `footer?`, `disableBackdropClose?`, `size` (`sm`|`lg`). Se renderiza en un portal dentro de `.kaibil-app`.
- **`ConfirmDialog`** — props: `open`, `title`, `message`, `confirmLabel?`, `cancelLabel?`, `tone?` (`danger`|`primary`), `onConfirm`, `onClose`.
- **`Stepper`** — props: `steps` (`[{id,label,hint}]`), `current`, `onBack`, `onNext`, `onCancel`, `submitLabel?`, `isLast`, `submitting?`, children.

### Componentes de dominio (lógica)
- **`LeagueForm`** — props: `{ league?, onSaved, onCancel }` (mismo componente para crear y editar). Wizard de **3 pasos**: (0) Datos básicos → (1) Formato y calendario → (2) Canchas. Usa `useForm` + `zodResolver`. Calcula `endDate` automáticamente (ver `03`, sección 7). Sugiere jornadas round-robin. Radio "¿Cómo se decide el campeón?" (tabla/liguilla) + checkboxes "Fase regular ida y vuelta" y "Eliminatorias ida y vuelta".
- **`TeamForm`** — `{ team?, onSaved, onCancel }`. Campos: `name`, `shortName`, `emoji`, `primaryColor`, `secondaryColor`.
- **`UserForm`** — `{ user?, onSaved, onCancel }` (crear/editar usuario).
- **`FieldForm`** — `{ field?, onSaved, onCancel }`.
- **`DefaultTeamsButton`** — `{ leagueId, count, startAt, onDone, size?, variant? }`. Crea `count` equipos "default" (`Equipo NN`) e inscribe a la liga; helper `nextPlaceholderStart(names)`.
- **`AddTeamMemberForm`** — `{ team, existingUserIds?, allowedRoles?, onAdded, onCancel }`. Dos modos: invitar (buscar usuario) o crear (nuevo usuario).
- **`InviteModal`** — genera invitación con QR (`qrcode.react`) + enlace + copiar.
- **`RosterList`**, **`StaffBlock`**, **`TeamBadge`**, **`TeamPicker`**, **`StandingsTable`**, **`Bracket`**, **`CalendarView`**, **`Leaderboard`**, **`MatchTimeline`**, **`MatchScoreboard`**, **`MatchClock`**, **`MatchBanner`**, **`MatchPill`**, **`MatchdayColumn`**, **`EventQuickAdd`**, **`PlayerMiniCard`**, **`PhotoUploader`**, **`Header`**, **`ThemeToggle`**, **`RequireAuth`**, **`RouteFallback`**.

### Kit sport (`components/sport/`, premium — solo props)
- **`SportButton`** — `variant` (`solid`|`navy`|`outline`|`soft`|`ghost`), `size` (`sm`|`md`|`lg`), `startIcon`, `endIcon`, `block`, `to`, ref.
- **`PlayerCard`** — `{ name, position, number, positionGroup?, rating?, stats?: {apps?,goals?,assists?}, accent?, clubLogoUrl?, clubName?, photoUrl?, className? }`. Deriva `positionGroup` de `position` si se omite (`GK/DEF/MID/FWD`).
- **`FormGuide`** — `{ results: (FormResult|null)[], size?: 'sm'|'md', className? }`; `FormResult = 'W'|'D'|'L'`. Muestra puntos V/E/D y huecos vacíos (partidos pendientes).

## Utilidades (`src/utils/`)

`playerStats.ts`, `roleChip.ts`, `roundRobin.ts` (versión frontend del Berger), `shuffle.ts`, `standings.ts` (cálculo de tabla en cliente), `validation.ts` (esquemas zod).

## Tipos (`src/types/`)

`league.ts` (`LeagueType`, `FORMAT_LABEL`, `WEEK_DAY_SHORT`, `TIME_SLOT_LABEL`, `League`, `LeagueCreateInput`), `match.ts`, `team.ts`, `user.ts`, `field.ts`, etc.
