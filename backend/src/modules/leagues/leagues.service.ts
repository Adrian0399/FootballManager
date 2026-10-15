import { prisma } from '../../shared/prisma/prisma.client.js';
import { ApiError } from '../../shared/errors/api-error.js';
import { standingsService } from '../standings/standings.service.js';
import {
  bergerRoundRobin,
  doubleRounds,
  orientHomeAway,
  weeklyDate,
  addDays,
  addHours,
  withTime,
  shuffle,
  EIGHT_TEAM_BRACKET,
  TIME_SLOT_HOUR,
} from './tournament.js';
import type {
  LeagueCreateDto,
  LeagueUpdateDto,
  FixtureGenerateDto,
  KnockoutGenerateDto,
  LeagueTeamAddDto,
  LeagueTeamUpdateDto,
} from './leagues.validation.js';
import type { League, Field, LeagueField, LeagueTeam } from '@prisma/client';

/**
 * The shape we expose to clients. We flatten the M:N join into `fields`
 * (array of Field) + `fieldIds` (array of UUID) so the frontend doesn't
 * have to know about the underlying league_fields table. `deletedAt` is
 * intentionally omitted from the public type.
 */
export type PublicLeague = Omit<League, 'deletedAt'> & {
  fields: Field[];
  fieldIds: string[];
};

type PrismaLeagueWithLeagueFields = League & {
  leagueFields: (LeagueField & { field: Field })[];
};

function toPublicLeague(league: PrismaLeagueWithLeagueFields): PublicLeague {
  const { deletedAt: _d, leagueFields, ...rest } = league;
  const fields = leagueFields
    .map((lf) => lf.field)
    .filter((f) => !f.deletedAt);
  return { ...rest, fields, fieldIds: fields.map((f) => f.id) };
}

