import type { Request, Response, NextFunction } from 'express';
import { matchesService } from './matches.service.js';
import { ApiError } from '../../shared/errors/api-error.js';
import { ok, created } from '../../shared/utils/response.util.js';

export const matchesController = {
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const leagueId = typeof req.query.leagueId === 'string' ? req.query.leagueId : undefined;
      const matchdayId = typeof req.query.matchdayId === 'string' ? req.query.matchdayId : undefined;
      const matches = await matchesService.findAll({ leagueId, matchdayId });
      ok(res, matches);
    } catch (err) {
      next(err);
    }
  },

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const match = await matchesService.findById(req.params.id!);
      ok(res, match);
    } catch (err) {
      next(err);
    }
  },

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw ApiError.unauthorized('Authentication required', 'AUTH_REQUIRED');
      const match = await matchesService.create(req.body, req.user.id);
      created(res, match);
    } catch (err) {
      next(err);
    }
  },

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw ApiError.unauthorized('Authentication required', 'AUTH_REQUIRED');
      const match = await matchesService.update(req.params.id!, req.body, req.user.id);
      ok(res, match);
    } catch (err) {
      next(err);
    }
  },

  async setScore(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw ApiError.unauthorized('Authentication required', 'AUTH_REQUIRED');
      const match = await matchesService.setScore(req.params.id!, req.body, req.user.id);
      ok(res, match);
    } catch (err) {
      next(err);
    }
  },

  async setStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw ApiError.unauthorized('Authentication required', 'AUTH_REQUIRED');
      const match = await matchesService.setStatus(req.params.id!, req.body, req.user.id);
      ok(res, match);
    } catch (err) {
      next(err);
    }
  },

  async remove(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await matchesService.remove(req.params.id!);
      ok(res, { deleted: true });
    } catch (err) {
      next(err);
    }
  },

  // ----- Matchday writes (ADMIN) — L-5, L-6, L-7 -----

  async createMatchday(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw ApiError.unauthorized('Authentication required', 'AUTH_REQUIRED');
      const md = await matchesService.createMatchday(req.params.id!, req.body, req.user.id);
      created(res, md);
    } catch (err) {
      next(err);
    }
  },

  async updateMatchday(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw ApiError.unauthorized('Authentication required', 'AUTH_REQUIRED');
      const md = await matchesService.updateMatchday(req.params.id!, req.body, req.user.id);
      ok(res, md);
    } catch (err) {
      next(err);
    }
  },

  async removeMatchday(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await matchesService.removeMatchday(req.params.id!);
      ok(res, { deleted: true });
    } catch (err) {
      next(err);
    }
  },
};
