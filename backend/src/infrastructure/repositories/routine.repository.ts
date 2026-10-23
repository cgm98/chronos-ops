import { sqlite } from '../database/connection.js';
import { Routine } from '../../domain/entities/routine.entity.js';

export class RoutineRepository {
  getAll(userId: string): Routine[] {
    const stmt = sqlite.prepare('SELECT * FROM routines WHERE user_id = ? ORDER BY created_at ASC');
    return stmt.all(userId) as Routine[];
  }

  findById(id: string, userId: string): Routine | undefined {
    const stmt = sqlite.prepare('SELECT * FROM routines WHERE id = ? AND user_id = ?');
    return (stmt.get(id, userId) as Routine) || undefined;
  }

  create(routine: Routine): void {
    const stmt = sqlite.prepare(`
      INSERT INTO routines (id, user_id, title, description, frequency, weekly_days, active, time_of_day, duration_mins, anchor_cue, depends_on_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      routine.id,
      routine.user_id,
      routine.title,
      routine.description,
      routine.frequency,
      routine.weekly_days,
      routine.active,
      routine.time_of_day,
      routine.duration_mins,
      routine.anchor_cue,
      routine.depends_on_id,
      routine.created_at,
      routine.updated_at
    );
  }

  update(routine: Routine): void {
    const stmt = sqlite.prepare(`
      UPDATE routines
      SET title = ?, description = ?, frequency = ?, weekly_days = ?, active = ?, time_of_day = ?, duration_mins = ?, anchor_cue = ?, depends_on_id = ?, updated_at = ?
      WHERE id = ? AND user_id = ?
    `);
    stmt.run(
      routine.title,
      routine.description,
      routine.frequency,
      routine.weekly_days,
      routine.active,
      routine.time_of_day,
      routine.duration_mins,
      routine.anchor_cue,
      routine.depends_on_id,
      routine.updated_at,
      routine.id,
      routine.user_id
    );
  }

  delete(id: string, userId: string): void {
    const stmt = sqlite.prepare('DELETE FROM routines WHERE id = ? AND user_id = ?');
    stmt.run(id, userId);
  }
}
