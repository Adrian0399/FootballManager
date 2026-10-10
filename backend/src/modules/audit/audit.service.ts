import { prisma } from '../../shared/prisma/prisma.client.js';
import type { Prisma } from '@prisma/client';

export type AuditSummary = {
  totals: { mutaciones: number; ultimas24h: number; usuariosActivos: number; registros: number };
  porAccion: Array<{ action: string; count: number }>;
  porDia: Array<{ date: string; count: number }>;
  usuariosMasActivos: Array<{ userId: string; name: string; count: number }>;
};

const ACTION_LABEL: Record<string, string> = {
  LOGIN: 'Inicios de sesión',
  REGISTER: 'Registros',
  LOGOUT: 'Cierres de sesión',
  REFRESH: 'Refrescos de sesión',
  GENERAR_FIXTURE: 'Fixtures generados',
  GENERAR_LLAVES: 'Llaves generadas',
  ACTUALIZAR_MARCADOR: 'Marcadores',
  CAMBIAR_ESTADO: 'Cambios de estado',
  POST_LEAGUE: 'Ligas creadas',
  PUT_LEAGUE: 'Ligas editadas',
  DELETE_LEAGUE: 'Ligas eliminadas',
  POST_TEAM: 'Equipos creados',
  PUT_TEAM: 'Equipos editados',
  DELETE_TEAM: 'Equipos eliminados',
  POST_FIELD: 'Canchas creadas',
  PUT_FIELD: 'Canchas editadas',
  DELETE_FIELD: 'Canchas eliminadas',
  POST_MATCH: 'Partidos creados',
  PUT_MATCH: 'Partidos editados',
  DELETE_MATCH: 'Partidos eliminados',
  POST_EVENT: 'Eventos registrados',
  PUT_EVENT: 'Eventos editados',
  DELETE_EVENT: 'Eventos eliminados',
  POST_AWARD: 'Premios creados',
  PUT_AWARD: 'Premios editados',
  DELETE_AWARD: 'Premios eliminados',
  POST_USER: 'Usuarios creados',
  PUT_USER: 'Usuarios editados',
  DELETE_USER: 'Usuarios eliminados',
  POST_MIEMBRO: 'Miembros agregados',
  DELETE_MIEMBRO: 'Miembros removidos',
  POST_EQUIPO_LIGA: 'Equipos inscritos',
  DELETE_EQUIPO_LIGA: 'Equipos desinscritos',
};

type AuditDetails = { body?: Record<string, unknown>; params?: Record<string, string> };

const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

/**
 * `req.params` is empty in a global middleware (Express fills it at the
 * router layer), so entity ids are recovered from the stored path instead.
 */
function pathIds(path: string): { teamId?: string; userId?: string; matchId?: string; leagueId?: string } {
  const segs = path.split('/');
  const at = (name: string): string | undefined => {
    const i = segs.indexOf(name);
    const next = i >= 0 ? segs[i + 1] : undefined;
    return next && UUID_RE.test(next) ? next : undefined;
  };
  const teamId = at('teams') ?? at('team');
  const userId = at('users');
  const matchId = at('matches') ?? at('match');
  const leagueId = at('leagues') ?? at('league');
  return { teamId, userId, matchId, leagueId };
}

const ROLE_NOUN: Record<string, string> = {
  ADMIN: 'El administrador',
  REFEREE: 'El árbitro',
  TECHNICAL_DIRECTOR: 'El director técnico',
  ASSISTANT: 'El auxiliar',
  PLAYER: 'El jugador',
};

interface MessageContext {
  nameOf: (id: string | undefined) => string | null;
  teamOf: (id: string | undefined) => string | null;
  leagueOf: (id: string | undefined) => string | null;
  matchOf: (id: string | undefined) => string | null;
}

function str(v: unknown): string {
  return typeof v === 'string' ? v : '';
}

