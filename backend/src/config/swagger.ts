import path from 'node:path';
import { fileURLToPath } from 'node:url';
import swaggerJSDoc from 'swagger-jsdoc';
import { env } from './env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Resolve the backend root (one level up from src/config) so the glob works
// regardless of where the process is launched from.
const backendRoot = path.resolve(__dirname, '..', '..');

/**
 * OpenAPI 3.0 spec generated from JSDoc blocks placed above each route.
 *
 * Document an endpoint by adding an `@openapi` block to the same file where
 * the route is registered (e.g. `modules/<feature>/<feature>.routes.ts`).
 * Reusable schemas live in `docs/openapi.schemas.ts`.
 */
export const swaggerSpec = swaggerJSDoc({
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'Kaibil Football League Manager API',
      version: '1.0.0',
      description:
        'REST API for the Kaibil Football League Manager. ' +
        'All endpoints are prefixed with `/api/v1`. ' +
        'Most endpoints require a Bearer access token obtained from `/auth/login` or `/auth/register`. ' +
        'Admin-only routes are marked with the **ADMIN** badge in their description.',
      contact: { name: 'Kaibil Backend Team' },
      license: { name: 'UNLICENSED' },
    },
    servers: [
      {
        url: env.PUBLIC_BASE_URL,
        description: `Current environment (${env.NODE_ENV})`,
      },
    ],
    tags: [
      { name: 'Health', description: 'Liveness probe' },
      { name: 'Auth', description: 'Registration, login, refresh, logout, current user' },
      { name: 'Users', description: 'Profile management and photo uploads' },
      { name: 'Fields', description: 'Soccer fields / venues (ADMIN-only mutations)' },
      { name: 'Leagues', description: 'Leagues and their associated fields (ADMIN-only mutations)' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description:
            'Paste the `accessToken` returned by `/auth/login` or `/auth/register` ' +
            'as `Authorization: Bearer <token>`.',
        },
        refreshTokenCookie: {
          type: 'apiKey',
          in: 'cookie',
          name: 'kaibil_rt',
          description:
            'HttpOnly refresh-token cookie set automatically by `/auth/login`, ' +
            '`/auth/register` and `/auth/refresh`. Swagger UI cannot send cookies, ' +
            'so use Postman (which has cookie support) for those endpoints.',
        },
      },
      responses: {
        Unauthorized: {
          description: 'Missing or invalid access token',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorEnvelope' },
            },
          },
        },
        Forbidden: {
          description: 'Authenticated user lacks the required role',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorEnvelope' },
            },
          },
        },
        NotFound: {
          description: 'Resource not found',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorEnvelope' },
            },
          },
        },
        ValidationError: {
          description: 'Request payload failed schema validation',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ValidationErrorEnvelope' },
            },
          },
        },
        TooManyRequests: {
          description: 'Rate limit exceeded',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorEnvelope' },
            },
          },
        },
        InternalError: {
          description: 'Unhandled server error',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorEnvelope' },
            },
          },
        },
      },
    },
  },
  // Glob is resolved relative to CWD (backend/) at runtime; fall back to an
  // absolute path so it works whether you start the server from the repo root
  // or from inside `backend/`.
  apis: [
    path.join(backendRoot, 'src', '**', '*.routes.ts'),
    path.join(backendRoot, 'src', '**', '*.routes.js'),
    path.join(backendRoot, 'docs', 'openapi.schemas.ts'),
    path.join(backendRoot, 'docs', 'openapi.schemas.js'),
  ],
});

export const swaggerUiOptions: import('swagger-ui-express').SwaggerUiOptions = {
  customSiteTitle: 'Kaibil API Docs',
  customCss: '.swagger-ui .topbar { display: none }',
  swaggerOptions: {
    persistAuthorization: true,
    docExpansion: 'list',
    filter: true,
    tryItOutEnabled: true,
  },
};
