import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { matchesApi } from '../api/matches';
import { useUserById } from '../hooks/playerStats';
import type { Match } from '../types/match';
import type { MatchEvent } from '../types/matchEvent';

/**
 * Scoreboard-style banner for a finished match, used by the admin
 * dashboard ("Últimos partidos finalizados").
 *
 * Laid out like a match poster: both crests flank a big score, the
 * kickoff date reads as a headline strip, and the referee plus the
 * scorers sit in a footer. Event names are resolved lazily per match
 * so the dashboard does not fan out one request per banner up-front.
 */

interface MatchBannerProps {
  match: Match;
}

interface ScorerLine {
  name: string;
  teamId: string;
  minute: number;
}

/** Groups the GOAL events of a match into one readable line per team. */
function formatScorers(events: MatchEvent[]): ScorerLine[] {
  return events
    .filter((e) => e.type === 'GOAL')
    .map((e) => ({
      name: e.playerName || e.playerId,
      teamId: e.teamId,
      minute: e.minute,
    }))
    .sort((a, b) => a.minute - b.minute);
}

const DAY_LABEL = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MONTH_LABEL = [
  'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
  'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic',
];

/** "Jue 10 · 19:00" plus a year when the match is not from this one. */
function formatKickoff(iso: string): { day: string; time: string; year: string } {
  const d = new Date(iso);
  return {
    day: `${DAY_LABEL[d.getDay()]} ${d.getDate()} ${MONTH_LABEL[d.getMonth()]}`,
    time: `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`,
    year: String(d.getFullYear()),
  };
}

export function MatchBanner({ match }: MatchBannerProps) {
  const [events, setEvents] = useState<MatchEvent[]>([]);

  useEffect(() => {
    let cancelled = false;
    matchesApi
      .listEvents(match.id)
      .then((rows) => {
        if (!cancelled) setEvents(rows);
      })
      .catch(() => {
        if (!cancelled) setEvents([]);
      });
    return () => {
      cancelled = true;
    };
  }, [match.id]);

  const kickoff = formatKickoff(match.scheduledAt);
  const scorers = formatScorers(events);
  const homeScorers = scorers.filter((s) => s.teamId === match.homeTeamId);
  const awayScorers = scorers.filter((s) => s.teamId === match.awayTeamId);

  const home = match.homeTeam;
  const away = match.awayTeam;
  // A team wins if it scored more; both null/zero is a draw.
  const homeWin = (match.homeScore ?? 0) > (match.awayScore ?? 0);
  const awayWin = (match.awayScore ?? 0) > (match.homeScore ?? 0);

  return (
    <li className="match-banner">
      <Link to={`/matches/${match.id}`} className="match-banner__link">
        {/* Date strip */}
        <div className="match-banner__date">
          <span className="match-banner__day">{kickoff.day}</span>
          <span className="match-banner__time">{kickoff.time}</span>
          <span className="match-banner__year">{kickoff.year}</span>
        </div>

        {/* Teams + score */}
        <div className="match-banner__teams">
          <div className={`match-banner__side ${homeWin ? 'is-winner' : ''}`.trim()}>
            <span className="match-banner__crest" aria-hidden="true">
              {home?.emoji ?? '⚽'}
            </span>
            <span className="match-banner__name">{home?.shortName ?? '?'}</span>
          </div>

          <div className="match-banner__score">
            <span className="match-banner__score-num">{match.homeScore ?? 0}</span>
            <span className="match-banner__score-sep">–</span>
            <span className="match-banner__score-num">{match.awayScore ?? 0}</span>
          </div>

          <div className={`match-banner__side ${awayWin ? 'is-winner' : ''}`.trim()}>
            <span className="match-banner__crest" aria-hidden="true">
              {away?.emoji ?? '⚽'}
            </span>
            <span className="match-banner__name">{away?.shortName ?? '?'}</span>
          </div>
        </div>

        {/* Scorers */}
        {(homeScorers.length > 0 || awayScorers.length > 0) && (
          <div className="match-banner__scorers">
            <span className="match-banner__scorers-line">
              {homeScorers.length > 0 ? (
                <>
                  <BallIconMini /> {homeScorers.map((s) => `${s.name} ${s.minute}'`).join(' · ')}
                </>
              ) : (
                '—'
              )}
            </span>
            <span className="match-banner__scorers-line">
              {awayScorers.length > 0 ? (
                <>
                  <BallIconMini /> {awayScorers.map((s) => `${s.name} ${s.minute}'`).join(' · ')}
                </>
              ) : (
                '—'
              )}
            </span>
          </div>
        )}

        {/* Footer */}
        <div className="match-banner__footer">
          <span className="match-banner__referee">
            {match.referee?.fullName ? `Árbitro: ${match.referee.fullName}` : 'Sin árbitro asignado'}
          </span>
          {match.field?.name && <span className="match-banner__field">{match.field.name}</span>}
        </div>
      </Link>
    </li>
  );
}

/** Tiny inline ball used as the scorer bullet (semantic, not an emoji). */
function BallIconMini() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" aria-hidden="true" className="match-banner__ball">
      <circle cx="12" cy="12" r="9" fill="currentColor" />
      <polygon points="12,7 14.5,10 13.5,13.5 10.5,13.5 9.5,10" fill="var(--color-bg)" />
    </svg>
  );
}

/** Resolves a referee id to a name for callers that only have the id. */
export function useRefereeName(refereeId: string | null | undefined) {
  return useUserById(refereeId);
}