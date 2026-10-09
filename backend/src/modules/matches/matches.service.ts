import { prisma } from '../../shared/prisma/prisma.client.js';
import { ApiError } from '../../shared/errors/api-error.js';
import type { Match, Matchday, Team } from '@prisma/client';
import type {
  MatchCreateDto,
  MatchUpdateDto,
  MatchScoreDto,
  MatchStatusDto,
} from './matches.validation.js';
import type { MatchdayCreateDto, MatchdayUpdateDto } from '../leagues/leagues.validation.js';

export type PublicMatch = Match & {
  homeTeam: Pick<Team, 'id' | 'name' | 'shortName' | 'emoji' | 'primaryColor' | 'secondaryColor'>;
  awayTeam: Pick<Team, 'id' | 'name' | 'shortName' | 'emoji' | 'primaryColor' | 'secondaryColor'>;
  /** Resolved so the UI never has to render a raw referee UUID. */
  referee: { id: string; fullName: string } | null;
  /** Resolved so the UI never has to render a raw field UUID. */
  field: { id: string; name: string } | null;
  mvp: { id: string; fullName: string } | null;
};

/** Minimal user shape needed to label a referee or an MVP in the UI. */
type PersonRef = { id: string; firstName: string; paternalSurname: string };
type FieldRef = { id: string; name: string };
type MatchWithRefs = Match & {
  homeTeam: Team;
  awayTeam: Team;
  referee?: PersonRef | null;
  field?: FieldRef | null;
  mvpUser?: PersonRef | null;
};

function fullName(p: PersonRef | null | undefined): string {
  return p ? `${p.firstName} ${p.paternalSurname}`.trim() : '';
}

/**
 * `refereeId` and `mvpUserId` are plain columns with no Prisma relation, so
 * the names are resolved in one extra query for the whole page instead of
 * per match. The UI needs them: without them it renders a raw UUID.
 */
async function peopleById(ids: string[]): Promise<Map<string, PersonRef>> {
  const unique = [...new Set(ids.filter(Boolean))];
  if (unique.length === 0) return new Map();
  const rows = await prisma.user.findMany({
    where: { id: { in: unique } },
    select: { id: true, firstName: true, paternalSurname: true },
  });
  return new Map(rows.map((r) => [r.id, r]));
}

/** Resolves referee / MVP for a page of matches with two extra queries. */
async function decorate(matches: MatchWithRefs[]): Promise<PublicMatch[]> {
  const people = await peopleById([
    ...matches.map((m) => m.refereeId ?? ''),
    ...matches.map((m) => m.mvpUserId ?? ''),
  ]);
  return matches.map((m) =>
    toPublicMatch({
      ...m,
      referee: m.refereeId ? (people.get(m.refereeId) ?? null) : null,
      mvpUser: m.mvpUserId ? (people.get(m.mvpUserId) ?? null) : null,
    }),
  );
}

export type PublicMatchday = Matchday;

function toPublicMatch(m: MatchWithRefs): PublicMatch {
  const { homeTeam, awayTeam, referee, field, mvpUser, ...rest } = m;
  return {
    ...rest,
    homeTeam: {
      id: homeTeam.id,
      name: homeTeam.name,
      shortName: homeTeam.shortName,
      emoji: homeTeam.emoji,
      primaryColor: homeTeam.primaryColor,
      secondaryColor: homeTeam.secondaryColor,
    },
    awayTeam: {
      id: awayTeam.id,
      name: awayTeam.name,
      shortName: awayTeam.shortName,
      emoji: awayTeam.emoji,
      primaryColor: awayTeam.primaryColor,
      secondaryColor: awayTeam.secondaryColor,
    },
    referee: referee ? { id: referee.id, fullName: fullName(referee) } : null,
    field: field ? { id: field.id, name: field.name } : null,
    mvp: mvpUser ? { id: mvpUser.id, fullName: fullName(mvpUser) } : null,
  };
}

function toPublicMatchday(md: Matchday): PublicMatchday {
  return md;
}

