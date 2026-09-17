import { forwardRef, type InputHTMLAttributes } from 'react';
import { FieldError } from './FieldError';

export interface TextFieldProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> {
  /** Required — used both as the input id and the label `htmlFor`. */
  id: string;
  /** Field label. Required for accessibility. */
  label: string;
  /** When set, the input gets `input--error` and the message is shown below. */
  error?: string;
  /** Optional helper text shown below the input when there's no error. */
  hint?: string;
}

/**
 * Single-line text input with a label, optional hint and error message.
 *
 * Wraps the design-system `.input` + `.input-label` + `.field-error`
 * trio so consumers don't have to repeat the markup. Passes every other
 * native input prop (`type`, `placeholder`, `autoComplete`, …) through
 * to the underlying `<input>`.
 *
 * Integrates with React Hook Form via `forwardRef` + spreading
 * `register('fieldName')` directly into the component.
 *
 * @example
 *   <TextField
 *     id="email"
 *     label="Email"
 *     type="email"
 *     error={errors.email?.message}
 *     {...register('email')}
 *   />
 */
export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(
  function TextField({ id, label, error, hint, className, ...rest }, ref) {
    const inputClass = ['input', error ? 'input--error' : '', className ?? '']
      .filter(Boolean)
      .join(' ');
    return (
      <label htmlFor={id}>
        <span className="input-label">{label}</span>
        <input id={id} ref={ref} className={inputClass} {...rest} />
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
