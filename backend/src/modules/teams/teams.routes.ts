import { Router } from 'express';
import { teamsController } from './teams.controller.js';
import { authenticate, authorize } from '../../shared/middlewares/auth.middleware.js';
import { validateBody } from '../../shared/middlewares/validate.middleware.js';
import {
  teamCreateSchema,
  teamUpdateSchema,
  membershipCreateSchema,
  membershipUpdateSchema,
} from './teams.validation.js';

/**
 * @openapi
 * /api/v1/teams:
 *   get:
 *     tags: [Teams]
 *     summary: List teams
 *     description: Returns active (non-soft-deleted) teams. Optionally filtered by league.
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: leagueId
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Array of teams.
 *       401: { $ref: '#/components/responses/Unauthorized' }
 */
export const teamsRouter = Router();

teamsRouter.get('/', authenticate, teamsController.list);

/**
 * @openapi
 * /api/v1/teams/{id}:
 *   get:
 *     tags: [Teams]
 *     summary: Get a team by id (with members)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Team with members.
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       404: { $ref: '#/components/responses/NotFound' }
 */
teamsRouter.get('/:id', authenticate, teamsController.getById);

/**
 * @openapi
 * /api/v1/teams/{id}/members:
 *   get:
 *     tags: [Teams]
 *     summary: Get team members
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Array of team members (player/staff).
 */
teamsRouter.get('/:id/members', authenticate, teamsController.getMembers);

/**
 * @openapi
 * /api/v1/teams:
 *   post:
 *     tags: [Teams]
 *     summary: Create a team
 *     description: '**ADMIN only.** Optionally enrolls the team in a league (adds a LeagueTeam entry).'
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/CreateTeamRequest' }
 *     responses:
 *       201:
 *         description: Team created.
 *       400: { $ref: '#/components/responses/ValidationError' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 */
teamsRouter.post(
  '/',
  authenticate,
  authorize('ADMIN'),
  validateBody(teamCreateSchema),
  teamsController.create,
);

/**
 * @openapi
 * /api/v1/teams/{id}:
 *   patch:
 *     tags: [Teams]
 *     summary: Update a team
 *     description: '**ADMIN only.** Partial update.'
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Updated team. }
 *       400: { $ref: '#/components/responses/ValidationError' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 */
teamsRouter.patch(
  '/:id',
  authenticate,
  authorize('ADMIN'),
  validateBody(teamUpdateSchema),
  teamsController.update,
);

/**
 * @openapi
 * /api/v1/teams/{id}:
 *   delete:
 *     tags: [Teams]
 *     summary: Soft-delete a team
 *     description: '**ADMIN only.**'
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
teamsRouter.delete(
  '/:id',
  authenticate,
  authorize('ADMIN'),
  teamsController.remove,
);

/**
 * @openapi
 * /api/v1/teams/{id}/members:
 *   post:
 *     tags: [Teams]
 *     summary: Add a member to a team roster
 *     description: '**ADMIN only.** `jerseyNumber` and `position` apply only to PLAYER memberships.'
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       201: { description: Membership created. }
 *       400: { $ref: '#/components/responses/ValidationError' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       409: { description: User is already a member. }
 */
teamsRouter.post(
  '/:id/members',
  authenticate,
  authorize('ADMIN'),
  validateBody(membershipCreateSchema),
  teamsController.addMember,
);

/**
 * @openapi
 * /api/v1/teams/{id}/members/{userId}:
 *   patch:
 *     tags: [Teams]
 *     summary: Update a roster membership
 *     description: '**ADMIN only.**'
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Updated membership. }
 *       400: { $ref: '#/components/responses/ValidationError' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 */
teamsRouter.patch(
  '/:id/members/:userId',
  authenticate,
  authorize('ADMIN'),
  validateBody(membershipUpdateSchema),
  teamsController.updateMember,
);

/**
 * @openapi
 * /api/v1/teams/{id}/members/{userId}:
 *   delete:
 *     tags: [Teams]
 *     summary: Remove a member from a team roster
 *     description: '**ADMIN only.** Hard deletes the membership row.'
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Removed. }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 */
teamsRouter.delete(
  '/:id/members/:userId',
  authenticate,
  authorize('ADMIN'),
  teamsController.removeMember,
);
