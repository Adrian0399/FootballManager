interface FieldErrorProps {
  /** The error message to display. When falsy, the component renders `null`. */
  message?: string;
}

/**
 * Renders an inline error message under a form field. Returns `null` if
 * no message is provided, so consumers can drop it in unconditionally:
 *
 * @example
 *   <TextField id="email" error={errors.email?.message} />
 *   // or directly:
 *   <FieldError message={errors.email?.message} />
 */
export function FieldError({ message }: FieldErrorProps) {
  if (!message) return null;
  return <span className="field-error">{message}</span>;
}
