import type { Request, Response, NextFunction } from 'express';
import { eventsService } from './events.service.js';
import { ApiError } from '../../shared/errors/api-error.js';
import { ok, created } from '../../shared/utils/response.util.js';

export const eventsController = {
  async listByMatch(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const events = await eventsService.findByMatch(req.params.matchId!);
      ok(res, events);
    } catch (err) {
      next(err);
    }
  },

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw ApiError.unauthorized('Authentication required', 'AUTH_REQUIRED');
      const event = await eventsService.create(req.params.matchId!, req.body, req.user.id);
      created(res, event);
    } catch (err) {
      next(err);
    }
  },

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const event = await eventsService.update(req.params.id!, req.body);
      ok(res, event);
    } catch (err) {
      next(err);
    }
  },

  async remove(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await eventsService.remove(req.params.id!);
      ok(res, { deleted: true });
    } catch (err) {
      next(err);
    }
  },
};
