import { Link } from 'react-router-dom';
import type { Match } from '../types/match';
import { STATUS_LABEL, STATUS_TONE, STAGE_LABEL, STAGE_SHORT } from '../types/match';
import { TeamBadge } from './TeamBadge';
import { Chip } from './ui/Chip';
import { MOCK_TEAMS } from '../mocks/teams';
import { getWinnerTeamId } from '../hooks/knockout';
import type { BracketByStage } from '../hooks/knockout';

interface BracketProps {
  byStage: BracketByStage[];
  /** Called when the user clicks a match. Optional — when omitted, the
   *  bracket renders the cards without links. */
  onMatchClick?: (match: Match) => void;
  /** Show the trophy for the champion. Default true. */
  showChampion?: boolean;
  /** Map of teamId → team data for name/badge lookup. When omitted,
   *  falls back to MOCK_TEAMS (old IDs). */
  teams?: Map<string, { id: string; name: string; shortName: string; emoji: string | null; primaryColor: string; secondaryColor: string }>;
}

/**
 * Bracket visualization: rounds as columns, matches as cards. The
 * layout is intentionally simple (no SVG) — each round sits in a
 * column and the matches are vertically distributed. The user can
 * scan a column top-to-bottom to see the progression.
 *
 * For 8 teams the layout is:
 *   [Cuartos (4)]  →  [Semis (2)]  →  [Final (1)]
 *
 * The bracket does NOT draw the connector lines that join a match
 * to its parent in the next round — the column layout makes the
 * progression clear and the lines can be added in v1.1.
 */
export function Bracket({ byStage, onMatchClick, showChampion = true, teams }: BracketProps) {
  if (byStage.length === 0) {
    return (
      <p className="muted" style={{ padding: 'var(--space-4)' }}>
        Esta liga aún no tiene fase de eliminatorias configurada.
      </p>
    );
  }

  // Find the champion match (the COMPLETED FINAL) for the trophy.
  const finalStage = byStage[byStage.length - 1];
  const finalMatch = finalStage?.matches[0] ?? null;
  const champion =
    finalMatch && finalMatch.status === 'COMPLETED' ? getWinnerTeamId(finalMatch) : null;
  const championTeam = champion
    ? (teams?.get(champion) ?? MOCK_TEAMS.find((t) => t.id === champion) ?? null)
    : null;

  return (
    <div className="bracket">
      <div className="bracket__grid">
        {byStage.map((stage) => (
          <div className={`bracket__col bracket__col--${stage.stage}`} key={stage.stage}>
            <header className="bracket__col-head">
              <h3 className="bracket__col-title">{stage.label}</h3>
              <span className="bracket__col-count">{stage.matches.length} partido{stage.matches.length === 1 ? '' : 's'}</span>
            </header>
            <div className="bracket__col-matches">
              {stage.matches.map((m) => (
                <BracketMatchCard
                  key={m.id}
                  match={m}
                  onClick={onMatchClick ? () => onMatchClick(m) : undefined}
                  teams={teams}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {showChampion && championTeam && (
        <div className="bracket__champion">
          <div className="bracket__champion-trophy" aria-hidden="true">🏆</div>
          <div className="bracket__champion-body">
            <span className="bracket__champion-label">Campeón</span>
            <Link to={`/teams/${championTeam.id}`} className="bracket__champion-name">
              {championTeam.emoji} {championTeam.name}
            </Link>
            <span className="muted" style={{ fontSize: 'var(--text-sm)' }}>
              {finalMatch?.homeScore} - {finalMatch?.awayScore} en la final
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// ----- Single match card ---------------------------------------------------

interface BracketMatchCardProps {
  match: Match;
  onClick?: () => void;
}

function BracketMatchCard({ match, onClick, teams }: BracketMatchCardProps & { teams?: Map<string, { id: string; name: string; shortName: string; emoji?: string | null; primaryColor: string; secondaryColor: string }> }) {
  const homeRaw = match.homeTeamId ? (teams?.get(match.homeTeamId) ?? MOCK_TEAMS.find((t) => t.id === match.homeTeamId) ?? null) : null;
  const awayRaw = match.awayTeamId ? (teams?.get(match.awayTeamId) ?? MOCK_TEAMS.find((t) => t.id === match.awayTeamId) ?? null) : null;
  // Normalize emoji to non-null (TeamBadge expects a string).
  const home = homeRaw ? { ...homeRaw, emoji: homeRaw.emoji ?? '⚽' } : null;
  const away = awayRaw ? { ...awayRaw, emoji: awayRaw.emoji ?? '⚽' } : null;
  const isTBD = !home || !away;
  const winnerId = getWinnerTeamId(match);
  const homeIsWinner = winnerId && home?.id === winnerId;
  const awayIsWinner = winnerId && away?.id === winnerId;

  const date = match.scheduledAt.slice(0, 10);

  const card = (
    <div
      className={`bracket-match bracket-match--${match.status.toLowerCase()} ${isTBD ? 'is-tbd' : ''}`.trim()}
    >
      <div className="bracket-match__head">
        <span className="bracket-match__pos">#{match.knockoutPosition ?? '-'}</span>
        <Chip tone={STATUS_TONE[match.status]}>{STATUS_LABEL[match.status]}</Chip>
      </div>
      <div className="bracket-match__teams">
        {home ? (
          <Link
            to={`/teams/${home.id}`}
            className={`bracket-match__side ${homeIsWinner ? 'is-winner' : ''}`}
            onClick={(e) => e.stopPropagation()}
          >
            <TeamBadge team={home} size="sm" />
            <span className="bracket-match__name">{home.shortName}</span>
            {match.homeScore != null && (
              <span className="bracket-match__score">{match.homeScore}</span>
            )}
          </Link>
        ) : (
          <div className="bracket-match__side is-tbd-side">
            <span className="bracket-match__name">TBD</span>
          </div>
        )}
        {away ? (
          <Link
            to={`/teams/${away.id}`}
            className={`bracket-match__side ${awayIsWinner ? 'is-winner' : ''}`}
            onClick={(e) => e.stopPropagation()}
          >
            <TeamBadge team={away} size="sm" />
            <span className="bracket-match__name">{away.shortName}</span>
            {match.awayScore != null && (
              <span className="bracket-match__score">{match.awayScore}</span>
            )}
          </Link>
        ) : (
          <div className="bracket-match__side is-tbd-side">
            <span className="bracket-match__name">TBD</span>
          </div>
        )}
      </div>
      <div className="bracket-match__foot">
        <span className="muted" style={{ fontSize: 'var(--text-xs)' }}>{date}</span>
        {match.fieldId && (
          <span className="muted" style={{ fontSize: 'var(--text-xs)' }}>🏟 {match.fieldId}</span>
        )}
      </div>
    </div>
  );

  if (onClick && !isTBD && match.status !== 'SCHEDULED') {
    return (
      <button
        type="button"
        className="bracket-match-button"
        onClick={onClick}
        title={`Ver detalle del partido`}
      >
        {card}
      </button>
    );
  }
  return card;
}

// Re-export for tests.
export { STAGE_LABEL, STAGE_SHORT };
