# Kaibil Football — Design System v1.0

> **Visual identity**: híbrido de *neobrutalismo* (Duolingo chunky) + *pop-art*
> latino (Cartel Liga F 2024) + *esports gaming* (EWC). Eye‑catching, no
> minimalista empresarial. Tiene que gritar **"esto es fútbol"**.

---

## 1. Brand & Vision

**Personality**

| Rasgo | Descripción |
|---|---|
| Energía | Alta, competitiva, festiva |
| Audacia | Tipografía gigante, bordes negros gruesos, sin pedir permiso |
| Juego | Mascotas/insignias se sienten como cartas coleccionables |
| Cultura | Raíces latinas + cancha de barrio + esports moderno |
| Anti‑estilo | Nada de "SaaS corporativo", nada de gradientes tibios |

**Voz de marca**: segunda persona, directa, futbolera.
Ejemplos:
- ✅ "¡A la cancha!" · "Crea tu liga" · "¡Goles, no excuses!"
- ❌ "Bienvenido a nuestra plataforma" · "Comience ahora"

---

## 2. Color Tokens

> **Regla de oro**: cada CTA compite con un border negro de **3 px** y una
> drop‑shadow chunky de **4 px** sin blur. Si tu botón no se "ve presionable",
> no está siguiendo el sistema.

### Paleta primaria

```css
/* Pop‑art / Cartel */
--color-vamos:    #FFE600;  /* amarillo "VAMOS" — CTAs primarios */
--color-coral:    #FF3D5A;  /* rojo coral — peligro / hover agresivo */
--color-cyan:     #00D9FF;  /* cyan eléctrico — info, link */
--color-magenta:  #FF2E93;  /* magenta pop — acento festivo */

/* Esports / EWC */
--color-ink:      #0A0A0A;  /* casi negro — borders, texto fuerte */
--color-carbon:   #0E0F1A;  /* fondo esports (dark mode) */
--color-fog:      #1B1E2E;  /* surface dark secundaria */
--color-lime:     #C6FF3D;  /* acento esports — stats, highlights */
```

### Estados semánticos

```css
--color-success:  #19E68A;  /* victoria, ok */
--color-warning:  #FF9500;  /* tarjeta, atención */
--color-danger:   #FF3D5A;  /* expulsión, error (mismo coral) */
--color-info:     #00D9FF;  /* hint, link (mismo cyan) */
```

### Superficies y texto

```css
--color-bg:        #FFF8E7;  /* fondo cálido crema */
--color-surface:   #FFFFFF;  /* cards sobre fondo claro */
--color-surface-dark: #14172A;  /* cards sobre fondo dark */
--color-text:      #0A0A0A;  /* body sobre fondos claros */
--color-text-dark: #FFFFFF;  /* body sobre fondos dark */
--color-text-muted:#5C5C70;  /* captions */
```

### Reglas de uso

| Caso | Token | Notas |
|---|---|---|
| CTA principal | `--color-vamos` + border `--color-ink` | Solo 1 por pantalla |
| CTA secundaria | `--color-cyan` o `--color-magenta` + border ink | Máx 2 por pantalla |
| Error / peligro | `--color-coral` sobre fondo crema | Nunca coral sobre cyan (vibra mal) |
| Stats / goleadores | `--color-lime` sobre `--color-carbon` | Solo en zona dark |
| Fondo default | `--color-bg` | NO blanco puro (hiela la pantalla) |
| Cuerpo de texto | `--color-text` sobre cream, o `--color-text-dark` sobre carbon | Mínimo 16px |

---

## 3. Typography

```css
--font-display: "Bungee", "Russo One", "Impact", sans-serif;
--font-body:    "Inter", -apple-system, BlinkMacSystemFont, sans-serif;
--font-mono:    "JetBrains Mono", "SF Mono", monospace;
```

### Escala (clamp para responsividad)

