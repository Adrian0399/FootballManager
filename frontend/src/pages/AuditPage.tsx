import { useEffect, useMemo, useState } from 'react';
import { auditApi, type AuditSummary, type AuditEntry } from '../api/audit';
import { useIsAdmin } from '../hooks/useIsAdmin';
import { PageHeader } from '../components/ui/PageHeader';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';

/**
 * /audit — admin monitoring dashboard.
 *
 * Designed as a single control-room panel:
 *   1. Headline KPIs (mutaciones, 24h, usuarios, registros)
 *   2. Activity over time (CSS bar chart, last 30 days)
 *   3. Mix of actions (horizontal bars) and top users
 *   4. Live feed with role badge + method + status + readable message
 */

const RANGE_OPTIONS = [
  { label: '7 días', days: 7 },
  { label: '30 días', days: 30 },
  { label: '90 días', days: 90 },
] as const;

const ROLE_LABEL: Record<string, string> = {
  ADMIN: 'ADMIN',
  REFEREE: 'ÁRBITRO',
  TECHNICAL_DIRECTOR: 'DT',
  ASSISTANT: 'AUXILIAR',
  PLAYER: 'JUGADOR',
};

const ROLE_TONE: Record<string, 'admin' | 'ref' | 'td' | 'asst' | 'player' | 'default'> = {
  ADMIN: 'admin',
  REFEREE: 'ref',
  TECHNICAL_DIRECTOR: 'td',
  ASSISTANT: 'asst',
  PLAYER: 'player',
};

const METHOD_TONE: Record<string, 'success' | 'cyan' | 'warning' | 'coral'> = {
  POST: 'success',
  PUT: 'cyan',
  PATCH: 'cyan',
  DELETE: 'warning',
};

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
      auditApi.list({ from: from.toISOString(), size: 40 }),
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

  const maxDay = useMemo(
    () => (summary ? Math.max(1, ...summary.porDia.map((d) => d.count)) : 1),
    [summary],
  );
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
    <div className="container section-stack">
      <PageHeader
        title="Monitoreo"
        description="Actividad del sistema: qué se mueve, quién lo mueve y cuándo."
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
        <Card>
          <p className="muted">Cargando actividad…</p>
        </Card>
      ) : (
        summary && (
          <>
            {/* KPI row */}
            <section className="audit-kpis" aria-label="Indicadores clave">
              <KpiCard label="Mutaciones" value={summary.totals.mutaciones} tone="magenta" />
              <KpiCard label="Últimas 24 h" value={summary.totals.ultimas24h} tone="lime" />
              <KpiCard label="Usuarios activos" value={summary.totals.usuariosActivos} tone="cyan" />
              <KpiCard label="Registros" value={summary.totals.registros} tone="warning" />
            </section>

            {/* Activity over time */}
            <Card>
              <header className="audit-section-head">
                <h2>Actividad por día</h2>
                <span className="audit-section-head__hint">Últimos 30 días · máx {maxDay}</span>
              </header>
              <div className="audit-chart" role="img" aria-label="Actividad por día">
                {summary.porDia.map((d, i) => {
                  const ratio = d.count / maxDay;
                  const heightPct = Math.max(2, Math.round(ratio * 100));
                  const showLabel = i % 5 === 0 || i === summary.porDia.length - 1;
                  return (
                    <div className="audit-chart__col" key={d.date}>
                      <span className="audit-chart__value">{d.count}</span>
                      <div className="audit-chart__bar-wrap">
                        <div
                          className={`audit-chart__bar ${d.count === 0 ? 'is-zero' : ''}`.trim()}
                          style={{ height: `${heightPct}%` }}
                          title={`${d.date}: ${d.count} acciones`}
                        />
                      </div>
                      <span className={`audit-chart__label ${showLabel ? '' : 'is-hidden'}`.trim()}>
                        {formatDay(d.date)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </Card>

            <div className="audit-grid">
              {/* Mix of actions as horizontal bars */}
              <Card>
                <header className="audit-section-head">
                  <h2>Tipos de acción</h2>
                </header>
                <ul className="audit-actions">
                  {summary.porAccion.slice(0, 10).map((a) => {
                    const pct = Math.round((a.count / maxAction) * 100);
                    return (
                      <li key={a.action} className="audit-action">
                        <div className="audit-action__label">{a.actionLabel}</div>
                        <div className="audit-action__track">
                          <div
                            className="audit-action__bar"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <div className="audit-action__count">{a.count}</div>
                      </li>
                    );
                  })}
                </ul>
              </Card>

              {/* Top users */}
              <Card>
                <header className="audit-section-head">
                  <h2>Usuarios más activos</h2>
                </header>
                {summary.usuariosMasActivos.length > 0 ? (
                  <ol className="audit-users">
                    {summary.usuariosMasActivos.map((u, i) => (
                      <li key={u.userId} className="audit-user">
                        <span className="audit-user__rank">{i + 1}</span>
                        <span className="audit-user__name">{u.name}</span>
                        <span className="audit-user__count">
                          {u.count} <span className="muted">acciones</span>
                        </span>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="muted">Sin actividad registrada.</p>
                )}
              </Card>
            </div>

            {/* Live feed */}
            <Card>
              <header className="audit-section-head">
                <h2>Actividad reciente</h2>
                <span className="audit-section-head__hint">{entries.length} movimientos</span>
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

function FeedItem({ entry }: { entry: AuditEntry }) {
  const roleTone = (entry.actorRole && ROLE_TONE[entry.actorRole]) || 'default';
  const roleLabel = (entry.actorRole && ROLE_LABEL[entry.actorRole]) || '—';
  const methodTone = METHOD_TONE[entry.method] || 'default';
  const ok = entry.statusCode < 400;

  return (
    <li className={`audit-feed__item ${ok ? '' : 'is-error'}`.trim()}>
      <span className="audit-feed__rail" aria-hidden="true" />
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
        <span className={`audit-tag audit-tag--role-${roleTone}`}>{roleLabel}</span>
        <span className={`audit-tag audit-tag--method audit-tag--${methodTone}`}>
          {entry.method}
        </span>
        <span
          className={`audit-tag audit-tag--status ${ok ? 'is-ok' : 'is-fail'}`}
        >
          {entry.statusCode}
        </span>
      </div>
    </li>
  );
}

function KpiCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: 'magenta' | 'lime' | 'cyan' | 'warning';
}) {
  return (
    <div className={`audit-kpi audit-kpi--${tone}`}>
      <span className="audit-kpi__value">{value}</span>
      <span className="audit-kpi__label">{label}</span>
    </div>
  );
}