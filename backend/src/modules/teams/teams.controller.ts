import type { Request, Response, NextFunction } from 'express';
import { teamsService } from './teams.service.js';
import { ApiError } from '../../shared/errors/api-error.js';
import { ok, created } from '../../shared/utils/response.util.js';

export const teamsController = {
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const leagueId = typeof req.query.leagueId === 'string' ? req.query.leagueId : undefined;
      const teams = await teamsService.findAll(leagueId);
      ok(res, teams);
    } catch (err) {
      next(err);
    }
  },

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const team = await teamsService.findByIdWithMembers(req.params.id!);
      ok(res, team);
    } catch (err) {
      next(err);
    }
  },

  async getMembers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const team = await teamsService.findByIdWithMembers(req.params.id!);
      ok(res, team.members);
    } catch (err) {
      next(err);
    }
  },

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw ApiError.unauthorized('Authentication required', 'AUTH_REQUIRED');
      const team = await teamsService.create(req.body, req.user.id);
      created(res, team);
    } catch (err) {
      next(err);
    }
  },

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw ApiError.unauthorized('Authentication required', 'AUTH_REQUIRED');
      const team = await teamsService.update(req.params.id!, req.body, req.user.id);
      ok(res, team);
    } catch (err) {
      next(err);
    }
  },

  async remove(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw ApiError.unauthorized('Authentication required', 'AUTH_REQUIRED');
      await teamsService.softDelete(req.params.id!, req.user.id);
      ok(res, { deleted: true });
    } catch (err) {
      next(err);
    }
  },

  async addMember(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw ApiError.unauthorized('Authentication required', 'AUTH_REQUIRED');
      const member = await teamsService.addMember(req.params.id!, req.body, req.user.id);
      created(res, member);
    } catch (err) {
      next(err);
    }
  },

  async updateMember(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw ApiError.unauthorized('Authentication required', 'AUTH_REQUIRED');
      const member = await teamsService.updateMember(
        req.params.id!,
        req.params.userId!,
        req.body,
        req.user.id,
      );
      ok(res, member);
    } catch (err) {
      next(err);
    }
  },

  async removeMember(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw ApiError.unauthorized('Authentication required', 'AUTH_REQUIRED');
      await teamsService.removeMember(req.params.id!, req.params.userId!);
      ok(res, { deleted: true });
    } catch (err) {
      next(err);
    }
  },
};
