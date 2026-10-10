import { useEffect, useMemo, useState } from 'react';
import { auditApi, type AuditSummary, type AuditEntry } from '../api/audit';
import { useIsAdmin } from '../hooks/useIsAdmin';
import { PageHeader } from '../components/ui/PageHeader';
import { Card } from '../components/ui/Card';
import { Chip } from '../components/ui/Chip';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';

/**
 * /audit — admin monitoring dashboard.
 *
 * Shows what has been happening across the system: total mutations, the
 * busiest action types, a 30-day activity chart, the most active users and
 * the latest audit entries. Everything comes from the append-only AuditLog
 * table written by the backend middleware.
 */

const RANGE_OPTIONS = [
  { label: '7 días', days: 7 },
  { label: '30 días', days: 30 },
  { label: '90 días', days: 90 },
] as const;

function shortDate(iso: string): string {
  return iso.slice(0, 10);
}

function timeOf(iso: string): string {
  return iso.slice(11, 16);
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

  const maxDay = useMemo(() => {
    if (!summary) return 1;
    return Math.max(1, ...summary.porDia.map((d) => d.count));
  }, [summary]);

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
          <div className="row-3 row-wrap">
            {RANGE_OPTIONS.map((o) => (
              <Button
                key={o.days}
                size="sm"
                variant={range === o.days ? 'dark' : 'ghost'}
                onClick={() => setRange(o.days)}
              >
                {o.label}
              </Button>
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
            {/* KPI counters */}
            <div className="dashboard-counters">
              <Metric value={summary.totals.mutaciones} label="Mutaciones" tone="magenta" />
              <Metric value={summary.totals.ultimas24h} label="Últimas 24h" tone="lime" />
              <Metric value={summary.totals.usuariosActivos} label="Usuarios activos" tone="cyan" />
              <Metric value={summary.totals.registros} label="Registros" tone="warning" />
            </div>

            {/* Activity chart */}
            <Card>
              <h3 style={{ fontSize: 'var(--text-lg)' }}>Actividad por día</h3>
              <div className="audit-chart" role="img" aria-label="Actividad por día">
                {summary.porDia.map((d) => (
                  <div className="audit-chart__col" key={d.date}>
                    <div className="audit-chart__bar-wrap">
                      <div
                        className="audit-chart__bar"
                        style={{ height: `${Math.round((d.count / maxDay) * 100)}%` }}
                        title={`${d.date}: ${d.count}`}
                      />
                    </div>
                    <span className="audit-chart__label">{shortDate(d.date).slice(5)}</span>
                  </div>
                ))}
              </div>
            </Card>

            <div className="dashboard-quick">
              {/* Actions breakdown */}
              <Card>
                <h3 style={{ fontSize: 'var(--text-lg)' }}>Por tipo de acción</h3>
                <ul className="staff-list">
                  {summary.porAccion.slice(0, 10).map((a) => (
                    <li key={a.action} className="staff-list__row">
                      <div className="staff-list__body">
                        <span className="staff-list__name">{a.action}</span>
                      </div>
                      <Chip tone="default">{a.count}</Chip>
                    </li>
                  ))}
                </ul>
              </Card>

              {/* Most active users */}
              <Card>
                <h3 style={{ fontSize: 'var(--text-lg)' }}>Usuarios más activos</h3>
                {summary.usuariosMasActivos.length > 0 ? (
                  <ul className="staff-list">
                    {summary.usuariosMasActivos.map((u) => (
                      <li key={u.userId} className="staff-list__row">
                        <div className="staff-list__body">
                          <span className="staff-list__name">{u.name}</span>
                        </div>
                        <Chip tone="cyan">{u.count} acciones</Chip>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="muted">Sin actividad registrada todavía.</p>
                )}
              </Card>
            </div>

            {/* Recent activity feed with friendly sentences */}
            <Card>
              <h3 style={{ fontSize: 'var(--text-lg)' }}>Actividad reciente</h3>
              {entries.length > 0 ? (
                <ul className="staff-list" style={{ marginTop: 'var(--space-2)' }}>
                  {entries.map((e) => (
                    <li key={e.id} className="staff-list__row">
                      <div className="staff-list__body">
                        <span className="staff-list__name">{e.message}</span>
                        <span className="staff-list__role">
                          {shortDate(e.createdAt)} · {timeOf(e.createdAt)}
                          {e.userName ? ` · ${e.userName}` : ''}
                        </span>
                      </div>
                      <Chip tone={e.statusCode >= 400 ? 'coral' : 'success'}>
                        {e.statusCode}
                      </Chip>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="muted">Aún no hay movimientos registrados.</p>
              )}
            </Card>
          </>
        )
      )}
    </div>
  );
}

function Metric({
  value,
  label,
  tone,
}: {
  value: number;
  label: string;
  tone: 'magenta' | 'lime' | 'cyan' | 'warning';
}) {
  return (
    <div className={`dashboard-counter dashboard-counter--${tone}`}>
      <span className="dashboard-counter__value">{value}</span>
      <span className="dashboard-counter__label">{label}</span>
    </div>
  );
}