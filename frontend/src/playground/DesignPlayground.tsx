// Design Playground — previsualiza todos los tokens del sistema sin tocar
// ninguna página real. Accesible en /design.

import { useState } from 'react';
import {
  BallIcon,
  TrophyIcon,
  WhistleIcon,
  FieldIcon,
  ShieldIcon,
  StarIcon,
  ChevronRightIcon,
  PlayerKickIllustration,
} from '../components/icons';

const sections: { id: string; label: string }[] = [
  { id: 'colors', label: 'Colors' },
  { id: 'typography', label: 'Typography' },
  { id: 'shadows', label: 'Shadows' },
  { id: 'buttons', label: 'Buttons' },
  { id: 'inputs', label: 'Inputs' },
  { id: 'chips', label: 'Chips' },
  { id: 'cards', label: 'Cards' },
  { id: 'bgs', label: 'Backgrounds' },
  { id: 'icons', label: 'Icons' },
  { id: 'layout', label: 'Layout' },
];

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="stack-4" style={{ paddingBlock: 'var(--space-7)' }}>
      <header className="stack-2">
        <span className="sticker">§ {id}</span>
        <h2>{title}</h2>
      </header>
      <div>{children}</div>
    </section>
  );
}

function Swatch({ name, varName, onHex }: { name: string; varName: string; onHex: string }) {
  return (
    <div className="stack-2" style={{ minWidth: 140 }}>
      <div
        style={{
          height: 96,
          background: `var(${varName})`,
          border: 'var(--border-bold)',
          borderRadius: 'var(--radius-md)',
          boxShadow: 'var(--shadow-sm)',
        }}
        aria-label={`${name} swatch`}
      />
      <div>
        <div style={{ fontFamily: 'var(--font-display)', textTransform: 'uppercase', fontSize: 'var(--text-sm)' }}>
          {name}
        </div>
        <code className="mono" style={{ fontSize: 'var(--text-xs)' }}>
          {onHex}
        </code>
      </div>
    </div>
  );
}

