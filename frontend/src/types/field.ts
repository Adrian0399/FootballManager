/**
 * Public Field shape — mirrors the backend's `PublicField` in
 * `backend/src/modules/fields/fields.service.ts`.
 *
 * The backend always includes the 4 audit columns (`createdAt`,
 * `createdById`, `updatedAt`, `updatedById`) per `docs/api.md` §11.
 */
export interface Field {
  id: string;
  name: string;
  address: string | null;
  description: string | null;
  capacity: number | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdById: string | null;
  updatedById: string | null;
}

/** Body for POST /api/v1/fields. Mirrors `fieldCreateSchema`. */
export type FieldCreateInput = {
  name: string;
  address?: string | null;
  description?: string | null;
  capacity?: number | null;
};

/** Body for PATCH /api/v1/fields/:id. All keys optional. */
export type FieldUpdateInput = Partial<FieldCreateInput>;
