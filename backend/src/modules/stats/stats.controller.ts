import type { Request, Response, NextFunction } from 'express';
import { statsService } from './stats.service.js';
import { ok } from '../../shared/utils/response.util.js';

export const statsController = {
  async getForLeague(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await statsService.computeForLeague(req.params.id!);
      ok(res, result);
    } catch (err) {
      next(err);
    }
  },
};
