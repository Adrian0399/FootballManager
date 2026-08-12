# Database Standards

> Convenciones de PostgreSQL para el monorepo Kaibil Football.
> Aplica a **toda tabla nueva** que se cree en el schema. El linter del
> code review debe bloquear PRs que violen estas reglas.

---

## 1. Stack

| Capa | Tech |
|---|---|
| Engine | PostgreSQL 16 (Docker) |
| ORM / migrador | Prisma |
| Extensión requerida | `pgcrypto` (para `gen_random_uuid()`) |
| Cliente de aplicación | `@prisma/client` v5.22 |

---

## 2. Modelo multi-tenant

**Una instancia de BD por dueño.** No hay orquestador multi-tenant compartido.

- **NO** existe columna `owner_id` en las tablas.
- La BD entera pertenece al dueño. El aislamiento es a nivel de
  despliegue (cada dueño tiene su propio stack: app + BD + uploads).
- El `JWT` que se emite al login **no** codifica un ownerId porque
  no hace falta: la sesión es válida solo dentro de la instancia.

Si en el futuro se necesita un orquestador multi-tenant, este
documento se actualiza y se añade `owner_id` con migración.

---

## 3. Naming

| Elemento | Convención | Ejemplo |
|---|---|---|
| Tabla | plural `snake_case` | `users`, `leagues`, `league_fields` |
| Columna | `snake_case` | `first_name`, `birth_date`, `created_at` |
| Primary key | `id` (UUID v4) | `id UUID NOT NULL DEFAULT gen_random_uuid()` |
| Foreign key | `<recurso_singular>_id` | `user_id`, `league_id`, `field_id` |
| Self-FK (auditoría) | `<recurso>_id` apuntando a la misma tabla | `created_by UUID REFERENCES users(id)` |
| Join table M:N | `recurso1_recurso2` alfabético | `league_fields` (no `field_leagues`) |
| Enum PG | `<tabla>_<campo>_enum` | `users_role_enum` |
| Índice | `idx_<tabla>_<columna(s)>` | `idx_users_email` |
| Unique constraint | `uq_<tabla>_<columna(s)>` | `uq_users_email` |
| Check constraint | `ck_<tabla>_<regla>` | `ck_leagues_dates_order` |

> ⚠️ Las FKs en columnas de auditoría rompen esta regla. Se llaman
> `created_by` y `updated_by` (sin sufijo `_id`) por convención del repo
> y para mantener diffs limpios con el estándar de la industria.

---

## 4. Columnas de auditoría (OBLIGATORIO en TODA tabla)

```sql
created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
created_by  UUID         NULL REFERENCES <tabla>(id),
updated_at  TIMESTAMP NOT NULL,                       -- Prisma @updatedAt
updated_by  UUID         NULL REFERENCES <tabla>(id)
```

**Reglas:**

- `created_at` y `updated_at` son `NOT NULL` siempre. `NOW()` por default.
- `created_by` y `updated_by` son **NULLABLE** porque jobs de sistema,
  seeds o scripts de mantenimiento no tienen usuario.
- `onDelete: SetNull` en estas FKs para no perder auditoría si el usuario
  origen se borra.
- La capa de aplicación es responsable de mantener `updated_by` en cada
  write. Prisma `@updatedAt` se encarga solo de `updated_at`.

**Equivalencia Prisma:**

```prisma
model X {
  createdAt   DateTime  @default(now()) @map("created_at")
  createdById String?   @map("created_by")  @db.Uuid
  createdBy   User?     @relation("XCreatedBy", fields: [createdById], references: [id], onDelete: SetNull)
  updatedAt   DateTime  @updatedAt          @map("updated_at")
  updatedById String?   @map("updated_by")  @db.Uuid
  updatedBy   User?     @relation("XUpdatedBy", fields: [updatedById], references: [id], onDelete: SetNull)
  …
}
```

> **Excepción única**: las tablas de join M:N (`league_fields`,
> futuras) pueden saltarse `updated_by` / `updated_at` *si* la fila se
> considera inmutable una vez creada. Hoy **sí** los tienen, para
> mantener el contrato uniforme.

---

## 5. Soft delete (RECOMENDADO en entidades de negocio)

```sql
deleted_at  TIMESTAMP NULL
```

**Reglas:**

- Una fila con `deleted_at IS NOT NULL` está lógicamente borrada.
- `findAll` filtra por `deleted_at IS NULL` por defecto.
- Query param `?includeInactive=true` los incluye.
- **NUNCA** `DELETE FROM` físico desde la app. Siempre
  `UPDATE … SET deleted_at = NOW()`.
- Los índices deben incluir `deleted_at` para que las queries de listado
  sean rápidas:
  ```prisma
  @@index([deletedAt])
  ```

**Equivalencia Prisma:**

```prisma
deletedAt DateTime? @map("deleted_at")
```

---

## 6. Tipos preferidos

| Concepto | Tipo PG | Notas |
|---|---|---|
| IDs (PK y FK) | `UUID` | Generados con `gen_random_uuid()` |
| Strings cortos (nombres, roles) | `VARCHAR(100)` | No usar `TEXT` para campos acotados |
| Emails | `VARCHAR(255)` | `UNIQUE NOT NULL` |
| Teléfonos | `VARCHAR(20)` | Validación de formato en app (E.164) |
| CURP | `VARCHAR(18)` | `UNIQUE NOT NULL`, validación regex en app |
| Paths de archivo | `VARCHAR(500)` | Caben URLs largas de S3/Cloudinary |
| Descripciones largas | `VARCHAR(1000)` | Más allá, usar un campo `body TEXT` separado |
| Fechas de calendario | `DATE` | Sin hora: `birth_date`, `start_date`, `end_date` |
| Timestamps | `TIMESTAMP` | **No** usar `TIMESTAMPTZ` por ahora; UTC enforced en app |
| Booleanos | `BOOLEAN NOT NULL DEFAULT true/false` | Nunca nullable salvo en legacy imports |
| Enums | `PG ENUM` nativo | Siempre via Prisma `enum` |

