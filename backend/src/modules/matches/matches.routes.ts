import { Router } from 'express';
import { matchesController } from './matches.controller.js';
import { matchesService } from './matches.service.js';
import { authenticate, authorize } from '../../shared/middlewares/auth.middleware.js';
import { validateBody } from '../../shared/middlewares/validate.middleware.js';
import { ok } from '../../shared/utils/response.util.js';
import {
  matchCreateSchema,
  matchUpdateSchema,
  matchScoreSchema,
  matchStatusSchema,
} from './matches.validation.js';
import {
  matchdayCreateSchema,
  matchdayUpdateSchema,
} from '../leagues/leagues.validation.js';

export const matchesRouter = Router();

/**
 * @openapi
 * /api/v1/matches:
 *   get:
 *     tags: [Matches]
 *     summary: List matches
 *     parameters:
 *       - in: query
 *         name: leagueId
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: matchdayId
 *         schema: { type: string, format: uuid }
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Array of matches with embedded homeTeam/awayTeam.
 */
matchesRouter.get('/', authenticate, matchesController.list);

/**
 * @openapi
 * /api/v1/matches/{id}:
 *   get:
 *     tags: [Matches]
 *     summary: Get a match by id
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Match with embedded homeTeam/awayTeam.
 *       404: { $ref: '#/components/responses/NotFound' }
 */
matchesRouter.get('/:id', authenticate, matchesController.getById);

/**
 * @openapi
 * /api/v1/leagues/{id}/matchdays:
 *   get:
 *     tags: [Matches]
 *     summary: List matchdays of a league
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Array of matchdays ordered by number.
 */
export const leagueMatchdaysRouter = Router();
leagueMatchdaysRouter.get('/:id/matchdays', authenticate, async (req, res, next) => {
  try {
    const mds = await matchesService.findMatchdaysByLeague(req.params.id!);
    ok(res, mds);
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /api/v1/leagues/{id}/matchdays:
 *   post:
 *     tags: [Matches]
 *     summary: Add a matchday to a league
 *     description: '**ADMIN only.** `number` defaults to the next free slot.'
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       201: { description: Matchday created. }
 *       400: { $ref: '#/components/responses/ValidationError' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       409: { description: '`MATCHDAY_EXISTS`.' }
 */
leagueMatchdaysRouter.post(
  '/:id/matchdays',
  authenticate,
  authorize('ADMIN'),
  validateBody(matchdayCreateSchema),
  matchesController.createMatchday,
);

/**
 * @openapi
 * /api/v1/matchdays/{id}:
 *   get:
 *     tags: [Matches]
 *     summary: Get a matchday by id
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Matchday.
 *       404: { $ref: '#/components/responses/NotFound' }
 */
export const matchdaysRouter = Router();
matchdaysRouter.get('/:id', authenticate, async (req, res, next) => {
  try {
    const md = await matchesService.findMatchdayById(req.params.id!);
    ok(res, md);
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /api/v1/matchdays/{id}:
 *   patch:
 *     tags: [Matches]
 *     summary: Update a matchday
 *     description: '**ADMIN only.** Edit `number`, `date` and/or `status`.'
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Updated matchday. }
 *       400: { $ref: '#/components/responses/ValidationError' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 *       409: { description: '`MATCHDAY_EXISTS`.' }
 *   delete:
 *     tags: [Matches]
 *     summary: Delete a matchday
 *     description: '**ADMIN only.** Cascades its scheduled matches. Fails with `MATCHDAY_IN_PLAY` if any match is played.'
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Deleted. }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 *       409: { description: '`MATCHDAY_IN_PLAY`.' }
 */
matchdaysRouter.patch(
  '/:id',
  authenticate,
  authorize('ADMIN'),
  validateBody(matchdayUpdateSchema),
  matchesController.updateMatchday,
);

matchdaysRouter.delete(
  '/:id',
  authenticate,
  authorize('ADMIN'),
  matchesController.removeMatchday,
);

/**
 * @openapi
 * /api/v1/matches:
 *   post:
 *     tags: [Matches]
 *     summary: Create a match
 *     description: '**ADMIN only.** The matchday must belong to the given league.'
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201: { description: Match created. }
 *       400: { $ref: '#/components/responses/ValidationError' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 */
matchesRouter.post(
  '/',
  authenticate,
  authorize('ADMIN'),
  validateBody(matchCreateSchema),
  matchesController.create,
);

/**
 * @openapi
 * /api/v1/matches/{id}:
 *   patch:
 *     tags: [Matches]
 *     summary: Update a match
 *     description: '**ADMIN only.** Partial update (schedule, teams, field, referee, notes, knockout).'
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Updated match. }
 *       400: { $ref: '#/components/responses/ValidationError' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 */
matchesRouter.patch(
  '/:id',
  authenticate,
  authorize('ADMIN'),
  validateBody(matchUpdateSchema),
  matchesController.update,
);

/**
 * @openapi
 * /api/v1/matches/{id}/score:
 *   patch:
 *     tags: [Matches]
 *     summary: Set the final score of a match
 *     description: '**ADMIN only.** Optionally flips status (e.g. to COMPLETED) in the same call.'
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/SetMatchScoreRequest' }
 *     responses:
 *       200: { description: Updated match. }
 *       400: { $ref: '#/components/responses/ValidationError' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 */
matchesRouter.patch(
  '/:id/score',
  authenticate,
  authorize('ADMIN'),
  validateBody(matchScoreSchema),
  matchesController.setScore,
);

/**
 * @openapi
 * /api/v1/matches/{id}/status:
 *   patch:
 *     tags: [Matches]
 *     summary: Change the status of a match
 *     description: '**ADMIN only.**'
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Updated match. }
 *       400: { $ref: '#/components/responses/ValidationError' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 */
matchesRouter.patch(
  '/:id/status',
  authenticate,
  authorize('ADMIN'),
  validateBody(matchStatusSchema),
  matchesController.setStatus,
);

/**
 * @openapi
 * /api/v1/matches/{id}:
 *   delete:
 *     tags: [Matches]
 *     summary: Delete a match
 *     description: '**ADMIN only.** Hard delete; match events cascade.'
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Deleted. }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 */
matchesRouter.delete(
  '/:id',
  authenticate,
  authorize('ADMIN'),
  matchesController.remove,
);
