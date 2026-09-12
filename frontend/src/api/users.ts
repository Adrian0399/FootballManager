// Users API (Paso 10+ — admin user management).
//
// v1.0.0: this is a thin wrapper that reads/writes against the mock
// dataset via local state. When the real backend lands (v1.1), each
// method becomes an `apiClient.{get,post,patch,delete}` call. The
// shapes mirror the planned Prisma model.

import { apiClient } from './axios';
import type { SuccessEnvelope, User, UserRole } from '../types/user';

export interface UserCreateInput {
  firstName: string;
  paternalSurname: string;
  maternalSurname: string;
  birthDate: string;
  role: UserRole;
  nickname?: string | null;
  phoneNumber: string;
  email: string;
  curp: string;
  password: string;
}

export interface UserUpdateInput extends Partial<Omit<UserCreateInput, 'password'>> {
  isActive?: boolean;
}

export interface UserSearchParams {
  q?: string;
  role?: UserRole;
  page?: number;
  size?: number;
}

export interface PaginatedUsers {
  items: User[];
  total: number;
  page: number;
  size: number;
}

export const usersApi = {
  /** Admin search/list — GET /api/v1/users (ADMIN only). */
  async search(params: UserSearchParams = {}): Promise<PaginatedUsers> {
    const { data } = await apiClient.get<SuccessEnvelope<PaginatedUsers>>('/users', {
      params,
    });
    return data.data;
  },

  /** Admin list (GET /users). Returns the full first page. */
  async list(): Promise<User[]> {
    const { data } = await apiClient.get<SuccessEnvelope<PaginatedUsers>>('/users', {
      params: { size: 100 },
    });
    return data.data.items;
  },
  async getById(id: string): Promise<User | null> {
    const { data } = await apiClient.get<SuccessEnvelope<User>>(`/users/${id}`);
    return data.data;
  },
  /** Admin create — POST /users (ADMIN only). */
  async create(input: UserCreateInput): Promise<User> {
    const { data } = await apiClient.post<SuccessEnvelope<User>>('/users', input);
    return data.data;
  },
  /** Admin update — PATCH /users/:id (ADMIN only). */
  async update(id: string, input: UserUpdateInput): Promise<User> {
    const { data } = await apiClient.patch<SuccessEnvelope<User>>(
      `/users/${id}`,
      input,
    );
    return data.data;
  },
  /** Admin soft delete — DELETE /users/:id (ADMIN only). */
  async remove(id: string): Promise<{ deleted: boolean }> {
    await apiClient.delete(`/users/${id}`);
    return { deleted: true };
  },
};