export const matchesService = {
  async findAll(filters: { leagueId?: string; matchdayId?: string; status?: string }): Promise<PublicMatch[]> {
    const where: Record<string, unknown> = {};
    if (filters.leagueId) where.leagueId = filters.leagueId;
    if (filters.matchdayId) where.matchdayId = filters.matchdayId;
    // The dashboard asks for finished matches only; without this filter it
    // sorted by date and returned the (scoreless) upcoming ones.
    if (filters.status) where.status = filters.status;

    const matches = await prisma.match.findMany({
      where,
      include: {
        homeTeam: true,
        awayTeam: true,
        field: true,
      },
      orderBy: [{ scheduledAt: 'asc' }],
    });
    return decorate(matches);
  },

  async findById(id: string): Promise<PublicMatch> {
    const match = await prisma.match.findUnique({
      where: { id },
      include: {
        homeTeam: true,
        awayTeam: true,
        field: true,
      },
    });
    if (!match) {
      throw ApiError.notFound('Match not found', 'MATCH_NOT_FOUND');
    }
    return decorate([match]).then((rows) => rows[0]!);
  },

  async findMatchdaysByLeague(leagueId: string): Promise<PublicMatchday[]> {
    const mds = await prisma.matchday.findMany({
      where: { leagueId },
      orderBy: { number: 'asc' },
    });
    return mds.map(toPublicMatchday);
  },

  async findMatchdayById(id: string): Promise<PublicMatchday> {
    const md = await prisma.matchday.findUnique({ where: { id } });
    if (!md) {
      throw ApiError.notFound('Matchday not found', 'MATCHDAY_NOT_FOUND');
    }
    return toPublicMatchday(md);
  },

  // ----- Writes (ADMIN) -----

  async create(dto: MatchCreateDto, actorId: string): Promise<PublicMatch> {
    if (dto.homeTeamId === dto.awayTeamId) {
      throw ApiError.badRequest('A team cannot play itself', 'SAME_TEAM');
    }

    const [league, matchday, homeTeam, awayTeam] = await Promise.all([
      prisma.league.findFirst({ where: { id: dto.leagueId, deletedAt: null } }),
      prisma.matchday.findUnique({ where: { id: dto.matchdayId } }),
      prisma.team.findFirst({ where: { id: dto.homeTeamId, deletedAt: null } }),
      prisma.team.findFirst({ where: { id: dto.awayTeamId, deletedAt: null } }),
    ]);
    if (!league) throw ApiError.badRequest('League does not exist', 'LEAGUE_NOT_FOUND');
    if (!matchday) throw ApiError.badRequest('Matchday does not exist', 'MATCHDAY_NOT_FOUND');
    if (matchday.leagueId !== dto.leagueId) {
      throw ApiError.badRequest(
        'Matchday does not belong to the specified league',
        'MATCHDAY_LEAGUE_MISMATCH',
      );
    }
    if (!homeTeam) throw ApiError.badRequest('Home team does not exist', 'TEAM_NOT_FOUND');
    if (!awayTeam) throw ApiError.badRequest('Away team does not exist', 'TEAM_NOT_FOUND');

    if (dto.fieldId) {
      const field = await prisma.field.findFirst({
        where: { id: dto.fieldId, deletedAt: null },
        select: { id: true },
      });
      if (!field) throw ApiError.badRequest('Field does not exist', 'FIELD_NOT_FOUND');
    }
    if (dto.refereeId) {
      const referee = await prisma.user.findFirst({
        where: { id: dto.refereeId, deletedAt: null },
        select: { id: true },
      });
      if (!referee) throw ApiError.badRequest('Referee does not exist', 'USER_NOT_FOUND');
    }

    const created = await prisma.match.create({
      data: {
        leagueId: dto.leagueId,
        matchdayId: dto.matchdayId,
        homeTeamId: dto.homeTeamId,
        awayTeamId: dto.awayTeamId,
        fieldId: dto.fieldId ?? null,
        scheduledAt: dto.scheduledAt,
        ...(dto.status !== undefined ? { status: dto.status } : {}),
        refereeId: dto.refereeId ?? null,
        mvpUserId: dto.mvpUserId ?? null,
        scoringMode: dto.scoringMode ?? null,
        notes: dto.notes ?? null,
        knockoutStage: dto.knockoutStage ?? null,
        knockoutPosition: dto.knockoutPosition ?? null,
        knockoutFeedsIntoMatchId: dto.knockoutFeedsIntoMatchId ?? null,
        createdById: actorId,
        updatedById: actorId,
      },
    });
    return this.findById(created.id);
  },

  async update(id: string, dto: MatchUpdateDto, actorId: string): Promise<PublicMatch> {
    const current = await prisma.match.findUnique({ where: { id } });
    if (!current) {
      throw ApiError.notFound('Match not found', 'MATCH_NOT_FOUND');
    }
    if (
      dto.homeTeamId &&
      dto.awayTeamId &&
      dto.homeTeamId === dto.awayTeamId
    ) {
      throw ApiError.badRequest('A team cannot play itself', 'SAME_TEAM');
    }

    const { ...updates } = dto;
    await prisma.match.update({
      where: { id },
      data: { ...updates, updatedById: actorId },
    });
    return this.findById(id);
  },

  async setScore(id: string, dto: MatchScoreDto, actorId: string): Promise<PublicMatch> {
    const current = await prisma.match.findUnique({ where: { id } });
    if (!current) {
      throw ApiError.notFound('Match not found', 'MATCH_NOT_FOUND');
    }
    await prisma.match.update({
      where: { id },
      data: {
        homeScore: dto.homeScore,
        awayScore: dto.awayScore,
        ...(dto.status !== undefined ? { status: dto.status } : {}),
        updatedById: actorId,
      },
    });
    return this.findById(id);
  },

  async setStatus(id: string, dto: MatchStatusDto, actorId: string): Promise<PublicMatch> {
    const current = await prisma.match.findUnique({ where: { id } });
    if (!current) {
      throw ApiError.notFound('Match not found', 'MATCH_NOT_FOUND');
    }
    await prisma.match.update({
      where: { id },
      data: { status: dto.status, updatedById: actorId },
    });
    return this.findById(id);
  },

  async remove(id: string): Promise<void> {
    const current = await prisma.match.findUnique({ where: { id } });
    if (!current) {
      throw ApiError.notFound('Match not found', 'MATCH_NOT_FOUND');
    }
    // matches has no soft-delete column; events cascade via FK.
    await prisma.match.delete({ where: { id } });
  },

  /**
   * Recompute homeScore/awayScore from GOAL events. Called by the events
   * service after any create/update/delete so the scoreboard stays in sync
   * with the event timeline.
   */
  async recomputeScore(matchId: string): Promise<void> {
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      select: { homeTeamId: true, awayTeamId: true },
    });
    if (!match) {
      throw ApiError.notFound('Match not found', 'MATCH_NOT_FOUND');
    }
    const goals = await prisma.matchEvent.groupBy({
      by: ['teamId'],
      where: { matchId, type: 'GOAL' },
      _count: { _all: true },
    });
    const counts = new Map(goals.map((g) => [g.teamId, g._count._all]));
    await prisma.match.update({
      where: { id: matchId },
      data: {
        homeScore: counts.get(match.homeTeamId) ?? 0,
        awayScore: counts.get(match.awayTeamId) ?? 0,
      },
    });
  },

  // ----- Matchday writes (ADMIN) — L-5, L-6, L-7 -----

  async createMatchday(
    leagueId: string,
    dto: MatchdayCreateDto,
    actorId: string,
  ): Promise<PublicMatchday> {
    const league = await prisma.league.findUnique({
      where: { id: leagueId },
      select: { id: true, deletedAt: true },
    });
    if (!league || league.deletedAt) {
      throw ApiError.notFound('League not found', 'LEAGUE_NOT_FOUND');
    }

    let number = dto.number;
    if (number !== undefined) {
      const clash = await prisma.matchday.findUnique({
        where: { leagueId_number: { leagueId, number } },
      });
      if (clash) {
        throw ApiError.conflict('A matchday with that number already exists', 'MATCHDAY_EXISTS');
      }
    } else {
      const last = await prisma.matchday.findFirst({
        where: { leagueId },
        orderBy: { number: 'desc' },
        select: { number: true },
      });
      number = (last?.number ?? 0) + 1;
    }

    const md = await prisma.matchday.create({
      data: {
        leagueId,
        number,
        date: dto.date,
        status: dto.status ?? 'PENDING',
        createdById: actorId,
        updatedById: actorId,
      },
    });

    const count = await prisma.matchday.count({ where: { leagueId } });
    await prisma.league.update({
      where: { id: leagueId },
      data: { matchdaysCount: count, updatedById: actorId },
    });

    return toPublicMatchday(md);
  },

  async updateMatchday(
    id: string,
    dto: MatchdayUpdateDto,
    actorId: string,
  ): Promise<PublicMatchday> {
    const current = await prisma.matchday.findUnique({ where: { id } });
    if (!current) {
      throw ApiError.notFound('Matchday not found', 'MATCHDAY_NOT_FOUND');
    }
    if (dto.number !== undefined && dto.number !== current.number) {
      const clash = await prisma.matchday.findUnique({
        where: { leagueId_number: { leagueId: current.leagueId, number: dto.number } },
      });
      if (clash) {
        throw ApiError.conflict('A matchday with that number already exists', 'MATCHDAY_EXISTS');
      }
    }

    const md = await prisma.matchday.update({
      where: { id },
      data: {
        ...(dto.number !== undefined ? { number: dto.number } : {}),
        ...(dto.date !== undefined ? { date: dto.date } : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
        updatedById: actorId,
      },
    });
    return toPublicMatchday(md);
  },

  async removeMatchday(id: string): Promise<void> {
    const current = await prisma.matchday.findUnique({
      where: { id },
      select: { id: true, leagueId: true },
    });
    if (!current) {
      throw ApiError.notFound('Matchday not found', 'MATCHDAY_NOT_FOUND');
    }
    const played = await prisma.match.count({
      where: { matchdayId: id, status: { in: ['IN_PROGRESS', 'COMPLETED'] } },
    });
    if (played > 0) {
      throw ApiError.conflict(
        'Matchday has played matches and cannot be deleted',
        'MATCHDAY_IN_PLAY',
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.match.deleteMany({ where: { matchdayId: id } });
      await tx.matchday.delete({ where: { id } });
      const count = await tx.matchday.count({ where: { leagueId: current.leagueId } });
      await tx.league.update({
        where: { id: current.leagueId },
        data: { matchdaysCount: count },
      });
    });
  },
};
