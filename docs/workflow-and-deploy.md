# Flujo de trabajo y despliegue

## Ramas

```
main ──► dev ──► uat ──► prod
  │       │
  │       └─ feat/<descripcion>   (feature por funcionalidad)
  │
  └─ solo recibe merge desde prod (tags)
```

| Rama   | Para qué | Se despliega a |
|--------|----------|----------------|
| `main` | Código estable y etiquetado | producción |
| `dev`  | Integración diaria | dev |
| `uat`  | Pre-producción, candidato a release | UAT |
| `prod` | Release en producción | producción |

### Reglas

- **`feat/*` cuelga siempre de `dev`**, nunca de `main`.
- Todo cambio entra por **Pull Request** a `dev`.
- `dev → uat`: cuando el ciclo de la funcionalidad está probado.
- `uat → prod`: solo después de validar en UAT.
- `main` y `prod` se mueven únicamente por merge (nunca push directo).

### Ejemplo

```bash
git checkout dev
git pull
git checkout -b feat/login-con-refresh

# ... trabajo ...
git add -A
git commit -m "feat(auth): refresh silencioso al cargar la app"
git push -u origin feat/login-con-refresh

# abrir PR: feat/login-con-refresh -> dev
```

---

## Variables de entorno por ambiente

Los `.env` **nunca se versionan** (ver `.gitignore`). Solo se versionan los
`.env.example`, que son plantillas documentadas.

El código es **idéntico** en todos los ambientes; lo único que cambia son los
valores, que CI/CD inyecta desde **GitHub Secrets**.

| Variable | dev | uat | prod |
|---|---|---|---|
| `NODE_ENV` | development | production | production |
| `DATABASE_URL` | localhost | URL de UAT | URL de producción |
| `JWT_ACCESS_SECRET` | local | secreto UAT | secreto prod |
| `JWT_REFRESH_SECRET` | local | secreto UAT | secreto prod |
| `CORS_ORIGIN` | `http://localhost:5173` | dominio UAT | dominio prod |
| `COOKIE_SECURE` | false | **true** | **true** |
| `COOKIE_DOMAIN` | localhost | dominio UAT | dominio prod |
| `PUBLIC_BASE_URL` | `http://localhost:3000` | dominio UAT | dominio prod |

### Frontend

`VITE_API_BASE_URL` queda **relativo** (`/api/v1`) por defecto: el mismo bundle
funciona en cualquier host. Solo cámbialo a URL absoluta si el API vive en otro
dominio (y agrega ese origen al `CORS_ORIGIN` del backend).

Los builds por ambiente:

```bash
pnpm --filter frontend run build       # producción (sin sourcemaps)
pnpm --filter frontend run build:uat   # UAT (con sourcemaps, útil para depurar)
```

---

## CI/CD

`.github/workflows/ci.yml` corre en cada push y PR (en `main`, `dev`, `uat`,
`prod` y `feat/**`):

1. `pnpm lint`
2. `pnpm -r typecheck`
3. `pnpm -r build`
4. Tests unitarios del backend
5. Verifica que `openapi.json` esté sincronizado con el código
6. Compila el build de UAT (valida el modo `uat`)
7. Sube `frontend/dist` como artefacto

Si algo falla, el PR no se puede mergear.

---

## Dónde desplegar

### Frontend — GitHub Pages ✅

React compilado es estático, así que **GitHub Pages lo sirve sin costo**.

Configura en **Settings → Pages → Source: GitHub Actions** (necesita un
workflow propio que publique `frontend/dist`).

> Para que funcione, el frontend usa rutas relativas al dominio; hay que
> configurar el `base` de Vite si el proyecto se publica en un subdirectorio
> (`/FootballManager/`).

### Backend — GitHub Pages ❌

**GitHub Pages no puede servir el backend.** Solo distribuye archivos
estáticos; no ejecuta Node ni acepta tráfico a `/api`. Necesitas un host que
corra procesos:

| Servicio | Plan | Notas |
|---|---|---|
| **Railway** | desde $5/mes | Postgres integrado, deploy desde GitHub, migraciones Prisma |
| **Render** | desde $7/mes | Web service + Postgres gestionado |
| **Fly.io** | desde $5/mes | Más control, requires Dockerfile |

El backend ya tiene todo lo necesario: `pnpm build` genera `dist/`, y
`pnpm db:migrate:deploy` aplica las migraciones en cada deploy.

**Importante:** el seed **nunca** corre en UAT ni producción. Solo `dev`.

### Fotos de usuario

Hoy las imágenes se guardan en disco (`UPLOAD_DIR`). En un host con sistema de
archivos efímero (Heroku-like, algunas opciones serverless) **se pierden al
redesplegar**. Soluciones:

1. Montar un volumen persistente (lo más simple si el host lo permite), o
2. Cambiar a almacenamiento de objetos (S3 / Cloudflare R2).

Está aislado en `backend/src/modules/users/photo.service.ts` para que el cambio
sea acotado.