import { useEffect, useMemo, useState } from 'react';
import { auditApi, type AuditSummary, type AuditEntry } from '../api/audit';
import { useIsAdmin } from '../hooks/useIsAdmin';
import { PageHeader } from '../components/ui/PageHeader';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import {
  BallIcon,
  ShieldIcon,
  TrophyIcon,
  WhistleIcon,
  FieldIcon,
} from '../components/icons';

const RANGE_OPTIONS = [
  { label: '7d', days: 7 },
  { label: '30d', days: 30 },
  { label: '90d', days: 90 },
] as const;

const ROLE_LABEL: Record<string, string> = {
  ADMIN: 'ADMIN',
  REFEREE: 'ÁRBITRO',
  TECHNICAL_DIRECTOR: 'DT',
  ASSISTANT: 'AUXILIAR',
  PLAYER: 'JUGADOR',
};
const ROLE_ICON: Record<string, JSX.Element> = {
  ADMIN: <ShieldIcon />,
  REFEREE: <WhistleIcon />,
  TECHNICAL_DIRECTOR: <TrophyIcon />,
  ASSISTANT: <FieldIcon />,
  PLAYER: <BallIcon />,
};
const ROLE_COLOR: Record<string, string> = {
  ADMIN: 'var(--color-coral)',
  REFEREE: 'var(--color-warning)',
  TECHNICAL_DIRECTOR: 'var(--color-cyan)',
  ASSISTANT: 'var(--color-success)',
  PLAYER: 'var(--color-lime)',
};
const METHOD_COLOR: Record<string, string> = {
  POST: 'var(--color-success)',
  PUT: 'var(--color-cyan)',
  PATCH: 'var(--color-cyan)',
  DELETE: 'var(--color-warning)',
};

/**
 * Classifies an action string into a visual category (color + icon) so the
 * "Tipos de acción" cards can show what the action actually IS, not just a
 * translated label. The mapping is intentionally a few buckets: it's a
 * monitoring dashboard, not a taxonomy.
 */
function classifyAction(action: string): {
  icon: JSX.Element;
  color: string;
  category: string;
} {
  if (action === 'LOGIN' || action === 'LOGOUT' || action === 'REFRESH') {
    return { icon: <WhistleIcon />, color: 'var(--color-warning)', category: 'AUTH' };
  }
  if (action === 'REGISTER') {
    return { icon: <TrophyIcon />, color: 'var(--color-magenta)', category: 'CUENTA' };
  }
  if (action.includes('FIXTURE') || action.includes('LLAVES') || action.includes('AWARD')) {
    return { icon: <FieldIcon />, color: 'var(--color-cyan)', category: 'CAMPEONATO' };
  }
  if (action.includes('MIEMBRO') || action.includes('EQUIPO_LIGA')) {
    return { icon: <BallIcon />, color: 'var(--color-lime)', category: 'PLANTILLA' };
  }
  if (action.startsWith('POST_')) {
    return { icon: <BallIcon />, color: 'var(--color-success)', category: 'CREAR' };
  }
  if (action.startsWith('PUT_') || action.startsWith('PATCH_')) {
    return { icon: <ShieldIcon />, color: 'var(--color-cyan)', category: 'EDITAR' };
  }
  if (action.startsWith('DELETE_')) {
    return { icon: <ShieldIcon />, color: 'var(--color-coral)', category: 'ELIMINAR' };
  }
  return { icon: <BallIcon />, color: 'var(--color-text-muted)', category: 'OTRO' };
}

