import { Router } from 'express';
import { usersController } from './users.controller.js';
import { photoController } from './photo.controller.js';
import { authenticate, authorize } from '../../shared/middlewares/auth.middleware.js';
import { validateBody } from '../../shared/middlewares/validate.middleware.js';
import {
  updateUserSchema,
  userCreateSchema,
  adminUpdateUserSchema,
} from './users.validation.js';

export const usersRouter = Router();

/**
 * @openapi
 * /api/v1/users:
 *   get:
 *     tags: [Users]
 *     summary: List / search users (admin only)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: q
 *         schema: { type: string }
 *         description: Free-text search over names, email and nickname.
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [ADMIN, REFEREE, TECHNICAL_DIRECTOR, ASSISTANT, PLAYER]
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1, default: 1 }
 *       - in: query
 *         name: size
 *         schema: { type: integer, minimum: 1, maximum: 100, default: 25 }
 *     responses:
 *       200:
 *         description: Paginated list of users.
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 */
usersRouter.get(
  '/',
  authenticate,
  authorize('ADMIN'),
  usersController.list,
);

/**
 * @openapi
 * /api/v1/users/me:
 *   get:
 *     tags: [Users]
 *     summary: Get my profile
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Current user.
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessEnvelope'
 *                 - type: object
 *                   properties:
 *                     data: { $ref: '#/components/schemas/User' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 */
usersRouter.get('/me', authenticate, usersController.getMe);

/**
 * @openapi
 * /api/v1/users/me:
 *   patch:
 *     tags: [Users]
 *     summary: Update my profile
 *     description: |
 *       Partial update. Unknown fields are rejected. If `birthDate` changes,
 *       `age` is recomputed server-side.
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/UpdateUserRequest' }
 *     responses:
 *       200:
 *         description: Updated user.
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessEnvelope'
 *                 - type: object
 *                   properties:
 *                     data: { $ref: '#/components/schemas/User' }
 *       400: { $ref: '#/components/responses/ValidationError' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 */
usersRouter.patch('/me', authenticate, validateBody(updateUserSchema), usersController.updateMe);

/**
 * @openapi
 * /api/v1/users/{id}:
 *   get:
 *     tags: [Users]
 *     summary: Get a user by id
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: User found.
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessEnvelope'
 *                 - type: object
 *                   properties:
 *                     data: { $ref: '#/components/schemas/User' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       404: { $ref: '#/components/responses/NotFound' }
 */
usersRouter.get('/:id', authenticate, usersController.getById);

/**
 * @openapi
 * /api/v1/users:
 *   post:
 *     tags: [Users]
 *     summary: Create a user (admin only)
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [firstName, paternalSurname, maternalSurname, birthDate, role, phoneNumber, email, curp, password]
 *             properties:
 *               firstName: { type: string }
 *               paternalSurname: { type: string }
 *               maternalSurname: { type: string }
 *               birthDate: { type: string, format: date }
 *               role:
 *                 type: string
 *                 enum: [ADMIN, REFEREE, TECHNICAL_DIRECTOR, ASSISTANT, PLAYER]
 *               nickname: { type: string, nullable: true }
 *               phoneNumber: { type: string }
 *               email: { type: string, format: email }
 *               curp: { type: string }
 *               password: { type: string, minLength: 8 }
 *     responses:
 *       201:
 *         description: User created.
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessEnvelope'
 *                 - type: object
 *                   properties:
 *                     data: { $ref: '#/components/schemas/User' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       409: { $ref: '#/components/responses/Conflict' }
 */
usersRouter.post('/', authenticate, authorize('ADMIN'), validateBody(userCreateSchema), usersController.create);

/**
 * @openapi
 * /api/v1/users/{id}:
 *   patch:
 *     tags: [Users]
 *     summary: Update a user (admin only)
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
 *             properties:
 *               firstName: { type: string }
 *               paternalSurname: { type: string }
 *               maternalSurname: { type: string }
 *               birthDate: { type: string, format: date }
 *               role:
 *                 type: string
 *                 enum: [ADMIN, REFEREE, TECHNICAL_DIRECTOR, ASSISTANT, PLAYER]
 *               nickname: { type: string, nullable: true }
 *               phoneNumber: { type: string }
 *               email: { type: string, format: email }
 *               curp: { type: string }
 *               isActive: { type: boolean }
 *     responses:
 *       200:
 *         description: User updated.
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessEnvelope'
 *                 - type: object
 *                   properties:
 *                     data: { $ref: '#/components/schemas/User' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 *       409: { $ref: '#/components/responses/Conflict' }
 */
usersRouter.patch('/:id', authenticate, authorize('ADMIN'), validateBody(adminUpdateUserSchema), usersController.update);

/**
 * @openapi
 * /api/v1/users/{id}:
 *   delete:
 *     tags: [Users]
 *     summary: Soft-delete a user (admin only)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: User soft-deleted.
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 */
usersRouter.delete('/:id', authenticate, authorize('ADMIN'), usersController.remove);

// ----- Photo uploads (multipart/form-data, field name "file") -----

/**
 * @openapi
 * /api/v1/users/me/profile-photo:
 *   post:
 *     tags: [Users]
 *     summary: Upload / replace my profile photo
 *     description: |
 *       Accepts a single image file under the form-data field name `file`.
 *       Allowed MIME types: `image/jpeg`, `image/png`, `image/webp`.
 *       Max size is `MAX_UPLOAD_SIZE_MB` (default 10 MB). The image is
 *       processed (resize/convert) and stored under `uploads/users/<id>/`.
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [file]
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Photo accepted. Returns the updated user with `profilePhotoUrl`.
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessEnvelope'
 *                 - type: object
 *                   properties:
 *                     data: { $ref: '#/components/schemas/User' }
 *       400:
 *         description: Missing file, wrong MIME type, or file too large.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorEnvelope' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 */
usersRouter.post(
  '/me/profile-photo',
  authenticate,
  photoController.uploadProfile,
);

/**
 * @openapi
 * /api/v1/users/me/profile-photo:
 *   delete:
 *     tags: [Users]
 *     summary: Delete my profile photo
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Photo removed. Returns the updated user.
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessEnvelope'
 *                 - type: object
 *                   properties:
 *                     data: { $ref: '#/components/schemas/User' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 */
usersRouter.delete(
  '/me/profile-photo',
  authenticate,
  photoController.deleteProfile,
);

/**
 * @openapi
 * /api/v1/users/me/cover-photo:
 *   post:
 *     tags: [Users]
 *     summary: Upload / replace my cover photo
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [file]
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Photo accepted. Returns the updated user with `coverPhotoUrl`.
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessEnvelope'
 *                 - type: object
 *                   properties:
 *                     data: { $ref: '#/components/schemas/User' }
 *       400:
 *         description: Missing file, wrong MIME type, or file too large.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorEnvelope' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 */
usersRouter.post(
  '/me/cover-photo',
  authenticate,
  photoController.uploadCover,
);

/**
 * @openapi
 * /api/v1/users/me/cover-photo:
 *   delete:
 *     tags: [Users]
 *     summary: Delete my cover photo
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Photo removed. Returns the updated user.
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessEnvelope'
 *                 - type: object
 *                   properties:
 *                     data: { $ref: '#/components/schemas/User' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 */
usersRouter.delete(
  '/me/cover-photo',
  authenticate,
  photoController.deleteCover,
);