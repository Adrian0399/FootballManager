import type { Request, Response, NextFunction } from 'express';
import { fieldsService } from './fields.service.js';
import { ApiError } from '../../shared/errors/api-error.js';
import { ok, created } from '../../shared/utils/response.util.js';

export const fieldsController = {
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const includeInactive = req.query.includeInactive === 'true';
      const fields = await fieldsService.findAll(includeInactive);
      ok(res, fields);
    } catch (err) {
      next(err);
    }
  },

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const field = await fieldsService.findById(req.params.id!);
      ok(res, field);
    } catch (err) {
      next(err);
    }
  },

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw ApiError.unauthorized('Authentication required', 'AUTH_REQUIRED');
      const field = await fieldsService.create(req.body, req.user.id);
      created(res, field);
    } catch (err) {
      next(err);
    }
  },

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw ApiError.unauthorized('Authentication required', 'AUTH_REQUIRED');
      const field = await fieldsService.update(req.params.id!, req.body, req.user.id);
      ok(res, field);
    } catch (err) {
      next(err);
    }
  },

  async remove(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw ApiError.unauthorized('Authentication required', 'AUTH_REQUIRED');
      await fieldsService.softDelete(req.params.id!, req.user.id);
      ok(res, { deleted: true });
    } catch (err) {
      next(err);
    }
  },
};
