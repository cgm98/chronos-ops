import { request } from './api.client';
import type { Task } from '../types/task.types';

export const TaskService = {
  getAll: () => request<Task[]>('/api/tasks'),
  getById: (id: string) => request<Task>(`/api/tasks/${id}`),
  create: (data: Partial<Task>) => request<Task>('/api/tasks', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<Task>) => request<Task>(`/api/tasks/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => request<{ ok: boolean }>(`/api/tasks/${id}`, { method: 'DELETE' })
};
