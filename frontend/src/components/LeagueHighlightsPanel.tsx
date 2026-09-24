import { Link } from 'react-router-dom';
import { useLeagueHighlights } from '../hooks/playerStats';
import { Card } from './ui/Card';

interface LeagueHighlightsPanelProps {
  leagueId: string;
}

/**
 * Compact "Destacados" card for the league detail page. Shows the top
 * scorer, top assister, the best goalkeeper, the best attacking team
 * and the best defensive team — all computed live from match events.
 */
export function LeagueHighlightsPanel({ leagueId }: LeagueHighlightsPanelProps) {
  const { data, isLoading } = useLeagueHighlights(leagueId);

  if (isLoading && !data) {
    return (
      <Card>
        <p className="muted">Cargando destacados…</p>
      </Card>
    );
  }
  if (!data) return null;

  return (
    <Card>
      <header className="row-3 row-between row-wrap" style={{ alignItems: 'baseline' }}>
        <h3 style={{ fontSize: 'var(--text-lg)' }}>Destacados de la liga</h3>
      </header>
      <div className="league-highlights">
        {/* Top Scorer */}
        <HighlightCell
          tone="success"
          emoji="⚽"
          label="Goleador"
          primary={data.topScorer?.playerName ?? '—'}
          secondary={data.topScorer ? `${data.topScorer.goals} goles · ${data.topScorer.assists} asist` : 'Sin datos'}
          teamName={data.topScorer?.teamName ?? null}
          link={data.topScorer ? `/players/${data.topScorer.playerId}` : null}
        />
        {/* Top Assister */}
        <HighlightCell
          tone="cyan"
          emoji="🅰️"
          label="Asistidor"
          primary={data.topAssister?.playerName ?? '—'}
          secondary={data.topAssister ? `${data.topAssister.assists} asist · ${data.topAssister.goals} goles` : 'Sin datos'}
          teamName={data.topAssister?.teamName ?? null}
          link={data.topAssister ? `/players/${data.topAssister.playerId}` : null}
        />
        {/* Best Goalkeeper */}
        <HighlightCell
          tone="default"
          emoji="🧤"
          label="Mejor portero"
          primary={data.bestGoalkeeper?.playerName ?? '—'}
          secondary={data.bestGoalkeeper ? `${data.bestGoalkeeper.cleanSheets} porterías a cero` : 'Sin datos'}
          teamName={data.bestGoalkeeper?.teamName ?? null}
          link={data.bestGoalkeeper ? `/players/${data.bestGoalkeeper.playerId}` : null}
        />
        {/* Best Attacking Team */}
        <HighlightCell
          tone="magenta"
          emoji="🔥"
          label="Mejor ataque"
          primary={data.bestAttackingTeam?.teamName ?? '—'}
          secondary={data.bestAttackingTeam ? `${data.bestAttackingTeam.goals} goles` : 'Sin datos'}
          teamName={null}
          link={data.bestAttackingTeam ? `/teams/${data.bestAttackingTeam.teamId}` : null}
        />
        {/* Best Defensive Team */}
        <HighlightCell
          tone="lime"
          emoji="🛡"
          label="Mejor defensa"
          primary={data.bestDefensiveTeam?.teamName ?? '—'}
          secondary={data.bestDefensiveTeam ? `${data.bestDefensiveTeam.conceded} goles recibidos` : 'Sin datos'}
          teamName={null}
          link={data.bestDefensiveTeam ? `/teams/${data.bestDefensiveTeam.teamId}` : null}
        />
      </div>
    </Card>
  );
}

function HighlightCell({
  tone,
  emoji,
  label,
  primary,
  secondary,
  teamName,
  link,
}: {
  tone: 'success' | 'cyan' | 'default' | 'magenta' | 'lime';
  emoji: string;
  label: string;
  primary: string;
  secondary: string;
  teamName: string | null;
  link: string | null;
}) {
  const content = (
    <div className={`league-highlight league-highlight--${tone}`}>
      <div className="league-highlight__head">
        <span className="league-highlight__emoji" aria-hidden="true">{emoji}</span>
        <span className="league-highlight__label">{label}</span>
      </div>
      {teamName && (
        <span className="league-highlight__team">{teamName}</span>
      )}
      <div className="league-highlight__body">
        <span className="league-highlight__primary">{primary}</span>
        <span className="league-highlight__secondary">{secondary}</span>
      </div>
    </div>
  );
  if (link) {
    return <Link to={link} className="league-highlight-link">{content}</Link>;
  }
  return content;
}
