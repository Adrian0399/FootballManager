import type { Request, Response, NextFunction } from 'express';
import { profileService } from './profile.service.js';
import { ok } from '../../shared/utils/response.util.js';

function limitFrom(query: unknown, fallback: number): number {
  const raw = (query as Record<string, unknown>).limit;
  const n = typeof raw === 'string' ? Number.parseInt(raw, 10) : NaN;
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.min(n, 50);
}

export const profileController = {
  async getProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const bundle = await profileService.getProfile(req.params.id!);
      ok(res, bundle);
    } catch (err) {
      next(err);
    }
  },

  async getTeams(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      ok(res, await profileService.getTeams(req.params.id!));
    } catch (err) {
      next(err);
    }
  },

  async getStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      ok(res, await profileService.getStats(req.params.id!));
    } catch (err) {
      next(err);
    }
  },

  async getStatsByLeague(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      ok(res, await profileService.getStatsByLeague(req.params.id!));
    } catch (err) {
      next(err);
    }
  },

  async getMatches(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      ok(res, await profileService.getRecentMatches(req.params.id!, limitFrom(req.query, 4)));
    } catch (err) {
      next(err);
    }
  },

  async getAwards(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      ok(res, await profileService.getAwards(req.params.id!));
    } catch (err) {
      next(err);
    }
  },

  async getRefereeStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      ok(res, await profileService.getRefereeStats(req.params.id!));
    } catch (err) {
      next(err);
    }
  },

  async getRefereeMatches(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      ok(res, await profileService.getRefereeMatches(req.params.id!, limitFrom(req.query, 5)));
    } catch (err) {
      next(err);
    }
  },
};
