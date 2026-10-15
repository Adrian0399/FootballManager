# 05 — Flujos y seguridad (auth + invitaciones)

## Tokens

- **Access token**: JWT firmado con `JWT_ACCESS_SECRET`, expira `JWT_ACCESS_EXPIRES_IN` (15m). Payload: `{ sub: userId, email, role }`.
- **Refresh token**: valor aleatorio (no JWT). Se guarda **solo su hash** en la tabla `refresh_tokens` (con `expiresAt`). Se envía en cookie httpOnly. Expira `JWT_REFRESH_EXPIRES_IN` (7d).
- Las contraseñas se hashean con `bcrypt` (`BCRYPT_SALT_ROUNDS`).

## Registro — `register(dto, creatorId?)`

1. Conflictos: `EMAIL_TAKEN` (email ya existe) / `CURP_TAKEN` (curp ya existe).
2. Si `dto.inviteToken` presente → `invitesService.resolve(token)` devuelve `{ teamId, role }`.
   - `role` final = si hay invitación → `userRoleFromTeamRole(invite.role)`, si no → `creatorId ? dto.role : 'PLAYER'`.
   - `userRoleFromTeamRole`: `DT→TECHNICAL_DIRECTOR`, `ASSISTANT→ASSISTANT`, `PLAYER→PLAYER`.
3. Crear usuario con `age = calculateAge(birthDate)`.
4. Si hay invitación: en una transacción crear `teamMembership` y actualizar `teamInvite` (`usedAt`, `usedById`).
5. Emitir tokens (`issueTokens`).

> Registro público: solo permite roles `PLAYER`/`ASSISTANT`. Un admin puede crear usuarios con cualquier rol (pasa `creatorId` y `role`).

## Login — `login(email, password)`

- Si usuario no existe / está inactivo / borrado / contraseña incorrecta → 401 `INVALID_CREDENTIALS`.
- Emite tokens.

## Refresh (rotación) — `refresh(refreshToken)`

1. Hashear el refresh token y buscarlo en `refresh_tokens`.
2. Si el token ya fue **revocado** → revocar **todos** los tokens del usuario + 401 `REFRESH_REUSE` (detección de reuso).
3. Si expiró → `REFRESH_EXPIRED`.
4. Si usuario inactivo → `USER_INACTIVE`.
5. Rotación: crear un nuevo refresh token y revocar el anterior (`replacedBy`).

## Logout — `logout(refreshToken)`

Revocar el refresh token actual.

## `issueTokens(user)`

1. Generar refresh token aleatorio → guardar su hash en `refresh_tokens`.
2. Devolver `{ user: toPublicUserWithAge(user), accessToken, refreshToken }`.

## Invitaciones a equipo

- `POST /teams/:teamId/invites` (ADMIN): crea un `TeamInvite` con `token` único (VarChar 64), `role` (`PLAYER`/`DT`/`ASSISTANT`), `expiresAt` (7 días).
- `GET /invites/:token` (público): resuelve el token → devuelve `{ teamId, role }` para mostrar el equipo y bloquear el rol en el formulario de registro.
- Al registrarse con el token: crea la membresía y consume el token (`usedAt`, `usedById`).
- Errores: `INVITE_NOT_FOUND`, `INVITE_USED`, `INVITE_EXPIRED`, `INVALID_INVITE_ROLE`.

## Middlewares (orden y responsabilidad)

1. `authenticate`: extrae y verifica el access token; si falta/expira/inválido → `AUTH_MISSING` / `AUTH_INVALID`.
2. `authorize('ADMIN')`: verifica `role === 'ADMIN'`, si no → `AUTH_FORBIDDEN` (403).
3. `validateBody(schema)`: valida con zod → 400 con `issues` si falla.
4. `auditLogger`: al finalizar mutaciones (POST/PUT/PATCH/DELETE), escribe un `AuditLog` (método, ruta, acción, statusCode, ip, userAgent, actor).
5. `errorHandler`: serializa `ApiError` al envelope de error.

## Frontend — silent refresh (`api/axios.ts`)

- `baseURL = import.meta.env.VITE_API_BASE_URL ?? '/api/v1'`; `withCredentials: true`; sin `Content-Type` por defecto (para que `FormData` funcione con multer).
- **Interceptor de request:** inyecta `Authorization: Bearer <accessToken>` desde el store de Zustand.
- **Interceptor de response (401):** hace refresh silencioso **single-flight**:
  - Mantiene `isRefreshing` y una cola de peticiones fallidas.
  - `POST /auth/refresh` → actualiza token → reintenta las peticiones en cola.
  - Si el refresh falla → `clear()` y redirect a `/login`.
  - Omite reintentar `/auth/refresh` y `/auth/login`.
