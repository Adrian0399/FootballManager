import rateLimit, { type Options } from 'express-rate-limit';
import type { Request, Response } from 'express';
import { fail } from '../utils/response.util.js';

function makeHandler(code: string, message: string): Options['handler'] {
  return (_req: Request, res: Response) => {
    fail(res, 429, code, message);
  };
}

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  handler: makeHandler('RATE_LIMITED', 'Too many auth attempts. Try again later.'),
});

/**
 * `/auth/refresh` is called on **every page load** (silent session restore
 * in `App.tsx`), so a plain reload is a *successful* call and must not eat
 * the budget. `skipSuccessfulRequests` decrements the counter for any
 * response under 400, leaving only failed/abusive refreshes counted.
 */
export const refreshRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  handler: makeHandler(
    'RATE_LIMITED',
    'Too many session refresh attempts. Try again in a few minutes.',
  ),
});

export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  handler: makeHandler('RATE_LIMITED', 'Too many login attempts. Try again later.'),
});

export const registerRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: makeHandler('RATE_LIMITED', 'Too many accounts created from this IP. Try again later.'),
});