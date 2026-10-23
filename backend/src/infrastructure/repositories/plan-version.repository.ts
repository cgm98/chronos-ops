import { sqlite } from '../database/connection.js';
import { PlanVersion, PlanVersionSummary } from '../../domain/entities/plan-version.entity.js';
import { IPlanVersionRepository } from '../../domain/interfaces/plan-version.repository.interface.js';

export class PlanVersionRepository implements IPlanVersionRepository {
  getByPlan(planId: string, userId: string): PlanVersionSummary[] {
    const stmt = sqlite.prepare(`
      SELECT v.id, v.plan_id, v.title, v.created_at
      FROM plan_versions v
      JOIN plans p ON p.id = v.plan_id
      WHERE v.plan_id = ? AND p.user_id = ?
      ORDER BY v.created_at DESC
    `);
    return stmt.all(planId, userId) as PlanVersionSummary[];
  }

  findById(id: string, planId: string, userId: string): PlanVersion | undefined {
    const stmt = sqlite.prepare(`
      SELECT v.*
      FROM plan_versions v
      JOIN plans p ON p.id = v.plan_id
      WHERE v.id = ? AND v.plan_id = ? AND p.user_id = ?
    `);
    return (stmt.get(id, planId, userId) as PlanVersion) || undefined;
  }

  create(version: PlanVersion): void {
    const stmt = sqlite.prepare(`
      INSERT INTO plan_versions (id, plan_id, title, content, created_at)
      VALUES (?, ?, ?, ?, ?)
    `);
    stmt.run(version.id, version.plan_id, version.title, version.content, version.created_at);
  }
}
