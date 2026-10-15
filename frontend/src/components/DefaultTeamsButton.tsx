import { useState } from 'react';
import { Modal } from './Modal';
import { Button } from './ui/Button';
import { Banner } from './ui/Banner';
import { teamsApi } from '../api/teams';
import type { ErrorEnvelope } from '../types/user';

/**
 * Cycled [primary, secondary] colour pairs for placeholder teams. Kept as
 * distinct, high-contrast hues so the auto-generated roster stays readable
 * in the standings/fixture before the real clubs replace them.
 */
const PALETTE: Array<[string, string]> = [
  ['#E11D48', '#FDE68A'],
  ['#2563EB', '#DBEAFE'],
  ['#16A34A', '#DCFCE7'],
  ['#F59E0B', '#111827'],
  ['#7C3AED', '#EDE9FE'],
  ['#0891B2', '#CFFAFE'],
  ['#DC2626', '#FEE2E2'],
  ['#4D7C0F', '#ECFCCB'],
  ['#DB2777', '#FCE7F3'],
  ['#0F172A', '#F1F5F9'],
];

/** Emojis used as placeholder crests (the Team model uses `emoji` as logo). */
const EMOJIS = ['⚽', '🦁', '🦅', '🐉', '🐺', '🦈', '🐻', '🦊', '🐯', '🦌', '🐲', '🦍'];

/**
 * Next 1-based number for a placeholder named "Equipo NN". Scans the given
 * names so successive "add defaults" clicks keep numbering without gaps or
 * duplicates.
 */
export function nextPlaceholderStart(names: string[]): number {
  let max = 0;
  for (const n of names) {
    const m = /^Equipo\s+(\d+)$/i.exec(n.trim());
    if (m) max = Math.max(max, Number(m[1]));
  }
  return max + 1;
}

interface DefaultTeamsButtonProps {
  leagueId: string;
  /** How many placeholder teams to create (the missing slots). */
  count: number;
  /** 1-based number the placeholders start at (see `nextPlaceholderStart`). */
  startAt: number;
  /** Called after every team was created + enrolled (and also after a partial failure, to refetch). */
  onDone: () => void;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'primary' | 'cyan' | 'lime' | 'ghost';
}

/**
 * Admin affordance that auto-generates the missing teams of a league as
 * editable placeholders ("Equipo 01", "Equipo 02", …), each created AND
 * enrolled via a single `POST /teams` (`currentLeagueId`). This lets the
 * user build a full calendar without creating 16 teams one by one; the
 * placeholders can then be renamed/replaced as real clubs register.
 */
export function DefaultTeamsButton({
  leagueId,
  count,
  startAt,
  onDone,
  size = 'sm',
  variant = 'cyan',
}: DefaultTeamsButtonProps) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(0);
  const [error, setError] = useState<string | null>(null);
  // The plan is frozen when the dialog opens so a background refetch
  // (which changes `count`) doesn't shift the numbers mid-flight.
  const [plan, setPlan] = useState<{ count: number; startAt: number } | null>(null);

  const openDialog = () => {
    setPlan({ count, startAt });
    setDone(0);
    setError(null);
    setOpen(true);
  };

  const closeDialog = () => {
    if (busy) return;
    setOpen(false);
    setPlan(null);
  };

  const createAll = async () => {
    if (!plan) return;
    setBusy(true);
    setError(null);
    setDone(0);
    try {
      for (let i = 0; i < plan.count; i += 1) {
        const n = plan.startAt + i;
        const [primaryColor, secondaryColor] = PALETTE[(n - 1) % PALETTE.length]!;
        const emoji = EMOJIS[(n - 1) % EMOJIS.length]!;
        await teamsApi.create({
          name: `Equipo ${String(n).padStart(2, '0')}`,
          shortName: `EQ${String(n).padStart(2, '0')}`.slice(0, 10),
          emoji,
          primaryColor,
          secondaryColor,
          currentLeagueId: leagueId,
        });
        setDone(i + 1);
      }
      setOpen(false);
      setPlan(null);
    } catch (err) {
      const msg = (err as { response?: { data?: ErrorEnvelope } }).response?.data?.error?.message;
      setError(
        msg ??
          `No se pudieron crear todos. Se crearon ${done} de ${plan.count}: revisá la lista antes de reintentar.`,
      );
    } finally {
      setBusy(false);
      // Refetch regardless so the list shows whatever was actually created.
      onDone();
    }
  };

  const label = plan ?? { count, startAt };
  const firstName = `Equipo ${String(label.startAt).padStart(2, '0')}`;
  const lastName = `Equipo ${String(label.startAt + label.count - 1).padStart(2, '0')}`;
  const pct = plan ? Math.round((done / plan.count) * 100) : 0;

  return (
    <>
      <Button variant={variant} size={size} onClick={openDialog} disabled={count <= 0}>
        + Añadir {count} equipos default
      </Button>

      <Modal
        open={open}
        onClose={closeDialog}
        title="Añadir equipos de relleno"
        description={`Se crearán ${label.count} equipos placeholder`}
        disableBackdropClose={busy}
        size="sm"
        footer={
          <div className="row-3 row-end row-wrap">
            <Button variant="ghost" size="sm" onClick={closeDialog} disabled={busy}>
              Cancelar
            </Button>
            <Button size="sm" onClick={createAll} disabled={busy}>
              {busy ? `Creando ${done}/${label.count}…` : `Crear ${label.count} equipos`}
            </Button>
          </div>
        }
      >
        <p style={{ margin: 0 }}>
          Se crearán los equipos <strong>{firstName}</strong> … <strong>{lastName}</strong> y
          quedarán inscritos en esta liga al instante. Después podrás <strong>renombrarlos</strong>,
          cambiar su escudo/colores y agregarles jugadores conforme se inscriban los equipos reales.
        </p>

        {busy && (
          <div style={{ marginTop: 'var(--space-3)' }}>
            <div
              style={{
                height: 8,
                borderRadius: 999,
                background: 'var(--color-fog)',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${pct}%`,
                  background: 'var(--color-cyan)',
                  transition: 'width 0.2s ease',
                }}
              />
            </div>
            <p className="muted" style={{ fontSize: 'var(--text-sm)', marginTop: 'var(--space-1)' }}>
              Creando {done} de {label.count}…
            </p>
          </div>
        )}

        {error && (
          <div style={{ marginTop: 'var(--space-3)' }}>
            <Banner tone="error">{error}</Banner>
          </div>
        )}
      </Modal>
    </>
  );
}
