import { useEffect, useMemo, useState } from 'react';
import { Button } from './ui/Button';
import { Select } from './ui/Select';
import { TextField } from './ui/TextField';
import { Banner } from './ui/Banner';
import { Chip } from './ui/Chip';
import { EVENT_LABEL, EVENT_TONE } from '../types/matchEvent';
import type { MatchEventCreateInput, MatchEventType } from '../types/matchEvent';
import type { MatchTeamSummary } from '../types/match';
import type { TeamMemberPublic } from '../types/team';

export interface EventQuickAddProps {
  homeTeamId: string;
  awayTeamId: string;
  /** Default minute (e.g. the running clock's minute). */
  defaultMinute: number;
  /** Default type, usually GOAL. */
  defaultType?: MatchEventType;
  /** Force the team to one side (used by the "+ Gol local" buttons). */
  forcedTeamId?: string;
  /** Optional resolved team data (real backend). Falls back to mocks. */
  homeTeam?: MatchTeamSummary | null;
  awayTeam?: MatchTeamSummary | null;
  /** Optional real roster provider. Falls back to mocks when absent. */
  rosterFor?: (teamId: string) => TeamMemberPublic[];
  onSubmit: (input: MatchEventCreateInput) => void;
  onCancel: () => void;
}

/**
 * Modal-style form to add a single match event in one click.
 *
 * Used by both LIVE mode (quick "+ Gol local" buttons) and the
 * POST_MATCH bulk editor (the form just keeps its state per row).
 */
export function EventQuickAdd({
  homeTeamId,
  awayTeamId,
  defaultMinute,
  defaultType = 'GOAL',
  forcedTeamId,
  homeTeam,
  awayTeam,
  rosterFor,
  onSubmit,
  onCancel,
}: EventQuickAddProps) {
  const [type, setType] = useState<MatchEventType>(defaultType);
  const [minute, setMinute] = useState<string>(String(defaultMinute));
  const [teamId, setTeamId] = useState<string>(forcedTeamId ?? homeTeamId);
  const [playerId, setPlayerId] = useState<string>('');
  const [secondaryPlayerId, setSecondaryPlayerId] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  // Sync teamId when forcedTeamId changes (from the parent buttons).
  useEffect(() => {
    if (forcedTeamId) setTeamId(forcedTeamId);
  }, [forcedTeamId]);

  // When type changes, reset secondary player (e.g. for GOAL it's the
  // assister; for SUBSTITUTION it's the incoming player).
  useEffect(() => {
    setSecondaryPlayerId('');
  }, [type]);

  const teamSummary =
    teamId === homeTeamId ? homeTeam : teamId === awayTeamId ? awayTeam : null;
  // Names always come from the resolved match payload — never from a
  // catalog that no longer matches the ids the backend returns.
  const teamShort = teamSummary?.shortName;
  const teamEmoji = teamSummary?.emoji;

  const roster = useMemo(() => {
    if (rosterFor) {
      return rosterFor(teamId).map((m) => ({
        userId: m.userId,
        jerseyNumber: m.jerseyNumber,
        position: m.position,
        name: `${m.firstName} ${m.paternalSurname}`.trim(),
      }));
    }
    return [];
  }, [rosterFor, teamId]);

  const homeName = homeTeam?.name ?? 'Local';
  const awayName = awayTeam?.name ?? 'Visita';

  function submit() {
    setError(null);
    const min = Number(minute);
    if (!Number.isInteger(min) || min < 0 || min > 130) {
      setError('Minuto inválido (0-130).');
      return;
    }
    if (!playerId) {
      setError('Selecciona un jugador.');
      return;
    }
    onSubmit({
      minute: min,
      type,
      teamId,
      playerId,
      secondaryPlayerId: secondaryPlayerId || null,
      notes: notes || null,
    });
  }

  return (
    <div className="form" style={{ minWidth: 320 }}>
      <div className="row-3 row-wrap">
        <Chip tone={EVENT_TONE[type]}>{EVENT_LABEL[type]}</Chip>
        {teamShort && (
          <Chip tone="default">
            {teamEmoji} {teamShort}
          </Chip>
        )}
      </div>

      <div className="form-grid-2">
        <Select
          id="event-type"
          label="Tipo de evento"
          value={type}
          onChange={(e) => setType(e.target.value as MatchEventType)}
        >
          {Object.entries(EVENT_LABEL).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </Select>

        <TextField
          id="event-minute"
          label="Minuto"
          type="number"
          inputMode="numeric"
          min={0}
          max={130}
          value={minute}
          onChange={(e) => setMinute(e.target.value)}
        />
      </div>

      <Select
        id="event-team"
        label="Equipo"
        value={teamId}
        onChange={(e) => {
          setTeamId(e.target.value);
          setPlayerId('');
        }}
      >
        <option value={homeTeamId}>
          🏠 {homeName}
        </option>
        <option value={awayTeamId}>
          ✈️ {awayName}
        </option>
      </Select>

      <Select
        id="event-player"
        label="Jugador"
        value={playerId}
        onChange={(e) => setPlayerId(e.target.value)}
      >
        <option value="">— Selecciona —</option>
        {roster.map((r) => (
          <option key={r.userId} value={r.userId}>
            #{r.jerseyNumber} · {r.name}
          </option>
        ))}
      </Select>

      {(type === 'GOAL' || type === 'SUBSTITUTION') && (
        <Select
          id="event-secondary"
          label={type === 'GOAL' ? 'Asistencia (opcional)' : 'Entra (opcional)'}
          value={secondaryPlayerId}
          onChange={(e) => setSecondaryPlayerId(e.target.value)}
        >
          <option value="">— Ninguno —</option>
          {roster
            .filter((r) => r.userId !== playerId)
            .map((r) => (
              <option key={r.userId} value={r.userId}>
                #{r.jerseyNumber} · {r.name}
              </option>
            ))}
        </Select>
      )}

      <TextField
        id="event-notes"
        label="Notas (opcional)"
        placeholder="Ej: gol de cabeza tras centro de córner"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
      />

      {error && <Banner tone="error">{error}</Banner>}

      <div className="row-3 row-end row-wrap">
        <Button variant="ghost" size="sm" onClick={onCancel}>
          Cancelar
        </Button>
        <Button size="sm" onClick={submit}>
          Agregar evento
        </Button>
      </div>
    </div>
  );
}
