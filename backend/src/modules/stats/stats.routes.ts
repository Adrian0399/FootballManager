import { Router } from 'express';
import { statsController } from './stats.controller.js';
import { authenticate } from '../../shared/middlewares/auth.middleware.js';

export const statsRouter = Router();

/**
 * @openapi
 * /api/v1/leagues/{id}/stats:
 *   get:
 *     tags: [Stats]
 *     summary: League leaderboards + highlights
 *     description: Returns top scorers, top assisters, MVPs, fair play, and league highlights (top scorer, best GK, best attack, best defense).
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Leaderboards + highlights.
 */
statsRouter.get('/leagues/:id/stats', authenticate, statsController.getForLeague);
