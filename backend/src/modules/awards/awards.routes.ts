import { Router } from 'express';
import { awardsController } from './awards.controller.js';
import {
  awardCreateSchema,
  awardUpdateSchema,
  awardSeedSchema,
} from './awards.validation.js';
import { authenticate, authorize } from '../../shared/middlewares/auth.middleware.js';
import { validateBody } from '../../shared/middlewares/validate.middleware.js';

export const awardsRouter = Router();

/**
 * @openapi
 * /awards:
 *   get:
 *     tags: [Awards]
 *     summary: List awards (optionally filtered by user, league or category)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: userId
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: leagueId
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: [SCORER, MVP, FAIR_PLAY, CHAMPION, BEST_DEFENSE]
 *     responses:
 *       200:
 *         description: List of awards
 */
awardsRouter.get('/awards', authenticate, awardsController.list);

/**
 * @openapi
 * /awards:
 *   post:
 *     tags: [Awards]
 *     summary: Create an award (admin)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Award created
 *       403:
 *         description: Insufficient permissions
 */
awardsRouter.post(
  '/awards',
  authenticate,
  authorize('ADMIN'),
  validateBody(awardCreateSchema),
  awardsController.create,
);

/**
 * @openapi
 * /awards/{id}:
 *   patch:
 *     tags: [Awards]
 *     summary: Update an award (admin)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Award updated
 *       404:
 *         description: Award not found
 */
awardsRouter.patch(
  '/awards/:id',
  authenticate,
  authorize('ADMIN'),
  validateBody(awardUpdateSchema),
  awardsController.update,
);

/**
 * @openapi
 * /awards/{id}:
 *   delete:
 *     tags: [Awards]
 *     summary: Soft-delete an award (admin)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Award deleted
 */
awardsRouter.delete(
  '/awards/:id',
  authenticate,
  authorize('ADMIN'),
  awardsController.remove,
);

/**
 * @openapi
 * /leagues/{id}/awards/seed:
 *   post:
 *     tags: [Awards]
 *     summary: Auto-generate awards for a league (champion, scorers, MVP, fair play)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Awards generated
 *       409:
 *         description: League already has awards
 */
awardsRouter.post(
  '/leagues/:id/awards/seed',
  authenticate,
  authorize('ADMIN'),
  validateBody(awardSeedSchema),
  awardsController.seedForLeague,
);
