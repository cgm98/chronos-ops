import { Plan } from '../entities/plan.entity.js';

export interface IPlanRepository {
  getByDomain(domainId: string, userId: string): Plan[];
  findById(id: string, userId: string): Plan | undefined;
  create(plan: Plan): void;
  update(plan: Plan): void;
  delete(id: string, userId: string): void;
}
