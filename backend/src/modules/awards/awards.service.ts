import { prisma } from '../../shared/prisma/prisma.client.js';
import { ApiError } from '../../shared/errors/api-error.js';
import { standingsService } from '../standings/standings.service.js';
import { statsService } from '../stats/stats.service.js';
import type {
  AwardCreateDto,
  AwardUpdateDto,
  AwardSeedDto,
  AwardListQueryDto,
} from './awards.validation.js';

export interface PublicAward {
  id: string;
  userId: string;
  userName: string;
  leagueId: string | null;
  leagueName: string | null;
  teamId: string | null;
  teamName: string | null;
  category: string;
  level: string;
  title: string;
  description: string | null;
  awardedAt: string;
}

function personName(user: {
  firstName: string;
  paternalSurname: string;
  maternalSurname: string;
  nickname?: string | null;
} | null): string {
  if (!user) return '';
  const full = `${user.firstName} ${user.paternalSurname} ${user.maternalSurname}`.trim();
  return user.nickname ? `${full} "${user.nickname}"` : full;
}

const awardInclude = {
  user: {
    select: {
      firstName: true,
      paternalSurname: true,
      maternalSurname: true,
      nickname: true,
    },
  },
  league: { select: { name: true, season: true } },
  team: { select: { name: true } },
} as const;

type AwardRow = {
  id: string;
  userId: string;
  leagueId: string | null;
  teamId: string | null;
  category: string;
  level: string;
  title: string;
  description: string | null;
  awardedAt: Date;
  user: {
    firstName: string;
    paternalSurname: string;
    maternalSurname: string;
    nickname: string | null;
  } | null;
  league: { name: string; season: string | null } | null;
  team: { name: string } | null;
};

function toPublicAward(a: AwardRow): PublicAward {
  return {
    id: a.id,
    userId: a.userId,
    userName: personName(a.user),
    leagueId: a.leagueId,
    leagueName: a.league ? a.league.name : null,
    teamId: a.teamId,
    teamName: a.team ? a.team.name : null,
    category: a.category,
    level: a.level,
    title: a.title,
    description: a.description,
    awardedAt: a.awardedAt.toISOString(),
  };
}

