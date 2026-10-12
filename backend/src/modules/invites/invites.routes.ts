import { Router } from 'express';
import { invitesController } from './invites.controller.js';
import { authenticate } from '../../shared/middlewares/auth.middleware.js';

export const invitesRouter = Router();

/**
 * @openapi
 * /api/v1/teams/{teamId}/invites:
 *   post:
 *     tags: [Invites]
 *     summary: Create an invitation to join a team (admin or that team's DT)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
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
 *               role: { type: string, enum: [PLAYER, DT, ASSISTANT] }
 *     responses:
 *       201: { description: Invitation created }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 */
invitesRouter.post('/teams/:teamId/invites', authenticate, invitesController.create);

/**
 * @openapi
 * /api/v1/teams/{teamId}/invites:
 *   get:
 *     tags: [Invites]
 *     summary: List invitations for a team (admin or that team's DT)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: teamId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Invitations }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 */
invitesRouter.get('/teams/:teamId/invites', authenticate, invitesController.listByTeam);

/**
 * @openapi
 * /api/v1/invites/{token}:
 *   get:
 *     tags: [Invites]
 *     summary: Resolve an invite token (public — used by the register page)
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Invite resolved (team + role) }
 *       404: { $ref: '#/components/responses/NotFound' }
 */
invitesRouter.get('/invites/:token', invitesController.resolve);
