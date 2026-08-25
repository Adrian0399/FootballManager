import { prisma } from '../../shared/prisma/prisma.client.js';
import { ApiError } from '../../shared/errors/api-error.js';
import { calculateAge as _calculateAge } from '../../shared/utils/age.util.js';
import type { FieldCreateDto, FieldUpdateDto } from './fields.validation.js';
import type { Field } from '@prisma/client';

export type PublicField = Omit<Field, 'createdById' | 'updatedById' | 'deletedAt'> & {
  createdById: string | null;
  updatedById: string | null;
  deletedAt: Date | null;
};

function toPublicField(field: Field): PublicField {
  return { ...field };
}

export const fieldsService = {
  async findAll(includeInactive = false): Promise<PublicField[]> {
    const fields = await prisma.field.findMany({
      where: includeInactive ? {} : { deletedAt: null },
      orderBy: { name: 'asc' },
    });
    return fields.map(toPublicField);
  },

  async findById(id: string): Promise<PublicField> {
    const field = await prisma.field.findUnique({ where: { id } });
    if (!field || field.deletedAt) {
      throw ApiError.notFound('Field not found', 'FIELD_NOT_FOUND');
    }
    return toPublicField(field);
  },

  async create(dto: FieldCreateDto, creatorId: string): Promise<PublicField> {
    const existing = await prisma.field.findFirst({
      where: { name: dto.name, deletedAt: null },
    });
    if (existing) {
      throw ApiError.conflict('A field with that name already exists', 'FIELD_NAME_TAKEN');
    }
    const field = await prisma.field.create({
      data: {
        name: dto.name,
        address: dto.address ?? null,
        description: dto.description ?? null,
        capacity: dto.capacity ?? null,
        createdById: creatorId,
        updatedById: creatorId,
      },
    });
    return toPublicField(field);
  },

  async update(id: string, dto: FieldUpdateDto, updaterId: string): Promise<PublicField> {
    const current = await prisma.field.findUnique({ where: { id } });
    if (!current || current.deletedAt) {
      throw ApiError.notFound('Field not found', 'FIELD_NOT_FOUND');
    }
    if (dto.name && dto.name !== current.name) {
      const conflict = await prisma.field.findFirst({
        where: { name: dto.name, deletedAt: null, NOT: { id } },
      });
      if (conflict) {
        throw ApiError.conflict('A field with that name already exists', 'FIELD_NAME_TAKEN');
      }
    }
    const field = await prisma.field.update({
      where: { id },
      data: {
        ...dto,
        updatedById: updaterId,
      },
    });
    return toPublicField(field);
  },

  async softDelete(id: string, updaterId: string): Promise<void> {
    const current = await prisma.field.findUnique({ where: { id } });
    if (!current || current.deletedAt) {
      throw ApiError.notFound('Field not found', 'FIELD_NOT_FOUND');
    }
    await prisma.field.update({
      where: { id },
      data: { deletedAt: new Date(), updatedById: updaterId },
    });
  },
};

// keep tree-shake from removing the import
void _calculateAge;
