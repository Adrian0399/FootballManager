import { Router } from 'express';
import { leaguesController } from './leagues.controller.js';
import { authenticate, authorize } from '../../shared/middlewares/auth.middleware.js';
import { validateBody } from '../../shared/middlewares/validate.middleware.js';
import {
  leagueCreateSchema,
  leagueUpdateSchema,
  fixtureGenerateSchema,
  knockoutGenerateSchema,
  leagueTeamAddSchema,
  leagueTeamUpdateSchema,
} from './leagues.validation.js';

export const leaguesRouter = Router();

/**
 * @openapi
 * /api/v1/leagues:
 *   get:
 *     tags: [Leagues]
 *     summary: List leagues
 *     description: Returns active (non-soft-deleted) leagues ordered by `isActive DESC, name ASC`. Pass `includeInactive=true` to also see soft-deleted ones.
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: includeInactive
 *         schema: { type: boolean, default: false }
 *     responses:
 *       200:
 *         description: Array of leagues with their `fieldIds`.
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessEnvelope'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items: { $ref: '#/components/schemas/League' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 */
leaguesRouter.get('/', authenticate, leaguesController.list);

/**
 * @openapi
 * /api/v1/leagues/{id}:
 *   get:
 *     tags: [Leagues]
 *     summary: Get a league by id
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: League found.
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessEnvelope'
 *                 - type: object
 *                   properties:
 *                     data: { $ref: '#/components/schemas/League' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       404: { $ref: '#/components/responses/NotFound' }
 */
leaguesRouter.get('/:id', authenticate, leaguesController.getById);

/**
 * @openapi
 * /api/v1/leagues/{id}/teams:
 *   get:
 *     tags: [Leagues]
 *     summary: List teams assigned to a league
 *     description: Returns all teams in the league, ordered by seed, with their members.
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Array of teams with members and seed.
 */
leaguesRouter.get('/:id/teams', authenticate, leaguesController.getTeams);

/**
 * @openapi
 * /api/v1/leagues:
 *   post:
 *     tags: [Leagues]
 *     summary: Create a league
 *     description: '**ADMIN only.** Every `fieldId` must reference an existing, non-soft-deleted field.'
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/CreateLeagueRequest' }
 *     responses:
 *       201:
 *         description: League created.
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessEnvelope'
 *                 - type: object
 *                   properties:
 *                     data: { $ref: '#/components/schemas/League' }
 *       400:
 *         description: Validation error or unknown `fieldId`.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorEnvelope' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 */
leaguesRouter.post(
  '/',
  authenticate,
  authorize('ADMIN'),
  validateBody(leagueCreateSchema),
  leaguesController.create,
);

/**
 * @openapi
 * /api/v1/leagues/{id}:
 *   patch:
 *     tags: [Leagues]
 *     summary: Update a league
 *     description: |
 *       **ADMIN only.** Partial update. If `fieldIds` is provided, it **replaces**
 *       the entire set of associated fields atomically. `startDate` must be
 *       `<= endDate` when both are set.
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
 *           schema: { $ref: '#/components/schemas/UpdateLeagueRequest' }
 *     responses:
 *       200:
 *         description: Updated league.
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessEnvelope'
 *                 - type: object
 *                   properties:
 *                     data: { $ref: '#/components/schemas/League' }
 *       400:
 *         description: Validation error, unknown `fieldId`, or invalid date range.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorEnvelope' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 */
leaguesRouter.patch(
  '/:id',
  authenticate,
  authorize('ADMIN'),
  validateBody(leagueUpdateSchema),
  leaguesController.update,
);

/**
 * @openapi
 * /api/v1/leagues/{id}:
 *   delete:
 *     tags: [Leagues]
 *     summary: Soft-delete a league
 *     description: '**ADMIN only.** Sets `deletedAt`.'
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Deleted.
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessEnvelope'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         deleted: { type: boolean, example: true }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 */
leaguesRouter.delete(
  '/:id',
  authenticate,
  authorize('ADMIN'),
  leaguesController.remove,
);

