import crypto from 'node:crypto';
import { prisma } from '../../shared/prisma/prisma.client.js';
import { ApiError } from '../../shared/errors/api-error.js';
import type { TeamRole } from '@prisma/client';

const INVITE_TTL_DAYS = 7;

function makeToken(): string {
  return crypto.randomBytes(24).toString('base64url');
}

/** True when the actor may manage a team's roster (ADMIN or that team's DT). */
async function canManageTeam(teamId: string, actorId: string, actorRole: string): Promise<boolean> {
  if (actorRole === 'ADMIN') return true;
  const membership = await prisma.teamMembership.findUnique({
    where: { teamId_userId: { teamId, userId: actorId } },
    select: { membershipRole: true },
  });
  return membership?.membershipRole === 'DT';
}

export const invitesService = {
  async create(teamId: string, role: TeamRole, actorId: string, actorRole: string) {
    const team = await prisma.team.findFirst({ where: { id: teamId, deletedAt: null } });
    if (!team) throw ApiError.notFound('Team not found', 'TEAM_NOT_FOUND');

    const allowed = await canManageTeam(teamId, actorId, actorRole);
    if (!allowed) {
      throw ApiError.forbidden('No tienes permiso para invitar a este equipo', 'FORBIDDEN');
    }

    if (role !== 'PLAYER' && role !== 'DT' && role !== 'ASSISTANT') {
      throw ApiError.badRequest('Rol de invitación inválido', 'INVALID_INVITE_ROLE');
    }

    const invite = await prisma.teamInvite.create({
      data: {
        teamId,
        role,
        token: makeToken(),
        expiresAt: new Date(Date.now() + INVITE_TTL_DAYS * 24 * 3600 * 1000),
        createdById: actorId,
      },
    });

    return {
      id: invite.id,
      token: invite.token,
      role: invite.role,
      expiresAt: invite.expiresAt,
    };
  },

  async listByTeam(teamId: string, actorId: string, actorRole: string) {
    const allowed = await canManageTeam(teamId, actorId, actorRole);
    if (!allowed) throw ApiError.forbidden('No tienes permiso para ver las invitaciones', 'FORBIDDEN');

    const invites = await prisma.teamInvite.findMany({
      where: { teamId },
      orderBy: { createdAt: 'desc' },
    });
    return invites.map((i) => ({
      id: i.id,
      role: i.role,
      token: i.token,
      expiresAt: i.expiresAt,
      usedAt: i.usedAt,
      createdAt: i.createdAt,
    }));
  },

  /** Public: resolves an invite token so the register page can prefill. */
  async resolve(token: string) {
    const invite = await prisma.teamInvite.findUnique({
      where: { token },
      include: { team: { select: { id: true, name: true, shortName: true } } },
    });
    if (!invite) throw ApiError.notFound('Invitación no encontrada', 'INVITE_NOT_FOUND');
    if (invite.usedAt) throw ApiError.conflict('Esta invitación ya fue usada', 'INVITE_USED');
    if (invite.expiresAt < new Date()) {
      throw ApiError.conflict('Esta invitación expiró', 'INVITE_EXPIRED');
    }
    return {
      token: invite.token,
      role: invite.role,
      team: { id: invite.team.id, name: invite.team.name, shortName: invite.team.shortName },
      expiresAt: invite.expiresAt,
    };
  },

  /** Marks an invite used and returns its teamId + role (for registration). */
  async consume(token: string, userId: string) {
    const invite = await prisma.teamInvite.findUnique({ where: { token } });
    if (!invite) throw ApiError.notFound('Invitación no encontrada', 'INVITE_NOT_FOUND');
    if (invite.usedAt) throw ApiError.conflict('Esta invitación ya fue usada', 'INVITE_USED');
    if (invite.expiresAt < new Date()) {
      throw ApiError.conflict('Esta invitación expiró', 'INVITE_EXPIRED');
    }
    await prisma.teamInvite.update({
      where: { id: invite.id },
      data: { usedAt: new Date(), usedById: userId },
    });
    return { teamId: invite.teamId, role: invite.role };
  },
};
