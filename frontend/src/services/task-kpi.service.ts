import { request } from './api.client';
import type { TaskKpis } from '../types/task-kpi.types';

export const TaskKpiService = {
  get: () => request<TaskKpis>('/api/kpis')
};
