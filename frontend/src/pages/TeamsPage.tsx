import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTeams, useLeagues, type TeamFilters } from '../hooks/teams';
import { teamsApi } from '../api/teams';
import { useIsAdmin } from '../hooks/useIsAdmin';
import { TeamBadge } from '../components/TeamBadge';
import { TeamForm } from '../components/TeamForm';
import { Modal } from '../components/Modal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Banner } from '../components/ui/Banner';
import { Chip } from '../components/ui/Chip';
import { PageHeader } from '../components/ui/PageHeader';
import { EmptyState } from '../components/ui/EmptyState';
import { Select } from '../components/ui/Select';
import { TextField } from '../components/ui/TextField';
import { FORMAT_LABEL, WEEK_DAY_SHORT, TIME_SLOT_LABEL } from '../types/league';
import type { League, LeagueFormat } from '../types/league';
import type { ErrorEnvelope } from '../types/user';
import type { Team } from '../types/team';

/**
 * Equipos — list with filters and admin-only create/edit/delete.
 *
 * Read access for any authenticated user. Mutating actions are gated by
 * `useIsAdmin()` (UI nicety); the backend will independently enforce
 * `authorize('ADMIN')` on POST/PATCH/DELETE in v1.1.
 */
export function TeamsPage() {
  const isAdmin = useIsAdmin();
  const [filters, setFilters] = useState<TeamFilters>({});
  const [modal, setModal] = useState<
    | { kind: 'closed' }
    | { kind: 'create' }
    | { kind: 'edit'; team: Team }
    | { kind: 'delete'; team: Team }
  >({ kind: 'closed' });

  const { data: teams, isLoading, error, refetch } = useTeams(filters);
  const { data: leagues } = useLeagues();
  const [actionError, setActionError] = useState<string | null>(null);

  // Index leagues by id for the badge subtitle lookup.
  const leagueIndex = useMemo(() => {
    const map = new Map<string, League>();
    for (const l of leagues ?? []) map.set(l.id, l);
    return map;
  }, [leagues]);

  const closeModal = () => setModal({ kind: 'closed' });
  const handleSaved = (_saved: Team) => {
    closeModal();
    refetch();
  };
  const handleDelete = async () => {
    if (modal.kind !== 'delete') return;
    setActionError(null);
    try {
      await teamsApi.remove(modal.team.id);
      closeModal();
      refetch();
    } catch (err) {
      const apiError = (err as { response?: { data?: ErrorEnvelope } }).response?.data?.error;
      setActionError(apiError?.message ?? 'No se pudo eliminar el equipo.');
    }
  };

  return (
    <div className="container section-stack">
      <PageHeader
        title="Equipos"
        description={
          isAdmin
            ? 'Crea, edita o elimina equipos. Asigna DT, auxiliares y jugadores.'
            : 'Lista de equipos registrados. Solo un admin puede modificarlos.'
        }
        actions={
          isAdmin && (
            <Button onClick={() => setModal({ kind: 'create' })}>
              + Crear equipo
            </Button>
          )
        }
      />

      {/* ----- Filters ----- */}
      <Card variant="cream">
        <div className="row-4 row-wrap" style={{ alignItems: 'flex-end' }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <TextField
              id="team-search"
              label="Buscar"
              placeholder="Nombre o short…"
              value={filters.q ?? ''}
              onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value || undefined }))}
            />
          </div>
          <div style={{ minWidth: 200 }}>
            <Select
              id="team-league-filter"
              label="Liga"
              value={filters.leagueId ?? ''}
              onChange={(e) =>
                setFilters((f) => ({ ...f, leagueId: e.target.value || undefined }))
              }
            >
              <option value="">Todas las ligas</option>
              {leagues?.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </Select>
          </div>
          <div style={{ minWidth: 160 }}>
            <Select
              id="team-format-filter"
              label="Formato"
              value={filters.format ?? ''}
              onChange={(e) =>
                setFilters((f) => ({
                  ...f,
                  format: e.target.value || undefined,
                }))
              }
            >
              <option value="">Todos</option>
              {(['1V1', '3V3', '5V5', '6V6', '7V7', '9V9', '11V11'] as LeagueFormat[]).map((f) => (
                <option key={f} value={f}>
                  {FORMAT_LABEL[f]}
                </option>
              ))}
            </Select>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setFilters({})}
            disabled={!filters.q && !filters.leagueId && !filters.format}
          >
            Limpiar
          </Button>
        </div>
      </Card>

      {error && <Banner tone="error">{error.message}</Banner>}
      {actionError && <Banner tone="error">{actionError}</Banner>}

      {isLoading && !teams && (
        <p className="muted">Cargando equipos…</p>
      )}

      {teams && teams.length === 0 && !isLoading && (
        <EmptyState
          title="Sin equipos todavía"
          description={
            isAdmin
              ? 'Crea el primer equipo para empezar.'
              : 'Pídele a un admin que registre al menos un equipo.'
          }
          actions={
            isAdmin && (
              <Button onClick={() => setModal({ kind: 'create' })}>
                + Crear equipo
              </Button>
            )
          }
        />
      )}

      {teams && teams.length > 0 && (
        <div className="grid-cards">
          {teams.map((t) => {
            const league = t.currentLeagueId ? leagueIndex.get(t.currentLeagueId) : null;
            return (
              <Card key={t.id} as="article" className="team-card">
                <div className="team-card__top">
                  <TeamBadge team={t} size="md" />
                  <div className="team-card__heading">
                    <h3 style={{ fontSize: 'var(--text-xl)' }}>
                      <Link to={`/teams/${t.id}`} className="team-card__link">
                        {t.name}
                      </Link>
                    </h3>
                    <span className="team-card__short">{t.shortName}</span>
                  </div>
                </div>
                <div className="team-card__meta">
                  {league && (
                    <span className="muted" style={{ fontSize: 'var(--text-sm)' }}>
                      {league.name}
                    </span>
                  )}
                  {t.currentLeagueFormat && (
                    <Chip tone="default">{FORMAT_LABEL[t.currentLeagueFormat]}</Chip>
                  )}
                  {league?.dayOfWeek && (
                    <Chip tone="cyan">
                      {WEEK_DAY_SHORT[league.dayOfWeek]}
                      {league.timeSlot ? ` ${TIME_SLOT_LABEL[league.timeSlot]}` : ''}
                    </Chip>
                  )}
                </div>
                {isAdmin && (
                  <div className="collection-card__actions">
                    <Button
                      size="sm"
                      variant="cyan"
                      onClick={() => setModal({ kind: 'edit', team: t })}
                    >
                      Editar
                    </Button>
                    <Button
                      size="sm"
                      variant="coral"
                      onClick={() => setModal({ kind: 'delete', team: t })}
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
        title="Crear equipo"
        description="Da de alta un nuevo equipo en el sistema."
      >
        <TeamForm onSaved={handleSaved} onCancel={closeModal} />
      </Modal>

      <Modal
        open={modal.kind === 'edit'}
        onClose={closeModal}
        title="Editar equipo"
        description={modal.kind === 'edit' ? modal.team.name : ''}
      >
        {modal.kind === 'edit' && (
          <TeamForm team={modal.team} onSaved={handleSaved} onCancel={closeModal} />
        )}
      </Modal>

      <ConfirmDialog
        open={modal.kind === 'delete'}
        title="¿Eliminar equipo?"
        message={
          modal.kind === 'delete'
            ? `Vas a hacer soft-delete de "${modal.team.name}". No se mostrará en los listados pero las membresías históricas se mantienen.`
            : ''
        }
        confirmLabel="Eliminar"
        onConfirm={handleDelete}
        onClose={closeModal}
      />
    </div>
  );
}
