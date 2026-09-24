import { Link } from 'react-router-dom';
import type { Match, MatchTeamSummary } from '../types/match';
import { STATUS_LABEL, STATUS_TONE } from '../types/match';
import { TeamBadge } from './TeamBadge';
import { Chip } from './ui/Chip';
import { MOCK_TEAMS } from '../mocks/teams';
import {
  FORMAT_LABEL,
  TIME_SLOT_LABEL,
  WEEK_DAY_SHORT,
} from '../types/league';
import type { League, LeagueFormat, TimeSlot, WeekDay } from '../types/league';
import { MOCK_LEAGUES } from '../mocks/teams';

interface MatchScoreboardProps {
  match: Match;
  /** Optional resolved team/league data (real backend). Falls back to mocks. */
  homeTeam?: MatchTeamSummary | null;
  awayTeam?: MatchTeamSummary | null;
  league?: League | null;
  /** Optional running minute (for LIVE mode). If null, hidden. */
  runningMinute?: number | null;
}

/**
 * The big "estrella" header for a match: two huge team badges, the
 * score in giant mono, and metadata (status, date, time, field,
 * referee, format, category). Used at the top of the Match Detail
 * page and re-used in cards elsewhere.
 */
export function MatchScoreboard({
  match,
  homeTeam,
  awayTeam,
  league: leagueProp,
  runningMinute,
}: MatchScoreboardProps) {
  const home = homeTeam ?? match.homeTeam ?? MOCK_TEAMS.find((t) => t.id === match.homeTeamId) ?? null;
  const away = awayTeam ?? match.awayTeam ?? MOCK_TEAMS.find((t) => t.id === match.awayTeamId) ?? null;
  const league = leagueProp ?? (MOCK_LEAGUES.find((l) => l.id === match.leagueId) as League | undefined);
  const date = new Date(match.scheduledAt);
  const time = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  const dayLabel = `${WEEK_DAY_SHORT[weekdayFromDate(date)] ?? ''} ${date.getDate()}`;

  const homeScore = match.homeScore;
  const awayScore = match.awayScore;
  const showScore =
    match.status === 'IN_PROGRESS' || match.status === 'COMPLETED';

  return (
    <div className={`match-scoreboard match-scoreboard--${match.status.toLowerCase()}`}>
      <div className="match-scoreboard__row">
        <Link
          to={home ? `/teams/${home.id}` : '#'}
          className="match-scoreboard__side"
        >
          <TeamBadge team={badgeTeam(home, match.homeTeamId)} size="xl" />
          <div className="match-scoreboard__name">{home?.name ?? match.homeTeamId}</div>
        </Link>

        <div className="match-scoreboard__center">
          {showScore ? (
            <div className="match-scoreboard__score" aria-label={`Marcador ${homeScore} a ${awayScore}`}>
              <span className="match-scoreboard__score-num">{homeScore ?? 0}</span>
              <span className="match-scoreboard__score-sep">:</span>
              <span className="match-scoreboard__score-num">{awayScore ?? 0}</span>
            </div>
          ) : (
            <div className="match-scoreboard__score match-scoreboard__score--pending">
              VS
            </div>
          )}
          {runningMinute != null && (
            <div className="match-scoreboard__clock">
              <span className="match-scoreboard__clock-num">{runningMinute}'</span>
              <span className="match-scoreboard__clock-label">en juego</span>
            </div>
          )}
        </div>

        <Link
          to={away ? `/teams/${away.id}` : '#'}
          className="match-scoreboard__side match-scoreboard__side--away"
        >
          <TeamBadge team={badgeTeam(away, match.awayTeamId)} size="xl" />
          <div className="match-scoreboard__name">{away?.name ?? match.awayTeamId}</div>
        </Link>
      </div>

      <div className="match-scoreboard__meta">
        <Chip tone={STATUS_TONE[match.status]}>{STATUS_LABEL[match.status]}</Chip>
        {league?.format && (
          <Chip tone="lime">{FORMAT_LABEL[league.format as LeagueFormat]}</Chip>
        )}
        {league?.category && <Chip tone="magenta">{league.category}</Chip>}
        <span className="match-scoreboard__time">🕒 {dayLabel} · {time}</span>
        {league?.dayOfWeek && league.timeSlot && (
          <Chip tone="cyan">
            {WEEK_DAY_SHORT[league.dayOfWeek as WeekDay]}{' '}
            {TIME_SLOT_LABEL[league.timeSlot as TimeSlot]}
          </Chip>
        )}
        {match.scoringMode && (
          <Chip tone="default">Modo {match.scoringMode}</Chip>
        )}
        {match.refereeId && (
          <Chip tone="ref">Árbitro: {match.refereeId}</Chip>
        )}
      </div>
    </div>
  );
}

function placeholder(id: string) {
  return {
    name: `Equipo ${id.slice(-3)}`,
    shortName: id.slice(-3).toUpperCase(),
    emoji: '⚽',
    primaryColor: '#ECECEC',
    secondaryColor: '#0A0A0A',
  };
}

type BadgeTeam = ReturnType<typeof placeholder>;

function badgeTeam(
  team: { name: string; shortName: string; emoji?: string | null; primaryColor: string; secondaryColor: string } | null,
  id: string,
): BadgeTeam {
  if (!team) return placeholder(id);
  return {
    name: team.name,
    shortName: team.shortName,
    emoji: team.emoji ?? '⚽',
    primaryColor: team.primaryColor,
    secondaryColor: team.secondaryColor,
  };
}

function weekdayFromDate(d: Date): WeekDay {
  const map: WeekDay[] = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
  return map[d.getDay()]!;
}
