import { PlanVersion, PlanVersionSummary } from '../entities/plan-version.entity.js';

export interface IPlanVersionRepository {
  getByPlan(planId: string, userId: string): PlanVersionSummary[];
  findById(id: string, planId: string, userId: string): PlanVersion | undefined;
  create(version: PlanVersion): void;
}
