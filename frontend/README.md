# Kaibil Football — Frontend

> **Design language**: híbrido de *neobrutalismo* (Duolingo chunky) +
> *pop-art latino* (Cartel Liga F 2024) + *esports gaming* (EWC).
> Eye‑catching, no minimalista empresarial.

Esta guía es para sesiones/agentes que vayan a **crear componentes visuales
nuevos**. Léela antes de tocar JSX o CSS.

---

## 0. TL;DR para empezar rápido

```bash
pnpm install
pnpm --filter frontend run dev     # http://localhost:5173
```

Antes de añadir código:

1. Lee la sección **[§ 5 Diseño](#5-dise%C3%B1o)** de este README.
2. Abre <http://localhost:5173/design> en el navegador — es el playground
   visual con todos los tokens y componentes renderizados. Úsalo como
   referencia visual.
3. Los tokens viven en `src/styles/tokens.css`. No inventes colores.
4. Si vas a añadir un componente, sigue el patrón de los existentes
   (`btn`, `card-pack`, `input`, `chip`, `hero`). Mira `Header.tsx`,
   `LoginPage.tsx`, `DashboardPage.tsx`.

Para documentación extendida (changelog, anti‑patterns detallados,
voces de marca): `../docs/design-system.md`.

---

## 1. Stack

| Capa | Tech |
|---|---|
| Build | Vite 5 |
| UI | React 18 + TypeScript 5 |
| Routing | React Router 6 |
| State | Zustand |
| Forms | React Hook Form + Zod |
| HTTP | Axios |
| Fuentes | Google Fonts (Bungee, Inter, JetBrains Mono) precargadas en `index.html` |

Sin Tailwind. Sin MUI. Sin librería de UI externa. Todo CSS propio del
sistema de diseño.

---

## 2. Estructura

```
frontend/
├── index.html                  # añade Google Fonts
├── src/
│   ├── main.tsx                # importa los CSS del sistema
│   ├── App.tsx                 # bootstrap sesión (silent refresh)
│   ├── router.tsx              # define rutas. Shell envuelve auth pages en .kaibil-app
│   ├── api/axios.ts            # Axios con interceptor de refresh
│   ├── store/auth.store.ts     # Zustand: { user, accessToken }
│   ├── types/user.ts           # tipos compartidos (User, UserRole…)
│   ├── utils/
│   │   ├── validation.ts       # Zod schemas de cada form
│   │   └── roleChip.ts         # mapea UserRole → clase chip
│   ├── components/
│   │   ├── Header.tsx          # shell header (brand, nav, role chip, logout)
│   │   ├── RequireAuth.tsx     # guard de rutas privadas
│   │   ├── Modal.tsx           # modal reusable (portal dentro de .kaibil-app)
│   │   ├── ConfirmDialog.tsx   # confirm con busy state
│   │   ├── FieldForm.tsx       # form create/edit cancha
│   │   ├── LeagueForm.tsx      # form create/edit liga
│   │   ├── PhotoUploader.tsx   # (legacy) sube fotos → backend
│   │   ├── ui/                 # ⭐ design-system React wrappers
│   │   │   ├── Button.tsx
│   │   │   ├── TextField.tsx
│   │   │   ├── TextArea.tsx
│   │   │   ├── Select.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Chip.tsx
│   │   │   ├── Banner.tsx
│   │   │   ├── FieldError.tsx
│   │   │   ├── PageHeader.tsx
│   │   │   ├── EmptyState.tsx
│   │   │   └── index.ts
│   │   └── icons/index.tsx     # set de iconos SVG inline
│   ├── pages/
│   │   ├── LoginPage.tsx       # usa system → auth-screen + card-pack--rare
│   │   ├── RegisterPage.tsx    # idem
│   │   ├── DashboardPage.tsx   # hero + grid-cards
│   │   └── ProfilePage.tsx     # profile-cover + form-grid-2
│   ├── playground/
│   │   └── DesignPlayground.tsx  # ruta /design — vista previa de tokens
│   └── styles/
│       ├── tokens.css          # ⭐ TODOS los CSS variables del sistema
│       ├── base.css            # componentes (.btn, .card-pack, .input…)
│       ├── illustrations.css   # fondos halftone, stripes, sticker, scanlines
│       └── global.css          # solo legacy (app-boot, photo-uploader)
└── vite.config.ts
```

---

## 3. Rutas

| Path | Página | Acceso |
|---|---|---|
| `/` | redirect a `/dashboard` | — |
| `/login` | Login | público (redirige a `/dashboard` si hay sesión) |
| `/register` | Registro | público |
| `/dashboard` | Dashboard del usuario | auth requerida |
| `/profile` | Mi perfil (editable) | auth requerida |
| `/leagues` | Listado de ligas (crear/editar/eliminar solo ADMIN) | auth requerida |
| `/fields` | Listado de canchas (crear/editar/eliminar solo ADMIN) | auth requerida |
| `/design` | Playground visual | público (referencia de diseño) |

> **Role-gating**: el backend ya protege con `authorize('ADMIN')` los
> POST/PATCH/DELETE de `/leagues` y `/fields` (ver `docs/api.md` §9). En
> el frontend usamos el hook `useIsAdmin()` para **ocultar** los botones
> de Crear/Editar/Eliminar a usuarios no-admin. El backend sigue siendo
> la barrera de seguridad real: aunque alguien manipule el DOM, la API
> rechazará la mutación con `403 AUTH_FORBIDDEN`.

---

## 4. Convenciones de código

- **Un componente = un archivo** exportando `function NombreComponente`.
- **TypeScript estricto**. Sin `any` salvo en el catch de Axios.
- **Componentes UI reutilizables**: para botones, inputs, cards, chips y
  banners usa los componentes de `src/components/ui/` (`Button`, `TextField`,
  `TextArea`, `Select`, `Card`, `Chip`, `Banner`, `FieldError`,
  `PageHeader`, `EmptyState`). **No escribas `className="btn …"` o
  `className="card-pack …"` en pantallas o forms** — el `DesignPlayground`
  es la única excepción porque es el showcase de los tokens crudos.
- **Formularios**: `useForm` + `zodResolver(schema)` desde
  `src/utils/validation.ts`. Los inputs van con `<TextField>` /
  `<TextArea>` / `<Select>` que ya manejan label + error + className.
- **Sesión**: lee `useAuthStore` para `user`/`accessToken`. Mutaciones con
  `setAuth(user, token)` o `setUser(user)`.
- **Peticiones**: `apiClient` (Axios) con interceptor que adjunta el access
  token y refresca si expira. Nunca uses `fetch` a pelo.
- **Iconos**: importa de `'../components/icons'`. `currentColor` permite
  pintarlos del color del texto.
- **Sin emojis decorativos** en UI principal salvo que sean contenido
  semántico (p.ej. un 🏆 en una final). El brand visual es el `BallIcon`.

---

## 5. Diseño

### 5.0 Componentes UI (wrappers de los tokens)

> Los tokens viven en `src/styles/tokens.css` + `base.css`. **No los
> uses directamente en pantallas** — pasa por los wrappers de
> `src/components/ui/`. Estos preservan el 100% del look & feel y
> centralizan props (variant, size, error, …) para no repetir
> `className="btn btn--cyan btn--sm"` por todos lados.

| Componente | Reemplaza | Notas |
|---|---|---|
| `<Button variant="primary" size="md" to="/x">` | `<button className="btn">` / `<a className="btn">` / `<Link className="btn">` | Variants: `primary` · `cyan` · `coral` · `magenta` · `lime` · `ghost` · `dark`. Pasa `to` para que renderice como `<Link>`. |
| `<TextField id="email" label="Email" error={…} {...register('email')}>` | `<label><span class="input-label"/>…</label>` | Compatible con RHF: spread `register()` directo. |
| `<TextArea id="desc" label="…" rows={3}>` | idem textarea | |
| `<Select id="role" label="…">…</Select>` | idem select | |
| `<Card variant="rare" as="article">` | `<div className="card-pack card-pack--rare">` | Variants: `default` · `rare` · `legend` · `dark` · `cream`. Flag `scanlines` para overlay decorativo. |
| `<Chip tone="admin">ADMIN</Chip>` | `<span className="chip chip--admin">` | Tones: `default` · `admin` · `ref` · `td` · `asst` · `player`. |
| `<Banner tone="error">…</Banner>` | `<div className="form-banner form-banner--error">` | Tones: `error` · `success` (+ `info` / `warning` cuando se necesiten). |
| `<FieldError message={…} />` | `<span className="field-error">` | Retorna `null` si no hay mensaje. |
| `<PageHeader title="…" description="…" actions={…} />` | header de página con `row-3 row-between` | Estandariza el header de listados. |
| `<EmptyState title="…" description="…" actions={…} />` | `<div className="empty-state">…</div>` | El placeholder dashed-border. |

Ejemplo de un listado con todo:

```tsx
<PageHeader
  title="Ligas"
  description="Crea, edita o elimina ligas y sus canchas asociadas."
  actions={isAdmin && <Button onClick={openCreate}>+ Crear liga</Button>}
/>

{leagues?.length === 0 && (
  <EmptyState
    title="Sin ligas todavía"
    description="Crea la primera liga y selecciónale al menos una cancha."
    actions={isAdmin && <Button onClick={openCreate}>+ Crear liga</Button>}
  />
)}

<div className="grid-cards">
  {leagues?.map((lg) => (
    <Card key={lg.id} as="article" variant={lg.isActive ? 'rare' : 'default'}>
      <h3>{lg.name}</h3>
      {isAdmin && (
        <div className="collection-card__actions">
          <Button size="sm" variant="cyan" onClick={…}>Editar</Button>
          <Button size="sm" variant="coral" onClick={…}>Eliminar</Button>
        </div>
      )}
    </Card>
  ))}
</div>
```

> **Excepción intencional**: `src/playground/DesignPlayground.tsx` usa
> classNames crudos. Es el showcase visual de los tokens y debe
> demostrar el 100% de las variantes CSS tal cual.

### 5.1 Principios rectores

1. **Neobrutalismo siempre visible**: bordes negros de **3 px**, sombras
   rectangulares sin blur (`5px 5px 0 var(--color-ink)`), tipografía
   `Bungee` para títulos, `Inter` para el resto.
2. **Pop-art como acento, no como base**: usa `--color-vamos`
   (amarillo) y `--color-coral` (rojo) para elementos que necesiten gritar
   (CTAs, errores, tarjetas raras).
3. **Dark mode = solo para tarjetas de stats**: `--color-carbon` con
   `--color-lime` es para secciones de goleadores / rankings, no para
   páginas completas.
4. **Halftone para atmósfera, no para legibilidad**: úsalo como fondo de
   pantallas de auth o de hero, nunca detrás de texto largo.
5. **`display: uppercase` en títulos, nunca en inputs**: Bungee entero
   en mayúsculas porque su línea visual lo pide; Inter en las labels de
   inputs se queda en case del usuario.

### 5.2 Dónde ver cada cosa

| Quiero ver… | Ruta |
|---|---|
| Todos los tokens renderizados (paleta, tipografía, sombras) | `/design` → §Colors, §Typography, §Shadows |
| Botones en todos los colores y tamaños | `/design` → §Buttons |
| Inputs con estados focus/error/disabled | `/design` → §Inputs |
| Chips de rol renderizados | `/design` → §Chips |
| Cards en sus 4 variantes (default/rare/legend/dark) | `/design` → §Cards |
| Fondos decorativos (halftone, stripes, scanlines) | `/design` → §Backgrounds |
| Iconos disponibles | `/design` → §Icons |
| Patrón de layout "hero" | `/design` → §Layout |

---

### 5.3 Tokens — referencia rápida

> ⚠️ No escribas colores a mano. Usa siempre `var(--color-*)`.

#### Color

```css
/* Brand */
--color-vamos:    #FFE600;   /* CTA principal */
--color-coral:    #FF3D5A;   /* peligro / hype */
--color-cyan:     #00D9FF;   /* info / link */
--color-magenta:  #FF2E93;   /* acento festivo */

/* Esports / dark */
--color-ink:      #0A0A0A;   /* bordes, texto fuerte */
--color-carbon:   #0E0F1A;   /* fondo dark */
--color-fog:      #1B1E2E;   /* surface dark */
--color-lime:     #C6FF3D;   /* acento esports (stats) */

/* Estados */
--color-success:  #19E68A;
--color-warning:  #FF9500;

/* Superficies */
--color-bg:           #FFF8E7;  /* fondo default — crema */
--color-surface:      #FFFFFF;
--color-surface-dark: #14172A;
--color-text:         #0A0A0A;
--color-text-dark:    #FFFFFF;
--color-text-muted:   #5C5C70;
```

#### Tipografía

```css
--font-display: "Bungee", "Russo One", "Impact", sans-serif;
--font-body:    "Inter", -apple-system, "Segoe UI", Roboto, sans-serif;
--font-mono:    "JetBrains Mono", "SF Mono", Menlo, monospace;

--text-xs    0.75rem
--text-sm    0.875rem
--text-base  1rem
--text-lg    1.125rem
--text-xl    1.25rem
--text-2xl   1.5rem
--text-3xl   1.875rem
--text-hero  3rem
--text-mega  5rem        /* “VAMOS” / numerales gigantes */
```

#### Spacing

```css
--space-1   4px
--space-2   8px
--space-3   12px
--space-4   16px
--space-5   24px
--space-6   32px
--space-7   48px
--space-8   64px
--space-9   96px
```

#### Shapes y sombras

```css
--radius-sm   4px     /* chips, inputs */
--radius-md   8px     /* botones, badges */
--radius-lg   16px    /* cards */
--radius-xl   24px    /* hero cards */
--radius-pill 9999px  /* chips de rol */

/* SIEMPRE rectangular, sin blur */
--shadow-sm  3px 3px 0  var(--color-ink)
--shadow-md  5px 5px 0  var(--color-ink)
--shadow-lg  8px 8px 0  var(--color-ink)
--shadow-xl  12px 12px 0 var(--color-coral)
--shadow-press 1px 1px 0 var(--color-ink)  /* estado :active */
```

#### Motion

```css
--ease-pop:    cubic-bezier(0.34, 1.56, 0.64, 1);   /* tactile */
--ease-out:    cubic-bezier(0.16, 1, 0.3, 1);
--duration-fast: 120ms;
--duration-base: 200ms;
--duration-slow: 320ms;
```

`prefers-reduced-motion` ya está honrado en `tokens.css`.

---

### 5.4 Componentes — uso

> Todos viven bajo `.kaibil-app` (el `Shell` del router ya lo aplica
> para páginas autenticadas; las públicas envuelven en `.kaibil-app`
> explícitamente, ver `LoginPage.tsx`).

#### Botón

```tsx
<button className="btn">Crear liga</button>
<a className="btn btn--cyan" href="/leagues">Ver ligas</a>
<button className="btn btn--sm btn--ghost" disabled>Cancelar</button>

/* Variantes disponibles:
   btn            → fondo vamos (amarillo), border + shadow negros
   btn--cyan      → cyan
   btn--coral     → coral (color del texto blanco para contraste)
   btn--magenta   → magenta (texto blanco)
   btn--lime      → lime
   btn--ghost     → transparente, hover invierte
   btn--dark      → fondo carbon, border lime
   btn--sm        → padding chico
   btn--lg        → padding grande
*/
```

Si necesitas combinar con un icono:

```tsx
<button className="btn btn--lg">
  <BallIcon />
  Crear liga
</button>
```

#### Input / Form

```tsx
<label htmlFor="email">
  <span className="input-label">Email</span>
  <input
    id="email"
    type="email"
    className={`input ${errors.email ? 'input--error' : ''}`}
    {...register('email')}
  />
  {errors.email && <span className="field-error">{errors.email.message}</span>}
</label>
```

Layouts de form:

```tsx
<form className="form">
  <div className="form-grid-2">
    <label>…</label>
    <label>…</label>
  </div>
  <div className="form-grid-2">
    <label>…</label>
    <label>…</label>
  </div>
</form>
```

Banners:

```tsx
{serverError && <div className="form-banner form-banner--error">{serverError}</div>}
{success     && <div className="form-banner form-banner--success">{success}</div>}
```

#### Card coleccionable

```tsx
<div className="card-pack"> …default cream border… </div>
<div className="card-pack card-pack--rare"> …yellow gradient… </div>
<div className="card-pack card-pack--legend"> …magenta → coral, texto blanco… </div>
<div className="card-pack card-pack--dark scanlines"> …stats dark con acento lime… </div>
```

Con esquina de número (estilo holograma de carta):

```tsx
<div className="card-pack">
  <span className="corner-badge">82</span>
  …
</div>
```

#### Chip de rol

```tsx
import { roleChipClass, roleLabel } from '../utils/roleChip';

<span className={`chip ${roleChipClass(user.role)}`}>
  {roleLabel(user.role)}
</span>
```

Roles y colores:

| Rol | Clase | Color |
|---|---|---|
| `ADMIN` | `chip--admin` | magenta |
| `REFEREE` | `chip--ref` | vamos (amarillo) |
| `TECHNICAL_DIRECTOR` | `chip--td` | lime |
| `ASSISTANT` | `chip--asst` | cyan |
| `PLAYER` | `chip--player` | coral |

#### Avatar

```tsx
<img src={user.profilePhotoUrl} className="avatar avatar--lg" />
{/* sin foto, fallback con iniciales */}
<span className="avatar avatar--lg">{initials}</span>

/* Sizes: avatar (56px) · avatar--sm (32px) · avatar--lg (120px) */
```

#### Hero (patrón de sección de entrada)

```tsx
<section className="hero">
  <div style={{ position: 'relative', zIndex: 1 }}>
    <span className="sticker">Bienvenido</span>
    <h1 className="hero__title">¡A la cancha!</h1>
    <p className="hero__sub">Subtítulo descriptivo en Inter.</p>
    <div className="row-3 row-wrap">
      <button className="btn">Acción 1</button>
      <button className="btn btn--cyan">Acción 2</button>
    </div>
  </div>
  <div className="hero__art">
    <div className="hero__blob">{/* ilu */}</div>
  </div>
</section>
```

#### Sticker (etiqueta angulada decorativa)

```tsx
<span className="sticker">⚽ Login</span>
<span className="sticker" style={{ background: 'var(--color-coral)' }}>
  Apuntate
</span>
```

#### Iconos

```tsx
import { BallIcon, TrophyIcon, WhistleIcon, FieldIcon, ShieldIcon, StarIcon, ChevronRightIcon } from '../components/icons';

<BallIcon style={{ fontSize: 48, color: 'var(--color-cyan)' }} />
```

Iconos actuales: `BallIcon`, `TrophyIcon`, `WhistleIcon`, `FieldIcon`,
`ShieldIcon`, `StarIcon`, `ChevronRightIcon`, `WhistleHero`, y la
ilustración completa `PlayerKickIllustration` (SVG grande para hero).

Para añadir más: edita `src/components/icons/index.tsx`. Mantén
`fill="currentColor"` y/o `stroke="currentColor"` para que el consumidor
controle el color con CSS normal.

#### Backgrounds decorativos

```tsx
<div className="bg-halftone"> … </div>              {/* dots ink sobre crema */}
<div className="bg-halftone--yellow"> … </div>      {/* dots ink sobre amarillo */}
<div className="bg-halftone--coral"> … </div>
<div className="bg-halftone--dark scanlines"> … </div>
<div className="bg-stripes"> … </div>               {/* rayas diagonales warning */}
<div className="bg-stripes--magenta"> … </div>
```

Para superpunto decorativo sobre un elemento ya existente:

```tsx
<div className="card-pack" style={{ position: 'relative' }}>
  <div className="halftone-overlay" />   {/* esquina superior con dots */}
  …contenido…
</div>
```

---

### 5.5 Patrones de página

| Patrón | Clases clave | Ejemplo en repo |
|---|---|---|
| **Auth pública** (login/register) | `.kaibil-app` → `.auth-screen` (con `.bg-halftone` adentro) → `.card-pack card-pack--rare` | `LoginPage.tsx` |
| **Dashboard / home** autenticado | `Shell` (Header + Outlet) → `<section className="hero">` → `container section-stack` → `grid-cards` | `DashboardPage.tsx` |
| **Perfil / detalle** | `container container--narrow section-stack` → `profile-cover` + `profile-avatar-wrap` + `profile-meta` → `card-pack` con form | `ProfilePage.tsx` |
| **Lista / colección** | `container` → `grid-cards` con muchas `card-pack` | — (pendiente, ej. `/leagues`) |

---

### 5.6 Anti‑patterns (NO hacer)

| ❌ Mal | ✅ Bien |
|---|---|
| `box-shadow: 0 8px 24px rgba(0,0,0,0.1)` | `box-shadow: var(--shadow-lg)` (rectangular, sin blur) |
| `border: 1px solid #ccc` | `border: var(--border-bold)` (3 px ink) |
| `background: linear-gradient(...)` para fondo de página | color plano (`--color-bg`) |
| `color: #1e40af` (azul random) | `color: var(--color-cyan)` o `var(--color-ink)` |
| `<h1 className="text-2xl font-bold">` estilo Tailwind | `<h1>` — la cascada del sistema ya le da Bungee uppercase |
| Botón con `border-radius: 9999px` | `border-radius: var(--radius-md)` (los `9999px` son solo para `.chip`) |
| `<input>` con estilos en línea heredados de `global.css` | `<input className="input" />` |
| `transform: scale(1.05)` para hover | `transform: translate(-2px, -2px)` + `box-shadow` más grande |
| Múltiples Bungees compitiendo en la misma pantalla | máximo 3 elementos `Bungee` por viewport |
| Más de una sombra con `!important` | usa la cascada del sistema; si necesitas un nuevo nivel, propón un nuevo `--shadow-*` |
| Emoji como icono de UI (⚽, 🏆) | `<BallIcon />` o `<TrophyIcon />` — emojis solo en contenido |

---

### 5.7 Cómo añadir un componente nuevo

Flujo recomendado:

1. **Decide la categoría**: ¿es botón, card, input, layout, decoración?
   Revisa si ya existe algo parecido (no dupliques).
2. **Define o reutiliza tokens**. Si necesitas un nuevo color de acento o
   un nuevo nivel de sombra, *primero* añádelo a `tokens.css` con un
   nombre semántico. Después úsalo desde el componente.
3. **Escribe el CSS en `base.css`** bajo `.kaibil-app .tu-componente`.
   Usa las variables. Sin valores hardcoded.
4. **Implementa el JSX** en `src/components/`. Sin estilos inline salvo
   para lo que es genuinamente puntual (p.ej. `style={{ marginTop:
   'var(--space-4)' }}` cuando necesites un offset específico).
5. **Pruébalo en `/design`**. Si el playground ya tiene una sección
   relacionada, actualízala para incluir tu componente. Si no, añade una.
6. **Conéctalo a una página real** y al store / API que toque.
7. Si inventas un nuevo patrón visual significativo, anota un ejemplo en
   `../docs/design-system.md`.

---

### 5.8 Cómo añadir un ícono nuevo

1. Diseña el path en SVG plano (24×24 idealmente, sin fills propios,
   solo `currentColor`).
2. Añade el componente a `src/components/icons/index.tsx` siguiendo la
   forma de los existentes.
3. Exporta con naming `XxxIcon`.
4. Añádelo a la sección §Icons del playground (`DesignPlayground.tsx`).

---

## 6. Tests y validación

```bash
pnpm --filter frontend run typecheck   # tsc --noEmit
pnpm --filter frontend run build       # tsc + vite build
```

No hay tests todavía (placeholder en `package.json`). Para añadir:

- React Testing Library + Vitest para componentes puros.
- Playwright para flujos completos (login → dashboard → profile).

---

## 7. Cómo previsualizar cambios de diseño rápido

1. Levanta el dev server (`pnpm --filter frontend run dev`).
2. Edita tokens en `src/styles/tokens.css`.
3. Refresca `/design` para ver todos los componentes actualizados al
   instante (Vite HMR).
4. Cuando estés conforme, captura los cambios diff en `git diff
   frontend/src/styles/` y comitea con mensaje del tipo
   `design: tighten card shadow to 6px on rare cards`.

---

## 8. Referencias

- Documentación extendida del sistema: `../docs/design-system.md`
- Repositorio de diseño de referencia clonado: `~/Projects/open-design/`
  (116 templates, +150 design systems oficiales —
  `plugins/_official/design-systems/<nombre>/DESIGN.md`)
- Inspiraciones aplicadas:
  - `duolingo` (botones chunky, owl green como amarillo VAMOS)
  - `neobrutalism` (bordes negros + sombras rectangulares)
  - `vibrant` (paleta audaz)
  - `retro` / `doodle` (punto pop-art halftone)
  - `dithered` (patrones de medio tono)
