import { sqlite } from '../database/connection.js';
import { Plan } from '../../domain/entities/plan.entity.js';
import { IPlanRepository } from '../../domain/interfaces/plan.repository.interface.js';

export class PlanRepository implements IPlanRepository {
  getByDomain(domainId: string, userId: string): Plan[] {
    const stmt = sqlite.prepare('SELECT * FROM plans WHERE domain_id = ? AND user_id = ? ORDER BY created_at DESC');
    return stmt.all(domainId, userId) as Plan[];
  }

  findById(id: string, userId: string): Plan | undefined {
    const stmt = sqlite.prepare('SELECT * FROM plans WHERE id = ? AND user_id = ?');
    return (stmt.get(id, userId) as Plan) || undefined;
  }

  create(plan: Plan): void {
    const stmt = sqlite.prepare(`
      INSERT INTO plans (id, user_id, domain_id, title, status, content, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(plan.id, plan.user_id || 'default', plan.domain_id, plan.title, plan.status, plan.content, plan.created_at, plan.updated_at);
  }

  update(plan: Plan): void {
    const stmt = sqlite.prepare(`
      UPDATE plans
      SET title = ?, status = ?, content = ?, updated_at = ?
      WHERE id = ? AND user_id = ?
    `);
    stmt.run(plan.title, plan.status, plan.content, plan.updated_at, plan.id, plan.user_id || 'default');
  }

  delete(id: string, userId: string): void {
    const stmt = sqlite.prepare('DELETE FROM plans WHERE id = ? AND user_id = ?');
    stmt.run(id, userId);
  }
}
