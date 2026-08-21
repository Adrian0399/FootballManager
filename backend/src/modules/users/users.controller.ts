import type { Request, Response, NextFunction } from 'express';
import { usersService } from './users.service.js';
import { listUsersQuerySchema } from './users.validation.js';
import { ApiError } from '../../shared/errors/api-error.js';
import { ok, created } from '../../shared/utils/response.util.js';

export const usersController = {
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = listUsersQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        next(parsed.error);
        return;
      }
      const result = await usersService.findAll(parsed.data);
      ok(res, result);
    } catch (err) {
      next(err);
    }
  },

  async getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw ApiError.unauthorized('Authentication required', 'AUTH_REQUIRED');
      const user = await usersService.findById(req.user.id);
      ok(res, user);
    } catch (err) {
      next(err);
    }
  },

  async updateMe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw ApiError.unauthorized('Authentication required', 'AUTH_REQUIRED');
      const user = await usersService.update(req.user.id, req.body, req.user.id);
      ok(res, user);
    } catch (err) {
      next(err);
    }
  },

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw ApiError.unauthorized('Authentication required', 'AUTH_REQUIRED');
      const user = await usersService.create(req.body, req.user.id);
      created(res, user);
    } catch (err) {
      next(err);
    }
  },

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw ApiError.unauthorized('Authentication required', 'AUTH_REQUIRED');
      const user = await usersService.adminUpdate(req.params.id!, req.body, req.user.id);
      ok(res, user);
    } catch (err) {
      next(err);
    }
  },

  async remove(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw ApiError.unauthorized('Authentication required', 'AUTH_REQUIRED');
      await usersService.softDelete(req.params.id!, req.user.id);
      ok(res, { deleted: true });
    } catch (err) {
      next(err);
    }
  },

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await usersService.findById(req.params.id!);
      ok(res, user);
    } catch (err) {
      next(err);
    }
  },
};