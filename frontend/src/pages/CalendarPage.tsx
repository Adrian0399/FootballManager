import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { matchesApi } from '../api/matches';
import { useUserTeams, useLeagues, useTeams } from '../hooks/teams';
import { useAuthStore } from '../store/auth.store';
import { PageHeader } from '../components/ui/PageHeader';
import { Select } from '../components/ui/Select';
import { ChevronRightIcon } from '../components/icons';
import type { Match } from '../types/match';

type CalFilter = 'general' | 'particular' | 'league' | 'team';

/**
 * Global calendar (Microsoft-Teams style).
 *
 * Shows every upcoming match across all leagues in a month grid. Each day
 * cell lists up to 4 "TEAM vs TEAM" chips; hovering the cell reveals a
 * descriptive popup with all of that day's matches (teams, time, league,
 * field). Clicking a match opens its detail page.
 */

const WEEK_HEADERS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function toDate(iso: string): Date {
  return new Date(iso);
}

function shiftMonth(base: Date, delta: number): Date {
  return new Date(base.getFullYear(), base.getMonth() + delta, 1);
}

/** Builds the 42-cell grid (6 weeks) for a month, Monday-first. */
function buildMonthGrid(month: Date): Array<Date | null> {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const startOffset = (first.getDay() + 6) % 7; // Mon=0
  const cells: Array<Date | null> = [];
  const gridStart = new Date(first);
  gridStart.setDate(first.getDate() - startOffset);
  for (let i = 0; i < 42; i += 1) {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    cells.push(d.getMonth() === month.getMonth() ? d : null);
  }
  return cells;
}

