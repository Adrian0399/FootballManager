import type { MatchEvent } from '../types/matchEvent';
import { EVENT_LABEL, EVENT_TONE } from '../types/matchEvent';
import { Chip } from './ui/Chip';
import { getPlayerName, getTeamName } from '../hooks/matchEvents';

interface MatchTimelineProps {
  events: MatchEvent[];
  homeTeamId: string;
  awayTeamId: string;
  /** Optional resolved team names (real backend). Falls back to mocks. */
  homeTeamName?: string;
  awayTeamName?: string;
  /** When provided, render a remove button for each event. */
  onRemove?: (eventId: string) => void;
}

/**
 * Chronological timeline of match events. Two columns: home events
 * on the left, away on the right, with a center "minute marker"
 * that splits the two halves — a familiar football broadcast style.
 */
export function MatchTimeline({
  events,
  homeTeamId,
  awayTeamId,
  homeTeamName,
  awayTeamName,
  onRemove,
}: MatchTimelineProps) {
  if (events.length === 0) {
    return (
      <p className="muted" style={{ padding: 'var(--space-3)' }}>
        Sin eventos registrados todavía.
      </p>
    );
  }

  const home = events.filter((e) => e.teamId === homeTeamId);
  const away = events.filter((e) => e.teamId === awayTeamId);

  return (
    <div className="match-timeline">
      <div className="match-timeline__col match-timeline__col--home">
        {home.map((e) => (
          <EventCard
            key={e.id}
            event={e}
            side="home"
            teamName={homeTeamName}
            onRemove={onRemove}
          />
        ))}
      </div>
      <div className="match-timeline__col match-timeline__col--center">
        {events.map((e) => (
          <div key={e.id} className="match-timeline__minute">
            <span className="match-timeline__minute-num">{e.minute}'</span>
            {e.type === 'GOAL' && <span className="match-timeline__minute-icon">⚽</span>}
            {e.type === 'YELLOW_CARD' && <span className="match-timeline__minute-icon" style={{ color: 'var(--color-warning)' }}>🟨</span>}
            {e.type === 'RED_CARD' && <span className="match-timeline__minute-icon" style={{ color: 'var(--color-coral)' }}>🟥</span>}
            {e.type === 'SUBSTITUTION' && <span className="match-timeline__minute-icon">⇄</span>}
            {e.type === 'MVP' && <span className="match-timeline__minute-icon">★</span>}
            {e.type === 'ASSIST' && <span className="match-timeline__minute-icon">👟</span>}
            {e.type === 'NOTE' && <span className="match-timeline__minute-icon">📝</span>}
          </div>
        ))}
      </div>
      <div className="match-timeline__col match-timeline__col--away">
        {away.map((e) => (
          <EventCard
            key={e.id}
            event={e}
            side="away"
            teamName={awayTeamName}
            onRemove={onRemove}
          />
        ))}
      </div>
    </div>
  );
}

function EventCard({
  event,
  side,
  teamName,
  onRemove,
}: {
  event: MatchEvent;
  side: 'home' | 'away';
  teamName?: string;
  onRemove?: (eventId: string) => void;
}) {
  const primary = event.playerName ?? getPlayerName(event.playerId);
  const secondary = event.secondaryPlayerId
    ? (event.secondaryPlayerName ?? getPlayerName(event.secondaryPlayerId))
    : null;
  const team = teamName ?? getTeamName(event.teamId);
  return (
    <div className={`match-timeline__card match-timeline__card--${side} match-timeline__card--${event.type.toLowerCase()}`}>
      <div className="match-timeline__card-head">
        <Chip tone={EVENT_TONE[event.type]}>{EVENT_LABEL[event.type]}</Chip>
        <span className="match-timeline__card-team muted">{team}</span>
      </div>
      <div className="match-timeline__card-body">
        <strong>{primary}</strong>
        {secondary && event.type === 'GOAL' && (
          <span className="match-timeline__card-asist">
            · asist. <strong>{secondary}</strong>
          </span>
        )}
        {secondary && event.type === 'SUBSTITUTION' && (
          <span className="match-timeline__card-asist">
            · entra <strong>{secondary}</strong>
          </span>
        )}
      </div>
      {event.notes && <div className="match-timeline__card-notes">{event.notes}</div>}
      {onRemove && (
        <button
          type="button"
          className="match-timeline__remove"
          onClick={() => onRemove(event.id)}
          aria-label="Quitar evento"
          title="Quitar"
        >
          ✕
        </button>
      )}
    </div>
  );
}
