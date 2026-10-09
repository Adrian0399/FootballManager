import type { Request, Response, NextFunction } from 'express';
import { auditService } from './audit.service.js';
import { ok } from '../../shared/utils/response.util.js';

function parseQuery(req: Request) {
  const q = req.query as Record<string, string | undefined>;
  return {
    action: q.action || undefined,
    userId: q.userId || undefined,
    from: q.from || undefined,
    to: q.to || undefined,
    page: q.page ? Number(q.page) : undefined,
    size: q.size ? Number(q.size) : undefined,
  };
}

export const auditController = {
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await auditService.list(parseQuery(req));
      ok(res, result);
    } catch (err) {
      next(err);
    }
  },

  async summary(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { from, to } = parseQuery(req);
      const result = await auditService.summary(from, to);
      ok(res, result);
    } catch (err) {
      next(err);
    }
  },
};
