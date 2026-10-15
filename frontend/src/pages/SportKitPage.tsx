import { Plus, Download, CalendarPlus, ChevronRight, Trophy, Users } from 'lucide-react';
import { SportButton, PlayerCard, FormGuide, type PositionGroup } from '../components/sport';
import '../styles/sport-ui.css';

const CLUB_ACCENT = '#D4AF37'; // club gold

interface DemoPlayer {
  name: string;
  pos: string;
  group: PositionGroup;
  num: number;
  rating: number;
  stats: { apps: number; goals: number; assists: number };
}

/* Demo-only sample roster. Real cut-out portraits drop in via `photoUrl`. */
const SQUAD: { group: string; players: DemoPlayer[] }[] = [
  {
    group: 'Porteros',
    players: [
      { name: 'Courtois', pos: 'Portero', group: 'GK', num: 1, rating: 90, stats: { apps: 14, goals: 0, assists: 0 } },
    ],
  },
  {
    group: 'Defensas',
    players: [
      { name: 'Asencio', pos: 'Defensa', group: 'DEF', num: 2, rating: 78, stats: { apps: 9, goals: 1, assists: 0 } },
      { name: 'E. Militão', pos: 'Defensa', group: 'DEF', num: 3, rating: 85, stats: { apps: 12, goals: 2, assists: 1 } },
      { name: 'Huijsen', pos: 'Defensa', group: 'DEF', num: 4, rating: 82, stats: { apps: 11, goals: 1, assists: 2 } },
      { name: 'F. Mendy', pos: 'Lateral', group: 'DEF', num: 23, rating: 83, stats: { apps: 13, goals: 0, assists: 3 } },
    ],
  },
  {
    group: 'Centrocampistas',
    players: [
      { name: 'Bellingham', pos: 'Centrocampista', group: 'MID', num: 5, rating: 89, stats: { apps: 15, goals: 8, assists: 6 } },
      { name: 'Valverde', pos: 'Centrocampista', group: 'MID', num: 8, rating: 87, stats: { apps: 15, goals: 4, assists: 5 } },
      { name: 'Tchouaméni', pos: 'Mediocentro', group: 'MID', num: 14, rating: 84, stats: { apps: 14, goals: 2, assists: 2 } },
    ],
  },
  {
    group: 'Delanteros',
    players: [
      { name: 'Vinícius Jr.', pos: 'Delantero', group: 'FWD', num: 7, rating: 91, stats: { apps: 15, goals: 12, assists: 9 } },
      { name: 'Mbappé', pos: 'Delantero', group: 'FWD', num: 10, rating: 92, stats: { apps: 15, goals: 16, assists: 4 } },
      { name: 'Rodrygo', pos: 'Delantero', group: 'FWD', num: 11, rating: 86, stats: { apps: 14, goals: 6, assists: 7 } },
    ],
  },
];

function Section({ title, hint, children }: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="sp-sec">
      <div className="sp-sec__head">
        <h2 className="sp-sec__title">{title}</h2>
        {hint && <p className="sp-sec__hint">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

/** Sport-kit preview page (route `/sport-kit`). */
export function SportKitPage() {
  return (
    <div className="sport-ui">
      <div className="container sp-kit">
        <header className="sp-hero">
          <h1>Sport UI Kit</h1>
          <p>
            Lenguaje visual premium para el gestor de ligas: azul royal, navy y
            tarjetas de jugador estilo broadcast. Cada componente vive aislado
            bajo la raíz <code>.sport-ui</code>.
          </p>
        </header>

        {/* ---------------------------------------------------------- */}
        <Section
          title="Botones"
          hint="solid (CTA) · outline (sobre azul) · soft (pill en tarjeta blanca) · navy · ghost."
        >
          <div className="sp-stage">
            <SportButton variant="solid" startIcon={<Plus size={16} />}>Crear liga</SportButton>
            <SportButton variant="navy" startIcon={<Users size={16} />}>Inscribir equipo</SportButton>
            <SportButton variant="ghost" startIcon={<Download size={16} />}>Exportar</SportButton>
            <SportButton variant="soft" endIcon={<ChevronRight size={15} />}>Ver detalles</SportButton>
          </div>

          <div className="sp-stage sp-stage--navy">
            <span className="sp-stage__label" style={{ color: 'rgba(255,255,255,.6)' }}>
              sobre fondo azul / navy
            </span>
            <SportButton variant="outline" startIcon={<CalendarPlus size={16} />}>
              Añadir al calendario
            </SportButton>
            <SportButton variant="outline">Ver todos los partidos</SportButton>
            <SportButton variant="solid">Filtrar</SportButton>
          </div>

          <div className="sp-stage">
            <span className="sp-stage__label">sizes</span>
            <SportButton size="sm">sm</SportButton>
            <SportButton size="md">md</SportButton>
            <SportButton size="lg">lg</SportButton>
            <SportButton variant="solid" disabled>Guardando…</SportButton>
          </div>
        </Section>

        {/* ---------------------------------------------------------- */}
        <Section
          title="Tarjetas de jugador"
          hint="Rating, insignia de club, etiqueta de posición por línea y micro-estadísticas."
        >
          {SQUAD.map((g) => (
            <div key={g.group}>
              <h3 className="sp-group">{g.group}</h3>
              <div className="sp-row">
                {g.players.map((p) => (
                  <PlayerCard
                    key={p.num}
                    name={p.name}
                    position={p.pos}
                    positionGroup={p.group}
                    number={p.num}
                    rating={p.rating}
                    stats={p.stats}
                    accent={CLUB_ACCENT}
                    clubName="Real Madrid"
                  />
                ))}
              </div>
            </div>
          ))}
        </Section>

        {/* ---------------------------------------------------------- */}
        <Section
          title="Form guide"
          hint="Racha reciente V/E/D. Los huecos punteados son partidos pendientes."
        >
          <div className="sp-stage">
            <FormGuide results={[null, null, null, null, 'W']} />
            <FormGuide results={['W', 'D', 'L', 'W', 'W']} />
            <FormGuide results={['L', 'D', 'W', 'D', 'L']} />
            <FormGuide results={['W', 'W', 'W', 'D', 'W']} size="sm" />
          </div>
        </Section>

        {/* ---------------------------------------------------------- */}
        <Section title="Encabezados" hint="Títulos de sección con barra de acento.">
          <div className="sp-stage sp-stage--navy">
            <span className="sp-stage__label" style={{ color: 'rgba(255,255,255,.6)' }}>
              barras de acento + CTA
            </span>
            <SportButton variant="outline" startIcon={<Trophy size={16} />}>Ver clasificación</SportButton>
            <SportButton variant="solid">Nuevo partido</SportButton>
          </div>
        </Section>
      </div>
    </div>
  );
}
