import type { Request, Response, NextFunction } from 'express';
import { invitesService } from './invites.service.js';
import { ApiError } from '../../shared/errors/api-error.js';
import { ok, created } from '../../shared/utils/response.util.js';
import type { TeamRole } from '@prisma/client';

function auth(req: Request): { id: string; role: string } {
  const u = req.user;
  if (!u) throw ApiError.unauthorized('Authentication required', 'AUTH_REQUIRED');
  return { id: u.id, role: u.role };
}

export const invitesController = {
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id, role } = auth(req);
      const teamId = req.params.teamId!;
      const bodyRole = (req.body?.role ?? 'PLAYER') as TeamRole;
      const invite = await invitesService.create(teamId, bodyRole, id, role);
      created(res, invite);
    } catch (err) {
      next(err);
    }
  },

  async listByTeam(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id, role } = auth(req);
      const teamId = req.params.teamId!;
      const invites = await invitesService.listByTeam(teamId, id, role);
      ok(res, invites);
    } catch (err) {
      next(err);
    }
  },

  async resolve(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const invite = await invitesService.resolve(req.params.token!);
      ok(res, invite);
    } catch (err) {
      next(err);
    }
  },
};