export const leaguesService = {
  async findAll(includeInactive = false): Promise<PublicLeague[]> {
    const leagues = await prisma.league.findMany({
      where: includeInactive ? {} : { deletedAt: null },
      include: {
        leagueFields: {
          include: { field: true },
        },
      },
      orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
    });
    return leagues.map(toPublicLeague);
  },

  async findById(id: string): Promise<PublicLeague> {
    const league = await prisma.league.findUnique({
      where: { id },
      include: {
        leagueFields: {
          include: { field: true },
        },
      },
    });
    if (!league || league.deletedAt) {
      throw ApiError.notFound('League not found', 'LEAGUE_NOT_FOUND');
    }
    return toPublicLeague(league);
  },

  async create(dto: LeagueCreateDto, creatorId: string): Promise<PublicLeague> {
    // Validate that every fieldId exists and is not soft-deleted.
    const fields = await prisma.field.findMany({
      where: { id: { in: dto.fieldIds }, deletedAt: null },
      select: { id: true },
    });
    const foundIds = new Set(fields.map((f) => f.id));
    const missing = dto.fieldIds.filter((id) => !foundIds.has(id));
    if (missing.length > 0) {
      throw ApiError.badRequest(
        `Some fields do not exist: ${missing.join(', ')}`,
        'FIELD_NOT_FOUND',
      );
    }

    const created = await prisma.$transaction(async (tx) => {
      const league = await tx.league.create({
        data: {
          name: dto.name,
          description: dto.description ?? null,
          season: dto.season ?? null,
          startDate: dto.startDate ?? null,
          endDate: dto.endDate ?? null,
          format: dto.format ?? null,
          category: dto.category ?? null,
          type: dto.type ?? null,
          matchdaysCount: dto.matchdaysCount ?? null,
          homeAndAway: dto.homeAndAway ?? null,
          knockoutHomeAndAway: dto.knockoutHomeAndAway ?? null,
          maxTeams: dto.maxTeams ?? null,
          dayOfWeek: dto.dayOfWeek ?? null,
          timeSlot: dto.timeSlot ?? null,
          status: dto.status ?? null,
          createdById: creatorId,
          updatedById: creatorId,
        },
      });
      await tx.leagueField.createMany({
        data: dto.fieldIds.map((fieldId) => ({
          leagueId: league.id,
          fieldId,
          createdById: creatorId,
          updatedById: creatorId,
        })),
      });
      return league;
    });

    return this.findById(created.id);
  },

  async update(
    id: string,
    dto: LeagueUpdateDto,
    updaterId: string,
  ): Promise<PublicLeague> {
    const current = await prisma.league.findUnique({ where: { id } });
    if (!current || current.deletedAt) {
      throw ApiError.notFound('League not found', 'LEAGUE_NOT_FOUND');
    }

    if (dto.fieldIds !== undefined) {
      const fields = await prisma.field.findMany({
        where: { id: { in: dto.fieldIds }, deletedAt: null },
        select: { id: true },
      });
      const foundIds = new Set(fields.map((f) => f.id));
      const missing = dto.fieldIds.filter((id2) => !foundIds.has(id2));
      if (missing.length > 0) {
        throw ApiError.badRequest(
          `Some fields do not exist: ${missing.join(', ')}`,
          'FIELD_NOT_FOUND',
        );
      }
    }

    await prisma.$transaction(async (tx) => {
      const { fieldIds, ...scalarUpdates } = dto;
      await tx.league.update({
        where: { id },
        data: {
          ...scalarUpdates,
          updatedById: updaterId,
        },
      });

      if (fieldIds !== undefined) {
        await tx.leagueField.deleteMany({ where: { leagueId: id } });
        if (fieldIds.length > 0) {
          await tx.leagueField.createMany({
            data: fieldIds.map((fieldId) => ({
              leagueId: id,
              fieldId,
              createdById: updaterId,
              updatedById: updaterId,
            })),
          });
        }
      }
    });

    return this.findById(id);
  },

  async softDelete(id: string, updaterId: string): Promise<void> {
    const current = await prisma.league.findUnique({ where: { id } });
    if (!current || current.deletedAt) {
      throw ApiError.notFound('League not found', 'LEAGUE_NOT_FOUND');
    }
    await prisma.league.update({
      where: { id },
      data: { deletedAt: new Date(), updatedById: updaterId },
    });
  },

  // ===================================================================
  // Fase B — Tournament engine
  // ===================================================================

  /**
   * L-3 — Generate the round-robin fixture. Replaces any existing fixture
   * (matches + matchdays) unless a played match exists and `force` is off.
   */
  async generateFixture(
    leagueId: string,
    dto: FixtureGenerateDto,
    actorId: string,
  ): Promise<{ matchdayCount: number; matchCount: number }> {
    const league = await prisma.league.findUnique({ where: { id: leagueId } });
    if (!league || league.deletedAt) {
      throw ApiError.notFound('League not found', 'LEAGUE_NOT_FOUND');
    }

    const leagueTeams = await prisma.leagueTeam.findMany({
      where: { leagueId },
      orderBy: [{ seed: 'asc' }],
      select: { teamId: true },
    });
    if (leagueTeams.length < 2) {
      throw ApiError.badRequest(
        'At least 2 teams are required to generate a fixture',
        'NOT_ENOUGH_TEAMS',
      );
    }

    const existing = await prisma.match.findMany({
      where: { leagueId },
      select: { status: true },
    });
    const hasPlayed = existing.some(
      (m) => m.status === 'IN_PROGRESS' || m.status === 'COMPLETED',
    );
    if (hasPlayed && !dto.force) {
      throw ApiError.conflict(
        'League already has played matches; pass force=true to regenerate the fixture',
        'FIXTURE_IN_PLAY',
      );
    }

    let ordered = leagueTeams.map((lt) => lt.teamId);
    if (dto.shuffle) ordered = shuffle(ordered);

    const baseRounds = orientHomeAway(bergerRoundRobin(ordered.length));
    // Mirroring an already-balanced single round-robin keeps it perfectly
    // balanced, so orient BEFORE doubling (never after).
    const rounds = league.homeAndAway ? doubleRounds(baseRounds) : baseRounds;

    const leagueFields = await prisma.leagueField.findMany({
      where: { leagueId },
      select: { fieldId: true },
    });
    const fieldIds = leagueFields.map((lf) => lf.fieldId);

    const base = dto.startDate ?? league.startDate ?? new Date();
    const hhmm = league.timeSlot ? TIME_SLOT_HOUR[league.timeSlot] : '19:00';
    const roundDates = rounds.map((_, i) =>
      weeklyDate(base, i, league.dayOfWeek ?? null, hhmm),
    );

    return prisma.$transaction(async (tx) => {
      await tx.match.deleteMany({ where: { leagueId } });
      await tx.matchday.deleteMany({ where: { leagueId } });

      let matchCount = 0;
      for (let i = 0; i < rounds.length; i += 1) {
        const date = roundDates[i]!;
        const md = await tx.matchday.create({
          data: { leagueId, number: i + 1, date, status: 'PENDING' },
        });
        const round = rounds[i]!;
        for (let p = 0; p < round.length; p += 1) {
          const [homeIdx, awayIdx] = round[p]!;
          await tx.match.create({
            data: {
              leagueId,
              matchdayId: md.id,
              homeTeamId: ordered[homeIdx]!,
              awayTeamId: ordered[awayIdx]!,
              fieldId: fieldIds.length > 0 ? fieldIds[p % fieldIds.length]! : null,
              scheduledAt: date,
              status: 'SCHEDULED',
              createdById: actorId,
              updatedById: actorId,
            },
          });
          matchCount += 1;
        }
      }

      await tx.league.update({
        where: { id: leagueId },
        data: { matchdaysCount: rounds.length, updatedById: actorId },
      });

      return { matchdayCount: rounds.length, matchCount };
    });
  },

  /**
   * L-4 — Generate the 8-team knockout bracket from the current standings
   * (falls back to seed order when no matches have been played). Wires the
   * bracket through `knockoutFeedsIntoMatchId`.
   */
  async generateKnockout(
    leagueId: string,
    dto: KnockoutGenerateDto,
    actorId: string,
  ): Promise<{ quarters: number; semis: number; final: number; thirdPlace: number; matchdayId: string }> {
    const league = await prisma.league.findUnique({ where: { id: leagueId } });
    if (!league || league.deletedAt) {
      throw ApiError.notFound('League not found', 'LEAGUE_NOT_FOUND');
    }

    const existingKo = await prisma.match.count({
      where: { leagueId, knockoutStage: { not: null } },
    });
    if (existingKo > 0 && !dto.force) {
      throw ApiError.conflict(
        'League already has a knockout bracket; pass force=true to regenerate',
        'KNOCKOUT_EXISTS',
      );
    }

    const leagueTeams = await prisma.leagueTeam.findMany({
      where: { leagueId },
      orderBy: [{ seed: 'asc' }],
      select: { teamId: true },
    });
    if (leagueTeams.length < 8) {
      throw ApiError.badRequest(
        'At least 8 teams are required to generate a knockout bracket',
        'NOT_ENOUGH_TEAMS',
      );
    }

    const standings = await standingsService.computeForLeague(leagueId);
    const totalPlayed = standings.overall.reduce((sum, r) => sum + r.played, 0);
    const ranked = (
      totalPlayed > 0 ? standings.overall.map((r) => r.teamId) : leagueTeams.map((lt) => lt.teamId)
    ).slice(0, 8);

    const lastMd = await prisma.matchday.findFirst({
      where: { leagueId },
      orderBy: { number: 'desc' },
    });
    const base = dto.startDate ?? (lastMd ? addDays(lastMd.date, 7) : new Date());
    const hhmm = league.timeSlot ? TIME_SLOT_HOUR[league.timeSlot] : '19:00';
    const bracket = EIGHT_TEAM_BRACKET;
    const twoLegs = league.knockoutHomeAndAway === true;

    const result = await prisma.$transaction(async (tx) => {
      if (existingKo > 0) {
        await tx.match.deleteMany({
          where: { leagueId, knockoutStage: { not: null } },
        });
      }

      const nextNumber = (lastMd?.number ?? 0) + 1;
      const md = await tx.matchday.create({
        data: { leagueId, number: nextNumber, date: withTime(base, hhmm), status: 'PENDING' },
      });

      const createKoMatch = (
        stage: 'QUARTERS' | 'SEMIS' | 'FINAL' | 'THIRD_PLACE',
        position: number,
        leg: number,
        homeIdx: number,
        awayIdx: number,
        scheduledAt: Date,
      ) =>
        tx.match.create({
          data: {
            leagueId,
            matchdayId: md.id,
            homeTeamId: ranked[homeIdx]!,
            awayTeamId: ranked[awayIdx]!,
            fieldId: null,
            scheduledAt,
            status: 'SCHEDULED',
            knockoutStage: stage,
            knockoutPosition: position,
            knockoutLeg: leg,
            createdById: actorId,
            updatedById: actorId,
          },
        });

      /**
       * Creates a tie: a single match, or two legs (home/away swapped)
       * when the league plays its playoff home-and-away. Returns every
       * match id in the tie (the first one is the tie's anchor).
       */
      const createTie = async (
        stage: 'QUARTERS' | 'SEMIS' | 'FINAL' | 'THIRD_PLACE',
        position: number,
        homeIdx: number,
        awayIdx: number,
        leg1At: Date,
        leg2At: Date,
      ): Promise<string[]> => {
        const first = await createKoMatch(stage, position, 1, homeIdx, awayIdx, leg1At);
        if (!twoLegs) return [first.id];
        const second = await createKoMatch(stage, position, 2, awayIdx, homeIdx, leg2At);
        return [first.id, second.id];
      };

      // Round dates. Single-leg keeps the compact 2-day spacing; two-leg
      // gives each tie a week between legs and each round a week's gap.
      const qfLegOffsets: [number, number][] = twoLegs
        ? [[0, 7], [2, 9], [4, 11], [6, 13]]
        : [[0, 0], [2, 0], [4, 0], [6, 0]];
      const sfLegOffsets: [number, number][] = twoLegs
        ? [[14, 21], [15, 22]]
        : [[9, 0], [10, 0]];
      const finalLegOffsets: [number, number] = twoLegs ? [28, 35] : [12, 0];

      const qfTies: string[][] = [];
      for (let i = 0; i < bracket.quarters.length; i += 1) {
        const [h, a] = bracket.quarters[i]!;
        const [l1, l2] = qfLegOffsets[i]!;
        qfTies.push(
          await createTie(
            'QUARTERS',
            i + 1,
            h,
            a,
            withTime(addDays(base, l1!), hhmm),
            withTime(addDays(base, l2!), hhmm),
          ),
        );
      }

      const sfTies: string[][] = [];
      for (let i = 0; i < bracket.semis.length; i += 1) {
        const [h, a] = bracket.semis[i]!;
        const [l1, l2] = sfLegOffsets[i]!;
        sfTies.push(
          await createTie(
            'SEMIS',
            i + 1,
            h,
            a,
            withTime(addDays(base, l1!), hhmm),
            withTime(addDays(base, l2!), hhmm),
          ),
        );
      }

      const [finL1, finL2] = finalLegOffsets;
      const finalDate = withTime(addDays(base, finL1!), hhmm);
      const finalLeg2Date = withTime(addDays(base, finL2!), hhmm);
      const finalTie = await createTie(
        'FINAL',
        1,
        bracket.final[0],
        bracket.final[1],
        finalDate,
        finalLeg2Date,
      );
      await createTie(
        'THIRD_PLACE',
        1,
        bracket.third[0],
        bracket.third[1],
        addHours(finalDate, 2),
        addHours(finalLeg2Date, 2),
      );

      /** Links every match of a tie into the next round's first leg. */
      const linkTie = async (fromTie: string[], into: string): Promise<void> => {
        for (const id of fromTie) {
          await tx.match.update({ where: { id }, data: { knockoutFeedsIntoMatchId: into } });
        }
      };

      const finalAnchor = finalTie[0]!;
      for (let i = 0; i < qfTies.length; i += 1) {
        await linkTie(qfTies[i]!, sfTies[Math.floor(i / 2)]![0]!);
      }
      for (let i = 0; i < sfTies.length; i += 1) {
        await linkTie(sfTies[i]!, finalAnchor);
      }

      return { matchdayId: md.id };
    });

    return {
      quarters: twoLegs ? 8 : 4,
      semis: twoLegs ? 4 : 2,
      final: twoLegs ? 2 : 1,
      thirdPlace: twoLegs ? 2 : 1,
      matchdayId: result.matchdayId,
    };
  },

  // ----- League enrollment (L-8, L-9, L-10) -----

  async addLeagueTeam(
    leagueId: string,
    dto: LeagueTeamAddDto,
    actorId: string,
  ): Promise<LeagueTeam> {
    const league = await prisma.league.findUnique({ where: { id: leagueId } });
    if (!league || league.deletedAt) {
      throw ApiError.notFound('League not found', 'LEAGUE_NOT_FOUND');
    }
    const team = await prisma.team.findFirst({
      where: { id: dto.teamId, deletedAt: null },
      select: { id: true },
    });
    if (!team) {
      throw ApiError.badRequest('Team does not exist', 'TEAM_NOT_FOUND');
    }
    const existing = await prisma.leagueTeam.findUnique({
      where: { leagueId_teamId: { leagueId, teamId: dto.teamId } },
    });
    if (existing) {
      throw ApiError.conflict('Team is already enrolled in this league', 'TEAM_ALREADY_ENROLLED');
    }

    // A team can only compete in ONE league at a time.
    const other = await prisma.leagueTeam.findFirst({
      where: { teamId: dto.teamId, leagueId: { not: leagueId } },
      select: { league: { select: { name: true } } },
    });
    if (other) {
      throw ApiError.conflict(
        `El equipo ya pertenece a la liga "${other.league.name}". Un equipo solo puede estar en una liga a la vez.`,
        'TEAM_IN_ANOTHER_LEAGUE',
      );
    }

    let seed = dto.seed;
    if (seed === undefined) {
      const last = await prisma.leagueTeam.findFirst({
        where: { leagueId },
        orderBy: { seed: 'desc' },
        select: { seed: true },
      });
      seed = (last?.seed ?? 0) + 1;
    }

    const [created] = await prisma.$transaction([
      prisma.leagueTeam.create({
        data: {
          leagueId,
          teamId: dto.teamId,
          seed,
          groupLabel: dto.groupLabel ?? null,
          createdById: actorId,
          updatedById: actorId,
        },
      }),
      prisma.team.update({
        where: { id: dto.teamId },
        data: { currentLeagueId: leagueId, updatedById: actorId },
      }),
    ]);

    return created;
  },

  async updateLeagueTeam(
    leagueId: string,
    teamId: string,
    dto: LeagueTeamUpdateDto,
    actorId: string,
  ): Promise<LeagueTeam> {
    const entry = await prisma.leagueTeam.findUnique({
      where: { leagueId_teamId: { leagueId, teamId } },
    });
    if (!entry) {
      throw ApiError.notFound('Team is not enrolled in this league', 'ENROLLMENT_NOT_FOUND');
    }
    return prisma.leagueTeam.update({
      where: { leagueId_teamId: { leagueId, teamId } },
      data: {
        ...(dto.seed !== undefined ? { seed: dto.seed } : {}),
        ...(dto.groupLabel !== undefined ? { groupLabel: dto.groupLabel } : {}),
        updatedById: actorId,
      },
    });
  },

  async removeLeagueTeam(leagueId: string, teamId: string): Promise<void> {
    const entry = await prisma.leagueTeam.findUnique({
      where: { leagueId_teamId: { leagueId, teamId } },
    });
    if (!entry) {
      throw ApiError.notFound('Team is not enrolled in this league', 'ENROLLMENT_NOT_FOUND');
    }
    await prisma.$transaction([
      prisma.leagueTeam.delete({
        where: { leagueId_teamId: { leagueId, teamId } },
      }),
      // Clear the denormalized pointer only if it still points here, so a
      // re-enrollment into another league isn't clobbered.
      prisma.team.updateMany({
        where: { id: teamId, currentLeagueId: leagueId },
        data: { currentLeagueId: null },
      }),
    ]);
  },
};