---

## 7. Constraints

- **Email**: `UNIQUE NOT NULL`. Validación de formato en app (Zod).
- **CURP**: `UNIQUE NOT NULL`. Validación regex en app.
- **FKs requeridas**: `NOT NULL` (la relación no puede faltar).
- **FKs opcionales** (ej. `created_by`): `NULL`, FK opcional.
- **Toda FK**: debe tener su índice en la tabla hija. Prisma lo agrega
  automáticamente si usás `references`, pero verifica en migraciones.
- **Strings opcionales**: `VARCHAR(n) NULL` (no string vacío `""`).
- **No** usar `CHECK` constraints para validar formatos (eso va en app).

---

## 8. Índices

- **Toda FK**: lleva índice (Prisma lo hace con `@@index([fkCol])`).
- **Todo campo usado en `WHERE` frecuente**: lleva índice. Ejemplo: `role`
  en `users` (filtramos por role en listados).
- **Todo campo usado en `ORDER BY`**: índice compuesto en el mismo orden
  que la query.
- **No** crees índices redundantes. Un índice `(a, b)` cubre queries que
  filtran solo por `a`, pero no al revés.

---

## 9. Migraciones

- **Nombre**: snake_case descriptivo, en inglés. `add_<tabla>_<descriptor>`
  o `add_<columna>_to_<tabla>`. Ejemplos:
  - `init`
  - `add_user_photos`
  - `add_fields_and_leagues`
- **Nunca** edites una migración ya aplicada. Si algo está mal, crea una
  nueva que arregle el problema.
- En CI / producción: `prisma migrate deploy`. En dev: `prisma migrate dev`.
- Las migraciones son committeadas al repo (carpeta `backend/prisma/migrations/`).
- Cada migración debe ser **reversible manualmente** si puede (no usamos
  `migrate reset` en prod).

---

## 10. Estructura física

```
backend/prisma/
├── schema.prisma              # fuente de verdad
├── seed.ts                    # ejecutable con `pnpm db:seed`
├── migrations/
│   ├── migration_lock.toml    # auto-generado, no tocar
│   └── <timestamp>_<name>/
│       └── migration.sql      # SQL auto-generado por Prisma
```

**El seed debe ser determinista** (mismos datos en cada `pnpm db:seed`).
Ver `backend/prisma/seed.ts` para el patrón de usuarios fijos.

---

## 11. Anti-patterns

| ❌ No | ✅ Sí |
|---|---|
| `owner_id UUID` en cada tabla | single-tenant; no hace falta |
| `DELETE FROM users WHERE id = $1` | `UPDATE users SET deleted_at = NOW() WHERE id = $1` |
| `created_at` default `null` | `created_at TIMESTAMP NOT NULL DEFAULT NOW()` |
| `IFNULL(created_at, '...')` en queries | nunca nullable, no hace falta |
| `VARCHAR(255)` para nombres | `VARCHAR(100)` con `n` conservador |
| `created_by` y `updated_by` como `VARCHAR(36)` (UUID en string) | `UUID` nativo |
| `JSONB` libre para todo | JSONB solo cuando el shape es genuinamente dinámico y no se va a buscar por campos internos |
| `VARCHAR(50)` con un valor hardcoded de status | PG `ENUM` |
| `created_at_utc`, `created_at_local` | un solo `created_at` siempre en UTC |
| Tabla `audit_log` con INSERT manual en cada write | la auditoría obligatoria por tabla es suficiente; el log unificado es nice-to-have, no MVP |

---

## 12. Checklist de revisión para una tabla nueva

Antes de mergear una tabla nueva, verifica:

- [ ] Nombre plural en `snake_case`.
- [ ] PK `id UUID` con `DEFAULT gen_random_uuid()`.
- [ ] Las 4 columnas de auditoría presentes con sus índices.
- [ ] Si es entidad de negocio: `deleted_at` + índice.
- [ ] FKs explícitas con `references` + `onDelete` correcto (`Cascade` para
      joins, `SetNull` para auditoría, `Restrict` para relaciones fuertes).
- [ ] Strings con `VARCHAR(n)` y `n` justificado.
- [ ] Booleans `NOT NULL DEFAULT …`.
- [ ] Fechas de calendario en `DATE`, timestamps en `TIMESTAMP`.
- [ ] Enums via Prisma `enum`, no `VARCHAR` con check.
- [ ] Índices en toda FK y en todo campo de `WHERE` frecuente.
- [ ] `@@map("snake_case_plural")` en Prisma para que el nombre de la
      tabla y de las columnas en SQL coincida con esta guía.

---

## 13. Migración desde legacy

Si te encuentras con código que no sigue esta guía (ej. una columna
`created_on` en vez de `created_at`, o un `owner_id` huérfano):

1. Crear una migración ad-hoc que renombre o migre.
2. Actualizar el código de aplicación.
3. **No** dejar la inconsistencia "temporal". Las reglas de este doc
   aplican desde el día 1, sin excepciones grandfathered.

---

## 14. Referencias

- Documento hermano: [`docs/api.md`](./api.md) — cómo se consume esta BD
  desde el backend.
- Diagrama ER actual: [`docs/er-diagram.md`](./er-diagram.md).
- Schema fuente: `backend/prisma/schema.prisma`.
- Prisma docs: <https://www.prisma.io/docs/orm/prisma-schema>