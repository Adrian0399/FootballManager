# API Standards

> Convenciones del backend HTTP de Kaibil Football. Aplica a **todo
> endpoint nuevo** que se cree. El code review debe bloquear PRs que
> violen el envelope o los códigos de error documentados.

---

## 1. Stack

| Capa | Tech |
|---|---|
| Runtime | Node 20+ / 24 LTS |
| Framework | Express 5 |
| Lenguaje | TypeScript estricto |
| ORM | Prisma 5.22 (cliente generado desde `backend/prisma/schema.prisma`) |
| Validación | Zod |
| Auth | JWT propio (access token en memoria + refresh token en cookie httpOnly) |
| Password hash | bcrypt 10 rounds (dev) / 12 (prod) |
| Image processing | sharp |
| File upload | multer |

---

## 2. Base URL y versionado

- **Base**: `/api/v1`
- La versión va en el **path**, no en un header. Esto permite
  versionado paralelo (v1 y v2 vivos al mismo tiempo durante migración).
- Cuando se rompa compatibilidad, se publica `/api/v2` y se mantiene v1
  hasta que todos los clientes migren.

---

## 3. Envelope de respuesta (OBLIGATORIO)

**Todos** los endpoints devuelven este envelope. Sin excepciones.

### Éxito

```json
{
  "success": true,
  "statusCode": 200,
  "data": { … }
}
```

- `data` puede ser un objeto, un array, `null` o un valor escalar.
- `statusCode` espeja el HTTP status de la response (200, 201, 204).

### Error

```json
{
  "success": false,
  "statusCode": 400,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request payload",
    "issues": [
      { "path": "email", "message": "Invalid email" }
    ]
  }
}
```

- `issues[]` solo aparece en `VALIDATION_ERROR` (errores de Zod).
- `code` es estable y machine-readable. No traducir, no cambiar mayúsculas.
- `message` es human-readable. Se puede localizar en el futuro.

### Helpers de implementación

Backend (`backend/src/shared/utils/response.util.ts`):

```ts
import { ok, created, fail } from '../shared/utils/response.util.js';

ok(res, data);                  // 200
ok(res, data, 200);             // explícito
created(res, data);             // 201

fail(res, 404, 'NOT_FOUND', 'Resource missing');
fail(res, 400, 'VALIDATION_ERROR', 'Bad payload', issuesArray);
```

---

## 4. Auth

### Flujo

1. **Login / Register**: el backend devuelve el `user` + `accessToken`
   en el body y setea la cookie `kaibil_rt` con el refresh token.
2. **El frontend** guarda el `accessToken` **en memoria** (Zustand) y
   nunca en `localStorage`. El refresh token **no** es accesible desde JS
   (cookie `httpOnly`).
3. **Cada request** lleva `Authorization: Bearer <accessToken>`.
4. **Si la response es 401** y no es `/auth/refresh` ni `/auth/login`,
   el frontend hace un silent refresh. Si el refresh también falla, el
   usuario va a `/login`.

### Endpoints de auth

| Método | Path | Body | Respuesta |
|---|---|---|---|
| `POST` | `/auth/register` | `{...user fields, password}` | 201 `{user, accessToken}` + cookie |
| `POST` | `/auth/login` | `{email, password}` | 200 `{user, accessToken}` + cookie |
| `POST` | `/auth/refresh` | (cookie) | 200 `{user, accessToken}` + cookie rotada |
| `POST` | `/auth/logout` | (cookie) | 200 `{loggedOut: true}`, cookie limpiada |
| `GET` | `/auth/me` | — | 200 `{...user}` |

### Cookies

- **Nombre**: `kaibil_rt`
- **httpOnly**: `true`
- **sameSite**: `lax`
- **secure**: `true` en prod, `false` en dev
- **path**: `/api/v1/auth` (solo se envía a rutas de auth)
- **maxAge**: 7 días (match con `JWT_REFRESH_EXPIRES_IN`)

### Access token

- **TTL**: 15 min (`JWT_ACCESS_EXPIRES_IN`)
- **Algoritmo**: HS256
- **Payload**: `{ sub: userId, email, role }`
- **Secret**: `JWT_ACCESS_SECRET` (≥ 32 chars)

### Refresh rotation

- Cada `/auth/refresh` revoca el refresh token usado y emite uno nuevo.
- **Replay protection**: si un refresh token revocado se vuelve a usar,
  el servidor marca como revocados **todos** los refresh tokens del
  usuario. Esto detecta tokens robados.

---

## 5. Convenciones de URL