| Token | Mobile | Desktop | Uso |
|---|---|---|---|
| `--text-xs`    | 0.75rem | 0.8rem  | captions, chips |
| `--text-sm`    | 0.875rem| 0.9rem  | inputs, meta |
| `--text-base`  | 1rem    | 1rem    | body |
| `--text-lg`    | 1.125rem| 1.25rem | body emphasized |
| `--text-xl`    | 1.25rem | 1.5rem  | card titles |
| `--text-2xl`   | 1.5rem  | 2rem    | section titles |
| `--text-3xl`   | 1.875rem| 2.5rem  | page titles |
| `--text-hero`  | 2.5rem  | 4.5rem  | hero / cartel |
| `--text-mega`  | 4rem    | 7rem    | "VAMOS" / numerals |

### Pesos y reglas

- **Display (`Bungee`)** solo para H1, H2, números grandes, botones primarios.
  Bungee es pesado y grita; no abusar — máximo 3 elementos por pantalla.
- **Body (`Inter`)** para todo lo demás. Pesos disponibles: 400 / 500 / 600 / 700.
- **Mono (`JetBrains Mono`)** para IDs, scores (`2‑1`), códigos de partido.

### Google Fonts a cargar

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Bungee&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@500&display=swap" rel="stylesheet">
```

---

## 4. Spacing, Grid & Shape

### Spacing scale

```css
--space-0:  0;
--space-1:  4px;
--space-2:  8px;
--space-3:  12px;
--space-4:  16px;
--space-5:  24px;
--space-6:  32px;
--space-7:  48px;
--space-8:  64px;
--space-9:  96px;
```

### Shapes (key para el trading‑card feel)

```css
--radius-sm: 4px;     /* chips, inputs */
--radius-md: 8px;     /* botones, badges */
--radius-lg: 16px;    /* cards normales */
--radius-xl: 24px;    /* hero cards */
--radius-pill: 9999px;/* chips de rol, tags de liga */
--border-thin:  2px solid var(--color-ink);
--border-bold:  3px solid var(--color-ink);
--border-heavy: 4px solid var(--color-ink);
```

### Sombras chunky (firma del sistema)

```css
--shadow-sm: 3px 3px 0 var(--color-ink);                   /* tags */
--shadow-md: 5px 5px 0 var(--color-ink);                   /* botones */
--shadow-lg: 8px 8px 0 var(--color-ink);                   /* cards */
--shadow-xl: 12px 12px 0 var(--color-coral);              /* hero / drama */
--shadow-press: 1px 1px 0 var(--color-ink);               /* estado :active */
```

> **Regla**: nunca usar sombras con blur (`0 4px 8px rgba(...)`). Si la sombra
> no es rectangular, no es on‑brand.

---

## 5. Motion

```css
--ease-snap:   cubic-bezier(0.5, 1.5, 0.5, 1);   /* overshoot suave */
--ease-pop:    cubic-bezier(0.34, 1.56, 0.64, 1); /* "tactile" */
--ease-out:    cubic-bezier(0.16, 1, 0.3, 1);    /* general */
--duration-fast: 120ms;
--duration-base: 200ms;
--duration-slow: 320ms;
```

### Reglas

- Hover en botón: `transform: translate(-2px, -2px); box-shadow: 7px 7px 0 var(--color-ink);`
- Active: `transform: translate(2px, 2px); box-shadow: var(--shadow-press);`
- Cards al aparecer: `scale(0.96) → 1` con `--ease-pop`, 320ms.
- **Nunca** animar `box-shadow` con `transition` (no es performante).
  En su lugar, define varias sombras (`--shadow-sm`, `--shadow-md`, `--shadow-lg`)
  y transiciona la propiedad completa con `prefers-reduced-motion` siempre
  honrado.

---

## 6. Components

### 6.1 Botón (`btn-*`)

```
.btn-primary    → fondo --color-vamos,    border --color-ink, --shadow-md
.btn-secondary  → fondo --color-cyan,     border --color-ink, --shadow-md
.btn-danger     → fondo --color-coral,    border --color-ink, --shadow-md
.btn-ghost      → fondo transparent,     border --color-ink, sin shadow
.btn-dark       → fondo --color-carbon,   border --color-lime, --shadow-md
```

Todos:
- `font-family: var(--font-display)`
- `text-transform: uppercase`
- `letter-spacing: 0.04em`
- `padding: 0.75rem 1.5rem`
- `border-radius: var(--radius-md)`
- Hover: lift `-2px`, `-2px` + sombra crece a `7px 7px 0`.
- Active: push `+2px`, `+2px` + sombra `1px 1px 0`.

### 6.2 Card coleccionable (`card-pack`)

Pensada para **ligas, jugadores, equipos** — se ve como una carta de Panini:

```css
.card-pack {
  background: var(--color-surface);
  border: var(--border-bold);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  overflow: hidden;
  position: relative;
}
.card-pack::before {
  /* halftone strip superior */
  content: "";
  position: absolute; inset: 0 0 auto 0; height: 32px;
  background-image: radial-gradient(var(--color-ink) 1px, transparent 1.5px);
  background-size: 8px 8px;
  opacity: 0.15;
  pointer-events: none;
}
.card-pack--rare   { background: linear-gradient(135deg, var(--color-vamos), #FFB300); }
.card-pack--legend { background: linear-gradient(135deg, var(--color-magenta), var(--color-coral)); color: var(--color-text-dark); }
.card-pack--dark   { background: var(--color-carbon);       color: var(--color-text-dark); }
```

Variantes:
- `--rare`: amarillo dorado (liga destacada)
- `--legend`: magenta → coral (campeón / final)
- `--dark`: carbon con accent lime (sección de goleadores / stats)

### 6.3 Input

```css
.input {
  background: var(--color-surface);
  border: var(--border-bold);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
  padding: 0.75rem 1rem;
  font-family: var(--font-body);
}
.input:focus {
  outline: none;
  border-color: var(--color-cyan);
  box-shadow: 4px 4px 0 var(--color-cyan);
}
.input--error { border-color: var(--color-coral); box-shadow: 4px 4px 0 var(--color-coral); }
```

### 6.4 Chip / Pill (rol, tag de liga)

```css
.chip {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.25rem 0.75rem;
  border-radius: var(--radius-pill);
  border: 2px solid var(--color-ink);
  font-family: var(--font-display);
  font-size: var(--text-xs);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}
.chip--admin   { background: var(--color-magenta); color: white; }
.chip--ref     { background: var(--color-vamos);   color: var(--color-ink); }
.chip--player  { background: var(--color-cyan);    color: var(--color-ink); }
```

### 6.5 Avatar con border chunky

```css
.avatar {
  width: 56px; height: 56px;
  border-radius: 50%;
  border: var(--border-bold);
  box-shadow: var(--shadow-sm);
  overflow: hidden;
  background: var(--color-fog);
}
.avatar--lg { width: 120px; height: 120px; box-shadow: var(--shadow-md); }
```

---

## 7. Ilustraciones (inline SVG)

Todas vector‑inline, sin assets externos. Estilos base:

### 7.1 Halftone de fondo (`bg-halftone`)

```css
.bg-halftone {
  background-color: var(--color-bg);
  background-image:
    radial-gradient(var(--color-ink) 1.2px, transparent 1.6px);
  background-size: 12px 12px;
  background-position: 0 0;
}
.bg-halftone--yellow { background-color: var(--color-vamos); background-image: radial-gradient(var(--color-ink) 1.2px, transparent 1.6px); }
.bg-halftone--dark   { background-color: var(--color-carbon); background-image: radial-gradient(#FFFFFF26 1.2px, transparent 1.6px); }
```

### 7.2 Diagonal stripes (para hero / banner)

```css
.bg-stripes {
  background: repeating-linear-gradient(
    -45deg,
    var(--color-vamos) 0 20px,
    var(--color-ink) 20px 22px
  );
}
```

### 7.3 Iconografía estándar

- **Balón**: SVG 24×24 con `<circle>` + 5 `<polygon>` negros formando pentágonos.
- **Trofeo**: SVG outline negro, relleno `--color-vamos`.
- **Cancha**: viewBox 0 0 24 16 con líneas blancas sobre `--color-ink`.
- **Silbato**: path simple outline.
- **Bandera de esquina**: rectángulo con triangulo.

Estas se exponen como componentes React en `frontend/src/components/icons/`
o como CSS classes `.icon-ball`, `.icon-trophy`, etc. que montan un SVG inline.

---

## 8. Layout Patterns

### 8.1 Hero (estilo cartel)

```css
.hero {
  display: grid;
  grid-template-columns: 1.2fr 1fr;
  gap: var(--space-6);
  padding: var(--space-7) var(--space-6);
  background: var(--color-bg);
  border-bottom: var(--border-heavy);
  position: relative;
  overflow: hidden;
}
.hero::after {
  /* gran mancha decorativa */
  content: "";
  position: absolute; right: -120px; top: -80px;
  width: 360px; height: 360px;
  background: var(--color-magenta);
  border-radius: 50%;
  opacity: 0.18;
  filter: blur(0);     /* blur 0 — debe ser edge afilada */
}
.hero h1 { font-family: var(--font-display); font-size: var(--text-hero); line-height: 0.95; }
.hero p  { font-size: var(--text-lg); max-width: 32em; }
```

### 8.2 Grid de ligas (cartas coleccionables)

```css
.league-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: var(--space-5);
}
```

### 8.3 Standings table

Para conservar tabla de posiciones sin que parezca spreadsheet:

```css
.standings {
  background: var(--color-surface);
  border: var(--border-bold);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
  overflow: hidden;
}
.standings th {
  background: var(--color-ink);
  color: var(--color-text-dark);
  font-family: var(--font-display);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-size: var(--text-xs);
  padding: var(--space-3) var(--space-4);
}
.standings tr:nth-child(1) td { background: var(--color-vamos); font-weight: 700; }
```

---

## 9. Voice & Microcopy

| ✅ On‑brand | ❌ Off‑brand |
|---|---|
| "A la cancha" | "Bienvenido a la plataforma" |
| "Crea tu liga" | "Comience ahora" |
| "Tu equipo" | "Su equipo" |
| "¡GOL!" (toast) | "Operación exitosa" |
| "Tarjeta roja" (error) | "Error" |
| "Arrancá el torneo" | "Iniciar torneo" |

Tono: directo, festivo, mexicano‑neutro. Nada de solemnidad SaaS.

---

## 10. Anti‑patterns

❌ **No usar** cualquiera de esto:

- **Sombras con blur** (`box-shadow: 0 8px 24px rgba(0,0,0,0.1)`) — rompería el lenguaje visual.
- **Gradientes sutiles** para fondo — usar colores planos.
- **Botones con border‑radius 9999px** para CTAs primarios — eso es para chips.
- **Texto en minúsculas** para headings — el sistema grita, no susurra.
- **Bordes `1px solid` hairlines** — mínimo 2px, ideal 3–4px.
- **Más de 1 Bungee** del mismo peso en la misma viewport — compite y marea.
- **Colores fuera de paleta** — todos los colores vienen de los tokens.
- **Animaciones lentas** (>400ms) — el sistema se siente ágil o se rompe.
- **Fondo blanco puro `#FFFFFF`** en páginas grandes — usar `--color-bg` (crema).

---

## 11. Implementation Map

Dónde está materializado en este repo:

| Archivo | Contenido |
|---|---|
| `frontend/src/styles/tokens.css` | Todos los CSS variables de este doc |
| `frontend/src/styles/illustrations.css` | Halftone, stripes, svg‑bg utilities |
| `frontend/src/styles/base.css` | Reset + tipografía + body defaults |
| `frontend/src/playground/DesignPlayground.tsx` | Vista previa de tokens sin tocar páginas reales |
| `frontend/src/router.tsx` | Ruta `/design` que monta el playground |

> Las páginas existentes (Login, Register, Profile, Dashboard, Header) **aún
> no consumen estos tokens**. La migración se hará en una iteración posterior
> sustituyendo los `var(--color-primary)` actuales por los nuevos.

---

## 12. Changelog

| Versión | Fecha | Cambio |
|---|---|---|
| 1.0 | 2026‑10‑08 | Creación: paleta, tipografía, spacing, componentes, ilustraciones, anti‑patterns. |