export function DesignPlayground() {
  const [input, setInput] = useState('');
  const [hasError, setHasError] = useState(false);

  return (
    <div className="kaibil-app" style={{ minHeight: '100vh' }}>
      {/* ---------- HERO ---------- */}
      <div className="hero">
        <div style={{ position: 'relative', zIndex: 1 }}>
          <span className="sticker">v1.0 · Design System</span>
          <h1 className="hero__title" style={{ marginTop: 'var(--space-4)' }}>
            Kaibil <span style={{ color: 'var(--color-coral)' }}>Football</span>
          </h1>
          <p className="hero__sub">
            Neobrutalismo + pop-art + esports. <strong>Pop‑art</strong>, no
            minimalista. Hecho para gritar en la cancha.
          </p>
          <div className="row-3" style={{ flexWrap: 'wrap' }}>
            <a href="#colors" className="btn btn--lg">
              <BallIcon /> Ver tokens
            </a>
            <a href="#cards" className="btn btn--lg btn--cyan">
              <TrophyIcon /> Cards coleccionables
            </a>
          </div>
        </div>
        <div className="hero__art">
          <div className="hero__blob">
            <div style={{ width: 320, height: 320 }}>
              <PlayerKickIllustration />
            </div>
          </div>
        </div>
      </div>

      {/* ---------- TOC ---------- */}
      <nav
        className="container"
        style={{
          paddingBlock: 'var(--space-5)',
          borderBottom: 'var(--border-thin)',
          position: 'sticky',
          top: 'var(--header-height)',
          background: 'var(--color-bg)',
          zIndex: 10,
        }}
      >
        <div className="row-3" style={{ flexWrap: 'wrap' }}>
          {sections.map((s) => (
            <a key={s.id} href={`#${s.id}`} className="chip">
              {s.label}
            </a>
          ))}
        </div>
      </nav>

      <div className="container">
        {/* ---------- COLORS ---------- */}
        <Section id="colors" title="Color tokens">
          <h3>Brand</h3>
          <div className="row-4" style={{ flexWrap: 'wrap' }}>
            <Swatch name="vamos"   varName="--color-vamos"   onHex="#FFE600" />
            <Swatch name="coral"   varName="--color-coral"   onHex="#FF3D5A" />
            <Swatch name="cyan"    varName="--color-cyan"    onHex="#00D9FF" />
            <Swatch name="magenta" varName="--color-magenta" onHex="#FF2E93" />
          </div>
          <h3 style={{ marginTop: 'var(--space-5)' }}>Esports / dark</h3>
          <div className="row-4" style={{ flexWrap: 'wrap' }}>
            <Swatch name="ink"    varName="--color-ink"    onHex="#0A0A0A" />
            <Swatch name="carbon" varName="--color-carbon" onHex="#0E0F1A" />
            <Swatch name="fog"    varName="--color-fog"    onHex="#1B1E2E" />
            <Swatch name="lime"   varName="--color-lime"   onHex="#C6FF3D" />
          </div>
          <h3 style={{ marginTop: 'var(--space-5)' }}>Semantic</h3>
          <div className="row-4" style={{ flexWrap: 'wrap' }}>
            <Swatch name="success" varName="--color-success" onHex="#19E68A" />
            <Swatch name="warning" varName="--color-warning" onHex="#FF9500" />
            <Swatch name="danger"  varName="--color-danger"  onHex="#FF3D5A" />
            <Swatch name="info"    varName="--color-info"    onHex="#00D9FF" />
          </div>
        </Section>

        {/* ---------- TYPOGRAPHY ---------- */}
        <Section id="typography" title="Typography">
          <div className="stack-3">
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-mega)', lineHeight: 0.95 }}>
              ¡VAMOS!
            </div>
            <h1>Display H1 · Bungee</h1>
            <h2>Display H2 · Bungee</h2>
            <h3>Display H3 · Bungee</h3>
            <p className="muted" style={{ fontSize: 'var(--text-lg)' }}>
              Body text en Inter — el mensaje del partido, las instrucciones
              para crear la liga, los términos legales.
            </p>
            <p>
              <strong>Inline strong</strong> y <em>em</em> — texto normal con{' '}
              <code className="mono">código inline</code>.
            </p>
            <p>
              Score: <span className="mono" style={{ fontSize: 'var(--text-2xl)', color: 'var(--color-coral)' }}>
                3&nbsp;–&nbsp;2
              </span>
            </p>
          </div>
        </Section>

        {/* ---------- SHADOWS ---------- */}
        <Section id="shadows" title="Shadows (chunky, no blur)">
          <div className="row-4" style={{ flexWrap: 'wrap' }}>
            {(['sm', 'md', 'lg', 'xl'] as const).map((key) => (
              <div
                key={key}
                className="stack-2"
                style={{
                  background: 'var(--color-vamos)',
                  border: 'var(--border-bold)',
                  borderRadius: 'var(--radius-md)',
                  padding: 'var(--space-5)',
                  boxShadow: `var(--shadow-${key})`,
                  minWidth: 160,
                }}
              >
                <span className="mono">--shadow-{key}</span>
                <span style={{ fontFamily: 'var(--font-display)' }}>CHUNKY</span>
              </div>
            ))}
          </div>
        </Section>

        {/* ---------- BUTTONS ---------- */}
        <Section id="buttons" title="Buttons">
          <div className="row-3" style={{ flexWrap: 'wrap' }}>
            <button className="btn">Crear liga</button>
            <button className="btn btn--cyan">Ver standings</button>
            <button className="btn btn--coral">Eliminar</button>
            <button className="btn btn--magenta">Cobrar</button>
            <button className="btn btn--lime">Confirmar gol</button>
            <button className="btn btn--ghost">Cancelar</button>
            <button className="btn btn--dark">Dark mode</button>
          </div>
          <div className="row-3" style={{ flexWrap: 'wrap', marginTop: 'var(--space-4)' }}>
            <button className="btn btn--sm">SM</button>
            <button className="btn">MD</button>
            <button className="btn btn--lg">LG</button>
            <button className="btn" disabled>Disabled</button>
          </div>
        </Section>

        {/* ---------- INPUTS ---------- */}
        <Section id="inputs" title="Inputs">
          <div className="stack-3" style={{ maxWidth: 480 }}>
            <label>
              <span className="input-label">Nombre de la liga</span>
              <input
                className={`input ${hasError ? 'input--error' : ''}`}
                placeholder="Liga Apertura 2026"
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  setHasError(e.target.value.length > 0 && e.target.value.length < 3);
                }}
              />
            </label>
            <label>
              <span className="input-label">Sede</span>
              <select className="input" defaultValue="">
                <option value="" disabled>Selecciona cancha…</option>
                <option>Cancha Norte</option>
                <option>Cancha Sur</option>
                <option>Cancha Central</option>
              </select>
            </label>
            <button className="btn" disabled={hasError || !input}>
              Guardar <ChevronRightIcon />
            </button>
            <p className="mono muted" style={{ fontSize: 'var(--text-xs)' }}>
              A11y: label + focus ring cyan + estado error coral + disabled 55% opacity.
            </p>
          </div>
        </Section>

        {/* ---------- CHIPS ---------- */}
        <Section id="chips" title="Chips & pills">
          <div className="row-3" style={{ flexWrap: 'wrap' }}>
            <span className="chip">Default chip</span>
            <span className="chip chip--admin">ADMIN</span>
            <span className="chip chip--ref">REFEREE</span>
            <span className="chip chip--td">TECHNICAL DIRECTOR</span>
            <span className="chip chip--asst">ASSISTANT</span>
            <span className="chip chip--player">PLAYER</span>
          </div>
        </Section>

        {/* ---------- CARDS ---------- */}
        <Section id="cards" title="Cards coleccionables">
          <div className="grid-cards">
            {/* default */}
            <div className="card-pack">
              <span className="corner-badge">82</span>
              <span className="chip" style={{ marginBottom: 'var(--space-3)' }}>
                COMMON
              </span>
              <h3>Cancha Norte</h3>
              <p className="muted">
                Pasto sintético · 11 vs 11 · 200 espectadores. Disponible fines
                de semana.
              </p>
              <div className="row-3" style={{ marginTop: 'var(--space-4)' }}>
                <button className="btn btn--sm">Reservar</button>
                <button className="btn btn--sm btn--ghost">Detalles</button>
              </div>
            </div>

            {/* rare */}
            <div className="card-pack card-pack--rare">
              <span className="corner-badge" style={{ background: 'var(--color-ink)', color: 'var(--color-vamos)' }}>
                ⭐
              </span>
              <span className="chip chip--td" style={{ marginBottom: 'var(--space-3)' }}>
                RARE · LIGA
              </span>
              <h3>Liga Apertura 2026</h3>
              <p className="muted">
                8 equipos · todos contra todos · 12 jornadas · premio al
                campeón.
              </p>
              <div className="row-3" style={{ marginTop: 'var(--space-4)' }}>
                <button className="btn btn--sm btn--dark">Inscribirme</button>
                <button className="btn btn--sm btn--ghost">Reglamento</button>
              </div>
            </div>

            {/* legend */}
            <div className="card-pack card-pack--legend">
              <span className="corner-badge" style={{ background: 'var(--color-vamos)', color: 'var(--color-ink)' }}>
                🏆
              </span>
              <span className="chip" style={{ marginBottom: 'var(--space-3)' }}>
                LEGEND · FINAL
              </span>
              <h3 style={{ color: 'inherit' }}>Gran Final</h3>
              <p style={{ color: 'inherit' }}>
                Sábado 14 de junio · 19:00 · Estadio Central. Entradas abiertas.
              </p>
              <div className="row-3" style={{ marginTop: 'var(--space-4)' }}>
                <button className="btn btn--sm">Boletos</button>
              </div>
            </div>

            {/* dark / stats */}
            <div className="card-pack card-pack--dark scanlines">
              <span className="corner-badge">★</span>
              <span className="chip chip--player" style={{ marginBottom: 'var(--space-3)' }}>
                MVP
              </span>
              <h3 style={{ color: 'var(--color-text-dark)' }}>Goleadores</h3>
              <div className="stack-3" style={{ marginTop: 'var(--space-4)' }}>
                <div className="row-3" style={{ justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--color-text-dark)' }}>Carlos López</span>
                  <span className="mono" style={{ color: 'var(--color-lime)' }}>
                    14 goles
                  </span>
                </div>
                <div className="row-3" style={{ justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--color-text-dark)' }}>Ana García</span>
                  <span className="mono" style={{ color: 'var(--color-lime)' }}>
                    11 goles
                  </span>
                </div>
                <div className="row-3" style={{ justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--color-text-dark)' }}>Diego Pérez</span>
                  <span className="mono" style={{ color: 'var(--color-lime)' }}>
                    9 goles
                  </span>
                </div>
              </div>
            </div>
          </div>
        </Section>

        {/* ---------- BACKGROUNDS ---------- */}
        <Section id="bgs" title="Background patterns">
          <div className="grid-cards">
            <div className="bg-halftone" style={{ height: 180, border: 'var(--border-bold)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-md)', display: 'grid', placeItems: 'center' }}>
              <span className="sticker">halftone</span>
            </div>
            <div className="bg-halftone--yellow" style={{ height: 180, border: 'var(--border-bold)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-md)', display: 'grid', placeItems: 'center' }}>
              <span className="sticker" style={{ background: 'var(--color-coral)' }}>vamos dots</span>
            </div>
            <div className="bg-halftone--coral" style={{ height: 180, border: 'var(--border-bold)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-md)', display: 'grid', placeItems: 'center' }}>
              <span className="sticker">coral dots</span>
            </div>
            <div className="bg-halftone--dark scanlines" style={{ height: 180, border: 'var(--border-heavy)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-lg)', display: 'grid', placeItems: 'center' }}>
              <span className="sticker" style={{ background: 'var(--color-lime)', color: 'var(--color-ink)' }}>esports dark</span>
            </div>
            <div className="bg-stripes" style={{ height: 180, border: 'var(--border-bold)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-md)', display: 'grid', placeItems: 'center' }}>
              <span className="sticker" style={{ background: 'var(--color-surface)' }}>warning stripes</span>
            </div>
            <div className="bg-stripes--magenta" style={{ height: 180, border: 'var(--border-bold)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-md)', display: 'grid', placeItems: 'center' }}>
              <span className="sticker" style={{ background: 'var(--color-surface)' }}>magenta stripes</span>
            </div>
          </div>
        </Section>

        {/* ---------- ICONS ---------- */}
        <Section id="icons" title="Icons (inline SVG)">
          <div className="row-3" style={{ flexWrap: 'wrap', fontSize: 48 }}>
            <BallIcon />
            <TrophyIcon />
            <WhistleIcon />
            <FieldIcon />
            <ShieldIcon />
            <StarIcon />
            <ChevronRightIcon />
          </div>
        </Section>

        {/* ---------- LAYOUT ---------- */}
        <Section id="layout" title="Layout patterns">
          <div className="hero" style={{ gridTemplateColumns: '1fr', padding: 'var(--space-6)', borderRadius: 'var(--radius-lg)' }}>
            <span className="sticker">Hero pattern</span>
            <h1 className="hero__title" style={{ fontSize: 'var(--text-3xl)' }}>
              Página completa
            </h1>
            <p className="hero__sub">
              Esta misma grilla se usará en el dashboard real cuando migremos.
            </p>
            <div className="row-3" style={{ flexWrap: 'wrap' }}>
              <button className="btn btn--lg">Crear liga</button>
              <button className="btn btn--lg btn--ghost">Entrar</button>
            </div>
          </div>
        </Section>

        <footer
          className="stack-3"
          style={{ paddingBlock: 'var(--space-7)', borderTop: 'var(--border-heavy)', marginTop: 'var(--space-7)' }}
        >
          <div className="row-3">
            <BallIcon style={{ fontSize: 48 }} />
            <h2>Kaibil Football · Design System v1.0</h2>
          </div>
          <p className="muted">
            Ver <code className="mono">docs/design-system.md</code> para tokens,
            componentes, anti‑patterns y changelog.
          </p>
        </footer>
      </div>
    </div>
  );
}
