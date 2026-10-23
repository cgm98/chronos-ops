import { request } from './api.client';
import type { Routine, RoutineWithStatus } from '../types/routine.types';

export const RoutineService = {
  getAll: () => request<RoutineWithStatus[]>('/api/routines'),
  getDag: () => request<{ layers: Routine[][]; sortedOrder: Routine[] }>('/api/routines/dag'),
  create: (data: Partial<Routine>) => request<Routine>('/api/routines', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<Routine>) => request<Routine>(`/api/routines/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => request<{ ok: boolean }>(`/api/routines/${id}`, { method: 'DELETE' }),
  toggleToday: (id: string) => request<{ doneToday: boolean }>(`/api/routines/${id}/toggle`, { method: 'POST' })
};
