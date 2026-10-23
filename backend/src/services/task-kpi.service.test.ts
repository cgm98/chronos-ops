import { test, describe, before } from 'node:test';
import assert from 'node:assert';

process.env.DB_PATH = ':memory:';

describe('TaskKpiService.getKpis (Fase 3: header de TasksView)', () => {
  let TaskKpiService: any;
  let TaskService: any, TaskRepository: any;
  let todayLocal: any;
  let sqlite: any;
  let userId: string;

  before(async () => {
    const connection = await import('../../infrastructure/database/connection.js');
    sqlite = connection.sqlite;
    connection.initDb();

    ({ TaskKpiService } = await import('./task-kpi.service.js'));
    ({ TaskService } = await import('./task.service.js'));
    ({ TaskRepository } = await import('../../infrastructure/repositories/task.repository.js'));
    ({ todayLocal } = await import('../../lib/recurrence.js'));

    userId = 'u-test';
    sqlite.prepare(`INSERT INTO users (id, email, created_at, updated_at) VALUES (?, ?, datetime('now'), datetime('now'))`).run(userId, 'test@example.com');
  });

  test('agrega total, por status, vencidas y tasa de cumplimiento de 30 días', () => {
    const taskService = new TaskService(new TaskRepository());
    // Fecha local, nunca .toISOString().slice(0,10) (corre el día por
    // timezone) — mismo cuidado que todayLocal()/TaskKpiService usan.
    const today = todayLocal();
    const yesterday = todayLocal(new Date(Date.now() - 24 * 60 * 60 * 1000));

    taskService.create({ title: 'Vencida', due_date: yesterday, status: 'todo' }, userId);
    taskService.create({ title: 'Hecha a tiempo', due_date: yesterday, status: 'done' }, userId);
    taskService.create({ title: 'En curso, no vence hoy', due_date: today, status: 'in_progress' }, userId);
    taskService.create({ title: 'Bloqueada', status: 'blocked' }, userId);

    const kpiService = new TaskKpiService(new TaskRepository());
    const kpis = kpiService.getKpis(userId);

    assert.strictEqual(kpis.total, 4);
    assert.deepStrictEqual(kpis.byStatus, { todo: 1, in_progress: 1, blocked: 1, done: 1 });
    // Solo "Vencida" cuenta: due_date < hoy y status != done
    assert.strictEqual(kpis.overdueCount, 1);
    // Las 4 se actualizaron recién (created_at = updated_at = ahora) → entran en la ventana de 30 días
    assert.strictEqual(kpis.completionRate30d, 25); // 1 de 4 = 25%
  });
});
