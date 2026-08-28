import { Router } from 'express';
import { eventsController } from './events.controller.js';
import { authenticate, authorize } from '../../shared/middlewares/auth.middleware.js';
import { validateBody } from '../../shared/middlewares/validate.middleware.js';
import { eventCreateSchema, eventUpdateSchema } from './events.validation.js';

/**
 * @openapi
 * /api/v1/matches/{matchId}/events:
 *   get:
 *     tags: [Events]
 *     summary: List events for a match
 *     description: Returns all events (goals, assists, cards, MVP) for a match, ordered by minute.
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: matchId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Array of match events.
 */
export const eventsRouter = Router();
eventsRouter.get('/matches/:matchId/events', authenticate, eventsController.listByMatch);

/**
 * @openapi
 * /api/v1/matches/{matchId}/events:
 *   post:
 *     tags: [Events]
 *     summary: Add an event to a match
 *     description: '**ADMIN only.** GOAL events recompute the match scoreboard automatically. MVP events set the match MVP.'
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: matchId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       201: { description: Event created. }
 *       400: { $ref: '#/components/responses/ValidationError' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 */
eventsRouter.post(
  '/matches/:matchId/events',
  authenticate,
  authorize('ADMIN'),
  validateBody(eventCreateSchema),
  eventsController.create,
);

/**
 * @openapi
 * /api/v1/events/{id}:
 *   patch:
 *     tags: [Events]
 *     summary: Update a match event
 *     description: '**ADMIN only.**'
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Updated event. }
 *       400: { $ref: '#/components/responses/ValidationError' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 */
eventsRouter.patch(
  '/events/:id',
  authenticate,
  authorize('ADMIN'),
  validateBody(eventUpdateSchema),
  eventsController.update,
);

/**
 * @openapi
 * /api/v1/events/{id}:
 *   delete:
 *     tags: [Events]
 *     summary: Delete a match event
 *     description: '**ADMIN only.** Deleting a GOAL recomputes the scoreboard.'
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
eventsRouter.delete(
  '/events/:id',
  authenticate,
  authorize('ADMIN'),
  eventsController.remove,
);
