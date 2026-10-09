import type { NextFunction, Request, Response } from 'express';
import { prisma } from '../prisma/prisma.client.js';

/**
 * Turns a request into a short, human-readable action label used to group
 * the audit feed and the dashboard charts.
 */
export function auditActionFor(method: string, path: string): string {
  // Strip trailing slash and query string.
  const clean = path.replace(/[?#].*$/, '').replace(/\/+$/, '') || '/';

  // Auth events.
  if (clean === '/api/v1/auth/login') return 'LOGIN';
  if (clean === '/api/v1/auth/register') return 'REGISTER';
  if (clean === '/api/v1/auth/refresh') return 'REFRESH';
  if (clean === '/api/v1/auth/logout') return 'LOGOUT';

  // Normalise ids so "POST /teams/:id/members" groups together.
  const norm = clean.replace(/\/[0-9a-f-]{36}/gi, '/:id');

  const verb = method.toUpperCase();
  const entityRaw = norm
    .replace(/^\/api\/v1\//, '')
    .split('/')[0]!
    .toUpperCase();
  const SINGULAR: Record<string, string> = {
    LEAGUES: 'LEAGUE',
    TEAMS: 'TEAM',
    FIELDS: 'FIELD',
    MATCHES: 'MATCH',
    EVENTS: 'EVENT',
    AWARDS: 'AWARD',
    USERS: 'USER',
    MATCHDAYS: 'MATCHDAY',
  };
  const entity = SINGULAR[entityRaw] ?? entityRaw;

  if (norm.includes('fixture/generate')) return 'GENERAR_FIXTURE';
  if (norm.includes('knockout/generate')) return 'GENERAR_LLAVES';
  if (norm.includes('/score')) return 'ACTUALIZAR_MARCADOR';
  if (norm.includes('/status')) return 'CAMBIAR_ESTADO';
  if (norm.includes('/members')) return `${verb}_MIEMBRO`;
  if (norm.includes('/teams')) return `${verb}_EQUIPO_LIGA`;

  return `${verb}_${entity}`;
}

const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/** Internal endpoints that fire on every page load — auditing them would
 *  flood the feed with noise that has no business meaning. */
const SKIP = new Set(['/api/v1/auth/refresh']);

/**
 * Appends an AuditLog row for every mutating request that actually reached
 * a handler. Reads happen to be too high-volume and low-value to store.
 *
 * Registered as a global middleware but the record is written on
 * `res.on('finish')`, so `req.user` (populated by `authenticate` inside the
 * route) is already available by the time it runs.
 */
export function auditLogger(req: Request, res: Response, next: NextFunction): void {
  const fullPath = req.originalUrl.split('?')[0] ?? req.path;
  if (!MUTATING.has(req.method) || SKIP.has(fullPath)) {
    next();
    return;
  }

  res.on('finish', () => {
    // req.path is relative to the router mount, so use originalUrl to get
    // the full "/api/v1/..." path the action classifier expects.
    const fullPath = req.originalUrl.split('?')[0] ?? req.path;
    const action = auditActionFor(req.method, fullPath);
    const statusCode = res.statusCode;

    // `req.user` is set by `authenticate`, but login/register run BEFORE
    // that, so their actor is resolved from the email in the body instead.
    void (async () => {
      const authedId = (req as unknown as { user?: { id: string } }).user?.id;
      let userId = authedId ?? null;
      if (!userId && (req.body?.email as string | undefined)) {
        const u = await prisma.user
          .findUnique({ where: { email: (req.body as { email: string }).email }, select: { id: true } })
          .catch(() => null);
        userId = u?.id ?? null;
      }

      // Fire-and-forget: logging must never block or fail the response.
      await prisma.auditLog
        .create({
          data: {
            userId,
            method: req.method,
            path: fullPath,
            action,
            statusCode,
            ip: req.ip ?? null,
            userAgent: req.get('user-agent') ?? null,
          },
        })
        .catch(() => {
          /* audit is best-effort */
        });
    })();
  });

  next();
}
