import { Router } from 'express';
import { auditController } from './audit.controller.js';
import { authenticate, authorize } from '../../shared/middlewares/auth.middleware.js';

export const auditRouter = Router();

/**
 * @openapi
 * /api/v1/audit:
 *   get:
 *     tags: [Audit]
 *     summary: List audit entries (admin only)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: action
 *         schema: { type: string }
 *       - in: query
 *         name: userId
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: from
 *         schema: { type: string, format: date-time }
 *       - in: query
 *         name: to
 *         schema: { type: string, format: date-time }
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1, default: 1 }
 *       - in: query
 *         name: size
 *         schema: { type: integer, minimum: 1, maximum: 100, default: 50 }
 *     responses:
 *       200: { description: Audit entries }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 */
auditRouter.get('/audit', authenticate, authorize('ADMIN'), auditController.list);

/**
 * @openapi
 * /api/v1/audit/summary:
 *   get:
 *     tags: [Audit]
 *     summary: Aggregated audit summary for the monitoring dashboard (admin only)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: from
 *         schema: { type: string, format: date-time }
 *       - in: query
 *         name: to
 *         schema: { type: string, format: date-time }
 *     responses:
 *       200: { description: Audit summary }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 */
auditRouter.get('/audit/summary', authenticate, authorize('ADMIN'), auditController.summary);
