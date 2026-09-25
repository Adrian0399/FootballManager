import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { leaguesApi } from '../api/leagues';
import type { League } from '../types/league';
import {
  FORMAT_LABEL,
  TIME_SLOT_LABEL,
  WEEK_DAY_SHORT,
} from '../types/league';
import type { ErrorEnvelope } from '../types/user';
import { useIsAdmin } from '../hooks/useIsAdmin';
import { LeagueForm } from '../components/LeagueForm';
import { Modal } from '../components/Modal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { TrophyIcon } from '../components/icons';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Banner } from '../components/ui/Banner';
import { Chip } from '../components/ui/Chip';
import { PageHeader } from '../components/ui/PageHeader';
import { EmptyState } from '../components/ui/EmptyState';

/**
 * Ligas (Leagues) — list + admin-only create/edit/delete.
 *
 * Each card surfaces the season, date range and a chip per associated
 * field (using the same `.chip` token as the role chips for visual
 * consistency).
 *
 * Read access for any authenticated user. Mutating actions are gated by
 * `useIsAdmin()` (UI nicety); the backend independently enforces
 * `authorize('ADMIN')` on POST/PATCH/DELETE.
 */
export function LeaguesPage() {
  const isAdmin = useIsAdmin();
  const navigate = useNavigate();
  const [leagues, setLeagues] = useState<League[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [modal, setModal] = useState<
    | { kind: 'closed' }
    | { kind: 'create' }
    | { kind: 'edit'; league: League }
    | { kind: 'delete'; league: League }
  >({ kind: 'closed' });

  const reload = useCallback(async () => {
    setLoadError(null);
    try {
      const list = await leaguesApi.list();
      setLeagues(list);
    } catch (err) {
      const apiError = (err as { response?: { data?: ErrorEnvelope } }).response?.data;
      setLoadError(apiError?.error?.message ?? 'No se pudieron cargar las ligas');
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const closeModal = () => setModal({ kind: 'closed' });

  const handleSaved = (_saved: League) => {
    closeModal();
    void reload();
  };

  const handleDelete = async () => {
    if (modal.kind !== 'delete') return;
    await leaguesApi.remove(modal.league.id);
  };

  function formatDateRange(start: string | null, end: string | null): string | null {
    if (!start && !end) return null;
    const opts: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short', day: '2-digit' };
    /**
     * The backend serializes PostgreSQL `date` columns as full ISO
     * strings like `2026-09-15T00:00:00.000Z`. We only care about the
     * `YYYY-MM-DD` prefix, so we slice it and parse as a local date
     * to avoid timezone shift surprises in the UI.
     */
    const fmt = (s: string) => {
      const ymd = s.slice(0, 10);
      return new Date(ymd + 'T00:00:00').toLocaleDateString('es-MX', opts);
    };
    if (start && end) return `${fmt(start)} → ${fmt(end)}`;
    if (start) return `Desde ${fmt(start)}`;
    return `Hasta ${fmt(end!)}`;
  }

  return (
    <div className="container section-stack">
      <PageHeader
        title="Ligas"
        description={
          isAdmin
            ? 'Crea, edita o elimina ligas y sus canchas asociadas.'
            : 'Lista de ligas activas. Solo un admin puede modificarlas.'
        }
        actions={
          isAdmin && (
            <Button onClick={() => setModal({ kind: 'create' })}>
              + Crear liga
            </Button>
          )
        }
      />

      {loadError && <Banner tone="error">{loadError}</Banner>}

      {leagues === null && !loadError && (
        <p className="muted">Cargando ligas…</p>
      )}

      {leagues && leagues.length === 0 && !loadError && (
        <EmptyState
          title="Sin ligas todavía"
          description={
            isAdmin
              ? 'Crea la primera liga y selecciónale al menos una cancha.'
              : 'Pídele a un admin que registre la primera liga.'
          }
          actions={
            isAdmin && (
              <Button onClick={() => setModal({ kind: 'create' })}>
                + Crear liga
              </Button>
            )
          }
        />
      )}

      {leagues && leagues.length > 0 && (
        <div className="grid-cards">
          {leagues.map((lg) => {
            const range = formatDateRange(lg.startDate, lg.endDate);
            // v1.1 fields come straight from the backend.
            const format = lg.format;
            const category = lg.category;
            const dayOfWeek = lg.dayOfWeek;
            const timeSlot = lg.timeSlot;
            const maxTeams = lg.maxTeams;
            return (
              <Card
                key={lg.id}
                as="article"
                variant={lg.isActive ? 'rare' : 'default'}
                className="collection-card league-card"
              >
                <Link to={`/leagues/${lg.id}`} className="league-card__cover-link" aria-label={`Ver detalle de ${lg.name}`}>
                  <div className="collection-card__title">
                    <TrophyIcon style={{ color: 'var(--color-magenta)', fontSize: '1.4em' }} />
                    <h3 style={{ fontSize: 'var(--text-xl)' }}>{lg.name}</h3>
                    {!lg.isActive && (
                      <Chip
                        style={{
                          background: 'var(--color-fog)',
                          color: 'var(--color-text-dark)',
                        }}
                      >
                        Inactiva
                      </Chip>
                    )}
                  </div>
                  <div className="row-3 row-wrap" style={{ marginTop: 'var(--space-2)' }}>
                    {format && <Chip tone="lime">{FORMAT_LABEL[format]}</Chip>}
                    {category && <Chip tone="magenta">{category}</Chip>}
                    {dayOfWeek && (
                      <Chip tone="cyan">
                        {WEEK_DAY_SHORT[dayOfWeek]}
                        {timeSlot ? ` ${TIME_SLOT_LABEL[timeSlot]}` : ''}
                      </Chip>
                    )}
                    {maxTeams !== undefined && (
                      <Chip tone="default">Cupo {maxTeams}</Chip>
                    )}
                  </div>
                  <div className="collection-card__meta">
                    {lg.season && (
                      <span>
                        🏷 <strong>{lg.season}</strong>
                      </span>
                    )}
                    {range && <span>📅 {range}</span>}
                    {lg.description && <span>{lg.description}</span>}
                    <span>
                      ⚽ <strong>{lg.fields.length}</strong>{' '}
                      {lg.fields.length === 1 ? 'cancha' : 'canchas'}
                    </span>
                    {lg.fields.length > 0 && (
                      <div
                        className="row-3 row-wrap"
                        style={{ marginTop: 'var(--space-1)' }}
                      >
                        {lg.fields.map((f) => (
                          <Chip key={f.id} tone="ref">
                            {f.name}
                          </Chip>
                        ))}
                      </div>
                    )}
                  </div>
                </Link>
                {isAdmin && (
                  <div className="collection-card__actions">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => navigate(`/leagues/${lg.id}/teams`)}
                    >
                      Equipos
                    </Button>
                    <Button
                      size="sm"
                      variant="cyan"
                      onClick={() => setModal({ kind: 'edit', league: lg })}
                    >
                      Editar
                    </Button>
                    <Button
                      size="sm"
                      variant="coral"
                      onClick={() => setModal({ kind: 'delete', league: lg })}
                    >
                      Eliminar
                    </Button>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <Modal
        open={modal.kind === 'create'}
        onClose={closeModal}
        title="Crear liga"
        description="Asocia al menos una cancha a la nueva liga."
      >
        <LeagueForm onSaved={handleSaved} onCancel={closeModal} />
      </Modal>

      <Modal
        open={modal.kind === 'edit'}
        onClose={closeModal}
        title="Editar liga"
        description={modal.kind === 'edit' ? modal.league.name : ''}
      >
        {modal.kind === 'edit' && (
          <LeagueForm league={modal.league} onSaved={handleSaved} onCancel={closeModal} />
        )}
      </Modal>

      <ConfirmDialog
        open={modal.kind === 'delete'}
        title="¿Eliminar liga?"
        message={
          modal.kind === 'delete'
            ? `Vas a hacer soft-delete de "${modal.league.name}". Los partidos y equipos históricos la siguen referenciando pero no aparecerá en los listados.`
            : ''
        }
        confirmLabel="Eliminar"
        onConfirm={handleDelete}
        onClose={closeModal}
      />
    </div>
  );
}