- **Recursos en plural**: `/leagues`, `/fields`, `/users`.
- **Sub-recursos**: `/users/me/profile-photo`, `/leagues/:id/teams`.
- **Acciones singulares**: `/auth/login`, `/auth/refresh` (no `/auth/logins`).
- **IDs en path**: UUID v4.
- **Query params**:
  - `?includeInactive=true` → incluye soft-deleted en listados.
  - `?page=1&size=25` → paginación (cuando se implemente).
  - Sin prefijos raros (`?q=...` solo si es búsqueda libre).

### Forma del path

```
GET    /api/v1/<resource>          → lista paginada (próximamente)
GET    /api/v1/<resource>/:id      → uno
POST   /api/v1/<resource>          → crea
PATCH  /api/v1/<resource>/:id      → actualiza parcial
DELETE /api/v1/<resource>/:id      → soft delete
GET    /api/v1/<resource>/:id/<sub>→ sub-recurso
```

---

## 6. Validación

- **Zod** para todo input (body, query, params).
- Schemas en `*.validation.ts` al lado del módulo.
- Tipos TypeScript derivados: `export type FooDto = z.infer<typeof fooSchema>`.
- Errores de validación → `400 VALIDATION_ERROR` con `issues[]` por campo.

### Patrón mínimo

```ts
// auth.validation.ts
export const loginSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(1),
});
export type LoginDto = z.infer<typeof loginSchema>;

// auth.routes.ts
router.post('/login',
  loginRateLimiter,                          // rate limit
  validateBody(loginSchema),                  // validación
  authController.login,                       // handler
);
```

---

## 7. Códigos de error estables

Estos códigos son contrato público. Cambiarlos rompe clientes.

| Código | HTTP | Cuándo se emite |
|---|---|---|
| `VALIDATION_ERROR` | 400 | Zod falló (incluye `issues[]`) |
| `AUTH_MISSING` | 401 | Falta el header `Authorization` |
| `AUTH_INVALID` | 401 | Access token expirado o inválido |
| `AUTH_REQUIRED` | 401 | Endpoint requiere sesión y `req.user` no está |
| `NO_REFRESH` | 401 | Cookie de refresh ausente |
| `REFRESH_EXPIRED` | 401 | Refresh token expirado |
| `REFRESH_REUSE` | 401 | Reuso de refresh token ya rotado (seguridad) |
| `INVALID_CREDENTIALS` | 401 | Email o password incorrectos |
| `USER_INACTIVE` | 401 | Usuario existe pero `is_active = false` o soft-deleted |
| `AUTH_FORBIDDEN` | 403 | Usuario autenticado pero sin el rol requerido |
| `NOT_FOUND` | 404 | Recurso o ruta no existe |
| `USER_NOT_FOUND` | 404 | `users.id` no existe |
| `FIELD_NOT_FOUND` | 404 | `fields.id` no existe (también para `fieldIds[]` inválidos en creación de liga) |
| `LEAGUE_NOT_FOUND` | 404 | `leagues.id` no existe |
| `EMAIL_TAKEN` | 409 | `users.email` ya registrado |
| `CURP_TAKEN` | 409 | `users.curp` ya registrado |
| `FIELD_NAME_TAKEN` | 409 | `fields.name` ya existe (case-insensitive) |
| `BAD_FIELD` | 400 | multer: field name del form inesperado |
| `NO_FILE` | 400 | multer: no llegó archivo bajo el field esperado |
| `FILE_TOO_LARGE` | 413 | multer: archivo > `MAX_UPLOAD_SIZE_MB` |
| `INVALID_IMAGE_TYPE` | 400 | mimetype no es jpeg/png/webp |
| `IMAGE_PROCESS_FAILED` | 500 | sharp falló al procesar |
| `RATE_LIMITED` | 429 | express-rate-limit disparó |
| `INTERNAL_ERROR` | 500 | cualquier otro error no manejado |

> Al añadir un nuevo recurso, **primero** se añade su código de error
> aquí, luego se usa en el controller. No se inventan códigos sobre la
> marcha.

---

## 8. Uploads

- **Content-Type**: `multipart/form-data`.
- **Field name**: `file` (siempre, en todos los endpoints de upload).
- **MIME permitidos**: `image/jpeg`, `image/png`, `image/webp`.
- **Tamaño máximo**: `MAX_UPLOAD_SIZE_MB` (default `10`).
- **Procesamiento** con `sharp`:
  - Profile photo: 512×512, `webp` calidad 85, crop cuadrado centrado.
  - Cover photo: 1500×500, `webp` calidad 85, fit cover centrado.