/** Builds a human sentence from an audit entry + resolved names. */
function buildMessage(
  entry: { method: string; path: string; action: string; actorRole: string | null; details: unknown },
  actorName: string | null,
  ctx: MessageContext,
): string {
  const d = (entry.details ?? {}) as AuditDetails;
  const body = d.body ?? {};
  const ids = pathIds(entry.path);
  const role = ROLE_NOUN[entry.actorRole ?? ''] ?? 'Un usuario';
  const who = actorName ? `${role} ${actorName}` : role;

  // Member add/remove on a team.
  if (entry.path.includes('/members')) {
    const team = ctx.teamOf(ids.teamId) ?? 'un equipo';
    const playerId = str(body.userId) || ids.userId;
    const player = ctx.nameOf(playerId || undefined);
    const playerText = player ? `a ${player}` : 'a un jugador';
    return entry.method === 'DELETE'
      ? `${who} removió ${playerText} del equipo ${team}`
      : `${who} registró ${playerText} en el equipo ${team}`;
  }

  // Self profile edit (PATCH /users/:id with no sub-resource).
  if (entry.method === 'PATCH' && /^\/api\/v1\/users\/[^/]+$/.test(entry.path)) {
    return `${who} editó su perfil`;
  }

  // Match mutations.
  if (entry.path.includes('/matches/')) {
    const label = ctx.matchOf(ids.matchId) ?? 'un partido';
    if (entry.path.includes('/score')) return `${who} actualizó el marcador del partido ${label}`;
    if (entry.path.includes('/status')) return `${who} cambió el estado del partido ${label}`;
    if (entry.path.includes('/events')) return `${who} registró un evento en el partido ${label}`;
    return `${who} modificó el partido ${label}`;
  }

  // Fixture / knockout generation.
  if (entry.path.includes('fixture/generate')) {
    const lg = ctx.leagueOf(ids.leagueId) ?? 'la liga';
    return `${who} generó el fixture de ${lg}`;
  }
  if (entry.path.includes('knockout/generate')) {
    const lg = ctx.leagueOf(ids.leagueId) ?? 'la liga';
    return `${who} generó las llaves de ${lg}`;
  }

  // League team enrollment.
  if (entry.path.includes('/api/v1/leagues/') && entry.path.includes('/teams')) {
    const league = ctx.leagueOf(ids.leagueId) ?? 'la liga';
    const team = ctx.teamOf(str(body.teamId) || ids.teamId) ?? 'un equipo';
    return entry.method === 'DELETE'
      ? `${who} desinscribió a ${team} de ${league}`
      : `${who} inscribió a ${team} en ${league}`;
  }

  // Generic fallback.
  const label = ACTION_LABEL[entry.action]?.toLowerCase() ?? entry.action.replace(/_/g, ' ').toLowerCase();
  return `${who} realizó una acción: ${label}`;
}

