import type { Request, Response, NextFunction } from 'express';
import { authService } from './auth.service.js';
import { ApiError } from '../../shared/errors/api-error.js';
import {
  REFRESH_TOKEN_COOKIE,
  refreshTokenCookieOptions,
  clearRefreshTokenCookieOptions,
} from '../../shared/utils/cookie.util.js';
import { ok, created } from '../../shared/utils/response.util.js';

const REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function setRefreshCookie(res: Response, refreshToken: string): void {
  res.cookie(REFRESH_TOKEN_COOKIE, refreshToken, refreshTokenCookieOptions(REFRESH_TTL_MS));
}

function clearRefreshCookie(res: Response): void {
  res.clearCookie(REFRESH_TOKEN_COOKIE, clearRefreshTokenCookieOptions());
}

export const authController = {
  async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const creatorId = req.user?.id;
      const result = await authService.register(req.body, creatorId);
      setRefreshCookie(res, result.refreshToken);
      created(res, { user: result.user, accessToken: result.accessToken });
    } catch (err) {
      next(err);
    }
  },

  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await authService.login(req.body);
      setRefreshCookie(res, result.refreshToken);
      ok(res, { user: result.user, accessToken: result.accessToken });
    } catch (err) {
      next(err);
    }
  },

  async refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const refreshToken = req.cookies?.[REFRESH_TOKEN_COOKIE];
      if (!refreshToken) throw ApiError.unauthorized('No refresh token cookie', 'NO_REFRESH');

      const result = await authService.refresh(refreshToken);
      setRefreshCookie(res, result.refreshToken);
      ok(res, { user: result.user, accessToken: result.accessToken });
    } catch (err) {
      next(err);
    }
  },

  async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const refreshToken = req.cookies?.[REFRESH_TOKEN_COOKIE];
      await authService.logout(refreshToken);
      clearRefreshCookie(res);
      ok(res, { loggedOut: true });
    } catch (err) {
      next(err);
    }
  },
};