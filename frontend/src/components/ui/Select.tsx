import { forwardRef, type SelectHTMLAttributes, type ReactNode } from 'react';
import { FieldError } from './FieldError';

export interface SelectProps
  extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'id'> {
  /** Required — used both as the select id and the label `htmlFor`. */
  id: string;
  /** Field label. Required for accessibility. */
  label: string;
  /** When set, the select gets `input--error` and the message is shown below. */
  error?: string;
  /** `<option>` children (or any ReactNode, the select forwards it). */
  children: ReactNode;
}

/**
 * Native `<select>` wrapped with the design-system label + error pattern.
 *
 * @example
 *   <Select id="role" label="Rol" error={errors.role?.message} {...register('role')}>
 *     {USER_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
 *   </Select>
 */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { id, label, error, children, className, ...rest },
  ref,
) {
  const cls = ['input', error ? 'input--error' : '', className ?? '']
    .filter(Boolean)
    .join(' ');
  return (
    <label htmlFor={id}>
      <span className="input-label">{label}</span>
      <select id={id} ref={ref} className={cls} {...rest}>
        {children}
      </select>
      {error && <FieldError message={error} />}
    </label>
  );
});
