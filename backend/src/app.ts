import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import path from 'node:path';
import swaggerUi from 'swagger-ui-express';
import { env } from './config/env.js';
import { swaggerSpec, swaggerUiOptions } from './config/swagger.js';
import { errorHandler, notFoundHandler } from './shared/middlewares/error.middleware.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { usersRouter } from './modules/users/users.routes.js';
import { fieldsRouter } from './modules/fields/fields.routes.js';
import { leaguesRouter } from './modules/leagues/leagues.routes.js';
import { teamsRouter } from './modules/teams/teams.routes.js';
import {
  matchesRouter,
  leagueMatchdaysRouter,
  matchdaysRouter,
} from './modules/matches/matches.routes.js';
import { eventsRouter } from './modules/events/events.routes.js';
import { standingsRouter } from './modules/standings/standings.routes.js';
import { statsRouter } from './modules/stats/stats.routes.js';
import { knockoutRouter } from './modules/knockout/knockout.routes.js';
import { profileRouter } from './modules/profile/profile.routes.js';
import { awardsRouter } from './modules/awards/awards.routes.js';
import { auditRouter } from './modules/audit/audit.routes.js';
import { auditLogger } from './shared/middlewares/audit.middleware.js';

export function buildApp(): express.Express {
  const app = express();

  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(
    cors({
      origin: env.CORS_ORIGIN,
      credentials: true,
    }),
  );
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());
  // Best-effort audit: records every POST/PUT/PATCH/DELETE on finish.
  app.use(auditLogger);

  // Serve uploaded photos as static files.
  //
  // `uploads/tmp` holds files that were uploaded but not yet processed (or
  // rejected). Serving it would expose raw, unvalidated uploads, so it is
  // denied before express.static gets a chance to resolve the path.
  app.use(
    '/uploads',
    (_req, res, next) => {
      res.setHeader('X-Content-Type-Options', 'nosniff');
      next();
    },
  );
  app.use('/uploads/tmp', (_req, res) => {
    res.status(404).json({
      success: false,
      statusCode: 404,
      error: { code: 'NOT_FOUND', message: 'Not found' },
    });
  });
  app.use(
    '/uploads',
    express.static(path.resolve(process.cwd(), env.UPLOAD_DIR), {
      maxAge: '7d',
      fallthrough: true,
      dotfiles: 'deny',
      index: false,
    }),
  );

  app.get('/health', (_req, res) => {
    res.json({
      status: 'ok',
      service: 'kaibil-backend',
      timestamp: new Date().toISOString(),
    });
  });

  // ----- API documentation (Swagger UI + raw OpenAPI JSON) -----
  // The JSON endpoint is what you import into Postman
  // (File > Import > Link or paste URL).
  app.get('/api/v1/docs.json', (_req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });
  app.use('/api/v1/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, swaggerUiOptions));

  app.use('/api/v1/auth', authRouter);
  app.use('/api/v1/users', usersRouter);
  app.use('/api/v1/fields', fieldsRouter);
  app.use('/api/v1/leagues', leaguesRouter);
  // Sub-resources under /leagues/:id (matchdays) — mounted after leaguesRouter
  // so /leagues/:id/teams (in leaguesRouter) still wins first.
  app.use('/api/v1/leagues', leagueMatchdaysRouter);
  app.use('/api/v1/teams', teamsRouter);
  app.use('/api/v1/matches', matchesRouter);
  app.use('/api/v1/matchdays', matchdaysRouter);
  // Full-path routers (routes already include /leagues/... and /matches/...)
  app.use('/api/v1', eventsRouter);
  app.use('/api/v1', standingsRouter);
  app.use('/api/v1', statsRouter);
  app.use('/api/v1', knockoutRouter);
  // Profile aggregation (P-0..P-6). Full paths /users/:id/... and /referees/:id/...
  app.use('/api/v1', profileRouter);

  app.use('/api/v1', awardsRouter);
  app.use('/api/v1', auditRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}