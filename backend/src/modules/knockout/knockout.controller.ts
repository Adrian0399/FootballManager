import type { Request, Response, NextFunction } from 'express';
import { knockoutService } from './knockout.service.js';
import { ok } from '../../shared/utils/response.util.js';

export const knockoutController = {
  async getBracket(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const bracket = await knockoutService.getBracket(req.params.id!);
      ok(res, bracket);
    } catch (err) {
      next(err);
    }
  },
};
