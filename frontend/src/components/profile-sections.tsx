// Visual sections for the profile dashboard.
//
// Each renderer is a small, self-contained component that owns its
// loading state. The data hook is called inside the renderer so the
// loading skeleton stays close to the section it represents (better
// perceived performance than a single global spinner).

import {
  BallIcon,
  FieldIcon,
  ShieldIcon,
  StarIcon,
  TrophyIcon,
} from './icons';
import type {
  Award,
  AwardCategory,
  MatchResult,
  ProfileStats,
  RecentMatch,
} from '../types/profile';
import {
  useAwards,
  useProfileStats,
  useRecentMatches,
} from '../hooks/profile';
import { Card } from './ui/Card';

// =========================================================================
// Shared primitives
// =========================================================================

interface StatIconProps {
  children: React.ReactNode;
  tone?: 'default' | 'cyan' | 'coral' | 'magenta' | 'lime';
}

function StatIcon({ children, tone = 'default' }: StatIconProps) {
  const toneClass = tone === 'default' ? '' : `profile-stat__icon--${tone}`;
  return <div className={`profile-stat__icon ${toneClass}`.trim()}>{children}</div>;
}

function Skeleton({ height = 24, width = '100%' }: { height?: number; width?: number | string }) {
  return (
    <span
      className="profile-skeleton"
      style={{ display: 'block', height, width }}
      aria-hidden="true"
    />
  );
}

// =========================================================================
// Stats strip — 4 small cards + 1 featured (win-rate) card
// =========================================================================

function StatsStripContent({ stats }: { stats: ProfileStats }) {
  return (
    <div className="profile-stats-strip">
      {/* Featured: win rate (the "hero" number) */}
      <div className="profile-stat profile-stat--featured">
        <StatIcon tone="lime">
          <TrophyIcon />
        </StatIcon>
        <div>
          <div className="profile-stat__value">{stats.winRate}%</div>
          <div className="profile-stat__label">Win rate</div>
        </div>
        <div className="profile-stat__sub">
          Ranking #{stats.ranking} · Racha {stats.currentStreak}W
        </div>
      </div>

      <div className="profile-stat">
        <StatIcon tone="cyan">
          <FieldIcon />
        </StatIcon>
        <div>
          <div className="profile-stat__value">{stats.matchesPlayed}</div>
          <div className="profile-stat__label">Partidos</div>
        </div>
        <div className="profile-stat__sub">
          {stats.matchesWon}G · {stats.matchesDrawn}E · {stats.matchesLost}P
        </div>
      </div>

      <div className="profile-stat">
        <StatIcon tone="coral">
          <BallIcon />
        </StatIcon>
        <div>
          <div className="profile-stat__value">{stats.goals}</div>
          <div className="profile-stat__label">Goles</div>
        </div>
        <div className="profile-stat__sub">
          {stats.assists} asist · {stats.cleanSheets} porterías
        </div>
      </div>

      <div className="profile-stat">
        <StatIcon tone="magenta">
          <StarIcon />
        </StatIcon>
        <div>
          <div className="profile-stat__value">{stats.mvpAwards}</div>
          <div className="profile-stat__label">MVPs</div>
        </div>
        <div className="profile-stat__sub">
          {stats.yellowCards} amarillas · {stats.redCards} rojas
        </div>
      </div>

      <div className="profile-stat">
        <StatIcon tone="default">
          <ShieldIcon />
        </StatIcon>
        <div>
          <div className="profile-stat__value">{stats.cleanSheets}</div>
          <div className="profile-stat__label">Porterías a cero</div>
        </div>
        <div className="profile-stat__sub">Defensa</div>
      </div>
    </div>
  );
}

function StatsStripSkeleton() {
  return (
    <div className="profile-stats-strip">
      <Skeleton height={132} />
      <Skeleton height={132} />
      <Skeleton height={132} />
      <Skeleton height={132} />
      <Skeleton height={132} />
    </div>
  );
}

export function StatsStrip({ userId }: { userId: string }) {
  const { data, isLoading } = useProfileStats(userId);
  return (
    <div className="profile-section">
      <div className="profile-section__header">
        <h2 className="profile-section__title">
          <TrophyIcon />
          Tus números
        </h2>
        <span className="profile-section__hint">Temporada actual</span>
      </div>
      {isLoading || !data ? <StatsStripSkeleton /> : <StatsStripContent stats={data} />}
    </div>
  );
}

// =========================================================================
// Recent matches list
// =========================================================================

const MONTHS_ES = [
  'ene', 'feb', 'mar', 'abr', 'may', 'jun',
  'jul', 'ago', 'sep', 'oct', 'nov', 'dic',
];

function formatDate(iso: string): { day: string; month: string } {
  const d = new Date(iso);
  return {
    day: String(d.getDate()).padStart(2, '0'),
    month: MONTHS_ES[d.getMonth()] ?? '',
  };
}

