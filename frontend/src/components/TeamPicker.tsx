import { useMemo, useState } from 'react';
import type { Team } from '../types/team';
import type { LeagueTeam } from '../types/leagueTeam';
import { useAvailableTeams } from '../hooks/leagueTeams';
import { TextField } from './ui/TextField';
import { Button } from './ui/Button';
import { TeamBadge } from './TeamBadge';
import { Banner } from './ui/Banner';
import { shuffle } from '../utils/shuffle';

interface TeamPickerProps {
  leagueId: string;
  /** Already-assigned teams, in seed order. */
  assigned: LeagueTeam[];
  /** Max teams allowed in the league. Triggers the over-capacity warning. */
  maxTeams: number;
  /** Notified whenever the user changes the assigned list (locally). */
  onChange: (next: LeagueTeam[]) => void;
  /** Whether the picker is editable. False = read-only. */
  readOnly?: boolean;
  /**
   * Catalog of real teams (id → Team), used to resolve the names of the
   * already-assigned teams. Without it the picker falls back to the mock
   * dataset, which no longer matches the ids the backend returns.
   */
  teams?: Team[];
}

/**
 * Two-pane team assignment picker.
 *
 * Left  — "Disponibles": teams not yet in this league, searchable.
 * Right — "Asignados": teams in this league, in seed order.
 *
 * Interactions (HTML5 native drag & drop, works on desktop):
 *   - Drag a card from one pane to the other to assign / unassign.
 *   - Drag within "Asignados" to reorder (changes `seed`).
 *   - Click "→" / "←" buttons for keyboard / mobile support.
 *   - "Orden aleatorio" shuffles the seed order in place.
 *
 * The "maxTeams" warning fires when the assigned count exceeds the
 * league's configured cap; per the roadmap §1 rule 3, we *advise* but
 * don't auto-evict.
 */
