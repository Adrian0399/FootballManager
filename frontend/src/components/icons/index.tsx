/* Kaibil Football — inline SVG icon set
 * Curated for the pop-art / esports hybrid aesthetic. All icons are
 * currentColor-friendly (fill="currentColor") so consumers control color.
 *
 * Naming convention: PascalCase, semantic, suffix "Icon" (BallIcon, TrophyIcon…).
 */

import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement>;

const baseProps: IconProps = {
  xmlns: 'http://www.w3.org/2000/svg',
  viewBox: '0 0 24 24',
  width: '1em',
  height: '1em',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
};

export function BallIcon(props: IconProps) {
  return (
    <svg {...baseProps} {...props}>
      <circle cx="12" cy="12" r="9.5" fill="currentColor" stroke="none" />
      {/* white pentagon facets suggest the classic football pattern */}
      <polygon
        points="12,7 15,10.5 13.5,14.5 10.5,14.5 9,10.5"
        fill="var(--color-bg, #FFF8E7)"
        stroke="var(--color-ink, #0A0A0A)"
        strokeWidth={1}
      />
      <path d="M12 7 L12 4 M15 10.5 L18 9.5 M13.5 14.5 L15.5 18 M10.5 14.5 L8.5 18 M9 10.5 L6 9.5" />
    </svg>
  );
}

export function TrophyIcon(props: IconProps) {
  return (
    <svg {...baseProps} {...props}>
      <path d="M7 4h10v4a5 5 0 0 1-10 0V4Z" fill="currentColor" />
      <path d="M5 4h2v3a3 3 0 0 1-3 3V4h1Z" fill="currentColor" />
      <path d="M19 4h-2v3a3 3 0 0 0 3 3V4h-1Z" fill="currentColor" />
      <path d="M9 14h6l-.5 4h-5L9 14Z" fill="currentColor" />
      <rect x="7" y="18" width="10" height="2.5" fill="currentColor" />
    </svg>
  );
}

export function WhistleIcon(props: IconProps) {
  return (
    <svg {...baseProps} {...props}>
      <path d="M3 12c0-2 1.5-3.5 3.5-3.5h7l4-3v3h3v3h-3l-2 1.5h-4" />
      <circle cx="7" cy="12" r="1" fill="currentColor" />
    </svg>
  );
}

export function FieldIcon(props: IconProps) {
  return (
    <svg {...baseProps} {...props} viewBox="0 0 32 20">
      <rect x="1" y="1" width="30" height="18" rx="2" fill="currentColor" />
      <line x1="16" y1="1" x2="16" y2="19" stroke="var(--color-bg)" strokeWidth={1} />
      <circle cx="16" cy="10" r="3" stroke="var(--color-bg)" strokeWidth={1} fill="none" />
      <rect x="1" y="5" width="5" height="10" stroke="var(--color-bg)" strokeWidth={1} fill="none" />
      <rect x="26" y="5" width="5" height="10" stroke="var(--color-bg)" strokeWidth={1} fill="none" />
    </svg>
  );
}

export function ShieldIcon(props: IconProps) {
  return (
    <svg {...baseProps} {...props}>
      <path d="M12 2 4 5v7c0 5 3.5 8.5 8 10 4.5-1.5 8-5 8-10V5l-8-3Z" fill="currentColor" />
    </svg>
  );
}

export function StarIcon(props: IconProps) {
  return (
    <svg {...baseProps} {...props} fill="currentColor">
      <polygon points="12,2 14.5,8.5 21,8.5 16,12.5 17.5,19 12,15 6.5,19 8,12.5 3,8.5 9.5,8.5" />
    </svg>
  );
}

export function ChevronRightIcon(props: IconProps) {
  return (
    <svg {...baseProps} {...props}>
      <polyline points="9 6 15 12 9 18" />
    </svg>
  );
}

export function WhistleHero(props: IconProps) {
  // A "big crowd siren" decoration for hero areas.
  return (
    <svg {...baseProps} {...props} viewBox="0 0 64 64" stroke="none" fill="currentColor">
      <circle cx="32" cy="32" r="30" fill="var(--color-vamos, #FFE600)" />
      <circle cx="32" cy="32" r="26" fill="none" stroke="var(--color-ink, #0A0A0A)" strokeWidth={3} />
      <polygon
        points="32,12 38,24 50,24 40,32 44,46 32,38 20,46 24,32 14,24 26,24"
        fill="var(--color-ink, #0A0A0A)"
      />
    </svg>
  );
}

