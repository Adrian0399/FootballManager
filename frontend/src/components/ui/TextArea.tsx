import { forwardRef, type TextareaHTMLAttributes } from 'react';
import { FieldError } from './FieldError';

export interface TextAreaProps
  extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'id'> {
  /** Required — used both as the textarea id and the label `htmlFor`. */
  id: string;
  /** Field label. Required for accessibility. */
  label: string;
  /** When set, the textarea gets `input--error` and the message is shown below. */
  error?: string;
  /** Optional helper text shown below the textarea when there's no error. */
  hint?: string;
}

/**
 * Multi-line text input (textarea) with label, optional hint and error.
 *
 * @example
 *   <TextArea
 *     id="description"
 *     label="Descripción"
 *     rows={3}
 *     error={errors.description?.message}
 *     {...register('description')}
 *   />
 */
export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
  function TextArea({ id, label, error, hint, className, ...rest }, ref) {
    const cls = ['input', error ? 'input--error' : '', className ?? '']
      .filter(Boolean)
      .join(' ');
    return (
      <label htmlFor={id}>
        <span className="input-label">{label}</span>
        <textarea id={id} ref={ref} className={cls} {...rest} />
        {error ? (
          <FieldError message={error} />
        ) : hint ? (
          <span className="muted" style={{ fontSize: 'var(--text-xs)' }}>
            {hint}
          </span>
        ) : null}
      </label>
    );
  },
);
