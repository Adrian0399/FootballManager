import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Link, type LinkProps } from 'react-router-dom';

export type SportButtonVariant = 'solid' | 'navy' | 'outline' | 'soft' | 'ghost';
export type SportButtonSize = 'sm' | 'md' | 'lg';

interface CommonProps {
  variant?: SportButtonVariant;
  size?: SportButtonSize;
  /** Icon rendered before the label. */
  startIcon?: ReactNode;
  /** Icon rendered after the label. */
  endIcon?: ReactNode;
  /** Stretch to fill the container width. */
  block?: boolean;
  children?: ReactNode;
  className?: string;
}

type AsButton = CommonProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, keyof CommonProps> & { to?: undefined };
type AsLink = CommonProps & Omit<LinkProps, keyof CommonProps | 'to'> & { to: LinkProps['to'] };

export type SportButtonProps = AsButton | AsLink;

const variantClass: Record<SportButtonVariant, string> = {
  solid: 'sp-btn--solid',
  navy: 'sp-btn--navy',
  outline: 'sp-btn--outline',
  soft: 'sp-btn--soft',
  ghost: 'sp-btn--ghost',
};
const sizeClass: Record<SportButtonSize, string> = {
  sm: 'sp-btn--sm',
  md: '',
  lg: 'sp-btn--lg',
};

/**
 * Broadcast-style pill button for the sport kit.
 *
 * - `solid`  royal-blue primary CTA
 * - `outline` white outline for blue/navy backgrounds
 * - `soft`   light-blue pill ("Ver detalles") for white cards
 * - `navy` / `ghost` secondary styles
 *
 * Renders a react-router `<Link>` when `to` is provided, otherwise a `<button>`.
 *
 * @example
 *   <SportButton variant="solid" startIcon={<Plus size={16} />}>Crear liga</SportButton>
 *   <SportButton variant="outline">Ver todos los partidos</SportButton>
 *   <SportButton variant="soft" to="/matches/1">Ver detalles</SportButton>
 */
export const SportButton = forwardRef<HTMLButtonElement, SportButtonProps>(
  function SportButton({ variant = 'solid', size = 'md', startIcon, endIcon, block, className, children, ...rest }, ref) {
    const classes = [
      'sp-btn',
      variantClass[variant],
      sizeClass[size],
      block ? 'sp-btn--block' : '',
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

    if ('to' in rest && rest.to !== undefined) {
      const { to, ...linkRest } = rest as AsLink & { to: LinkProps['to'] };
      return (
        <Link to={to} className={classes} {...linkRest}>
          {content}
        </Link>
      );
    }

    const buttonRest = rest as AsButton;
    return (
      <button ref={ref} type="button" className={classes} {...buttonRest}>
        {content}
      </button>
    );
  },
);
