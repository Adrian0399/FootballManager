import type { Request, Response, NextFunction } from 'express';
import { standingsService } from './standings.service.js';
import { ok } from '../../shared/utils/response.util.js';

export const standingsController = {
  async getForLeague(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await standingsService.computeForLeague(req.params.id!);
      ok(res, result);
    } catch (err) {
      next(err);
    }
  },
};
