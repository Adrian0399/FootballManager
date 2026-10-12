import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { StandingRow } from '../utils/standings';

interface StandingsTableProps {
  rows: StandingRow[];
  /** League id for the "ver detalle" link. */
  leagueId: string;
  /** Group label shown in the header when displaying a sub-group. */
  groupLabel?: string;
}

type SortKey = 'rank' | 'team' | 'played' | 'wins' | 'draws' | 'losses' | 'goalsFor' | 'goalsAgainst' | 'goalDifference' | 'points' | 'fairPlay';

/**
 * Sortable standings table. Click a column header to sort; click
 * again to flip the direction. The default sort is by rank (which
 * itself is the standings-defined order: PTS → GD → GF → fair play).
 */
export function StandingsTable({ rows, leagueId, groupLabel }: StandingsTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('rank');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const sorted = useMemo(() => {
    const dir = sortDir === 'asc' ? 1 : -1;
    return [...rows].sort((a, b) => {
      const va = readKey(a, sortKey);
      const vb = readKey(b, sortKey);
      if (typeof va === 'string' && typeof vb === 'string') {
        return dir * va.localeCompare(vb);
      }
      return dir * (Number(va) - Number(vb));
    });
  }, [rows, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      // Numeric columns default to desc (bigger first), text/team to asc.
      setSortDir(key === 'team' ? 'asc' : 'desc');
    }
  }

  function header(label: string, key: SortKey, align: 'left' | 'right' = 'right', width?: string) {
    const isActive = sortKey === key;
    const arrow = isActive ? (sortDir === 'asc' ? '▲' : '▼') : '';
    return (
      <th
        scope="col"
        className={`standings-th standings-th--${align} ${isActive ? 'is-active' : ''}`.trim()}
        style={width ? { width } : undefined}
        onClick={() => toggleSort(key)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            toggleSort(key);
          }
        }}
      >
        {label} {arrow && <span className="standings-th__arrow">{arrow}</span>}
      </th>
    );
  }

  if (rows.length === 0) {
    return (
      <p className="muted" style={{ padding: 'var(--space-4)' }}>
        Aún no hay datos de la tabla.
      </p>
    );
  }

  return (
    <div className="standings-wrap">
      {groupLabel && (
        <h3 style={{ fontSize: 'var(--text-lg)' }}>Grupo {groupLabel}</h3>
      )}
      <table className="standings-table">
        <thead>
          <tr>
            {header('#', 'rank', 'right', '40px')}
            {header('Equipo', 'team', 'left')}
            {header('PJ', 'played')}
            {header('G', 'wins')}
            {header('E', 'draws')}
            {header('P', 'losses')}
            {header('GF', 'goalsFor')}
            {header('GC', 'goalsAgainst')}
            {header('DG', 'goalDifference')}
            {header('PTS', 'points')}
            {header('Fair play', 'fairPlay')}
          </tr>
        </thead>
        <tbody>
          {sorted.map((r) => {
            const isTop = r.rank >= 1 && r.rank <= 3;
            return (
              <tr key={r.teamId} className={`standings-row ${isTop ? 'is-top' : ''}`.trim()}>
                <td className="standings-cell standings-cell--num standings-cell--rank">
                  {r.rank}
                </td>
                <td className="standings-cell standings-cell--team">
                  <Link
                    to={`/teams/${r.teamId}`}
                    className="standings-team"
                    title={`Ver detalle de ${r.teamName}`}
                  >
                    <span className="standings-team__dot" style={{ background: teamColor(r.teamId) }} aria-hidden="true" />
                    <span className="standings-team__name">{r.teamName}</span>
                  </Link>
                </td>
                <td className="standings-cell standings-cell--num">{r.played}</td>
                <td className="standings-cell standings-cell--num">{r.wins}</td>
                <td className="standings-cell standings-cell--num">{r.draws}</td>
                <td className="standings-cell standings-cell--num">{r.losses}</td>
                <td className="standings-cell standings-cell--num">{r.goalsFor}</td>
                <td className="standings-cell standings-cell--num">{r.goalsAgainst}</td>
                <td className={`standings-cell standings-cell--num ${r.goalDifference > 0 ? 'is-pos' : r.goalDifference < 0 ? 'is-neg' : ''}`.trim()}>
                  {formatDiff(r.goalDifference)}
                </td>
                <td className="standings-cell standings-cell--num standings-cell--pts">
                  <strong>{r.points}</strong>
                </td>
                <td className="standings-cell standings-cell--num">
                  {r.fairPlay === 0 ? '0' : r.fairPlay}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function readKey(r: StandingRow, k: SortKey): string | number {
  switch (k) {
    case 'rank': return r.rank;
    case 'team': return r.teamName;
    case 'played': return r.played;
    case 'wins': return r.wins;
    case 'draws': return r.draws;
    case 'losses': return r.losses;
    case 'goalsFor': return r.goalsFor;
    case 'goalsAgainst': return r.goalsAgainst;
    case 'goalDifference': return r.goalDifference;
    case 'points': return r.points;
    case 'fairPlay': return r.fairPlay;
  }
}

function formatDiff(d: number): string {
  if (d > 0) return `+${d}`;
  return String(d);
}

/** Stable colour for a team, derived from its id (hue 0-359). */
function teamColor(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i += 1) {
    h = (h * 31 + id.charCodeAt(i)) % 360;
  }
  return `hsl(${h}, 62%, 46%)`;
}