const RESULT_LABEL: Record<MatchResult, string> = {
  WIN: 'G',
  LOSS: 'P',
  DRAW: 'E',
};

const RESULT_CLASS: Record<MatchResult, string> = {
  WIN: 'profile-match-row__result--win',
  LOSS: 'profile-match-row__result--loss',
  DRAW: 'profile-match-row__result--draw',
};

function MatchRow({ match }: { match: RecentMatch }) {
  const { day, month } = formatDate(match.date);
  return (
    <div className="profile-match-row">
      <div className="profile-match-row__date" aria-hidden="true">
        <span className="profile-match-row__date-day">{day}</span>
        <span className="profile-match-row__date-month">{month}</span>
      </div>
      <div className="profile-match-row__body">
        <span className="profile-match-row__comp">{match.competition}</span>
        <span className="profile-match-row__matchup">
          {match.homeTeam} vs {match.awayTeam}
        </span>
        <span className="profile-match-row__contrib">
          {match.field}
          {match.goals > 0 || match.assists > 0
            ? ` · ${match.goals} gol${match.goals === 1 ? '' : 'es'}, ${match.assists} asist.`
            : ''}
        </span>
      </div>
      <div className="profile-match-row__score">
        {match.homeScore}-{match.awayScore}
      </div>
      <div
        className={`profile-match-row__result ${RESULT_CLASS[match.result]}`}
        title={
          match.result === 'WIN'
            ? 'Victoria'
            : match.result === 'LOSS'
              ? 'Derrota'
              : 'Empate'
        }
      >
        {RESULT_LABEL[match.result]}
      </div>
    </div>
  );
}

function MatchListContent({ matches }: { matches: RecentMatch[] }) {
  return (
    <div className="profile-match-list">
      {matches.map((m) => (
        <MatchRow key={m.id} match={m} />
      ))}
    </div>
  );
}

function MatchListSkeleton() {
  return (
    <div className="profile-match-list">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} height={64} />
      ))}
    </div>
  );
}

export function MatchListSection({ userId }: { userId: string }) {
  const { data, isLoading } = useRecentMatches(userId, 4);
  return (
    <Card>
      <div className="profile-section">
        <div className="profile-section__header">
          <h2 className="profile-section__title">
            <FieldIcon />
            Partidos recientes
          </h2>
          <span className="profile-section__hint">Últimos 4</span>
        </div>
        {isLoading || !data ? <MatchListSkeleton /> : <MatchListContent matches={data} />}
      </div>
    </Card>
  );
}

// =========================================================================
// Awards list
// =========================================================================

const CATEGORY_ICON: Record<AwardCategory, React.ReactNode> = {
  SCORER: <BallIcon />,
  MVP: <StarIcon />,
  FAIR_PLAY: <ShieldIcon />,
  CHAMPION: <TrophyIcon />,
  BEST_DEFENSE: <ShieldIcon />,
};

const LEVEL_CLASS: Record<Award['level'], string> = {
  GOLD: 'profile-award--gold',
  SILVER: 'profile-award--silver',
  BRONZE: 'profile-award--bronze',
};

const LEVEL_ICON_CLASS: Record<Award['level'], string> = {
  GOLD: 'profile-award__icon--gold',
  SILVER: 'profile-award__icon--silver',
  BRONZE: 'profile-award__icon--bronze',
};

function formatAwardDate(iso: string): string {
  const d = new Date(iso);
  return `${MONTHS_ES[d.getMonth()] ?? ''} ${d.getFullYear()}`;
}

function AwardItem({ award }: { award: Award }) {
  return (
    <div className={`profile-award ${LEVEL_CLASS[award.level]}`}>
      <div className={`profile-award__icon ${LEVEL_ICON_CLASS[award.level]}`.trim()}>
        {CATEGORY_ICON[award.category]}
      </div>
      <div className="profile-award__body">
        <span className="profile-award__title">{award.title}</span>
        <span className="profile-award__season">
          {award.season} · {award.competition}
        </span>
      </div>
      <span className="profile-award__date">{formatAwardDate(award.awardedAt)}</span>
    </div>
  );
}

function AwardListContent({ awards }: { awards: Award[] }) {
  return (
    <div className="profile-award-list">
      {awards.map((a) => (
        <AwardItem key={a.id} award={a} />
      ))}
    </div>
  );
}

function AwardListSkeleton() {
  return (
    <div className="profile-award-list">
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} height={72} />
      ))}
    </div>
  );
}

export function AwardListSection({ userId }: { userId: string }) {
  const { data, isLoading } = useAwards(userId);
  return (
    <Card>
      <div className="profile-section">
        <div className="profile-section__header">
          <h2 className="profile-section__title">
            <TrophyIcon />
            Premios
          </h2>
          <span className="profile-section__hint">Histórico</span>
        </div>
        {isLoading || !data ? <AwardListSkeleton /> : <AwardListContent awards={data} />}
      </div>
    </Card>
  );
}