/**
 * @openapi
 * /api/v1/leagues/{id}/fixture/generate:
 *   post:
 *     tags: [Leagues]
 *     summary: Generate the round-robin fixture
 *     description: |
 *       **ADMIN only.** Replaces any existing fixture (matchdays + matches) with a
 *       fresh Berger round-robin. Honors `league.homeAndAway` (single vs double
 *       round) and `league.dayOfWeek` / `league.timeSlot` for scheduling.
 *       Fails with `FIXTURE_IN_PLAY` if the league already has played matches
 *       unless `force=true`.
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/GenerateFixtureRequest' }
 *     responses:
 *       200:
 *         description: Fixture generated.
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessEnvelope'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         matchdayCount: { type: integer }
 *                         matchCount: { type: integer }
 *       400: { $ref: '#/components/responses/ValidationError' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 *       409:
 *         description: '`FIXTURE_IN_PLAY` — already has played matches.'
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorEnvelope' }
 */
leaguesRouter.post(
  '/:id/fixture/generate',
  authenticate,
  authorize('ADMIN'),
  validateBody(fixtureGenerateSchema),
  leaguesController.generateFixture,
);

/**
 * @openapi
 * /api/v1/leagues/{id}/knockout/generate:
 *   post:
 *     tags: [Leagues]
 *     summary: Generate the knockout bracket
 *     description: |
 *       **ADMIN only.** Builds an 8-team single-elimination bracket from the
 *       current standings (seed order when no matches have been played).
 *       Fails with `KNOCKOUT_EXISTS` if a bracket already exists unless `force=true`.
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/GenerateKnockoutRequest' }
 *     responses:
 *       200:
 *         description: Bracket generated.
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessEnvelope'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         quarters: { type: integer }
 *                         semis: { type: integer }
 *                         final: { type: integer }
 *                         thirdPlace: { type: integer }
 *                         matchdayId: { type: string, format: uuid }
 *       400: { $ref: '#/components/responses/ValidationError' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 *       409:
 *         description: '`KNOCKOUT_EXISTS` — bracket already present.'
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorEnvelope' }
 */
leaguesRouter.post(
  '/:id/knockout/generate',
  authenticate,
  authorize('ADMIN'),
  validateBody(knockoutGenerateSchema),
  leaguesController.generateKnockout,
);

/**
 * @openapi
 * /api/v1/leagues/{id}/teams:
 *   post:
 *     tags: [Leagues]
 *     summary: Enroll a team in a league
 *     description: '**ADMIN only.** Adds a LeagueTeam row. `seed` defaults to the next free slot.'
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
 *           schema:
 *             type: object
 *             required: [teamId]
 *             properties:
 *               teamId: { type: string, format: uuid }
 *               seed: { type: integer, minimum: 1 }
 *               groupLabel: { type: string, nullable: true, maxLength: 5 }
 *     responses:
 *       201:
 *         description: Team enrolled.
 *       400: { $ref: '#/components/responses/ValidationError' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 *       409: { description: '`TEAM_ALREADY_ENROLLED`.' }
 */
leaguesRouter.post(
  '/:id/teams',
  authenticate,
  authorize('ADMIN'),
  validateBody(leagueTeamAddSchema),
  leaguesController.addTeam,
);

/**
 * @openapi
 * /api/v1/leagues/{id}/teams/{teamId}:
 *   patch:
 *     tags: [Leagues]
 *     summary: Reorder / regroup a league enrollment
 *     description: '**ADMIN only.** Updates `seed` and/or `groupLabel`.'
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: path
 *         name: teamId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               seed: { type: integer, minimum: 1 }
 *               groupLabel: { type: string, nullable: true, maxLength: 5 }
 *     responses:
 *       200:
 *         description: Enrollment updated.
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { description: '`ENROLLMENT_NOT_FOUND`.' }
 *   delete:
 *     tags: [Leagues]
 *     summary: Remove a team from a league
 *     description: '**ADMIN only.** Deletes the LeagueTeam row.'
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: path
 *         name: teamId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Enrollment removed.
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { description: '`ENROLLMENT_NOT_FOUND`.' }
 */
leaguesRouter.patch(
  '/:id/teams/:teamId',
  authenticate,
  authorize('ADMIN'),
  validateBody(leagueTeamUpdateSchema),
  leaguesController.updateTeam,
);

leaguesRouter.delete(
  '/:id/teams/:teamId',
  authenticate,
  authorize('ADMIN'),
  leaguesController.removeTeam,
);
