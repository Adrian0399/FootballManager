import { Router } from 'express';
import { standingsController } from './standings.controller.js';
import { authenticate } from '../../shared/middlewares/auth.middleware.js';

export const standingsRouter = Router();

/**
 * @openapi
 * /api/v1/leagues/{id}/standings:
 *   get:
 *     tags: [Standings]
 *     summary: Compute standings for a league
 *     description: Returns the league table ordered by points (desc), then goal difference, goals for, fair play. Uses only COMPLETED matches.
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Standings with overall and per-group arrays.
 */
standingsRouter.get('/leagues/:id/standings', authenticate, standingsController.getForLeague);
