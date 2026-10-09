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

    // Resolve names in one query.
    const userIds = [...new Set(items.map((i) => i.userId).filter(Boolean))] as string[];
    const users =
      userIds.length > 0
        ? await prisma.user.findMany({
            where: { id: { in: userIds } },
            select: { id: true, firstName: true, paternalSurname: true },
          })
        : [];
    const nameById = new Map(users.map((u) => [u.id, `${u.firstName} ${u.paternalSurname}`.trim()]));

    return {
      items: items.map((i) => ({
        id: i.id,
        userId: i.userId,
        userName: i.userId ? nameById.get(i.userId) ?? null : null,
        method: i.method,
        path: i.path,
        action: i.action,
        actionLabel: ACTION_LABEL[i.action] ?? i.action,
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
