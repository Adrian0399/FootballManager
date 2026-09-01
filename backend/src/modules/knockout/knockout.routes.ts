import { Router } from 'express';
import { knockoutController } from './knockout.controller.js';
import { authenticate } from '../../shared/middlewares/auth.middleware.js';

export const knockoutRouter = Router();

/**
 * @openapi
 * /api/v1/leagues/{id}/knockout:
 *   get:
 *     tags: [Knockout]
 *     summary: Get knockout bracket for a league
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Bracket with quarters, semis, final, third place, and champion.
 */
knockoutRouter.get('/leagues/:id/knockout', authenticate, knockoutController.getBracket);
