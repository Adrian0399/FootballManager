import { env } from '../../config/env.js';

export const REFRESH_TOKEN_COOKIE = 'kaibil_rt';
export const REFRESH_COOKIE_PATH = '/api/v1/auth';

/** Minimal cookie shape used by `res.cookie()` / `res.clearCookie()`. */
export interface RefreshCookieOptions {
  httpOnly: boolean;
  sameSite: 'lax' | 'strict' | 'none';
  secure: boolean;
  domain?: string;
  path: string;
  maxAge?: number;
}

function baseOptions(): RefreshCookieOptions {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.COOKIE_SECURE,
    // Omit `domain` for localhost so the cookie is set without a domain attribute.
    domain: env.COOKIE_DOMAIN && env.COOKIE_DOMAIN !== 'localhost' ? env.COOKIE_DOMAIN : undefined,
    path: REFRESH_COOKIE_PATH,
  };
}

export function refreshTokenCookieOptions(maxAgeMs: number): RefreshCookieOptions {
  return { ...baseOptions(), maxAge: maxAgeMs };
}

export function clearRefreshTokenCookieOptions(): RefreshCookieOptions {
  return { ...baseOptions() };
}