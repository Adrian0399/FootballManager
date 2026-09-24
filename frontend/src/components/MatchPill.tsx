import { Link } from 'react-router-dom';
import type { Match, MatchTeamSummary } from '../types/match';
import { STATUS_LABEL, STATUS_TONE } from '../types/match';
import { TeamBadge } from './TeamBadge';
import { Chip } from './ui/Chip';
import { MOCK_TEAMS } from '../mocks/teams';

interface MatchPillProps {
  match: Match;
  /** Render as draggable. Default true. */
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  onDragEnd?: (e: React.DragEvent) => void;
  isDragging?: boolean;
}

/**
 * Compact visual card for a single Match.
 *
 * Layout (left → right):
 *   [home badge] [home name] [score "X - Y"] [away name] [away badge] [status]
 *
 * The whole card is a `<Link>` to the future match detail page so the
 * user can click through anywhere. Drag handlers are still attached —
 * the link's `onClick` short-circuits while a drag is in progress.
 */
export function MatchPill({
  match,
  draggable = true,
  onDragStart,
  onDragEnd,
  isDragging,
}: MatchPillProps) {
  const home = resolveTeam(match.homeTeam, match.homeTeamId);
  const away = resolveTeam(match.awayTeam, match.awayTeamId);

  const score = formatScore(match);
  const time = formatTime(match.scheduledAt);
  const field = match.fieldId ?? '—';

  return (
    <div
      className={`match-pill ${isDragging ? 'is-dragging' : ''} match-pill--${match.status.toLowerCase()}`.trim()}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      <div className="match-pill__handle" aria-hidden="true" title="Arrastra para mover de jornada">⋮⋮</div>

      <TeamBadge team={home ?? placeholderTeam(match.homeTeamId)} size="sm" />
      <span className="match-pill__home" title={home?.name ?? match.homeTeamId}>
        {home?.shortName ?? match.homeTeamId.slice(-3)}
      </span>

      <span className="match-pill__score" aria-label={`Marcador ${score}`}>
        {score}
      </span>

      <span className="match-pill__away" title={away?.name ?? match.awayTeamId}>
        {away?.shortName ?? match.awayTeamId.slice(-3)}
      </span>
      <TeamBadge team={away ?? placeholderTeam(match.awayTeamId)} size="sm" />

      <div className="match-pill__meta">
        <span className="match-pill__time">{time}</span>
        <span className="match-pill__field" title={field}>
          🏟 {shortenField(field)}
        </span>
      </div>

      <Chip tone={STATUS_TONE[match.status]}>{STATUS_LABEL[match.status]}</Chip>

      <Link
        to={`/matches/${match.id}`}
        className="match-pill__link"
        aria-label={`Ver detalle del partido ${home?.shortName ?? '?'} vs ${away?.shortName ?? '?'}`}
        onClick={(e) => e.stopPropagation()}
      >
        →
      </Link>
    </div>
  );
}

function formatScore(m: Match): string {
  if (m.status === 'SCHEDULED' || m.status === 'POSTPONED' || m.status === 'CANCELLED') {
    return '—';
  }
  return `${m.homeScore ?? 0} - ${m.awayScore ?? 0}`;
}

function formatTime(iso: string): string {
  // Localized hh:mm. We strip seconds if present.
  const t = iso.slice(11, 16);
  return t || '';
}

function shortenField(fieldId: string): string {
  // Real field names are long (e.g. "Complejo Norte — Cancha 1"). Show
  // the trailing part after the last " — ".
  if (fieldId === '—') return '—';
  const idx = fieldId.lastIndexOf('—');
  if (idx === -1) return fieldId;
  return fieldId.slice(idx + 1).trim();
}

function placeholderTeam(id: string) {
  return {
    name: `Equipo ${id.slice(-3)}`,
    shortName: id.slice(-3).toUpperCase(),
    emoji: '⚽',
    primaryColor: '#ECECEC',
    secondaryColor: '#0A0A0A',
  };
}

/** Prefer the team summary embedded in the match; fall back to mock/placeholder. */
function resolveTeam(summary: MatchTeamSummary | null | undefined, id: string) {
  if (summary) {
    return {
      name: summary.name,
      shortName: summary.shortName,
      emoji: summary.emoji ?? '⚽',
      primaryColor: summary.primaryColor,
      secondaryColor: summary.secondaryColor,
    };
  }
  return MOCK_TEAMS.find((t) => t.id === id) ?? placeholderTeam(id);
}
