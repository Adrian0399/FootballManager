import type { ReactNode } from 'react';

export type BannerTone = 'error' | 'success' | 'info' | 'warning';

interface BannerProps {
  /** Visual tone. */
  tone?: BannerTone;
  /** Optional custom background (escape hatch for one-off banners). */
  children: ReactNode;
  /** Optional className passthrough. */
  className?: string;
}

const toneClass: Record<BannerTone, string> = {
  error: 'form-banner--error',
  success: 'form-banner--success',
  info: 'form-banner--info',
  warning: 'form-banner--warning',
};

/**
 * Inline banner for form errors, success messages and similar notices.
 *
 * @example
 *   <Banner tone="error">{serverError}</Banner>
 *   <Banner tone="success">¡Perfil actualizado!</Banner>
 */
export function Banner({ tone = 'error', children, className }: BannerProps) {
  const classes = ['form-banner', toneClass[tone], className ?? '']
    .filter(Boolean)
    .join(' ');
  return (
    <div className={classes} role={tone === 'error' ? 'alert' : 'status'}>
      {children}
    </div>
  );
}
