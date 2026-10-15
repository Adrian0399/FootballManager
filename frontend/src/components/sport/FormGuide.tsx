export type FormResult = 'W' | 'D' | 'L';

export interface FormGuideProps {
  /**
   * Recent results, oldest → newest. Use `null` for a slot not yet played
   * (renders as an empty dashed circle, like the UEFA table).
   */
  results: (FormResult | null)[];
  size?: 'sm' | 'md';
  className?: string;
}

const LABEL: Record<FormResult, string> = { W: 'V', D: 'E', L: 'D' };
const TITLE: Record<FormResult, string> = { W: 'Victoria', D: 'Empate', L: 'Derrota' };

/**
 * Form streak — a row of V/E/D dots (green / amber / red), with empty
 * dashed slots for pending fixtures. Used in standings tables and match
 * previews.
 *
 * @example
 *   <FormGuide results={[null, null, null, null, 'W']} />
 *   <FormGuide results={['W', 'D', 'L', 'W', 'W']} size="sm" />
 */
export function FormGuide({ results, size = 'md', className }: FormGuideProps) {
  const classes = ['sp-form', size === 'sm' ? 'sp-form--sm' : '', className ?? ''].filter(Boolean).join(' ');

  return (
    <div className={classes} role="list" aria-label="Racha reciente">
      {results.map((r, i) => (
        <span
          key={i}
          role="listitem"
          className={`sp-form__dot ${r ? `sp-form__dot--${r}` : 'sp-form__dot--empty'}`}
          title={r ? TITLE[r] : 'Sin jugar'}
        >
          {r ? LABEL[r] : ''}
        </span>
      ))}
    </div>
  );
}
