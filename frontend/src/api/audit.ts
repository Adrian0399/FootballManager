import { apiClient } from './axios';
import type { SuccessEnvelope } from '../types/user';

export interface AuditEntry {
  id: string;
  userId: string | null;
  userName: string | null;
  method: string;
  path: string;
  action: string;
  actionLabel: string;
  statusCode: number;
  ip: string | null;
  createdAt: string;
}

export interface AuditSummary {
  totals: {
    mutaciones: number;
    ultimas24h: number;
    usuariosActivos: number;
    registros: number;
  };
  porAccion: Array<{ action: string; count: number }>;
  porDia: Array<{ date: string; count: number }>;
  usuariosMasActivos: Array<{ userId: string; name: string; count: number }>;
}

export const auditApi = {
  async list(params?: {
    action?: string;
    userId?: string;
    from?: string;
    to?: string;
    page?: number;
    size?: number;
  }): Promise<{ items: AuditEntry[]; total: number; page: number; size: number }> {
    const { data } = await apiClient.get<
      SuccessEnvelope<{ items: AuditEntry[]; total: number; page: number; size: number }>
    >('/audit', { params });
    return data.data;
  },

  async summary(from?: string, to?: string): Promise<AuditSummary> {
    const { data } = await apiClient.get<SuccessEnvelope<AuditSummary>>('/audit/summary', {
      params: { from, to },
    });
    return data.data;
  },
};