- **Storage**: filesystem local en `backend/uploads/<tabla>/<id>/<kind>.webp`.
  Servido estáticamente en `/uploads/...` con `crossOriginResourcePolicy: cross-origin`.
- **URLs en respuesta**: absolutas (`http://localhost:3000/uploads/...`)
  vía `PUBLIC_BASE_URL`. En prod, detrás de un CDN.

### Endpoint

```
POST   /users/me/profile-photo     # multer + sharp + DB
DELETE /users/me/profile-photo     # borra archivo + null en DB
POST   /users/me/cover-photo
DELETE /users/me/cover-photo
```

La respuesta es el `user` actualizado con la nueva URL.

---

## 9. Roles y autorización

| Rol | Puede listar / ver | Puede crear / editar / borrar |
|---|---|---|
| `ADMIN` | sí | sí |
| `REFEREE` | sí | no |
| `TECHNICAL_DIRECTOR` | sí | no |
| `ASSISTANT` | sí | no |
| `PLAYER` | sí | no |

Por ahora, **solo ADMIN muta**. Esto puede cambiar cuando se añadan
permisos por recurso (ej. un DT crea equipos de su liga).

### Middleware de autorización

```ts
import { authenticate, authorize } from '../shared/middlewares/auth.middleware.js';

router.get('/',         authenticate,                 controller.list);   // cualquier user
router.post('/',        authenticate, authorize('ADMIN'), controller.create); // solo admin
```

---

## 10. Soft delete

- Toda entidad de negocio tiene `deletedAt: DateTime?`.
- `findAll` filtra `where: { deletedAt: null }` por defecto.
- `?includeInactive=true` los incluye.
- `softDelete(id)` setea `deletedAt = new Date()` + `updatedBy = req.user.id`.
- **Nunca** se hace `DELETE FROM` físico desde el código de app.

---

## 11. Auditoría en respuestas

Las respuestas de salida siempre incluyen los 4 campos de auditoría:

```json
{
  "id": "…",
  "name": "…",
  "createdAt": "2026-01-15T10:00:00Z",
  "createdById": "uuid-or-null",
  "updatedAt": "2026-01-15T10:00:00Z",
  "updatedById": "uuid-or-null"
}
```

`deletedAt` se **omite** del JSON público (es housekeeping interno).

---

## 12. Paginación (a implementar)

Cuando una lista crezca más allá de ~50 items:

```
GET /api/v1/matches?page=1&size=25
```

```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "items": [ … ],
    "page": 1,
    "size": 25,
    "total": 137,
    "totalPages": 6
  }
}
```

Orden estable: `orderBy: [{ createdAt: 'desc' }, { id: 'asc' }]` para que
paginación no salte ni duplique items.

> **No implementado todavía** en Matches/Teams. Por ahora se devuelve
> la lista completa.

---

## 13. Patrones de controller

```ts
// src/modules/<resource>/<resource>.controller.ts
import type { Request, Response, NextFunction } from 'express';
import { service } from './<resource>.service.js';
import { ApiError } from '../../shared/errors/api-error.js';
import { ok, created } from '../../shared/utils/response.util.js';

export const controller = {
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw ApiError.unauthorized('Authentication required', 'AUTH_REQUIRED');
      const result = await service.create(req.body, req.user.id);
      created(res, result);
    } catch (err) {
      next(err);
    }
  },

  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const includeInactive = req.query.includeInactive === 'true';
      const items = await service.findAll(includeInactive);
      ok(res, items);
    } catch (err) {
      next(err);
    }
  },

  // …update, remove, etc.
};
```

**Reglas**:

- Siempre `try/catch` + `next(err)`. Nunca `throw` directo al `res`.
- `req.user` puede ser `undefined` aunque haya pasado por `authenticate`
  (TypeScript no propaga el narrowing). Por eso el guard explícito.
- Usa `ok()` / `created()` / `fail()`. Nunca `res.status(...).json(...)`
  directo en controllers.

---

## 14. Patrones de service