export const auditService = {
  async list(filters: {
    action?: string;
    userId?: string;
    from?: string;
    to?: string;
    page?: number;
    size?: number;
  }) {
    const page = filters.page ?? 1;
    const size = Math.min(filters.size ?? 50, 100);

    const where: Prisma.AuditLogWhereInput = {};
    if (filters.action) where.action = filters.action;
    if (filters.userId) where.userId = filters.userId;
    if (filters.from || filters.to) {
      where.createdAt = {
        ...(filters.from ? { gte: new Date(filters.from) } : {}),
        ...(filters.to ? { lte: new Date(filters.to) } : {}),
      };
    }

    const [total, items] = await prisma.$transaction([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * size,
        take: size,
      }),
    ]);

    // Collect every referenced id across the page (actor + entities) and
    // resolve them with a handful of batched queries.
    const userIds = new Set<string>();
    const teamIds = new Set<string>();
    const matchIds = new Set<string>();
    const leagueIds = new Set<string>();

    const grab = (v: unknown, set: Set<string>) => {
      if (typeof v === 'string' && /^[0-9a-f-]{36}$/i.test(v)) set.add(v);
    };

    for (const i of items) {
      if (i.userId) userIds.add(i.userId);
      const d = (i.details ?? {}) as AuditDetails;
      const body = d.body ?? {};
      const ids = pathIds(i.path);
      if (ids.userId) userIds.add(ids.userId);
      if (ids.teamId) teamIds.add(ids.teamId);
      if (ids.matchId) matchIds.add(ids.matchId);
      if (ids.leagueId) leagueIds.add(ids.leagueId);
      const bodyIds = [body.userId, body.teamId, body.matchId];
      for (const v of bodyIds) {
        if (typeof v === 'string' && UUID_RE.test(v)) {
          userIds.add(v);
          teamIds.add(v);
        }
      }
    }

    const [users, teams, matches, leagues] = await Promise.all([
      userIds.size
        ? prisma.user.findMany({ where: { id: { in: [...userIds] } }, select: { id: true, firstName: true, paternalSurname: true } })
        : Promise.resolve([]),
      teamIds.size
        ? prisma.team.findMany({ where: { id: { in: [...teamIds] } }, select: { id: true, name: true } })
        : Promise.resolve([]),
      matchIds.size
        ? prisma.match.findMany({
            where: { id: { in: [...matchIds] } },
            select: { id: true, leagueId: true, homeTeam: { select: { shortName: true } }, awayTeam: { select: { shortName: true } } },
          })
        : Promise.resolve([]),
      leagueIds.size
        ? prisma.league.findMany({ where: { id: { in: [...leagueIds] } }, select: { id: true, name: true } })
        : Promise.resolve([]),
    ]);

    const nameById = new Map(users.map((u) => [u.id, `${u.firstName} ${u.paternalSurname}`.trim()]));
    const teamById = new Map(teams.map((t) => [t.id, t.name]));
    const leagueById = new Map(leagues.map((l) => [l.id, l.name]));
    const matchById = new Map(matches.map((m) => [m.id, m]));

    const ctx: MessageContext = {
      nameOf: (id) => (id ? nameById.get(id) ?? null : null),
      teamOf: (id) => (id ? teamById.get(id) ?? null : null),
      leagueOf: (id) => (id ? leagueById.get(id) ?? null : null),
      matchOf: (id) => {
        if (!id) return null;
        const m = matchById.get(id);
        if (!m) return null;
        const lg = m.leagueId ? leagueById.get(m.leagueId) : null;
        const label = `${m.homeTeam?.shortName ?? '?'} vs ${m.awayTeam?.shortName ?? '?'}`;
        return lg ? `${label} (${lg})` : label;
      },
    };

    return {
      items: items.map((i) => ({
        id: i.id,
        userId: i.userId,
        userName: i.userId ? nameById.get(i.userId) ?? null : null,
        actorRole: i.actorRole,
        method: i.method,
        path: i.path,
        action: i.action,
        actionLabel: ACTION_LABEL[i.action] ?? i.action,
        message: buildMessage(
          { method: i.method, path: i.path, action: i.action, actorRole: i.actorRole, details: i.details },
          i.userId ? nameById.get(i.userId) ?? null : null,
          ctx,
        ),
        statusCode: i.statusCode,
        ip: i.ip,
        createdAt: i.createdAt,
      })),
      total,
      page,
      size,
    };
  },

  async summary(from?: string, to?: string): Promise<AuditSummary> {
    const where: Prisma.AuditLogWhereInput = {};
    if (from || to) {
      where.createdAt = {
        ...(from ? { gte: new Date(from) } : {}),
        ...(to ? { lte: new Date(to) } : {}),
      };
    }

    const [totales, porAccion, usuarios, ultimas24h, registros] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.groupBy({
        by: ['action'],
        where,
        _count: { _all: true },
        orderBy: { _count: { action: 'desc' } },
        take: 15,
      }),
      prisma.auditLog.groupBy({
        by: ['userId'],
        where,
        _count: { _all: true },
        orderBy: { _count: { userId: 'desc' } },
        take: 8,
      }),
      prisma.auditLog.count({
        where: { ...where, createdAt: { gte: new Date(Date.now() - 24 * 3600 * 1000) } },
      }),
      prisma.auditLog.count({ where: { ...where, action: 'REGISTER' } }),
    ]);

    // Per-day series (last 30 days).
    const since = new Date();
    since.setDate(since.getDate() - 29);
    since.setHours(0, 0, 0, 0);
    const daily = await prisma.auditLog.groupBy({
      by: ['createdAt'],
      where: { ...where, createdAt: { gte: since } },
      _count: { _all: true },
    });

    // Build a dense 30-day series so the chart has no gaps.
    const days: Array<{ date: string; count: number }> = [];
    const byDay = new Map<string, number>();
    for (const d of daily) {
      const key = d.createdAt.toISOString().slice(0, 10);
      byDay.set(key, (byDay.get(key) ?? 0) + d._count._all);
    }
    for (let i = 29; i >= 0; i -= 1) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      days.push({ date: key, count: byDay.get(key) ?? 0 });
    }

    // Resolve names of the most active users.
    const activeIds = usuarios.map((u) => u.userId).filter(Boolean) as string[];
    const users2 =
      activeIds.length > 0
        ? await prisma.user.findMany({
            where: { id: { in: activeIds } },
            select: { id: true, firstName: true, paternalSurname: true },
          })
        : [];
    const nameById = new Map(users2.map((u) => [u.id, `${u.firstName} ${u.paternalSurname}`.trim()]));

    return {
      totals: {
        mutaciones: totales,
        ultimas24h,
        usuariosActivos: usuarios.filter((u) => u.userId).length,
        registros,
      },
      porAccion: porAccion.map((a) => ({
        action: a.action,
        count: a._count._all,
      })),
      porDia: days,
      usuariosMasActivos: usuarios
        .filter((u) => u.userId)
        .map((u) => ({
          userId: u.userId!,
          name: nameById.get(u.userId!) ?? u.userId!,
          count: u._count._all,
        })),
    };
  },
};
