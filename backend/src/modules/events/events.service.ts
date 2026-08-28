import { prisma } from '../../shared/prisma/prisma.client.js';
import { ApiError } from '../../shared/errors/api-error.js';
import { matchesService } from '../matches/matches.service.js';
import type { EventCreateDto, EventUpdateDto } from './events.validation.js';
import type { MatchEvent, User } from '@prisma/client';

export type PublicMatchEvent = Omit<MatchEvent, 'createdById' | 'createdAt'> & {
  user: Pick<User, 'id' | 'firstName' | 'paternalSurname' | 'maternalSurname'>;
  secondaryUser: Pick<User, 'id' | 'firstName' | 'paternalSurname' | 'maternalSurname'> | null;
};

function toPublicEvent(
  e: MatchEvent & { user: User; secondaryUser: User | null },
): PublicMatchEvent {
  const { createdById: _cb, createdAt: _ca, user, secondaryUser, ...rest } = e;
  return {
    ...rest,
    user: {
      id: user.id,
      firstName: user.firstName,
      paternalSurname: user.paternalSurname,
      maternalSurname: user.maternalSurname,
    },
    secondaryUser: secondaryUser
      ? {
          id: secondaryUser.id,
          firstName: secondaryUser.firstName,
          paternalSurname: secondaryUser.paternalSurname,
          maternalSurname: secondaryUser.maternalSurname,
        }
      : null,
  };
}

export const eventsService = {
  async findByMatch(matchId: string): Promise<PublicMatchEvent[]> {
    const events = await prisma.matchEvent.findMany({
      where: { matchId },
      include: { user: true, secondaryUser: true },
      orderBy: [{ minute: 'asc' }],
    });
    return events.map(toPublicEvent);
  },

  // ----- Writes (ADMIN) -----

  async create(
    matchId: string,
    dto: EventCreateDto,
    actorId: string,
  ): Promise<PublicMatchEvent> {
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      select: { id: true, homeTeamId: true, awayTeamId: true },
    });
    if (!match) {
      throw ApiError.notFound('Match not found', 'MATCH_NOT_FOUND');
    }
    if (dto.teamId !== match.homeTeamId && dto.teamId !== match.awayTeamId) {
      throw ApiError.badRequest(
        'Event team must be one of the two match teams',
        'EVENT_TEAM_MISMATCH',
      );
    }
    const user = await prisma.user.findUnique({ where: { id: dto.userId } });
    if (!user || user.deletedAt) {
      throw ApiError.badRequest('User does not exist', 'USER_NOT_FOUND');
    }

    const event = await prisma.matchEvent.create({
      data: {
        matchId,
        minute: dto.minute,
        type: dto.type,
        teamId: dto.teamId,
        userId: dto.userId,
        secondaryUserId: dto.secondaryUserId ?? null,
        notes: dto.notes ?? null,
        createdById: actorId,
      },
      include: { user: true, secondaryUser: true },
    });

    if (dto.type === 'GOAL') {
      await matchesService.recomputeScore(matchId);
    }
    if (dto.type === 'MVP') {
      await prisma.match.update({
        where: { id: matchId },
        data: { mvpUserId: dto.userId },
      });
    }

    return toPublicEvent(event);
  },

  async update(
    eventId: string,
    dto: EventUpdateDto,
  ): Promise<PublicMatchEvent> {
    const current = await prisma.matchEvent.findUnique({ where: { id: eventId } });
    if (!current) {
      throw ApiError.notFound('Event not found', 'EVENT_NOT_FOUND');
    }

    const event = await prisma.matchEvent.update({
      where: { id: eventId },
      data: {
        ...(dto.minute !== undefined ? { minute: dto.minute } : {}),
        ...(dto.type !== undefined ? { type: dto.type } : {}),
        ...(dto.teamId !== undefined ? { teamId: dto.teamId } : {}),
        ...(dto.userId !== undefined ? { userId: dto.userId } : {}),
        ...(dto.secondaryUserId !== undefined
          ? { secondaryUserId: dto.secondaryUserId }
          : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
      },
      include: { user: true, secondaryUser: true },
    });

    if (current.type === 'GOAL' || event.type === 'GOAL') {
      await matchesService.recomputeScore(event.matchId);
    }

    return toPublicEvent(event);
  },

  async remove(eventId: string): Promise<void> {
    const current = await prisma.matchEvent.findUnique({ where: { id: eventId } });
    if (!current) {
      throw ApiError.notFound('Event not found', 'EVENT_NOT_FOUND');
    }
    await prisma.matchEvent.delete({ where: { id: eventId } });
    if (current.type === 'GOAL') {
      await matchesService.recomputeScore(current.matchId);
    }
  },
};