export function CalendarPage() {
  const [month, setMonth] = useState(() => new Date());
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openDay, setOpenDay] = useState<string | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Popup opens immediately on hover, but closes after a 1s delay so the
  // cursor can travel into the popup without it vanishing.
  const openPopup = (key: string) => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setOpenDay(key);
  };
  const cancelClose = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
  };
  const scheduleClose = (key: string) => {
    cancelClose();
    closeTimer.current = setTimeout(() => {
      setOpenDay((cur) => (cur === key ? null : cur));
    }, 1000);
  };

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    matchesApi
      .list()
      .then((rows) => {
        if (!cancelled) {
          setMatches(rows);
          setError(null);
        }
      })
      .catch(() => {
        if (!cancelled) setError('No se pudieron cargar los partidos.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const currentUser = useAuthStore((s) => s.user);
  const [filter, setFilter] = useState<CalFilter>('general');
  const [leagueId, setLeagueId] = useState('');
  const [teamId, setTeamId] = useState('');

  const myTeams = useUserTeams(currentUser?.id ?? null);
  const leagues = useLeagues();
  const allTeams = useTeams();

  const matchesByDay = useMemo(() => {
    // Apply the active filter before grouping by day.
    let visible = matches;
    if (filter === 'particular') {
      const myIds = new Set((myTeams.data ?? []).map((t) => t.id));
      visible = matches.filter((m) => myIds.has(m.homeTeamId) || myIds.has(m.awayTeamId));
    } else if (filter === 'league' && leagueId) {
      visible = matches.filter((m) => m.leagueId === leagueId);
    } else if (filter === 'team' && teamId) {
      visible = matches.filter((m) => m.homeTeamId === teamId || m.awayTeamId === teamId);
    }

    const map = new Map<string, Match[]>();
    for (const m of visible) {
      const key = dayKey(toDate(m.scheduledAt));
      const list = map.get(key) ?? [];
      list.push(m);
      map.set(key, list);
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
    }
    return map;
  }, [matches, filter, leagueId, teamId, myTeams.data]);

  const cells = useMemo(() => buildMonthGrid(month), [month]);
  const monthLabel = `${MONTHS[month.getMonth()]} ${month.getFullYear()}`;

  return (
    <div className="container section-stack">
      <PageHeader
        title="Calendario"
        description="Todos los partidos del sistema, en un calendario mensual."
      />

      {/* Filter bar */}
      <div className="cal-filter">
        <div className="cal-filter__tabs" role="tablist" aria-label="Filtro de calendario">
          {(
            [
              ['general', 'General'],
              ['particular', 'Particular'],
              ['league', 'Por ligas'],
              ['team', 'Por equipos'],
            ] as Array<[CalFilter, string]>
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              className={`cal-filter__tab ${filter === value ? 'is-active' : ''}`.trim()}
              onClick={() => {
                setFilter(value);
                setLeagueId('');
                setTeamId('');
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {filter === 'league' && (
          <Select
            id="cal-league"
            label="Liga"
            value={leagueId}
            onChange={(e) => setLeagueId(e.target.value)}
          >
            <option value="">— Todas las ligas —</option>
            {(leagues.data ?? []).map((l) => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </Select>
        )}

        {filter === 'team' && (
          <>
            <Select
              id="cal-team-league"
              label="Liga"
              value={leagueId}
              onChange={(e) => {
                setLeagueId(e.target.value);
                setTeamId('');
              }}
            >
              <option value="">— Todas las ligas —</option>
              {(leagues.data ?? []).map((l) => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </Select>
            <Select
              id="cal-team"
              label="Equipo"
              value={teamId}
              onChange={(e) => setTeamId(e.target.value)}
            >
              <option value="">— Todos los equipos —</option>
              {(allTeams.data ?? [])
                .filter((t) => !leagueId || t.currentLeagueId === leagueId)
                .map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
            </Select>
          </>
        )}

        {/* Month navigation — pushed to the right */}
        <div className="cal-filter__month">
          <button
            type="button"
            className="cal-month-btn"
            onClick={() => setMonth((m) => shiftMonth(m, -1))}
            aria-label="Mes anterior"
          >
            <ChevronRightIcon style={{ transform: 'rotate(180deg)' }} />
          </button>
          <span className="calendar-month-label">{monthLabel}</span>
          <button
            type="button"
            className="cal-month-btn"
            onClick={() => setMonth((m) => shiftMonth(m, 1))}
            aria-label="Mes siguiente"
          >
            <ChevronRightIcon />
          </button>
        </div>
      </div>

      {error && <p className="muted">{error}</p>}
      {loading ? (
        <p className="muted">Cargando calendario…</p>
      ) : (
        <div className="cal-global">
          <div className="cal-global__weekdays">
            {WEEK_HEADERS.map((h) => (
              <span key={h} className="cal-global__weekday">{h}</span>
            ))}
          </div>

          <div className="cal-global__grid">
            {cells.map((d, i) => {
              if (!d) return <div key={`empty-${i}`} className="cal-global__cell is-empty" />;
              const key = dayKey(d);
              const dayMatches = matchesByDay.get(key) ?? [];
              const isToday = key === dayKey(new Date());
              return (
                <div
                  key={key}
                  className={`cal-global__cell ${isToday ? 'is-today' : ''}`.trim()}
                  onMouseEnter={() => openPopup(key)}
                  onMouseLeave={() => scheduleClose(key)}
                >
                  <span className="cal-global__daynum">{d.getDate()}</span>

                  {dayMatches.length > 0 && (
                    <div className="cal-global__chips">
                      {dayMatches.slice(0, 4).map((m) => (
                        <Link
                          key={m.id}
                          to={`/matches/${m.id}`}
                          className="cal-global__chip"
                          title={`${m.homeTeam?.shortName ?? '?'} vs ${m.awayTeam?.shortName ?? '?'}`}
                        >
                          <span className="cal-global__chip-emoji">{m.homeTeam?.emoji}</span>
                          <span className="cal-global__chip-teams">
                            {m.homeTeam?.shortName ?? '?'} vs {m.awayTeam?.shortName ?? '?'}
                          </span>
                          <span className="cal-global__chip-time">
                            {toDate(m.scheduledAt).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </Link>
                      ))}
                      {dayMatches.length > 4 && (
                        <span className="cal-global__more">+{dayMatches.length - 4} más</span>
                      )}
                    </div>
                  )}

                  {/* Hover popup with all of the day's matches */}
                  {dayMatches.length > 0 && (
                    <div
                      className={`cal-global__popup ${openDay === key ? 'is-open' : ''}`.trim()}
                      role="tooltip"
                      onMouseEnter={cancelClose}
                      onMouseLeave={() => scheduleClose(key)}
                    >
                      <span className="cal-global__popup-title">
                        {d.getDate()} {MONTHS[d.getMonth()]}
                      </span>
                      {dayMatches.map((m) => (
                        <Link
                          key={m.id}
                          to={`/matches/${m.id}`}
                          className="cal-global__popup-row"
                        >
                          <span className="cal-global__popup-teams">
                            <span className="cal-global__popup-emoji">{m.homeTeam?.emoji}</span>
                            {m.homeTeam?.shortName ?? '?'} vs {m.awayTeam?.shortName ?? '?'}
                            <span className="cal-global__popup-emoji">{m.awayTeam?.emoji}</span>
                          </span>
                          <span className="cal-global__popup-time">
                            {toDate(m.scheduledAt).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          {m.field?.name && (
                            <span className="cal-global__popup-field">· {m.field.name}</span>
                          )}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}