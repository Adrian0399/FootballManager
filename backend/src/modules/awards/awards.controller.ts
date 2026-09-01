import type { Request, Response, NextFunction } from 'express';
import { awardsService } from './awards.service.js';
import { awardListQuerySchema } from './awards.validation.js';
import { ApiError } from '../../shared/errors/api-error.js';
import { ok, created } from '../../shared/utils/response.util.js';

export const awardsController = {
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = awardListQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        next(parsed.error);
        return;
      }
      const result = await awardsService.findAll(parsed.data);
      ok(res, result);
    } catch (err) {
      next(err);
    }
  },

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw ApiError.unauthorized('Authentication required', 'AUTH_REQUIRED');
      }
      const result = await awardsService.create(req.body, req.user.id);
      created(res, result);
    } catch (err) {
      next(err);
    }
  },

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw ApiError.unauthorized('Authentication required', 'AUTH_REQUIRED');
      }
      const result = await awardsService.update(req.params.id!, req.body, req.user.id);
      ok(res, result);
    } catch (err) {
      next(err);
    }
  },

  async remove(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw ApiError.unauthorized('Authentication required', 'AUTH_REQUIRED');
      }
      await awardsService.softDelete(req.params.id!, req.user.id);
      ok(res, { deleted: true });
    } catch (err) {
      next(err);
    }
  },

  async seedForLeague(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw ApiError.unauthorized('Authentication required', 'AUTH_REQUIRED');
      }
      const result = await awardsService.seedForLeague(
        req.params.id!,
        req.body ?? {},
        req.user.id,
      );
      created(res, result);
    } catch (err) {
      next(err);
    }
  },
};
