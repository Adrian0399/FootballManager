import { apiClient } from './axios';
import type { SuccessEnvelope, ErrorEnvelope } from '../types/user';
import type { Field, FieldCreateInput, FieldUpdateInput } from '../types/field';

/**
 * API client for `/api/v1/fields`. See `docs/api.md` §5 and
 * `backend/src/modules/fields/fields.routes.ts` for the full contract.
 *
 * Authorization is enforced server-side:
 *   - GET (list / getById): any authenticated user.
 *   - POST / PATCH / DELETE: ADMIN only (returns 403 AUTH_FORBIDDEN otherwise).
 */
export const fieldsApi = {
  async list(includeInactive = false): Promise<Field[]> {
    const { data } = await apiClient.get<SuccessEnvelope<Field[]>>('/fields', {
      params: { includeInactive },
    });
    return data.data;
  },

  async getById(id: string): Promise<Field> {
    const { data } = await apiClient.get<SuccessEnvelope<Field>>(`/fields/${id}`);
    return data.data;
  },

  async create(input: FieldCreateInput): Promise<Field> {
    const { data } = await apiClient.post<SuccessEnvelope<Field>>('/fields', input);
    return data.data;
  },

  async update(id: string, input: FieldUpdateInput): Promise<Field> {
    const { data } = await apiClient.patch<SuccessEnvelope<Field>>(
      `/fields/${id}`,
      input,
    );
    return data.data;
  },

  async remove(id: string): Promise<{ deleted: boolean }> {
    const { data } = await apiClient.delete<
      SuccessEnvelope<{ deleted: boolean }>
    >(`/fields/${id}`);
    return data.data;
  },
};

/** Shape of an error response — useful for typed catch blocks. */
export type FieldApiError = ErrorEnvelope;
