import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';

export type CardVariant = 'default' | 'rare' | 'legend' | 'dark' | 'cream';

export interface CardProps extends Omit<HTMLAttributes<HTMLElement>, 'children'> {
  /** Visual style. `default` is the cream surface, `rare` is yellow gradient, etc. */
  variant?: CardVariant;
  /** When true, applies the `scanlines` decorative overlay (used with `dark`). */
  scanlines?: boolean;
  /** Element tag. Defaults to `<div>`, use `'article'` for cards in a grid, etc. */
  as?: 'div' | 'article' | 'section';
  children?: ReactNode;
}

const variantClass: Record<CardVariant, string> = {
  default: '',
  rare: 'card-pack--rare',
  legend: 'card-pack--legend',
  dark: 'card-pack--dark',
  cream: 'card-pack--cream',
};

/**
 * Card / "pack" container that wraps the design-system `.card-pack`
 * variants. The visual treatment is 100% identical to the raw class —
 * this component just removes the need to remember the modifier names.
 *
 * @example
 *   <Card>Default card</Card>
 *   <Card variant="rare" as="article">Tournament winner</Card>
 *   <Card variant="dark" scanlines>Goleadores ranking</Card>
 */
export const Card = forwardRef<HTMLElement, CardProps>(function Card(
  { variant = 'default', scanlines, as: Tag = 'div', className, children, ...rest },
  ref,
) {
  const classes = [
    'card-pack',
    variantClass[variant],
    scanlines ? 'scanlines' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <Tag ref={ref as never} className={classes} {...rest}>
      {children}
    </Tag>
  );
});
