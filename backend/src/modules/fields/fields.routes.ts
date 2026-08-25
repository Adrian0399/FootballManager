import { Router } from 'express';
import { fieldsController } from './fields.controller.js';
import { authenticate, authorize } from '../../shared/middlewares/auth.middleware.js';
import { validateBody } from '../../shared/middlewares/validate.middleware.js';
import { fieldCreateSchema, fieldUpdateSchema } from './fields.validation.js';

export const fieldsRouter = Router();

/**
 * @openapi
 * /api/v1/fields:
 *   get:
 *     tags: [Fields]
 *     summary: List fields
 *     description: Returns active (non-soft-deleted) fields by default. Pass `includeInactive=true` to also see soft-deleted ones.
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: includeInactive
 *         schema: { type: boolean, default: false }
 *     responses:
 *       200:
 *         description: Array of fields.
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessEnvelope'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items: { $ref: '#/components/schemas/Field' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 */
// List and get are open to any authenticated user.
fieldsRouter.get('/', authenticate, fieldsController.list);

/**
 * @openapi
 * /api/v1/fields/{id}:
 *   get:
 *     tags: [Fields]
 *     summary: Get a field by id
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Field found.
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessEnvelope'
 *                 - type: object
 *                   properties:
 *                     data: { $ref: '#/components/schemas/Field' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       404: { $ref: '#/components/responses/NotFound' }
 */
fieldsRouter.get('/:id', authenticate, fieldsController.getById);

/**
 * @openapi
 * /api/v1/fields:
 *   post:
 *     tags: [Fields]
 *     summary: Create a field
 *     description: '**ADMIN only.** Name must be unique among active fields.'
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/CreateFieldRequest' }
 *     responses:
 *       201:
 *         description: Field created.
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessEnvelope'
 *                 - type: object
 *                   properties:
 *                     data: { $ref: '#/components/schemas/Field' }
 *       400: { $ref: '#/components/responses/ValidationError' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       409:
 *         description: A field with that name already exists.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorEnvelope' }
 */
// Mutations are ADMIN-only.
fieldsRouter.post(
  '/',
  authenticate,
  authorize('ADMIN'),
  validateBody(fieldCreateSchema),
  fieldsController.create,
);

/**
 * @openapi
 * /api/v1/fields/{id}:
 *   patch:
 *     tags: [Fields]
 *     summary: Update a field
 *     description: '**ADMIN only.** Partial update.'
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
 *           schema: { $ref: '#/components/schemas/UpdateFieldRequest' }
 *     responses:
 *       200:
 *         description: Updated field.
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessEnvelope'
 *                 - type: object
 *                   properties:
 *                     data: { $ref: '#/components/schemas/Field' }
 *       400: { $ref: '#/components/responses/ValidationError' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 *       409:
 *         description: A field with the new name already exists.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorEnvelope' }
 */
fieldsRouter.patch(
  '/:id',
  authenticate,
  authorize('ADMIN'),
  validateBody(fieldUpdateSchema),
  fieldsController.update,
);

/**
 * @openapi
 * /api/v1/fields/{id}:
 *   delete:
 *     tags: [Fields]
 *     summary: Soft-delete a field
 *     description: '**ADMIN only.** Sets `deletedAt`; the field is hidden from default listings but preserved in the database.'
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
fieldsRouter.delete(
  '/:id',
  authenticate,
  authorize('ADMIN'),
  fieldsController.remove,
);
