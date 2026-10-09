import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useLeagueTeams } from '../hooks/leagueTeams';
import { useLeague, useTeams } from '../hooks/teams';
import { leaguesApi } from '../api/leagues';
import { useIsAdmin } from '../hooks/useIsAdmin';
import { TeamPicker } from '../components/TeamPicker';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Banner } from '../components/ui/Banner';
import { Chip } from '../components/ui/Chip';
import { PageHeader } from '../components/ui/PageHeader';
import {
  FORMAT_LABEL,
  TIME_SLOT_LABEL,
  WEEK_DAY_SHORT,
} from '../types/league';
import type { LeagueFormat, TimeSlot, WeekDay } from '../types/league';
import type { LeagueTeam } from '../types/leagueTeam';

/**
 * /leagues/:id/teams — team assignment view (Paso 4).
 *
 * Two-pane TeamPicker: "Disponibles" (left) and "Asignados a la liga"
 * (right). Supports:
 *   - HTML5 drag&drop between panes
 *   - Click a card to add/remove (mobile + keyboard)
 *   - ↑/↓ buttons and "Orden aleatorio" inside the assigned pane
 *   - Over-capacity warning when assigned > maxTeams
 *
 * The local changes are kept in component state — saving them
 * requires a "Guardar cambios" CTA. The save action is a no-op in
 * v1.0.0 mock mode (banner "Demo") and will hit the real
 * `leaguesApi.assignTeams` endpoint in v1.1.
 */
export function LeagueTeamsPage() {
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isAdmin = useIsAdmin();
  const { data: league } = useLeague(id);
  const { data: serverAssignedRaw, refetch } = useLeagueTeams(id);
  // Real team catalog, needed to render the names of the assigned teams.
  const { data: allTeams } = useTeams();
  // Adapt to the existing local format (use id and seed from the public
  // shape, plus a synthesized membership for the TeamPicker).
  const serverAssigned = (serverAssignedRaw ?? []).map((t) => ({
    leagueId: id,
    teamId: t.id,
    seed: t.seed,
    groupLabel: null,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
  }));

  // Local working copy of the assignment. Initialised from the server
  // snapshot, then diverged on each user action.
  const [draft, setDraft] = useState<LeagueTeam[] | null>(null);
  const [saved, setSaved] = useState<boolean>(true);
  const [savingMsg, setSavingMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // First time we see the server data, copy it into the draft.
  if (draft === null && serverAssigned.length >= 0) {
    // Use a microtask to avoid the warning about setState in render.
    queueMicrotask(() => setDraft(serverAssigned));
  }

  const current: LeagueTeam[] = draft ?? serverAssigned;
  const maxTeams = league?.maxTeams ?? current.length;

  const onSave = async () => {
    setSavingMsg(null);
    setErrorMsg(null);
    setIsSaving(true);
    try {
      const currentIds = new Set(current.map((t) => t.teamId));

      // 1. Remove enrollments that are no longer in the working copy.
      for (const entry of serverAssigned) {
        if (!currentIds.has(entry.teamId)) {
          await leaguesApi.removeTeam(id, entry.teamId);
        }
      }

      // 2. Add new enrollments and persist the ordering as the seed.
      for (let i = 0; i < current.length; i += 1) {
        const teamId = current[i]!.teamId;
        const seed = i + 1;
        const serverEntry = serverAssigned.find((s) => s.teamId === teamId);
        if (!serverEntry) {
          await leaguesApi.addTeam(id, { teamId, seed });
        } else if (serverEntry.seed !== seed) {
          await leaguesApi.updateTeam(id, teamId, { seed });
        }
      }

      refetch();
      setSaved(true);
      setSavingMsg('Inscripción de equipos guardada.');
    } catch (err) {
      const message =
        (err as { response?: { data?: { error?: { message?: string } } } }).response?.data?.error
          ?.message ?? 'No se pudieron guardar los cambios.';
      setErrorMsg(message);
    } finally {
      setIsSaving(false);
    }
  };

  const onReset = () => {
    setDraft(serverAssigned);
    setSaved(true);
    setSavingMsg(null);
    setErrorMsg(null);
  };

  return (
    <div className="container section-stack">
      <PageHeader
        title={league ? `Equipos — ${league.name}` : 'Equipos de la liga'}
        description={
          league
            ? `Asigna los equipos que participarán. El orden define el seed.`
            : undefined
        }
        actions={
          <div className="row-3 row-wrap">
            <Button variant="ghost" onClick={() => navigate(`/leagues/${id}`)}>
              ← Liga
            </Button>
            {!isAdmin && (
              <Chip tone="ref">Solo lectura</Chip>
            )}
          </div>
        }
      />

      {league && (
        <div className="row-3 row-wrap" style={{ alignItems: 'center' }}>
          {league.format && (
            <Chip tone="lime">{FORMAT_LABEL[league.format as LeagueFormat]}</Chip>
          )}
          {league.category && <Chip tone="magenta">{league.category}</Chip>}
          {league.dayOfWeek && (
            <Chip tone="cyan">
              {WEEK_DAY_SHORT[league.dayOfWeek as WeekDay]}
              {league.timeSlot ? ` · ${TIME_SLOT_LABEL[league.timeSlot as TimeSlot]}` : ''}
            </Chip>
          )}
          <Chip tone="default">
            {current.length} / {maxTeams} equipos
          </Chip>
        </div>
      )}

      {savingMsg && <Banner tone="success">{savingMsg}</Banner>}
      {errorMsg && <Banner tone="error">{errorMsg}</Banner>}

      <Card>
        <TeamPicker
          leagueId={id}
          assigned={current}
          maxTeams={maxTeams}
          onChange={(next) => {
            setDraft(next);
            setSaved(false);
          }}
          readOnly={!isAdmin}
          teams={allTeams ?? []}
        />
      </Card>

      {isAdmin && (
        <div className="row-3 row-end row-wrap">
          <Button
            variant="ghost"
            onClick={onReset}
            disabled={saved || isSaving}
          >
            Descartar cambios
          </Button>
          <Button onClick={onSave} disabled={saved || isSaving}>
            {isSaving ? 'Guardando…' : saved ? 'Sin cambios' : 'Guardar cambios'}
          </Button>
        </div>
      )}

      <p className="muted" style={{ fontSize: 'var(--text-sm)' }}>
        Tip: arrastra una card entre columnas o dentro de la columna
        derecha. En móvil o teclado, usa los botones ↑ ↓ ✕.{' '}
        <Link to={`/leagues/${id}`}>← Volver al detalle de la liga</Link>
      </p>
    </div>
  );
}
