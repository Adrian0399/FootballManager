import type { ReactNode } from 'react';
import { Button } from './ui/Button';

export interface StepperStep {
  id: string;
  label: string;
  /** Short helper shown under the step label in the indicator. */
  hint?: string;
}

interface StepperProps {
  steps: StepperStep[];
  /** Zero-based index of the active step. */
  current: number;
  /** Total completed check is decorative — steps become clickable once visited. */
  onBack: () => void;
  onNext: () => void;
  onCancel: () => void;
  /** Labels for the footer actions. */
  submitLabel: string;
  /** True when the current step is the last one (Next = submit). */
  isLast: boolean;
  submitting: boolean;
  /** Content of the active step. */
  children: ReactNode;
}

/**
 * Reusable step indicator + navigation footer for multi-step modals.
 *
 * It only manages *presentation*: the parent form owns `current`, validates
 * the active step's fields with react-hook-form `trigger()`, and advances on
 * `onNext`. The final step's button reads `submitLabel`.
 */
export function Stepper({
  steps,
  current,
  onBack,
  onNext,
  onCancel,
  submitLabel,
  isLast,
  submitting,
  children,
}: StepperProps) {
  return (
    <div className="stepper">
      {/* Indicator */}
      <ol className="stepper__steps" aria-label="Progreso del formulario">
        {steps.map((s, i) => {
          const state =
            i < current ? 'done' : i === current ? 'active' : 'todo';
          return (
            <li
              key={s.id}
              className={`stepper__step stepper__step--${state}`}
              aria-current={i === current ? 'step' : undefined}
            >
              <span className="stepper__dot">
                {i < current ? '✓' : i + 1}
              </span>
              <span className="stepper__text">
                <span className="stepper__label">{s.label}</span>
                {s.hint && <span className="stepper__hint">{s.hint}</span>}
              </span>
            </li>
          );
        })}
      </ol>

      {/* Active step body */}
      <div className="stepper__body">{children}</div>

      {/* Footer */}
      <div className="stepper__footer">
        <Button variant="ghost" size="sm" onClick={onCancel}>
          Cancelar
        </Button>
        <div className="row-3" style={{ gap: 'var(--space-2)' }}>
          {current > 0 && (
            <Button variant="ghost" size="sm" onClick={onBack}>
              Atrás
            </Button>
          )}
          <Button
            type="button"
            size="sm"
            onClick={onNext}
            disabled={submitting}
          >
            {submitting ? 'Guardando…' : isLast ? submitLabel : 'Siguiente'}
          </Button>
        </div>
      </div>
    </div>
  );
}