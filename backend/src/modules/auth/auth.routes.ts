import { Router } from 'express';
import { authController } from './auth.controller.js';
import { authenticate } from '../../shared/middlewares/auth.middleware.js';
import {
  authRateLimiter,
  loginRateLimiter,
  refreshRateLimiter,
  registerRateLimiter,
} from '../../shared/middlewares/rate-limit.middleware.js';
import { validateBody } from '../../shared/middlewares/validate.middleware.js';
import { loginSchema, registerSchema } from './auth.validation.js';
import { usersController } from '../users/users.controller.js';

export const authRouter = Router();

/**
 * @openapi
 * /api/v1/auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Register a new user
 *     description: |
 *       Creates a user account and immediately returns access + refresh tokens.
 *       The refresh token is also set as an HttpOnly cookie (`kaibil_rt`).
 *       Rate-limited more aggressively than other endpoints.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/RegisterRequest' }
 *     responses:
 *       201:
 *         description: User created.
 *         headers:
 *           Set-Cookie:
 *             schema: { type: string }
 *             description: HttpOnly `kaibil_rt` cookie.
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessEnvelope'
 *                 - type: object
 *                   properties:
 *                     data: { $ref: '#/components/schemas/AuthSuccess' }
 *       400: { $ref: '#/components/responses/ValidationError' }
 *       409:
 *         description: Email or CURP already registered.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorEnvelope' }
 *       429: { $ref: '#/components/responses/TooManyRequests' }
 */
authRouter.post(
  '/register',
  registerRateLimiter,
  authRateLimiter,
  validateBody(registerSchema),
  authController.register,
);

/**
 * @openapi
 * /api/v1/auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Log in with email + password
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/LoginRequest' }
 *     responses:
 *       200:
 *         description: Authenticated. Sets the `kaibil_rt` cookie.
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessEnvelope'
 *                 - type: object
 *                   properties:
 *                     data: { $ref: '#/components/schemas/AuthSuccess' }
 *       400: { $ref: '#/components/responses/ValidationError' }
 *       401:
 *         description: Invalid credentials, inactive user, or soft-deleted account.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorEnvelope' }
 *       429: { $ref: '#/components/responses/TooManyRequests' }
 */
authRouter.post(
  '/login',
  loginRateLimiter,
  validateBody(loginSchema),
  authController.login,
);

/**
 * @openapi
 * /api/v1/auth/refresh:
 *   post:
 *     tags: [Auth]
 *     summary: Rotate the refresh token
 *     description: |
 *       Reads the `kaibil_rt` HttpOnly cookie, revokes the old refresh token,
 *       and issues a fresh pair (access + refresh). Triggers global logout if
 *       a previously-revoked token is replayed.
 *     security:
 *       - refreshTokenCookie: []
 *     responses:
 *       200:
 *         description: New tokens issued.
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessEnvelope'
 *                 - type: object
 *                   properties:
 *                     data: { $ref: '#/components/schemas/AuthSuccess' }
 *       401:
 *         description: Missing, invalid, expired, or replayed refresh token.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorEnvelope' }
 *       429: { $ref: '#/components/responses/TooManyRequests' }
 */
authRouter.post('/refresh', refreshRateLimiter, authController.refresh);

/**
 * @openapi
 * /api/v1/auth/logout:
 *   post:
 *     tags: [Auth]
 *     summary: Log out (revoke the refresh token)
 *     description: |
 *       If the `kaibil_rt` cookie is present, the corresponding refresh token
 *       is revoked. Always clears the cookie. Safe to call when not logged in.
 *     responses:
 *       200:
 *         description: Logged out (no-op if there was no active session).
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
 *                         loggedOut: { type: boolean, example: true }
 */
authRouter.post('/logout', authController.logout);

/**
 * @openapi
 * /api/v1/auth/me:
 *   get:
 *     tags: [Auth]
 *     summary: Get the currently authenticated user
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current user profile.
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
// GET /auth/me — current user from access token
authRouter.get('/me', authenticate, usersController.getMe);