import { Router } from 'express';
import { profileController } from './profile.controller.js';
import { authenticate } from '../../shared/middlewares/auth.middleware.js';

// Profile aggregation routes (Fase C). Mounted at /api/v1, so the full
// paths are /users/:id/... and /referees/:id/.... A user id path segment
// here is 3 segments deep and does not collide with /users/:id.
export const profileRouter = Router();

/**
 * @openapi
 * /api/v1/users/{id}/profile:
 *   get:
 *     tags: [Profile]
 *     summary: Full player profile bundle (teams, stats, matches, awards, career)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Profile bundle. }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 */
profileRouter.get('/users/:id/profile', authenticate, profileController.getProfile);

/**
 * @openapi
 * /api/v1/users/{id}/teams:
 *   get:
 *     tags: [Profile]
 *     summary: Teams (with membership info) the user belongs to
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Team memberships. }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 */
profileRouter.get('/users/:id/teams', authenticate, profileController.getTeams);

/**
 * @openapi
 * /api/v1/users/{id}/stats:
 *   get:
 *     tags: [Profile]
 *     summary: Aggregated player stats across leagues
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Player stats. }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 */
profileRouter.get('/users/:id/stats', authenticate, profileController.getStats);

/**
 * @openapi
 * /api/v1/users/{id}/stats/by-league:
 *   get:
 *     tags: [Profile]
 *     summary: Per-league player stats (one row per league the user played in)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Per-league player stats. }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 */
profileRouter.get('/users/:id/stats/by-league', authenticate, profileController.getStatsByLeague);

/**
 * @openapi
 * /api/v1/users/{id}/matches:
 *   get:
 *     tags: [Profile]
 *     summary: Recent completed matches for the user (default limit 4)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 50, default: 4 }
 *     responses:
 *       200: { description: Recent matches. }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 */
profileRouter.get('/users/:id/matches', authenticate, profileController.getMatches);

/**
 * @openapi
 * /api/v1/users/{id}/awards:
 *   get:
 *     tags: [Profile]
 *     summary: Awards won by the user
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Awards. }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 */
profileRouter.get('/users/:id/awards', authenticate, profileController.getAwards);

/**
 * @openapi
 * /api/v1/referees/{id}/stats:
 *   get:
 *     tags: [Profile]
 *     summary: Aggregated referee stats
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Referee stats. }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 */
profileRouter.get('/referees/:id/stats', authenticate, profileController.getRefereeStats);

/**
 * @openapi
 * /api/v1/referees/{id}/matches:
 *   get:
 *     tags: [Profile]
 *     summary: Recent matches officiated by the referee (default limit 5)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 50, default: 5 }
 *     responses:
 *       200: { description: Recent matches. }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 */
profileRouter.get('/referees/:id/matches', authenticate, profileController.getRefereeMatches);
