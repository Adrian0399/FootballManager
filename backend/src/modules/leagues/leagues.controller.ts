import type { Request, Response, NextFunction } from 'express';
import { leaguesService } from './leagues.service.js';
import { teamsService } from '../teams/teams.service.js';
import { ApiError } from '../../shared/errors/api-error.js';
import { ok, created } from '../../shared/utils/response.util.js';

export const leaguesController = {
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const includeInactive = req.query.includeInactive === 'true';
      const leagues = await leaguesService.findAll(includeInactive);
      ok(res, leagues);
    } catch (err) {
      next(err);
    }
  },

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const league = await leaguesService.findById(req.params.id!);
      ok(res, league);
    } catch (err) {
      next(err);
    }
  },

  async getTeams(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const teams = await teamsService.findByLeagueWithMembers(req.params.id!);
      ok(res, teams);
    } catch (err) {
      next(err);
    }
  },

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw ApiError.unauthorized('Authentication required', 'AUTH_REQUIRED');
      const league = await leaguesService.create(req.body, req.user.id);
      created(res, league);
    } catch (err) {
      next(err);
    }
  },

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw ApiError.unauthorized('Authentication required', 'AUTH_REQUIRED');
      const league = await leaguesService.update(req.params.id!, req.body, req.user.id);
      ok(res, league);
    } catch (err) {
      next(err);
    }
  },

  async remove(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw ApiError.unauthorized('Authentication required', 'AUTH_REQUIRED');
      await leaguesService.softDelete(req.params.id!, req.user.id);
      ok(res, { deleted: true });
    } catch (err) {
      next(err);
    }
  },

  // ===================================================================
  // Fase B — Tournament engine
  // ===================================================================

  async generateFixture(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw ApiError.unauthorized('Authentication required', 'AUTH_REQUIRED');
      const result = await leaguesService.generateFixture(
        req.params.id!,
        req.body,
        req.user.id,
      );
      ok(res, result);
    } catch (err) {
      next(err);
    }
  },

  async generateKnockout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw ApiError.unauthorized('Authentication required', 'AUTH_REQUIRED');
      const result = await leaguesService.generateKnockout(
        req.params.id!,
        req.body,
        req.user.id,
      );
      ok(res, result);
    } catch (err) {
      next(err);
    }
  },

  async addTeam(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw ApiError.unauthorized('Authentication required', 'AUTH_REQUIRED');
      const entry = await leaguesService.addLeagueTeam(req.params.id!, req.body, req.user.id);
      created(res, entry);
    } catch (err) {
      next(err);
    }
  },

  async updateTeam(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw ApiError.unauthorized('Authentication required', 'AUTH_REQUIRED');
      const entry = await leaguesService.updateLeagueTeam(
        req.params.id!,
        req.params.teamId!,
        req.body,
        req.user.id,
      );
      ok(res, entry);
    } catch (err) {
      next(err);
    }
  },

  async removeTeam(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw ApiError.unauthorized('Authentication required', 'AUTH_REQUIRED');
      await leaguesService.removeLeagueTeam(req.params.id!, req.params.teamId!);
      ok(res, { deleted: true });
    } catch (err) {
      next(err);
    }
  },
};