export const awardsService = {
  async findAll(query: AwardListQueryDto): Promise<PublicAward[]> {
    const where: Record<string, unknown> = { deletedAt: null };
    if (query.userId) where.userId = query.userId;
    if (query.leagueId) where.leagueId = query.leagueId;
    if (query.category) where.category = query.category;

    const rows = (await prisma.award.findMany({
      where,
      include: awardInclude,
      orderBy: [{ awardedAt: 'desc' }, { createdAt: 'desc' }],
    })) as unknown as AwardRow[];

    return rows.map(toPublicAward);
  },

  async create(dto: AwardCreateDto, actorId: string): Promise<PublicAward> {
    const user = await prisma.user.findFirst({
      where: { id: dto.userId, deletedAt: null },
      select: { id: true },
    });
    if (!user) throw ApiError.badRequest('User does not exist', 'USER_NOT_FOUND');

    if (dto.leagueId) {
      const league = await prisma.league.findFirst({
        where: { id: dto.leagueId, deletedAt: null },
        select: { id: true },
      });
      if (!league) throw ApiError.badRequest('League does not exist', 'LEAGUE_NOT_FOUND');
    }
    if (dto.teamId) {
      const team = await prisma.team.findFirst({
        where: { id: dto.teamId, deletedAt: null },
        select: { id: true },
      });
      if (!team) throw ApiError.badRequest('Team does not exist', 'TEAM_NOT_FOUND');
    }

    const created = (await prisma.award.create({
      data: {
        userId: dto.userId,
        leagueId: dto.leagueId ?? null,
        teamId: dto.teamId ?? null,
        category: dto.category,
        level: dto.level,
        title: dto.title,
        description: dto.description ?? null,
        awardedAt: dto.awardedAt,
        createdById: actorId,
        updatedById: actorId,
      },
      include: awardInclude,
    })) as unknown as AwardRow;

    return toPublicAward(created);
  },

  async update(id: string, dto: AwardUpdateDto, actorId: string): Promise<PublicAward> {
    const current = await prisma.award.findFirst({ where: { id, deletedAt: null } });
    if (!current) throw ApiError.notFound('Award not found', 'AWARD_NOT_FOUND');

    const updated = (await prisma.award.update({
      where: { id },
      data: {
        ...(dto.userId !== undefined ? { userId: dto.userId } : {}),
        ...(dto.leagueId !== undefined ? { leagueId: dto.leagueId } : {}),
        ...(dto.teamId !== undefined ? { teamId: dto.teamId } : {}),
        ...(dto.category !== undefined ? { category: dto.category } : {}),
        ...(dto.level !== undefined ? { level: dto.level } : {}),
        ...(dto.title !== undefined ? { title: dto.title } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.awardedAt !== undefined ? { awardedAt: dto.awardedAt } : {}),
        updatedById: actorId,
      },
      include: awardInclude,
    })) as unknown as AwardRow;

    return toPublicAward(updated);
  },

  async softDelete(id: string, actorId: string): Promise<void> {
    const current = await prisma.award.findFirst({ where: { id, deletedAt: null } });
    if (!current) throw ApiError.notFound('Award not found', 'AWARD_NOT_FOUND');
    await prisma.award.update({
      where: { id },
      data: { deletedAt: new Date(), updatedById: actorId },
    });
  },

  /**
   * A-5 — Auto-award a league: champion (winning team's DT), top-3 scorers,
   * MVP leader and fair-play leader. Idempotent unless `force` is passed
   * (which soft-deletes prior awards for the league and regenerates).
   */
  async seedForLeague(
    leagueId: string,
    dto: AwardSeedDto,
    actorId: string,
  ): Promise<{ created: number }> {
    const league = await prisma.league.findFirst({
      where: { id: leagueId, deletedAt: null },
    });
    if (!league) throw ApiError.notFound('League not found', 'LEAGUE_NOT_FOUND');

    const existing = await prisma.award.count({
      where: { leagueId, deletedAt: null },
    });
    if (existing > 0 && !dto.force) {
      throw ApiError.conflict(
        'League already has awards; pass force=true to regenerate',
        'AWARDS_EXIST',
      );
    }

    const standings = await standingsService.computeForLeague(leagueId);
    const stats = await statsService.computeForLeague(leagueId);

    const awardedAt = dto.awardedAt ?? league.endDate ?? new Date();
    const season = league.season ?? '';

    const data: {
      userId: string;
      leagueId: string;
      teamId: string | null;
      category: 'SCORER' | 'MVP' | 'FAIR_PLAY' | 'CHAMPION' | 'BEST_DEFENSE';
      level: 'GOLD' | 'SILVER' | 'BRONZE';
      title: string;
      description: string | null;
      awardedAt: Date;
    }[] = [];

    // Champion: the winning team's DT.
    const championRow = standings.overall[0];
    if (championRow) {
      const dt = await prisma.teamMembership.findFirst({
        where: {
          teamId: championRow.teamId,
          membershipRole: 'DT',
        },
        select: { userId: true },
      });
      if (dt) {
        data.push({
          userId: dt.userId,
          leagueId,
          teamId: championRow.teamId,
          category: 'CHAMPION',
          level: 'GOLD',
          title: `Campeón ${league.name}`,
          description: `Título de liga con ${championRow.teamName}`,
          awardedAt,
        });
      }
    }

    // Top-3 scorers.
    const levels: ('GOLD' | 'SILVER' | 'BRONZE')[] = ['GOLD', 'SILVER', 'BRONZE'];
    stats.goals.slice(0, 3).forEach((entry, i) => {
      data.push({
        userId: entry.playerId,
        leagueId,
        teamId: entry.teamId || null,
        category: 'SCORER',
        level: levels[i]!,
        title: `Goleador ${season || league.name}`,
        description: `${entry.value} goles`,
        awardedAt,
      });
    });

    // MVP leader.
    const mvp = stats.mvps[0];
    if (mvp) {
      data.push({
        userId: mvp.playerId,
        leagueId,
        teamId: mvp.teamId || null,
        category: 'MVP',
        level: 'GOLD',
        title: `MVP ${season || league.name}`,
        description: `${mvp.value} reconocimientos MVP`,
        awardedAt,
      });
    }

    // Fair-play leader.
    const fair = stats.fairPlay[0];
    if (fair) {
      data.push({
        userId: fair.playerId,
        leagueId,
        teamId: fair.teamId || null,
        category: 'FAIR_PLAY',
        level: 'GOLD',
        title: `Juego limpio ${season || league.name}`,
        description: 'Menor cantidad de tarjetas',
        awardedAt,
      });
    }

    if (data.length === 0) {
      throw ApiError.badRequest(
        'No awards could be derived (no standings or stats data)',
        'NO_AWARD_DATA',
      );
    }

    const created = await prisma.$transaction(async (tx) => {
      if (existing > 0) {
        await tx.award.updateMany({
          where: { leagueId, deletedAt: null },
          data: { deletedAt: new Date(), updatedById: actorId },
        });
      }
      let count = 0;
      for (const row of data) {
        await tx.award.create({
          data: { ...row, createdById: actorId, updatedById: actorId },
        });
        count += 1;
      }
      return count;
    });

    return { created };
  },
};
