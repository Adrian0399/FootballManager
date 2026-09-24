import { useEffect, useRef, useState } from 'react';
import { Button } from './ui/Button';

interface MatchClockProps {
  /** Whether the clock is currently running. */
  running: boolean;
  /** Current minute (0..120). */
  minute: number;
  /** Notified when the user presses start. */
  onStart: () => void;
  /** Notified when the user pauses. */
  onPause: () => void;
  /** Notified when the user resumes from a paused state. */
  onResume: () => void;
  /** Notified when the user finalizes the match. */
  onFinish: () => void;
  /** Optional: external minute override (e.g. "+1' from stoppage time). */
  externalMinute?: number | null;
  /** Whether the finalize button is enabled. */
  canFinish?: boolean;
}

/**
 * Virtual match clock for LIVE mode.
 *
 * Renders a big "MM'" display, a row of controls (start / pause /
 * +1' / finish) and a status pill. The actual minute value lives
 * in the parent; the clock is a presentation + interaction surface.
 *
 * In v1.0.0 mock mode the parent doesn't run a setInterval — the
 * clock is a control panel, not a true timer. The visual minute
 * increments on a 5-second tick when running, so the user gets the
 * feel of a live clock.
 */
export function MatchClock({
  running,
  minute,
  onStart,
  onPause,
  onResume,
  onFinish,
  externalMinute,
  canFinish = true,
}: MatchClockProps) {
  // Local "fake ticker" so the clock feels live when running. Disabled
  // when prefers-reduced-motion is set.
  const [reducedMotion, setReducedMotion] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mq.matches);
    const onChange = () => setReducedMotion(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const tickRef = useRef<number | null>(null);
  useEffect(() => {
    if (!running || reducedMotion) return;
    // Don't increment the real minute; the parent decides when to bump.
    // We just emit a visual pulse via a class toggle below.
    tickRef.current = window.setInterval(() => {
      // no-op; visual hint via CSS
    }, 1000);
    return () => {
      if (tickRef.current) window.clearInterval(tickRef.current);
    };
  }, [running, reducedMotion]);

  const displayMinute = externalMinute ?? minute;

  return (
    <div className={`match-clock ${running ? 'is-running' : 'is-paused'}`}>
      <div className="match-clock__display">
        <span className="match-clock__num">{displayMinute}</span>
        <span className="match-clock__apos">'</span>
        <span className="match-clock__phase">
          {running ? 'En juego' : minute === 0 ? 'Por iniciar' : 'Pausado'}
        </span>
      </div>
      <div className="match-clock__controls">
        {minute === 0 && !running && (
          <Button variant="primary" onClick={onStart}>
            ▶ Iniciar partido
          </Button>
        )}
        {running && (
          <Button variant="ghost" onClick={onPause}>
            ⏸ Pausar
          </Button>
        )}
        {!running && minute > 0 && (
          <Button variant="lime" onClick={onResume}>
            ▶ Reanudar
          </Button>
        )}
        <Button
          variant="coral"
          onClick={onFinish}
          disabled={!canFinish || minute === 0}
        >
          ⏹ Finalizar partido
        </Button>
      </div>
    </div>
  );
}
