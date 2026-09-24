import { useMemo } from 'react';
import type { Match, Matchday } from '../types/match';
import { MOCK_TEAMS } from '../mocks/teams';

interface CalendarViewProps {
  matchdays: Matchday[];
  matchesByMatchday: Map<string, Match[]>;
}

const DAY_HEADERS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

/**
 * Lightweight month-grid view of a fixture.
 *
 * Renders a single month (the one containing the first matchday).
 * Each day cell shows the number of scheduled matches as a chip.
 * Clicking a day cell jumps to the corresponding jornada below.
 *
 * The view is intentionally minimal — the rich "list" view is where
 * the heavy interaction lives. This is the "at a glance" calendar.
 */
export function CalendarView({ matchdays, matchesByMatchday }: CalendarViewProps) {
  const cells = useMemo(() => buildMonthCells(matchdays, matchesByMatchday), [
    matchdays,
    matchesByMatchday,
  ]);

  return (
    <div className="calendar-view">
      <div className="calendar-view__head">
        <span className="calendar-view__month">{cells.monthLabel}</span>
        <span className="muted" style={{ fontSize: 'var(--text-sm)' }}>
          Vista mes · click en un día con partidos para ver la jornada
        </span>
      </div>
      <div className="calendar-view__grid">
        {DAY_HEADERS.map((d, i) => (
          <div key={i} className="calendar-view__dow">{d}</div>
        ))}
        {cells.weeks.flat().map((cell, i) => {
          if (!cell) {
            return <div key={i} className="calendar-view__cell calendar-view__cell--empty" />;
          }
          const teams = cell.matches
            .map((m) => {
              const home = MOCK_TEAMS.find((t) => t.id === m.homeTeamId);
              const away = MOCK_TEAMS.find((t) => t.id === m.awayTeamId);
              return `${home?.shortName ?? '?'} vs ${away?.shortName ?? '?'}`;
            })
            .slice(0, 2);
          return (
            <a
              key={i}
              href={`#md-${cell.matchdayId}`}
              className={`calendar-view__cell ${cell.matches.length > 0 ? 'has-matches' : ''}`.trim()}
              title={teams.join(' · ')}
            >
              <span className="calendar-view__day">{cell.day}</span>
              {cell.matches.length > 0 && (
                <span className="calendar-view__count">
                  {cell.matches.length} partido{cell.matches.length === 1 ? '' : 's'}
                </span>
              )}
            </a>
          );
        })}
      </div>
    </div>
  );
}

interface Cell {
  day: number;
  matchdayId: string;
  matches: Match[];
}

interface Cells {
  monthLabel: string;
  weeks: (Cell | null)[][];
}

const MONTHS_ES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

/**
 * Parses a matchday `date` as a local calendar day.
 *
 * The backend serializes PostgreSQL `date` columns as full ISO strings
 * ("2026-09-15T00:00:00.000Z"), so appending "T00:00:00" would produce an
 * Invalid Date. Slice the YYYY-MM-DD prefix and parse it as local time to
 * keep the day the user set.
 */
function toLocalDate(value: string | Date): Date {
  if (value instanceof Date) return value;
  const ymd = /^\d{4}-\d{2}-\d{2}/.exec(value)?.[0] ?? value;
  return new Date(`${ymd}T00:00:00`);
}

function buildMonthCells(
  matchdays: Matchday[],
  matchesByMatchday: Map<string, Match[]>,
): Cells {
  if (matchdays.length === 0) {
    return { monthLabel: '', weeks: [[]] };
  }
  // Use the month of the first matchday.
  const first = toLocalDate(matchdays[0]!.date);
  const year = first.getFullYear();
  const month = first.getMonth();

  // First day of the month; Monday=0 grid.
  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  // JS getDay: Sun=0, Mon=1...Sat=6. We want Mon=0.
  const offset = (firstDay.getDay() + 6) % 7;

  // Build the index by date.
  const byDate = new Map<string, Cell>();
  for (const md of matchdays) {
    const matches = matchesByMatchday.get(md.id) ?? [];
    byDate.set(md.date, { day: toLocalDate(md.date).getDate(), matchdayId: md.id, matches });
  }

  const cells: (Cell | null)[] = [];
  for (let i = 0; i < offset; i += 1) cells.push(null);
  for (let d = 1; d <= daysInMonth; d += 1) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const cell = byDate.get(dateStr) ?? { day: d, matchdayId: '', matches: [] };
    cells.push(cell);
  }
  // Pad to a multiple of 7.
  while (cells.length % 7 !== 0) cells.push(null);

  const weeks: (Cell | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  return { monthLabel: `${MONTHS_ES[month]} ${year}`, weeks };
}
