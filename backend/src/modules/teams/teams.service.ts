import { prisma } from '../../shared/prisma/prisma.client.js';
import { ApiError } from '../../shared/errors/api-error.js';
import type { Team, TeamMembership, User } from '@prisma/client';
import type {
  TeamCreateDto,
  TeamUpdateDto,
  MembershipCreateDto,
  MembershipUpdateDto,
} from './teams.validation.js';

export type PublicTeam = Omit<Team, 'deletedAt'>;

export type PublicTeamMember = {
  id: string;
  userId: string;
  firstName: string;
  paternalSurname: string;
  maternalSurname: string;
  fullName: string;
  membershipRole: 'PLAYER' | 'DT' | 'ASSISTANT';
  jerseyNumber: number | null;
  position: string | null;
  isCaptain: boolean;
};

export type PublicTeamWithMembers = PublicTeam & {
  members: PublicTeamMember[];
};

function toPublicTeam(t: Team): PublicTeam {
  const { deletedAt: _d, ...rest } = t;
  return rest;
}

function toPublicMember(
  m: TeamMembership & { user: User },
): PublicTeamMember {
  return {
    id: m.id,
    userId: m.userId,
    firstName: m.user.firstName,
    paternalSurname: m.user.paternalSurname,
    maternalSurname: m.user.maternalSurname,
    fullName: `${m.user.firstName} ${m.user.paternalSurname} ${m.user.maternalSurname}`.trim(),
    membershipRole: m.membershipRole,
    jerseyNumber: m.jerseyNumber,
    position: m.position,
    isCaptain: m.isCaptain,
  };
}

