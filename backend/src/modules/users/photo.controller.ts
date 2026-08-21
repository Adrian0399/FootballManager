import type { Request, Response, NextFunction } from 'express';
import fs from 'node:fs/promises';
import { ApiError } from '../../shared/errors/api-error.js';
import { runUpload } from '../../shared/middlewares/upload.middleware.js';
import { photoService } from './photo.service.js';
import { ok } from '../../shared/utils/response.util.js';

export const photoController = {
  async uploadProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw ApiError.unauthorized('Authentication required', 'AUTH_REQUIRED');
      await runUpload(req, res);
      if (!req.file) throw ApiError.badRequest('No file uploaded under field "file"', 'NO_FILE');

      await photoService.uploadProfilePhoto(req.user.id, req.file.path);
      const user = await photoService.getUserWithUrls(req.user.id);
      ok(res, user);
    } catch (err) {
      if (req.file?.path) await fs.unlink(req.file.path).catch(() => undefined);
      next(err);
    }
  },

  async deleteProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw ApiError.unauthorized('Authentication required', 'AUTH_REQUIRED');
      await photoService.deleteProfilePhoto(req.user.id);
      const user = await photoService.getUserWithUrls(req.user.id);
      ok(res, user);
    } catch (err) {
      next(err);
    }
  },

  async uploadCover(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw ApiError.unauthorized('Authentication required', 'AUTH_REQUIRED');
      await runUpload(req, res);
      if (!req.file) throw ApiError.badRequest('No file uploaded under field "file"', 'NO_FILE');

      await photoService.uploadCoverPhoto(req.user.id, req.file.path);
      const user = await photoService.getUserWithUrls(req.user.id);
      ok(res, user);
    } catch (err) {
      if (req.file?.path) await fs.unlink(req.file.path).catch(() => undefined);
      next(err);
    }
  },

  async deleteCover(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw ApiError.unauthorized('Authentication required', 'AUTH_REQUIRED');
      await photoService.deleteCoverPhoto(req.user.id);
      const user = await photoService.getUserWithUrls(req.user.id);
      ok(res, user);
    } catch (err) {
      next(err);
    }
  },
};