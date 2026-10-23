import { TaskRepository } from '../../infrastructure/repositories/task.repository.js';
import { TaskStatus } from '../../domain/entities/task.entity.js';
import { todayLocal } from '../../lib/recurrence.js';

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export interface TaskKpis {
  total: number;
  byStatus: Record<TaskStatus, number>;
  overdueCount: number;
  // null si no se tocó ninguna tarea en los últimos 30 días.
  completionRate30d: number | null;
}

export class TaskKpiService {
  constructor(private readonly taskRepo: TaskRepository) {}

  getKpis(userId: string): TaskKpis {
    const tasks = this.taskRepo.getAll(userId);
    const today = todayLocal();

    const byStatus: Record<TaskStatus, number> = { todo: 0, in_progress: 0, blocked: 0, done: 0 };
    let overdueCount = 0;
    for (const t of tasks) {
      byStatus[t.status]++;
      if (t.due_date && t.due_date < today && t.status !== 'done') overdueCount++;
    }

    const sinceIso = new Date(Date.now() - THIRTY_DAYS_MS).toISOString();
    const recent = tasks.filter(t => t.updated_at >= sinceIso);
    const doneRecent = recent.filter(t => t.status === 'done').length;
    const completionRate30d = recent.length > 0 ? Math.round((doneRecent / recent.length) * 1000) / 10 : null;

    return { total: tasks.length, byStatus, overdueCount, completionRate30d };
  }
}