function shortDate(iso: string): string {
  return iso.slice(0, 10);
}
function timeOf(iso: string): string {
  return iso.slice(11, 16);
}
function formatDay(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function AuditPage() {
  const isAdmin = useIsAdmin();
  const [summary, setSummary] = useState<AuditSummary | null>(null);
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [range, setRange] = useState<number>(30);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;
    setIsLoading(true);
    const from = new Date();
    from.setDate(from.getDate() - range);
    from.setHours(0, 0, 0, 0);

    Promise.all([
      auditApi.summary(from.toISOString(), undefined),
      auditApi.list({ from: from.toISOString(), size: 30 }),
    ])
      .then(([sum, list]) => {
        if (!cancelled) {
          setSummary(sum);
          setEntries(list.items);
          setError(null);
        }
      })
      .catch(() => {
        if (!cancelled) setError('No se pudo cargar el resumen de actividad.');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isAdmin, range]);

  const maxAction = useMemo(
    () => (summary ? Math.max(1, ...summary.porAccion.map((a) => a.count)) : 1),
    [summary],
  );

  if (!isAdmin) {
    return (
      <div className="container section-stack">
        <EmptyState
          title="Acceso restringido"
          description="El monitoreo de actividad es solo para administradores."
          actions={<Button to="/dashboard">Volver al dashboard</Button>}
        />
      </div>
    );
  }

  return (
    <div className="container section-stack audit-page">
      <PageHeader
        title="Monitoreo"
        description="Vista en vivo de la actividad del sistema."
        actions={
          <div className="audit-range">
            {RANGE_OPTIONS.map((o) => (
              <button
                key={o.days}
                type="button"
                className={`audit-range__btn ${range === o.days ? 'is-active' : ''}`.trim()}
                onClick={() => setRange(o.days)}
              >
                {o.label}
              </button>
            ))}
          </div>
        }
      />

      {error && <p className="muted">{error}</p>}

      {isLoading && !summary ? (
        <div className="audit-loading">Cargando telemetría…</div>
      ) : (
        summary && (
          <>
            {/* Hero KPI row */}
            <section className="audit-kpis" aria-label="Indicadores clave">
              <Kpi
                tone="cyan"
                label="Mutaciones"
                value={summary.totals.mutaciones}
                icon={<ShieldIcon />}
                hint={`${summary.totals.ultimas24h} en las últimas 24 h`}
              />
              <Kpi
                tone="lime"
                label="Usuarios activos"
                value={summary.totals.usuariosActivos}
                icon={<BallIcon />}
                hint="con al menos una acción"
              />
              <Kpi
                tone="coral"
                label="Registros"
                value={summary.totals.registros}
                icon={<TrophyIcon />}
                hint="nuevas cuentas creadas"
              />
              <Kpi
                tone="warning"
                label="Acciones hoy"
                value={lastDayCount(summary.porDia)}
                icon={<FieldIcon />}
                hint="mutaciones en el día actual"
              />
            </section>

            <div className="audit-layout">
              {/* Hero chart panel */}
              <Card className="audit-chart-card">
                <header className="audit-panel-head">
                  <h2>Actividad</h2>
                  <span className="audit-panel-head__sub">
                    {summary.porDia.length} días
                  </span>
                </header>
                <ActivityChart data={summary.porDia} />
              </Card>

              {/* Side: action mix as cards */}
              <Card className="audit-side-card">
                <header className="audit-panel-head">
                  <h2>Tipos de acción</h2>
                </header>
                <div className="audit-action-grid">
                  {summary.porAccion.slice(0, 8).map((a) => {
                    const pct = Math.round((a.count / maxAction) * 100);
                    const cls = classifyAction(a.action);
                    return (
                      <div
                        key={a.action}
                        className="audit-action-card"
                        style={{
                          // CSS custom properties consumed by the card CSS.
                          ['--card-accent' as string]: cls.color,
                        }}
                      >
                        <div
                          className="audit-action-card__icon"
                          aria-hidden="true"
                        >
                          {cls.icon}
                        </div>
                        <div className="audit-action-card__body">
                          <span className="audit-action-card__category">
                            {cls.category}
                          </span>
                          <span className="audit-action-card__label">
                            {a.actionLabel}
                          </span>
                        </div>
                        <div className="audit-action-card__foot">
                          <span className="audit-action-card__count">{a.count}</span>
                          <div className="audit-action-card__track">
                            <div
                              className="audit-action-card__bar"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>

              {/* Top users */}
              <Card className="audit-users-card">
                <header className="audit-panel-head">
                  <h2>Usuarios más activos</h2>
                </header>
                {summary.usuariosMasActivos.length > 0 ? (
                  <ol className="audit-users">
                    {summary.usuariosMasActivos.map((u, i) => (
                      <li key={u.userId} className="audit-user">
                        <span className="audit-user__rank">{i + 1}</span>
                        <span className="audit-user__name">{u.name}</span>
                        <span className="audit-user__count">
                          <strong>{u.count}</strong>
                          <span className="muted"> acciones</span>
                        </span>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="muted">Sin actividad registrada.</p>
                )}
              </Card>
            </div>

            {/* Feed */}
            <Card>
              <header className="audit-panel-head">
                <h2>Actividad reciente</h2>
                <span className="audit-panel-head__sub">{entries.length} movimientos</span>
              </header>
              {entries.length > 0 ? (
                <ol className="audit-feed">
                  {entries.map((e) => (
                    <FeedItem key={e.id} entry={e} />
                  ))}
                </ol>
              ) : (
                <p className="muted">Aún no hay movimientos en este rango.</p>
              )}
            </Card>
          </>
        )
      )}
    </div>
  );
}

function lastDayCount(porDia: { count: number }[]): number {
  // porDia is oldest -> newest; the last entry is "today" if it lines up,
  // but to be safe we use the most recent non-zero bucket.
  for (let i = porDia.length - 1; i >= 0; i -= 1) {
    if (porDia[i]!.count > 0) return porDia[i]!.count;
  }
  return 0;
}

function Kpi({
  tone,
  label,
  value,
  hint,
  icon,
}: {
  tone: 'cyan' | 'lime' | 'coral' | 'warning';
  label: string;
  value: number;
  hint?: string;
  icon: JSX.Element;
}) {
  return (
    <div className={`audit-kpi audit-kpi--${tone}`}>
      <span className={`audit-kpi__icon audit-kpi__icon--${tone}`}>{icon}</span>
      <div className="audit-kpi__body">
        <span className="audit-kpi__value">{value.toLocaleString('es-MX')}</span>
        <span className="audit-kpi__label">{label}</span>
        {hint && <span className="audit-kpi__hint">{hint}</span>}
      </div>
    </div>
  );
}

function ActivityChart({ data }: { data: { date: string; count: number }[] }) {
  const { path, area, dots, max, total, ticks } = useMemo(() => {
    const W = 1000, H = 220, PAD = 24;
    if (data.length === 0) {
      return { path: '', area: '', dots: [], max: 0, total: 0, ticks: [] };
    }
    const max = Math.max(1, ...data.map((d) => d.count));
    const total = data.reduce((s, d) => s + d.count, 0);
    const stepX = (W - PAD * 2) / Math.max(1, data.length - 1);
    const points = data.map((d, i) => {
      const x = PAD + i * stepX;
      const y = H - PAD - (d.count / max) * (H - PAD * 2);
      return { x, y, count: d.count, date: d.date };
    });
    // Build a smooth path with a single quadratic curve through midpoints
    // for a soft line (no harsh corner where activity spikes).
    let path = `M ${points[0]!.x},${points[0]!.y}`;
    for (let i = 1; i < points.length; i += 1) {
      const prev = points[i - 1]!;
      const cur = points[i]!;
      const midX = (prev.x + cur.x) / 2;
      path += ` Q ${midX},${prev.y} ${midX},${(prev.y + cur.y) / 2} T ${cur.x},${cur.y}`;
    }
    const area = `${path} L ${points.at(-1)!.x},${H - PAD} L ${points[0]!.x},${H - PAD} Z`;
    // Y-axis ticks: 0, mid, max.
    const ticks = [
      { y: H - PAD, label: '0' },
      { y: H - PAD - (H - PAD * 2) / 2, label: String(Math.round(max / 2)) },
      { y: PAD, label: String(max) },
    ];
    return { path, area, dots: points, max, total, ticks };
  }, [data]);

  return (
    <div className="audit-activity">
      <div className="audit-activity__head">
        <div>
          <span className="audit-activity__total">{total.toLocaleString('es-MX')}</span>
          <span className="audit-activity__sub">mutaciones en el rango</span>
        </div>
        <div className="audit-activity__legend">
          <span className="audit-activity__dot" /> eventos
        </div>
      </div>
      <svg className="audit-activity__svg" viewBox="0 0 1000 220" preserveAspectRatio="none" role="img">
        <defs>
          <linearGradient id="audit-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-cyan)" stopOpacity="0.6" />
            <stop offset="100%" stopColor="var(--color-cyan)" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="audit-line" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="var(--color-cyan)" />
            <stop offset="100%" stopColor="var(--color-magenta)" />
          </linearGradient>
        </defs>
        {/* Grid */}
        {ticks.map((t, i) => (
          <g key={i}>
            <line
              x1="24"
              y1={t.y}
              x2="976"
              y2={t.y}
              stroke="var(--color-ink)"
              strokeOpacity="0.12"
              strokeDasharray="3 4"
            />
            <text x="6" y={t.y + 4} fill="var(--color-text-muted)" fontSize="10">
              {t.label}
            </text>
          </g>
        ))}
        <path d={area} fill="url(#audit-area)" />
        <path
          d={path}
          fill="none"
          stroke="url(#audit-line)"
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {dots.map((d, i) => (
          <g key={i}>
            <circle
              cx={d.x}
              cy={d.y}
              r="3.5"
              fill="var(--color-bg)"
              stroke="var(--color-cyan)"
              strokeWidth="1.5"
            />
            {d.count > 0 && (
              <text
                x={d.x}
                y={d.y - 8}
                textAnchor="middle"
                fontSize="9"
                fill="var(--color-text-muted)"
                fontFamily="var(--font-mono)"
              >
                {d.count}
              </text>
            )}
          </g>
        ))}
      </svg>
    </div>
  );
}

function FeedItem({ entry }: { entry: AuditEntry }) {
  const ok = entry.statusCode < 400;
  const methodColor = METHOD_COLOR[entry.method] ?? 'var(--color-ink)';
  const roleIcon = entry.actorRole ? ROLE_ICON[entry.actorRole] : <BallIcon />;
  const roleLabel = entry.actorRole ? ROLE_LABEL[entry.actorRole] : '—';
  const roleColor = entry.actorRole ? ROLE_COLOR[entry.actorRole] : 'var(--color-ink)';
  return (
    <li className={`audit-feed__item ${ok ? '' : 'is-error'}`.trim()}>
      <span
        className="audit-feed__avatar"
        style={{ color: roleColor, borderColor: roleColor }}
        aria-hidden="true"
      >
        {roleIcon}
      </span>
      <div className="audit-feed__body">
        <p className="audit-feed__message">{entry.message}</p>
        <p className="audit-feed__meta">
          <span className="audit-feed__time">
            {shortDate(entry.createdAt)} · {timeOf(entry.createdAt)}
          </span>
          {entry.userName && (
            <span className="audit-feed__user">— {entry.userName}</span>
          )}
        </p>
      </div>
      <div className="audit-feed__tags">
        <span
          className="audit-feed__method"
          style={{ background: methodColor, color: 'var(--color-text-dark)' }}
        >
          {entry.method}
        </span>
        <span className="audit-feed__role" style={{ color: roleColor, borderColor: roleColor }}>
          {roleLabel}
        </span>
        <span
          className={`audit-feed__status ${ok ? 'is-ok' : 'is-fail'}`}
        >
          {entry.statusCode}
        </span>
      </div>
    </li>
  );
}