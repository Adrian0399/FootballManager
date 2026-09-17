import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Link, type LinkProps } from 'react-router-dom';

export type ButtonVariant =
  | 'primary'   // default — yellow (vamos)
  | 'cyan'
  | 'coral'     // danger / hype
  | 'magenta'
  | 'lime'
  | 'ghost'
  | 'dark';

export type ButtonSize = 'sm' | 'md' | 'lg';

interface CommonProps {
  /** Visual style. `primary` is the default yellow CTA. */
  variant?: ButtonVariant;
  /** `sm` | `md` (default) | `lg`. */
  size?: ButtonSize;
  /** Optional icon or other content to render before the label. */
  startIcon?: ReactNode;
  /** Optional icon or other content to render after the label. */
  endIcon?: ReactNode;
  /** Stretch the button to fill its container width. */
  block?: boolean;
  /** When provided, renders as a `<Link>` to this path. */
  to?: LinkProps['to'];
  children?: ReactNode;
  className?: string;
}

type ButtonAsButton = CommonProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, keyof CommonProps> & {
    to?: undefined;
  };

type ButtonAsLink = CommonProps &
  Omit<LinkProps, keyof CommonProps | 'to'> & {
    to: LinkProps['to'];
  };

export type ButtonProps = ButtonAsButton | ButtonAsLink;

const variantClass: Record<ButtonVariant, string> = {
  primary: '',
  cyan: 'btn--cyan',
  coral: 'btn--coral',
  magenta: 'btn--magenta',
  lime: 'btn--lime',
  ghost: 'btn--ghost',
  dark: 'btn--dark',
};

const sizeClass: Record<ButtonSize, string> = {
  sm: 'btn--sm',
  md: '',
  lg: 'btn--lg',
};

/**
 * Polymorphic button component.
 *
 * - Pass `to="…"` to render as a React Router `<Link>` (for navigation).
 * - Otherwise renders a `<button>`. `type="button"` is the default to
 *   prevent accidental form submission — pass `type="submit"` when
 *   inside a `<form>`.
 *
 * Visual variants mirror the design-system tokens (`.btn--cyan`,
 * `.btn--coral`, etc.) so the design stays 100% intact.
 *
 * @example
 *   <Button variant="cyan" size="sm">Editar</Button>
 *   <Button to="/leagues">Ver ligas</Button>
 *   <Button type="submit" disabled={busy}>Guardar</Button>
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  props,
  ref,
) {
  const {
    variant = 'primary',
    size = 'md',
    startIcon,
    endIcon,
    block,
    to,
    className,
    children,
    ...rest
  } = props;

  const classes = [
    'btn',
    variantClass[variant],
    sizeClass[size],
    block ? 'btn--block' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  const content = (
    <>
      {startIcon}
      {children}
      {endIcon}
    </>
  );

  if (to !== undefined) {
    // `to` is already destructured above; strip it from `rest` so we don't
    // re-set it when spreading the rest props.
    const { to: _ignored, ...linkRest } = rest as LinkProps;
    void _ignored;
    return (
      <Link to={to} className={classes} {...linkRest}>
        {content}
      </Link>
    );
  }

  return (
    <button
      ref={ref}
      type={(rest as ButtonHTMLAttributes<HTMLButtonElement>).type ?? 'button'}
      className={classes}
      {...(rest as ButtonHTMLAttributes<HTMLButtonElement>)}
    >
      {content}
    </button>
  );
});
