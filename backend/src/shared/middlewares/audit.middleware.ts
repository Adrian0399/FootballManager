import type { NextFunction, Request, Response } from 'express';
import { prisma } from '../prisma/prisma.client.js';
import type { Prisma } from '@prisma/client';

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
      const authed = req as unknown as { user?: { id: string; role?: string } };
      const authedId = authed.user?.id;
      let userId = authedId ?? null;
      let actorRole = authed.user?.role ?? null;
      if (!userId && (req.body?.email as string | undefined)) {
        const u = await prisma.user
          .findUnique({
            where: { email: (req.body as { email: string }).email },
            select: { id: true, role: true },
          })
          .catch(() => null);
        userId = u?.id ?? null;
        actorRole = u?.role ?? null;
      }

      // Snapshot the request payload so the dashboard can later build
      // human-friendly sentences ("el DT agrego a X en el equipo Y").
      // Sensitive fields are stripped and sizes capped.
      const details = snapshotDetails(req);

      // Fire-and-forget: logging must never block or fail the response.
      await prisma.auditLog
        .create({
          data: {
            userId,
            actorRole,
            method: req.method,
            path: fullPath,
            action,
            statusCode,
            details,
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

/** Sanitised, size-capped snapshot of the request body + route params. */
function snapshotDetails(req: Request): Prisma.JsonObject {
  const clean = (v: unknown, depth = 0): unknown => {
    if (v == null) return v;
    if (typeof v === 'string') return v.slice(0, 200);
    if (typeof v === 'number' || typeof v === 'boolean') return v;
    if (depth > 3) return '[…]';
    if (Array.isArray(v)) return v.slice(0, 10).map((x) => clean(x, depth + 1));
    if (typeof v === 'object') {
      const out: Record<string, unknown> = {};
      for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
        if (/password|token|secret/i.test(k)) continue;
        out[k] = clean(val, depth + 1);
      }
      return out;
    }
    return String(v);
  };

  return {
    body: clean((req as Request & { body?: unknown }).body) as Prisma.InputJsonValue,
    params: clean(req.params) as Prisma.InputJsonValue,
  } as Prisma.JsonObject;
}
