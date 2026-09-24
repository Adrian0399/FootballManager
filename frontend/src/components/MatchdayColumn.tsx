import { useState, type DragEvent } from 'react';
import type { Match, Matchday } from '../types/match';
import { MatchPill } from './MatchPill';
import { Chip } from './ui/Chip';

interface MatchdayColumnProps {
  matchday: Matchday;
  matches: Match[];
  /** Notified when a match is dropped on this column. */
  onDropMatch: (matchId: string, matchdayId: string) => void;
  /** Whether the column accepts drops (false = read-only). */
  readOnly?: boolean;
}

const DAY_NAMES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MONTH_NAMES = [
  'ene', 'feb', 'mar', 'abr', 'may', 'jun',
  'jul', 'ago', 'sep', 'oct', 'nov', 'dic',
];

/**
 * One jornada column in the fixture list. Shows the date, status and
 * all matches scheduled for that round. Doubles as a drop target so
 * matches can be dragged between columns.
 */
export function MatchdayColumn({
  matchday,
  matches,
  onDropMatch,
  readOnly,
}: MatchdayColumnProps) {
  const [dragOver, setDragOver] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  // The API returns `date` as a full ISO timestamp ("2026-09-15T00:00:00.000Z"),
// while the type documents YYYY-MM-DD. Appending "T00:00:00" to a full ISO
// string yields an Invalid Date (getDay() => NaN, rendered as
// "undefined NaN undefined"), so normalize first.
  const dateStr = String(matchday.date);
  const isoDay = /^\d{4}-\d{2}-\d{2}/.exec(dateStr)?.[0] ?? dateStr;
  const d = new Date(`${isoDay}T00:00:00`);
  const dateLabel = Number.isNaN(d.getTime())
    ? '—'
    : `${DAY_NAMES[d.getDay()]} ${d.getDate()} ${MONTH_NAMES[d.getMonth()]}`;
  const allCompleted = matches.length > 0 && matches.every((m) => m.status === 'COMPLETED');
  const anyInProgress = matches.some((m) => m.status === 'IN_PROGRESS');
  const status = allCompleted
    ? 'COMPLETADA'
    : anyInProgress
      ? 'EN JUEGO'
      : 'PENDIENTE';
  const statusTone = allCompleted
    ? 'success'
    : anyInProgress
      ? 'lime'
      : 'default';

  const onDragOver = (e: DragEvent<HTMLDivElement>) => {
    if (readOnly) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (!dragOver) setDragOver(true);
  };

  const onDragLeave = () => setDragOver(false);

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    const matchId =
      e.dataTransfer.getData('text/plain') || draggingId || '';
    if (matchId) onDropMatch(matchId, matchday.id);
  };

  return (
    <section
      className={`matchday-col ${dragOver ? 'is-drag-over' : ''} ${readOnly ? 'is-readonly' : ''}`.trim()}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <header className="matchday-col__head">
        <div className="matchday-col__heading">
          <span className="matchday-col__num">Jornada {matchday.number}</span>
          <span className="matchday-col__date">{dateLabel}</span>
        </div>
        <Chip tone={statusTone}>{status}</Chip>
      </header>

      <div className="matchday-col__matches">
        {matches.length === 0 && (
          <p className="muted" style={{ padding: 'var(--space-3)' }}>
            {readOnly
              ? 'Sin partidos en esta jornada.'
              : 'Arrastra partidos aquí o genera el fixture.'}
          </p>
        )}
        {matches.map((m) => (
          <MatchPill
            key={m.id}
            match={m}
            draggable={!readOnly}
            isDragging={draggingId === m.id}
            onDragStart={(e) => {
              if (readOnly) {
                e.preventDefault();
                return;
              }
              setDraggingId(m.id);
              e.dataTransfer.effectAllowed = 'move';
              e.dataTransfer.setData('text/plain', m.id);
            }}
            onDragEnd={() => setDraggingId(null)}
          />
        ))}
      </div>
    </section>
  );
}