export function TeamPicker({
  leagueId,
  assigned,
  maxTeams,
  onChange,
  readOnly = false,
  teams,
}: TeamPickerProps) {
  const [search, setSearch] = useState('');
  const availableQuery = useAvailableTeams(leagueId, search);
  const available: Team[] = availableQuery.data ?? [];

  // Resolve the display data of the already-assigned teams. The parent may
  // pass the real catalog; otherwise fall back to the available list (which
  // is empty for assigned teams) so we never render a stale mock id.
  const teamById = useMemo(() => {
    const map = new Map<string, Team>();
    for (const t of teams ?? []) map.set(t.id, t);
    for (const t of available) map.set(t.id, t);
    return map;
  }, [teams, available]);
  const isLoadingAvailable = availableQuery.isLoading;

  // Track which team is being dragged across panes.
  const [draggingTeamId, setDraggingTeamId] = useState<string | null>(null);

  const assignedTeamIds = useMemo(
    () => new Set(assigned.map((lt) => lt.teamId)),
    [assigned],
  );

  const overCapacity = assigned.length > maxTeams;

  // ----- Drag handlers ------------------------------------------------------

  const onDragStart = (teamId: string) => (e: React.DragEvent) => {
    if (readOnly) {
      e.preventDefault();
      return;
    }
    setDraggingTeamId(teamId);
    e.dataTransfer.effectAllowed = 'move';
    // Firefox requires setData to fire the drag.
    e.dataTransfer.setData('text/plain', teamId);
  };

  const onDragEnd = () => setDraggingTeamId(null);

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  // Drop on the "Asignados" pane: either insert at the end (new assign)
  // or reorder to a specific position.
  const onDropAssigned = (e: React.DragEvent) => {
    e.preventDefault();
    const teamId = e.dataTransfer.getData('text/plain') || draggingTeamId;
    if (!teamId) return;
    setDraggingTeamId(null);
    assign(teamId);
  };

  // Drop on a specific row in "Asignados" to insert *before* that row.
  const onDropAssignedAt = (insertBeforeTeamId: string) => (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const teamId = e.dataTransfer.getData('text/plain') || draggingTeamId;
    if (!teamId || teamId === insertBeforeTeamId) return;
    setDraggingTeamId(null);
    insertAssigned(teamId, insertBeforeTeamId);
  };

  const onDropAvailable = (e: React.DragEvent) => {
    e.preventDefault();
    const teamId = e.dataTransfer.getData('text/plain') || draggingTeamId;
    if (!teamId) return;
    setDraggingTeamId(null);
    unassign(teamId);
  };

  // ----- Mutators (operate on the local `assigned` list) ---------------------

  function reSeed(list: LeagueTeam[]): LeagueTeam[] {
    return list.map((lt, idx) => ({ ...lt, seed: idx + 1 }));
  }

  function assign(teamId: string) {
    if (assignedTeamIds.has(teamId)) return;
    const next: LeagueTeam[] = reSeed([
      ...assigned,
      {
        leagueId,
        teamId,
        seed: assigned.length + 1,
        groupLabel: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ]);
    onChange(next);
  }

  function insertAssigned(teamId: string, beforeTeamId: string) {
    // If the team is already assigned, just move it; otherwise add.
    const without = assigned.filter((lt) => lt.teamId !== teamId);
    const idx = without.findIndex((lt) => lt.teamId === beforeTeamId);
    const newRow: LeagueTeam = {
      leagueId,
      teamId,
      seed: 0,
      groupLabel: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const next =
      idx === -1
        ? [...without, newRow]
        : [...without.slice(0, idx), newRow, ...without.slice(idx)];
    onChange(reSeed(next));
  }

  function unassign(teamId: string) {
    onChange(reSeed(assigned.filter((lt) => lt.teamId !== teamId)));
  }

  function moveUp(teamId: string) {
    const idx = assigned.findIndex((lt) => lt.teamId === teamId);
    if (idx <= 0) return;
    const next = [...assigned];
    [next[idx - 1], next[idx]] = [next[idx]!, next[idx - 1]!];
    onChange(reSeed(next));
  }

  function moveDown(teamId: string) {
    const idx = assigned.findIndex((lt) => lt.teamId === teamId);
    if (idx === -1 || idx >= assigned.length - 1) return;
    const next = [...assigned];
    [next[idx], next[idx + 1]] = [next[idx + 1]!, next[idx]!];
    onChange(reSeed(next));
  }

  function shuffleAssigned() {
    onChange(reSeed(shuffle(assigned)));
  }

  // ----- Render -------------------------------------------------------------

  return (
    <div className="team-picker" data-readonly={readOnly || undefined}>
      {overCapacity && (
        <Banner tone="warning">
          Tienes {assigned.length} equipos asignados pero la liga permite
          máximo {maxTeams}. Reduce la lista o sube el tope en la
          configuración de la liga.
        </Banner>
      )}

      <div className="team-picker__panes">
        {/* ----- Available ----- */}
        <section
          className="team-picker__pane"
          aria-label="Equipos disponibles"
          onDragOver={onDragOver}
          onDrop={onDropAvailable}
        >
          <header className="team-picker__pane-header">
            <h3 style={{ fontSize: 'var(--text-lg)' }}>
              Disponibles
              <span className="muted" style={{ marginLeft: 'var(--space-2)' }}>
                ({available.length})
              </span>
            </h3>
            <TextField
              id="tp-search"
              label="Buscar"
              placeholder="Buscar equipo…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </header>
          <div className="team-picker__list">
            {isLoadingAvailable && (
              <p className="muted" style={{ padding: 'var(--space-3)' }}>
                Cargando…
              </p>
            )}
            {!isLoadingAvailable && available.length === 0 && (
              <p className="muted" style={{ padding: 'var(--space-3)' }}>
                {search ? 'Sin coincidencias.' : 'Todos los equipos ya están asignados.'}
              </p>
            )}
            {available.map((t) => (
              <button
                key={t.id}
                type="button"
                className={`team-picker__card ${draggingTeamId === t.id ? 'is-dragging' : ''}`.trim()}
                draggable={!readOnly}
                onDragStart={onDragStart(t.id)}
                onDragEnd={onDragEnd}
                onClick={() => !readOnly && assign(t.id)}
                title={readOnly ? t.name : `Click o arrastra para asignar a ${t.name}`}
              >
                <TeamBadge team={t} size="sm" />
                <div className="team-picker__card-body">
                  <span className="team-picker__card-name">{t.name}</span>
                  <span className="team-picker__card-meta">
                    {t.shortName} · {t.emoji}
                  </span>
                </div>
                <span className="team-picker__card-arrow" aria-hidden="true">→</span>
              </button>
            ))}
          </div>
        </section>

        {/* ----- Assigned ----- */}
        <section
          className="team-picker__pane team-picker__pane--assigned"
          aria-label="Equipos asignados a la liga"
          onDragOver={onDragOver}
          onDrop={onDropAssigned}
        >
          <header className="team-picker__pane-header">
            <h3 style={{ fontSize: 'var(--text-lg)' }}>
              Asignados a la liga
              <span className="muted" style={{ marginLeft: 'var(--space-2)' }}>
                ({assigned.length} / {maxTeams})
              </span>
            </h3>
            <Button
              size="sm"
              variant="cyan"
              onClick={shuffleAssigned}
              disabled={readOnly || assigned.length < 2}
              title="Mezclar el orden (asignar seed aleatorio)"
            >
              Orden aleatorio
            </Button>
          </header>
          <div className="team-picker__list">
            {assigned.length === 0 && (
              <p className="muted" style={{ padding: 'var(--space-3)' }}>
                Arrastra equipos desde la columna izquierda o haz click en
                una card para asignarlos.
              </p>
            )}
            {assigned.map((lt, idx) => {
              const team = teamById.get(lt.teamId);
              if (!team) {
                return (
                  <div
                    key={lt.teamId}
                    className="team-picker__row is-ghost"
                    title="Equipo no encontrado en el catálogo de mocks"
                  >
                    <span className="team-picker__seed">#{lt.seed}</span>
                    <span className="muted">Equipo {lt.teamId} (no en mocks)</span>
                  </div>
                );
              }
              return (
                <div
                  key={lt.teamId}
                  className={`team-picker__row ${draggingTeamId === lt.teamId ? 'is-dragging' : ''}`.trim()}
                  draggable={!readOnly}
                  onDragStart={onDragStart(lt.teamId)}
                  onDragEnd={onDragEnd}
                  onDragOver={onDragOver}
                  onDrop={onDropAssignedAt(lt.teamId)}
                >
                  <span className="team-picker__seed" aria-label={`Seed ${lt.seed}`}>
                    #{lt.seed}
                  </span>
                  <TeamBadge team={team} size="sm" />
                  <div className="team-picker__card-body">
                    <span className="team-picker__card-name">{team.name}</span>
                    <span className="team-picker__card-meta">
                      {team.shortName} · {team.emoji}
                    </span>
                  </div>
                  <div className="team-picker__row-actions">
                    <button
                      type="button"
                      className="team-picker__icon-btn"
                      onClick={() => moveUp(lt.teamId)}
                      disabled={readOnly || idx === 0}
                      title="Subir"
                      aria-label={`Subir ${team.name}`}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      className="team-picker__icon-btn"
                      onClick={() => moveDown(lt.teamId)}
                      disabled={readOnly || idx === assigned.length - 1}
                      title="Bajar"
                      aria-label={`Bajar ${team.name}`}
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      className="team-picker__icon-btn team-picker__icon-btn--coral"
                      onClick={() => unassign(lt.teamId)}
                      disabled={readOnly}
                      title="Quitar"
                      aria-label={`Quitar ${team.name}`}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}


