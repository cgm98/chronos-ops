import { Plan, PlanStatus } from '../../domain/entities/plan.entity.js';
import { PlanVersion, PlanVersionSummary, PLAN_SNAPSHOT_WINDOW_MS } from '../../domain/entities/plan-version.entity.js';
import { IPlanRepository } from '../../domain/interfaces/plan.repository.interface.js';
import { IPlanVersionRepository } from '../../domain/interfaces/plan-version.repository.interface.js';
import { IDomainRepository } from '../../domain/interfaces/domain.repository.interface.js';
import { NotFoundError } from '../../domain/errors.js';
import { eventBus } from '../../domain/events.js';
import { generateId } from '../utils.js';

export class PlanService {
  constructor(
    private readonly planRepository: IPlanRepository,
    private readonly planVersionRepository: IPlanVersionRepository,
    private readonly domainRepository: IDomainRepository
  ) {}

  getByDomain(domainId: string, userId: string): Plan[] {
    return this.planRepository.getByDomain(domainId, userId);
  }

  getById(id: string, userId: string): Plan | undefined {
    return this.planRepository.findById(id, userId);
  }

  create(data: { domain_id: string; title: string; content?: string; status?: PlanStatus }, userId: string): Plan {
    if (!this.domainRepository.findById(data.domain_id, userId)) {
      throw new NotFoundError('Dominio no encontrado');
    }
    const now = new Date().toISOString();
    const plan: Plan = {
      id: generateId('plan'),
      domain_id: data.domain_id,
      title: data.title,
      status: data.status || 'draft',
      content: data.content || '',
      created_at: now,
      updated_at: now
    };

    this.planRepository.create(plan);

    eventBus.emit('plan.created', {
      id: plan.id,
      timestamp: now,
      data: { ...plan, name: plan.title, entityType: 'plan' }
    });

    return plan;
  }

  update(id: string, data: Partial<Pick<Plan, 'title' | 'content' | 'status'>>, userId: string): Plan {
    const existing = this.planRepository.findById(id, userId);
    if (!existing) {
      throw new NotFoundError('Plan no encontrado');
    }

    const now = new Date().toISOString();
    const updated: Plan = {
      ...existing,
      title: data.title !== undefined ? data.title : existing.title,
      content: data.content !== undefined ? data.content : existing.content,
      status: data.status !== undefined ? data.status : existing.status,
      updated_at: now
    };

    // Snapshot del estado PREVIO, mismo criterio que ConceptService.update(): ventana de 5
    // min = una versión por sesión de edición.
    if (updated.content !== existing.content) {
      const last = this.planVersionRepository.latestCreatedAt(id);
      if (!last || Date.now() - Date.parse(last) >= PLAN_SNAPSHOT_WINDOW_MS) {
        this.planVersionRepository.create({
          id: generateId('planv'),
          plan_id: id,
          title: existing.title,
          content: existing.content,
          created_at: now
        });
      }
    }

    this.planRepository.update(updated);

    eventBus.emit('plan.updated', {
      id,
      timestamp: now,
      data: { ...updated, name: updated.title, entityType: 'plan' }
    });

    return updated;
  }

  delete(id: string, userId: string): void {
    const existing = this.planRepository.findById(id, userId);
    if (!existing) {
      throw new NotFoundError('Plan no encontrado');
    }
    this.planRepository.delete(id);
  }

  getVersions(planId: string, userId: string): PlanVersionSummary[] {
    if (!this.planRepository.findById(planId, userId)) {
      throw new NotFoundError('Plan no encontrado');
    }
    return this.planVersionRepository.getForPlan(planId);
  }

  getVersion(planId: string, versionId: string, userId: string): PlanVersion {
    if (!this.planRepository.findById(planId, userId)) {
      throw new NotFoundError('Plan no encontrado');
    }
    const version = this.planVersionRepository.findById(versionId);
    if (!version || version.plan_id !== planId) {
      throw new NotFoundError('Versión no encontrada');
    }
    return version;
  }

  restoreVersion(planId: string, versionId: string, userId: string): Plan {
    const existing = this.planRepository.findById(planId, userId);
    if (!existing) {
      throw new NotFoundError('Plan no encontrado');
    }
    const version = this.planVersionRepository.findById(versionId);
    if (!version || version.plan_id !== planId) {
      throw new NotFoundError('Versión no encontrada');
    }

    const now = new Date().toISOString();

    // Snapshot forzado del estado actual (ignora la ventana): restaurar nunca pierde nada.
    this.planVersionRepository.create({
      id: generateId('planv'),
      plan_id: planId,
      title: existing.title,
      content: existing.content,
      created_at: now
    });

    const restored: Plan = { ...existing, title: version.title, content: version.content, updated_at: now };
    this.planRepository.update(restored);

    eventBus.emit('plan.updated', {
      id: planId,
      timestamp: now,
      data: { ...restored, name: restored.title, entityType: 'plan' }
    });

    return restored;
  }
}
