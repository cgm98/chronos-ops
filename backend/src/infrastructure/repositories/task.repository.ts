import { sqlite } from '../database/connection.js';
import { Task } from '../../domain/entities/task.entity.js';

export class TaskRepository {
  getAll(userId: string): Task[] {
    const stmt = sqlite.prepare('SELECT * FROM tasks WHERE user_id = ? ORDER BY created_at DESC');
    return stmt.all(userId) as Task[];
  }

  findById(id: string, userId: string): Task | undefined {
    const stmt = sqlite.prepare('SELECT * FROM tasks WHERE id = ? AND user_id = ?');
    return (stmt.get(id, userId) as Task) || undefined;
  }

  create(task: Task): void {
    const stmt = sqlite.prepare(`
      INSERT INTO tasks (id, user_id, title, description, status, priority, assignee_id, project_id, due_date, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      task.id,
      task.user_id,
      task.title,
      task.description,
      task.status,
      task.priority,
      task.assignee_id,
      task.project_id,
      task.due_date,
      task.created_at,
      task.updated_at
    );
  }

  update(task: Task): void {
    const stmt = sqlite.prepare(`
      UPDATE tasks
      SET title = ?, description = ?, status = ?, priority = ?, assignee_id = ?, project_id = ?, due_date = ?, updated_at = ?
      WHERE id = ? AND user_id = ?
    `);
    stmt.run(
      task.title,
      task.description,
      task.status,
      task.priority,
      task.assignee_id,
      task.project_id,
      task.due_date,
      task.updated_at,
      task.id,
      task.user_id
    );
  }

  delete(id: string, userId: string): void {
    const stmt = sqlite.prepare('DELETE FROM tasks WHERE id = ? AND user_id = ?');
    stmt.run(id, userId);
  }
}
