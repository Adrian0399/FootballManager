import { prisma } from '../../shared/prisma/prisma.client.js';
import { ApiError } from '../../shared/errors/api-error.js';
import { toPublicUserWithAge, type PublicUser } from '../../shared/utils/user.util.js';
import { hashPassword } from '../../shared/utils/password.util.js';
import type {
  UpdateUserDto,
  ListUsersQueryDto,
  UserCreateDto,
  AdminUpdateUserDto,
} from './users.validation.js';
import type { Prisma } from '@prisma/client';

export type { PublicUser };

export interface PaginatedUsers {
  items: PublicUser[];
  total: number;
  page: number;
  size: number;
}

export const usersService = {
  async findAll(query: ListUsersQueryDto): Promise<PaginatedUsers> {
    const page = query.page ?? 1;
    const size = query.size ?? 25;

    const where: Prisma.UserWhereInput = { deletedAt: null };
    if (query.role) where.role = query.role;
    if (query.q) {
      where.OR = [
        { firstName: { contains: query.q, mode: 'insensitive' } },
        { paternalSurname: { contains: query.q, mode: 'insensitive' } },
        { maternalSurname: { contains: query.q, mode: 'insensitive' } },
        { email: { contains: query.q, mode: 'insensitive' } },
        { nickname: { contains: query.q, mode: 'insensitive' } },
      ];
    }

    const [total, users] = await prisma.$transaction([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        orderBy: [{ paternalSurname: 'asc' }, { firstName: 'asc' }],
        skip: (page - 1) * size,
        take: size,
      }),
    ]);

    return { items: users.map(toPublicUserWithAge), total, page, size };
  },

  async findById(id: string): Promise<PublicUser> {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user || user.deletedAt) {
      throw ApiError.notFound('User not found', 'USER_NOT_FOUND');
    }
    return toPublicUserWithAge(user);
  },

  async update(
    id: string,
    dto: UpdateUserDto,
    updaterId: string,
  ): Promise<PublicUser> {
    const updates: UpdateUserDto & { age?: number; updatedById: string } = {
      ...dto,
      updatedById: updaterId,
    };

    if (dto.birthDate) {
      const { calculateAge } = await import('../../shared/utils/age.util.js');
      updates.age = calculateAge(dto.birthDate);
    }

    const user = await prisma.user.update({
      where: { id },
      data: updates,
    });

    return toPublicUserWithAge(user);
  },

  async create(dto: UserCreateDto, actorId: string): Promise<PublicUser> {
    const [emailTaken, curpTaken] = await prisma.$transaction([
      prisma.user.count({ where: { email: dto.email } }),
      prisma.user.count({ where: { curp: dto.curp } }),
    ]);
    if (emailTaken > 0) {
      throw ApiError.conflict('Email is already registered', 'EMAIL_TAKEN');
    }
    if (curpTaken > 0) {
      throw ApiError.conflict('CURP is already registered', 'CURP_TAKEN');
    }
    const { calculateAge } = await import('../../shared/utils/age.util.js');
    const passwordHash = await hashPassword(dto.password);
    const user = await prisma.user.create({
      data: {
        firstName: dto.firstName,
        paternalSurname: dto.paternalSurname,
        maternalSurname: dto.maternalSurname,
        birthDate: dto.birthDate,
        age: calculateAge(dto.birthDate),
        role: dto.role,
        nickname: dto.nickname ?? null,
        phoneNumber: dto.phoneNumber,
        email: dto.email,
        curp: dto.curp,
        passwordHash,
        createdById: actorId,
        updatedById: actorId,
      },
    });
    return toPublicUserWithAge(user);
  },

  async adminUpdate(
    id: string,
    dto: AdminUpdateUserDto,
    updaterId: string,
  ): Promise<PublicUser> {
    const current = await prisma.user.findUnique({ where: { id } });
    if (!current || current.deletedAt) {
      throw ApiError.notFound('User not found', 'USER_NOT_FOUND');
    }
    if (dto.email && dto.email !== current.email) {
      const taken = await prisma.user.count({
        where: { email: dto.email, id: { not: id } },
      });
      if (taken > 0) throw ApiError.conflict('Email is already registered', 'EMAIL_TAKEN');
    }
    if (dto.curp && dto.curp !== current.curp) {
      const taken = await prisma.user.count({
        where: { curp: dto.curp, id: { not: id } },
      });
      if (taken > 0) throw ApiError.conflict('CURP is already registered', 'CURP_TAKEN');
    }
    const updates: AdminUpdateUserDto & { age?: number; updatedById: string } = {
      ...dto,
      updatedById: updaterId,
    };
    if (dto.birthDate) {
      const { calculateAge } = await import('../../shared/utils/age.util.js');
      updates.age = calculateAge(dto.birthDate);
    }
    const user = await prisma.user.update({ where: { id }, data: updates });
    return toPublicUserWithAge(user);
  },

  async softDelete(id: string, updaterId: string): Promise<void> {
    const current = await prisma.user.findUnique({ where: { id } });
    if (!current || current.deletedAt) {
      throw ApiError.notFound('User not found', 'USER_NOT_FOUND');
    }
    await prisma.user.update({
      where: { id },
      data: { deletedAt: new Date(), updatedById: updaterId },
    });
  },
};