export const teamsService = {
  async findAll(leagueId?: string): Promise<PublicTeam[]> {
    const teams = await prisma.team.findMany({
      where: {
        deletedAt: null,
        ...(leagueId
          ? {
              OR: [
                { currentLeagueId: leagueId },
                { leagueEntries: { some: { leagueId } } },
              ],
            }
          : {}),
      },
      orderBy: [{ name: 'asc' }],
    });
    return teams.map(toPublicTeam);
  },

  async findById(id: string): Promise<PublicTeam> {
    const team = await prisma.team.findUnique({ where: { id } });
    if (!team || team.deletedAt) {
      throw ApiError.notFound('Team not found', 'TEAM_NOT_FOUND');
    }
    return toPublicTeam(team);
  },

  async findByIdWithMembers(id: string): Promise<PublicTeamWithMembers> {
    const team = await prisma.team.findUnique({
      where: { id },
      include: {
        memberships: {
          include: { user: true },
          orderBy: [
            { membershipRole: 'asc' }, // DT first, then ASSISTANT, then PLAYER
            { jerseyNumber: 'asc' },
          ],
        },
      },
    });
    if (!team || team.deletedAt) {
      throw ApiError.notFound('Team not found', 'TEAM_NOT_FOUND');
    }
    return {
      ...toPublicTeam(team),
      members: team.memberships.map(toPublicMember),
    };
  },

  async findByLeagueWithMembers(leagueId: string): Promise<
    Array<PublicTeamWithMembers & { seed: number }>
  > {
    const entries = await prisma.leagueTeam.findMany({
      where: { leagueId },
      orderBy: { seed: 'asc' },
      include: {
        team: {
          include: {
            memberships: {
              include: { user: true },
              orderBy: [
                { membershipRole: 'asc' },
                { jerseyNumber: 'asc' },
              ],
            },
          },
        },
      },
    });
    return entries.map((e) => ({
      ...toPublicTeam(e.team),
      members: e.team.memberships.map(toPublicMember),
      seed: e.seed,
    }));
  },

  // ----- Writes (ADMIN) -----

  async create(dto: TeamCreateDto, creatorId: string): Promise<PublicTeam> {
    if (dto.homeFieldId) {
      const field = await prisma.field.findFirst({
        where: { id: dto.homeFieldId, deletedAt: null },
        select: { id: true },
      });
      if (!field) {
        throw ApiError.badRequest('Home field does not exist', 'FIELD_NOT_FOUND');
      }
    }
    if (dto.currentLeagueId) {
      const league = await prisma.league.findFirst({
        where: { id: dto.currentLeagueId, deletedAt: null },
        select: { id: true },
      });
      if (!league) {
        throw ApiError.badRequest('League does not exist', 'LEAGUE_NOT_FOUND');
      }
    }

    const team = await prisma.$transaction(async (tx) => {
      const createdTeam = await tx.team.create({
        data: {
          name: dto.name,
          shortName: dto.shortName,
          emoji: dto.emoji ?? null,
          primaryColor: dto.primaryColor,
          secondaryColor: dto.secondaryColor,
          homeFieldId: dto.homeFieldId ?? null,
          currentLeagueId: dto.currentLeagueId ?? null,
          createdById: creatorId,
          updatedById: creatorId,
        },
      });

      // When the team starts in a league, also register it in the LeagueTeam
      // join so standings/fixtures include it. Seed = next available position.
      if (dto.currentLeagueId) {
        const max = await tx.leagueTeam.aggregate({
          where: { leagueId: dto.currentLeagueId },
          _max: { seed: true },
        });
        await tx.leagueTeam.create({
          data: {
            leagueId: dto.currentLeagueId,
            teamId: createdTeam.id,
            seed: (max._max.seed ?? 0) + 1,
            createdById: creatorId,
            updatedById: creatorId,
          },
        });
      }

      return createdTeam;
    });

    return toPublicTeam(team);
  },

  async update(
    id: string,
    dto: TeamUpdateDto,
    updaterId: string,
  ): Promise<PublicTeam> {
    const current = await prisma.team.findUnique({ where: { id } });
    if (!current || current.deletedAt) {
      throw ApiError.notFound('Team not found', 'TEAM_NOT_FOUND');
    }
    if (dto.homeFieldId) {
      const field = await prisma.field.findFirst({
        where: { id: dto.homeFieldId, deletedAt: null },
        select: { id: true },
      });
      if (!field) {
        throw ApiError.badRequest('Home field does not exist', 'FIELD_NOT_FOUND');
      }
    }
    if (dto.currentLeagueId) {
      const league = await prisma.league.findFirst({
        where: { id: dto.currentLeagueId, deletedAt: null },
        select: { id: true },
      });
      if (!league) {
        throw ApiError.badRequest('League does not exist', 'LEAGUE_NOT_FOUND');
      }
    }

    const team = await prisma.$transaction(async (tx) => {
      const updatedTeam = await tx.team.update({
        where: { id },
        data: { ...dto, updatedById: updaterId },
      });

      if (dto.currentLeagueId && dto.currentLeagueId !== current.currentLeagueId) {
        const existing = await tx.leagueTeam.findUnique({
          where: {
            leagueId_teamId: { leagueId: dto.currentLeagueId, teamId: id },
          },
        });
        if (!existing) {
          const max = await tx.leagueTeam.aggregate({
            where: { leagueId: dto.currentLeagueId },
            _max: { seed: true },
          });
          await tx.leagueTeam.create({
            data: {
              leagueId: dto.currentLeagueId,
              teamId: id,
              seed: (max._max.seed ?? 0) + 1,
              createdById: updaterId,
              updatedById: updaterId,
            },
          });
        }
      }

      return updatedTeam;
    });

    return toPublicTeam(team);
  },

  async softDelete(id: string, updaterId: string): Promise<void> {
    const current = await prisma.team.findUnique({ where: { id } });
    if (!current || current.deletedAt) {
      throw ApiError.notFound('Team not found', 'TEAM_NOT_FOUND');
    }
    await prisma.team.update({
      where: { id },
      data: { deletedAt: new Date(), updatedById: updaterId },
    });
  },

  // ----- Roster (ADMIN) -----

  async addMember(
    teamId: string,
    dto: MembershipCreateDto,
    actorId: string,
  ): Promise<PublicTeamMember> {
    const team = await prisma.team.findUnique({ where: { id: teamId } });
    if (!team || team.deletedAt) {
      throw ApiError.notFound('Team not found', 'TEAM_NOT_FOUND');
    }
    const user = await prisma.user.findUnique({ where: { id: dto.userId } });
    if (!user || user.deletedAt) {
      throw ApiError.badRequest('User does not exist', 'USER_NOT_FOUND');
    }
    const existing = await prisma.teamMembership.findUnique({
      where: { teamId_userId: { teamId, userId: dto.userId } },
    });
    if (existing) {
      throw ApiError.conflict(
        'User is already a member of this team',
        'MEMBERSHIP_EXISTS',
      );
    }

    const isPlayer = dto.membershipRole === 'PLAYER';
    const membership = await prisma.teamMembership.create({
      data: {
        teamId,
        userId: dto.userId,
        membershipRole: dto.membershipRole,
        jerseyNumber: isPlayer ? dto.jerseyNumber ?? null : null,
        position: isPlayer ? dto.position ?? null : null,
        isCaptain: dto.isCaptain ?? false,
        createdById: actorId,
        updatedById: actorId,
      },
      include: { user: true },
    });
    return toPublicMember(membership);
  },

  async updateMember(
    teamId: string,
    userId: string,
    dto: MembershipUpdateDto,
    actorId: string,
  ): Promise<PublicTeamMember> {
    const existing = await prisma.teamMembership.findUnique({
      where: { teamId_userId: { teamId, userId } },
    });
    if (!existing) {
      throw ApiError.notFound('Membership not found', 'MEMBERSHIP_NOT_FOUND');
    }

    const role = dto.membershipRole ?? existing.membershipRole;
    const isPlayer = role === 'PLAYER';

    const membership = await prisma.teamMembership.update({
      where: { teamId_userId: { teamId, userId } },
      data: {
        ...(dto.membershipRole !== undefined
          ? { membershipRole: dto.membershipRole }
          : {}),
        jerseyNumber: isPlayer
          ? dto.jerseyNumber !== undefined
            ? dto.jerseyNumber
            : existing.jerseyNumber
          : null,
        position: isPlayer
          ? dto.position !== undefined
            ? dto.position
            : existing.position
          : null,
        ...(dto.isCaptain !== undefined ? { isCaptain: dto.isCaptain } : {}),
        updatedById: actorId,
      },
      include: { user: true },
    });
    return toPublicMember(membership);
  },

  async removeMember(teamId: string, userId: string): Promise<void> {
    const existing = await prisma.teamMembership.findUnique({
      where: { teamId_userId: { teamId, userId } },
    });
    if (!existing) {
      throw ApiError.notFound('Membership not found', 'MEMBERSHIP_NOT_FOUND');
    }
    // team_memberships has no soft-delete column: hard delete.
    await prisma.teamMembership.delete({
      where: { teamId_userId: { teamId, userId } },
    });
  },
};