/** SVG de ilustración "jugador pateando un balón" estilo Cartel Liga F 2024.
 *  No pixels externos, todo inline. 400x400 default.  */
export function PlayerKickIllustration(props: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 400 400"
      width="100%"
      height="100%"
      {...props}
    >
      {/* background halftone */}
      <defs>
        <pattern id="halftone-dots" x="0" y="0" width="14" height="14" patternUnits="userSpaceOnUse">
          <circle cx="3" cy="3" r="2" fill="var(--color-ink, #0A0A0A)" />
        </pattern>
      </defs>

      <rect width="400" height="400" fill="var(--color-vamos, #FFE600)" />
      <rect width="400" height="400" fill="url(#halftone-dots)" opacity="0.15" />

      {/* magenta ring */}
      <circle cx="200" cy="200" r="150" fill="none" stroke="var(--color-magenta, #FF2E93)" strokeWidth="14" />
      <circle cx="200" cy="200" r="150" fill="none" stroke="var(--color-ink, #0A0A0A)" strokeWidth="3" />

      {/* head */}
      <circle cx="220" cy="120" r="32" fill="var(--color-coral, #FF3D5A)" stroke="var(--color-ink)" strokeWidth="3" />

      {/* body silhouette — abstracted run/kick pose */}
      <path
        d="M190 160 Q200 200 180 240 L160 320 L200 320 L210 250 Q230 240 250 220 L260 180 Z"
        fill="var(--color-cyan, #00D9FF)"
        stroke="var(--color-ink, #0A0A0A)"
        strokeWidth="3"
        strokeLinejoin="round"
      />

      {/* leg kicking */}
      <path
        d="M200 260 L260 240 L280 280 L240 290 Z"
        fill="var(--color-ink, #0A0A0A)"
      />

      {/* ball */}
      <g transform="translate(310, 260) rotate(-15)">
        <circle r="34" fill="var(--color-surface, #FFFFFF)" stroke="var(--color-ink)" strokeWidth="3" />
        <polygon
          points="0,-18 16,-6 10,14 -10,14 -16,-6"
          fill="var(--color-ink, #0A0A0A)"
        />
        <path d="M0 -18 L0 -34 M16 -6 L30 -16 M10 14 L20 28 M-10 14 L-20 28 M-16 -6 L-30 -16"
              stroke="var(--color-ink)" strokeWidth="2" />
      </g>

      {/* motion lines */}
      <path
        d="M70 270 L150 260 M60 240 L150 230 M90 290 L150 280"
        stroke="var(--color-ink)"
        strokeWidth="4"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * Sun / moon pair for the theme toggle.
 * They follow the same rule as the rest of the icon set: `currentColor`
 * and CSS variables only, so they re-theme automatically.
 */

/** Shown when the app is in light mode (click to go dark). */
export function SunIcon(props: IconProps) {
  return (
    <svg {...baseProps} {...props}>
      <circle cx="12" cy="12" r="4.5" fill="currentColor" stroke="none" />
      <g stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M19.1 4.9l-1.8 1.8M6.7 17.3l-1.8 1.8" />
      </g>
    </svg>
  );
}

/** Shown when the app is in dark mode (click to go light). */
export function MoonIcon(props: IconProps) {
  return (
    <svg {...baseProps} {...props}>
      <path
        d="M20.5 14.5A8.5 8.5 0 0 1 9.5 3.5a8.5 8.5 0 1 0 11 11Z"
        fill="currentColor"
        stroke="none"
      />
    </svg>
  );
}

/** Hamburger (mobile menu open trigger). */
export function MenuIcon(props: IconProps) {
  return (
    <svg {...baseProps} {...props}>
      <g stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
        <path d="M3 6h18M3 12h18M3 18h18" />
      </g>
    </svg>
  );
}

/** Close (X) for the mobile menu. */
export function CloseIcon(props: IconProps) {
  return (
    <svg {...baseProps} {...props}>
      <g stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
        <path d="M6 6l12 12M18 6L6 18" />
      </g>
    </svg>
  );
}
