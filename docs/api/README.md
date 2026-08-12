# API Documentation (Swagger / OpenAPI)

The backend exposes a self-generated, machine-readable OpenAPI 3 spec built
from JSDoc blocks right above each route. Two endpoints, one goal: keep docs
in sync with the code, automatically.

| Where                          | What you get                                        |
| ------------------------------ | --------------------------------------------------- |
| `GET /api/v1/docs`             | Interactive **Swagger UI** (try-it-out, auth, etc.) |
| `GET /api/v1/docs.json`        | Raw **OpenAPI 3.0 JSON** (import into Postman etc.) |
| `backend/openapi/openapi.json` | Same spec, exported to disk via `pnpm docs:export`   |

> Spec source files scanned by `swagger-jsdoc`:
>
> - `backend/src/**/*.routes.ts` — each route's `@openapi` block.
> - `backend/docs/openapi.schemas.ts` — reusable components/schemas.
>
> Edit those → reload the server (or re-run `pnpm docs:export`) → docs updated.

---

## 1. Run the server and open Swagger UI

```bash
# from repo root
pnpm db:up        # only first time
pnpm --filter backend run dev
# then open:
#   http://localhost:3000/api/v1/docs        (Swagger UI)
#   http://localhost:3000/api/v1/docs.json   (raw OpenAPI JSON)
```

In Swagger UI:

1. Click **Authorize** (top right), paste the access token from
   `/auth/register` or `/auth/login` as `Bearer <token>`. Swagger remembers
   it (`persistAuthorization: true`).
2. Pick any endpoint → **Try it out** → **Execute**.

> ⚠️ **Cookie-based flows (`/auth/refresh`, `/auth/logout`)** — Swagger UI
> cannot send cookies. Use Postman for those, or call them with `curl` /
> your browser.

---

## 2. Import into Postman (recommended)

You have two options.

### Option A — Live URL (re-runs the import against the running server)

1. Start the backend: `pnpm --filter backend run dev`.
2. Postman → **Import** → **Link** tab.
3. Paste: `http://localhost:3000/api/v1/docs.json` → **Continue** → **Import**.
4. A new collection **"Kaibil Football League Manager API"** appears with one
   folder per tag (Auth, Users, Fields, Leagues). Every request includes
   pre-filled headers, body and a `bearerAuth` auth helper.
5. Edit the collection → **Authorization** → Type **Bearer Token** →
   `{{accessToken}}` → set a collection variable `accessToken` after
   running `POST /auth/login` once (Postman will suggest this automatically
   if you put the response into Tests as
   `pm.collectionVariables.set('accessToken', pm.response.json().data.accessToken)`).

### Option B — Static file (works without the server running)

```bash
pnpm --filter backend run docs:export
# writes: backend/openapi/openapi.json
```

Postman → **Import** → **File** → pick `backend/openapi/openapi.json`.

> Re-run the export whenever you add or change an endpoint, then re-import
> the file (or check the new file into the repo so the whole team shares it).

---

## 3. Document a new endpoint

You only have to drop a JSDoc block right above the route. Re-run the dev
server (or `pnpm docs:export`) and the new operation shows up.

### Pattern (path + method)

```ts
import { Router } from 'express';
import { someController } from './some.controller.js';
import { authenticate, authorize } from '../../shared/middlewares/auth.middleware.js';
import { validateBody } from '../../shared/middlewares/validate.middleware.js';
import { someCreateSchema } from './some.validation.js';

export const someRouter = Router();

/**
 * @openapi
 * /api/v1/some:
 *   get:
 *     tags: [Some]
 *     summary: List all the things
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: includeInactive
 *         schema: { type: boolean, default: false }
 *     responses:
 *       200:
 *         description: Array of things.
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessEnvelope'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items: { $ref: '#/components/schemas/Some' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 */
someRouter.get('/', authenticate, someController.list);

/**
 * @openapi
 * /api/v1/some:
 *   post:
 *     tags: [Some]
 *     summary: Create a thing
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/CreateSomeRequest' }
 *     responses:
 *       201:
 *         description: Created.
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessEnvelope'
 *                 - type: object
 *                   properties:
 *                     data: { $ref: '#/components/schemas/Some' }
 *       400: { $ref: '#/components/responses/ValidationError' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 */
someRouter.post(
  '/',
  authenticate,
  authorize('ADMIN'),
  validateBody(someCreateSchema),
  someController.create,
);
```

### Reusable building blocks

- **Schemas** live in `backend/docs/openapi.schemas.ts` (add a new
  `*Request`, `*Response` or domain model there, then `$ref` it from any
  route).
- **Common responses** (already defined in `src/config/swagger.ts`):
  - `$ref: '#/components/responses/Unauthorized'` (401)
  - `$ref: '#/components/responses/Forbidden'` (403)
  - `$ref: '#/components/responses/NotFound'` (404)
  - `$ref: '#/components/responses/ValidationError'` (400, with `issues[]`)
  - `$ref: '#/components/responses/TooManyRequests'` (429)
  - `$ref: '#/components/responses/InternalError'` (500)
- **Auth declarations**:
  - `security: [{ bearerAuth: [] }]` — requires `Authorization: Bearer …`.
  - `security: [{ refreshTokenCookie: [] }]` — relies on the `kaibil_rt`
    HttpOnly cookie (used by `/auth/refresh`).
  - Omit `security` entirely for fully public endpoints.

### Multi-line descriptions

Use a YAML block scalar (`|`) so the text is rendered as proper Markdown:

```yaml
description: |
  Creates a user and returns tokens.
  Rate-limited more aggressively than other endpoints.
```

### Gotcha: colons inside `description:`

A YAML scalar containing a `:` must be quoted, otherwise the parser thinks
it's a key:

```yaml
# ❌ breaks
description: Send as Authorization: Bearer <token>

# ✅
description: "Send as Authorization: Bearer <token>"
```

---

## 4. Tagging & grouping

The default tag for an operation is the `tags` array you set in the
`@openapi` block. New modules should be added to `tags` in
`backend/src/config/swagger.ts` so they show up in the Swagger UI sidebar
in a consistent order.

---

## 5. Generate client SDKs (optional)

`openapi/openapi.json` is a standard OpenAPI 3.0 document, so you can use
any generator:

```bash
# TypeScript axios client
npx openapi-generator-cli generate \
  -i backend/openapi/openapi.json \
  -g typescript-axios -o sdk/typescript

# orval (React Query hooks)
npx orval --input backend/openapi/openapi.json --output sdk/orval.ts
```

---

## 6. Troubleshooting

| Symptom                                       | Fix                                                                          |
| --------------------------------------------- | ---------------------------------------------------------------------------- |
| New endpoint missing from the spec            | Make sure the JSDoc block starts with `/** @openapi` and the file matches `*.routes.ts`. Restart `pnpm dev`. |
| `YAMLSemanticError: Nested mappings...`       | You have a `:` inside an unquoted `description:` value. Wrap it in `"…"`.   |
| `YAMLSemanticError: All mapping values must be a string` | Most likely a missing `description: \|` (block scalar) before a multi-line text. |
| 401 in Swagger UI even after pasting the token | Click **Authorize** at the top of the page, not the per-endpoint lock icon. |
| Cookie endpoints don't work in Swagger UI     | Use Postman. Swagger UI cannot set cookies.                                  |
| `pnpm docs:export` is empty                   | Re-run `pnpm --filter backend run dev` once so Prisma client is generated, then re-run the export. |