```ts
// src/modules/<resource>/<resource>.service.ts
export const service = {
  async create(dto: CreateDto, creatorId: string): Promise<PublicType> {
    // 1. Validar FKs existen (ej. fieldIds en una liga)
    // 2. Crear todo dentro de prisma.$transaction
    // 3. Devolver findById(result.id) para incluir relaciones
  },

  async findById(id: string): Promise<PublicType> {
    const x = await prisma.x.findUnique({ where: { id }, include: { … } });
    if (!x || x.deletedAt) throw ApiError.notFound('X not found', 'X_NOT_FOUND');
    return toPublic(x);
  },

  async softDelete(id: string, updaterId: string): Promise<void> {
    const current = await prisma.x.findUnique({ where: { id } });
    if (!current || current.deletedAt) throw ApiError.notFound('X not found', 'X_NOT_FOUND');
    await prisma.x.update({
      where: { id },
      data: { deletedAt: new Date(), updatedById: updaterId },
    });
  },
};
```

**Reglas:**

- Validar FKs antes de insertar (ej. `fieldIds` en `leagues.create`).
- Para crear con múltiples FKs o múltiples tablas, usar `prisma.$transaction`.
- `toPublicX()` quita `passwordHash`, `deletedAt` y cualquier campo
  sensible antes de devolver al controller.
- Toda mutación recibe `creatorId` / `updaterId` desde `req.user.id`.

---

## 15. Manejo de errores

`errorHandler` global convierte:

| Origen | → Envelope |
|---|---|
| `throw new ApiError(409, 'EMAIL_TAKEN', '…')` | `409 { success:false, statusCode:409, error:{code:'EMAIL_TAKEN',message:'…'} }` |
| `zod` falla en `validateBody(schema)` | `400 { error:{code:'VALIDATION_ERROR', message:…, issues:[…] } }` |
| `multer.LIMIT_FILE_SIZE` | `413 FILE_TOO_LARGE` |
| `multer.LIMIT_UNEXPECTED_FILE` | `400 BAD_FIELD` |
| `multer.MulterError` (otros) | `400 UPLOAD_ERROR` |
| `express-rate-limit` | `429 RATE_LIMITED` |
| Cualquier otro | `500 INTERNAL_ERROR` (mensaje genérico en prod) |

El stack trace se loguea siempre (`console.error('Unhandled error:', err)`)
pero **nunca** se devuelve al cliente (excepto en dev con
`env.NODE_ENV !== 'production'`).

---

## 16. Anti-patterns

| ❌ No | ✅ Sí |
|---|---|
| `res.status(200).json({ data: … })` directo | `ok(res, data)` |
| `res.json({ error: 'Something went wrong' })` | `fail(res, 500, 'INTERNAL_ERROR', '…')` |
| `throw new Error('Not found')` en service | `throw ApiError.notFound('X not found', 'X_NOT_FOUND')` |
| Validar con `if (!req.body.email)` en el handler | Zod schema en `*.validation.ts` |
| Devolver `passwordHash` en una response | `toPublicUser()` lo quita siempre |
| `prisma.user.delete({ where: { id } })` para "borrar" | `prisma.user.update({ …, data:{ deletedAt: new Date() } })` |
| Hardcodear `http://localhost:3000` en el código | `env.PUBLIC_BASE_URL` |
| `console.log(req.body)` para debug | `console.log({ userId: req.user?.id, route: req.path })` |
| Setear `Authorization` desde el front con `localStorage` | in-memory (Zustand) + refresh cookie |

---

## 17. Checklist de revisión para un endpoint nuevo

- [ ] Path correcto (`/api/v1/<resource>` o sub-recurso).
- [ ] Validación con Zod schema y `validateBody()` (o `validateQuery()` /
      `validateParams()`).
- [ ] `authenticate` middleware si requiere sesión.
- [ ] `authorize(...)` si requiere rol específico.
- [ ] `try/catch` + `next(err)` en el handler.
- [ ] Service con validación de FKs y `$transaction` si toca.
- [ ] Respuesta usa `ok()` / `created()` (no `res.json` directo).
- [ ] Errores con `ApiError.*` (no `throw new Error`).
- [ ] Si es soft delete, `findAll` filtra por `deletedAt: null` y acepta
      `?includeInactive=true`.
- [ ] Si toca auditoría, todos los writes pasan `creatorId`/`updaterId`.
- [ ] Si el endpoint es nuevo en el catálogo de errores, **primero**
      añadir el código en §7.

---

## 18. Referencias

- [`docs/database.md`](./database.md) — convenciones de PostgreSQL.
- [`docs/er-diagram.md`](./er-diagram.md) — modelo de datos actual.
- `backend/src/shared/utils/response.util.ts` — implementación del envelope.
- `backend/src/shared/middlewares/error.middleware.ts` — mapeo de errores.
- `backend/src/shared/middlewares/auth.middleware.ts` — JWT + roles.
- `backend/src/modules/` — ejemplos reales por recurso.