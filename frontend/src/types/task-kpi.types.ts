import type { TaskStatus } from './task.types';

export interface TaskKpis {
  total: number;
  byStatus: Record<TaskStatus, number>;
  overdueCount: number;
  completionRate30d: number | null;
}
