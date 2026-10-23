<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import '../../assets/styles/group-dashboard.css';
import { useProjectStore } from '../../stores/project.store';
import { useCodeReviewStore } from '../../stores/code-review.store';
import { usePersonStore } from '../../stores/person.store';
import { ProjectService } from '../../services/project.service';
import type { Experiment, Decision } from '../../types/project.types';

const projectStore = useProjectStore();
const codeReviewStore = useCodeReviewStore();
const personStore = usePersonStore();

const loadingActivity = ref(true);
const loading = computed(() => projectStore.loading || codeReviewStore.loading);

type ExperimentWithProject = Experiment & { projectName: string };
type DecisionWithProject = Decision & { projectName: string };

const recentExperiments = ref<ExperimentWithProject[]>([]);
const recentDecisions = ref<DecisionWithProject[]>([]);

onMounted(async () => {
  await Promise.all([
    projectStore.fetchProjects(),
    codeReviewStore.fetchCodeReviews(),
    personStore.fetchPeople()
  ]);

  // Los conteos ya vienen gratis en GET /projects (SQL agregado); solo
  // pedimos el contenido completo de experimentos/decisiones a los
  // proyectos recientes que realmente tienen algo, evitando N+1 inútiles.
  const candidates = recentProjects.value.filter(p => (p.experimentCount || 0) > 0 || (p.decisionCount || 0) > 0);
  try {
    const results = await Promise.all(candidates.map(async p => {
      const [experiments, decisions] = await Promise.all([
        (p.experimentCount || 0) > 0 ? ProjectService.getExperiments(p.id) : Promise.resolve([]),
        (p.decisionCount || 0) > 0 ? ProjectService.getDecisions(p.id) : Promise.resolve([])
      ]);
      return { project: p, experiments, decisions };
    }));

    recentExperiments.value = results
      .flatMap(r => r.experiments.map(e => ({ ...e, projectName: r.project.name })))
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
      .slice(0, 5);

    recentDecisions.value = results
      .flatMap(r => r.decisions.map(d => ({ ...d, projectName: r.project.name })))
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5);
  } finally {
    loadingActivity.value = false;
  }
});

const pendingReviews = computed(() => codeReviewStore.codeReviews.filter(r => r.status === 'pending'));
const changesRequested = computed(() => codeReviewStore.codeReviews.filter(r => r.status === 'changes_requested'));
const approvedReviews = computed(() => codeReviewStore.codeReviews.filter(r => r.status === 'approved'));

const recentProjects = computed(() =>
  [...projectStore.projects]
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .slice(0, 6)
);

const pendingReviewsPreview = computed(() =>
  [...pendingReviews.value]
    .sort((a, b) => new Date(a.due_date || a.created_at).getTime() - new Date(b.due_date || b.created_at).getTime())
    .slice(0, 6)
);

// Quién tiene más reviews atascadas (pendiente + cambios pedidos): mismo
// listado que ya trae codeReviewStore, agrupado por dev_id en el cliente.
const devLeaderboard = computed(() => {
  const counts = new Map<string | null, number>();
  for (const r of codeReviewStore.codeReviews) {
    if (r.status === 'approved') continue;
    counts.set(r.dev_id, (counts.get(r.dev_id) || 0) + 1);
  }
  return [...counts.entries()]
    .map(([devId, count]) => ({
      devId,
      name: devId ? personStore.people.find(p => p.id === devId)?.name || '?' : 'Sin asignar',
      count
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);
});

const statusLabel = (status: string) => {
  const map: Record<string, string> = {
    pending: 'Pendiente', changes_requested: 'Cambios pedidos', approved: 'Aprobado',
    active: 'Activo', paused: 'Pausado', done: 'Completado', archived: 'Archivado'
  };
  return map[status] || status;
};

const formatDate = (iso: string | null) => {
  if (!iso) return 'Sin fecha';
  return new Date(iso).toLocaleDateString('es-PE', { day: 'numeric', month: 'short' });
};

const experimentStatusLabel = (status: string) => {
  const map: Record<string, string> = {
    planned: 'Planeado', running: 'En curso', concluded: 'Concluido'
  };
  return map[status] || status;
};
</script>

<template>
  <div class="gdash-wrapper animate-fade-in">
    <div class="gdash-container">
      <header class="gdash-header">
        <div class="gdash-header-icon">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
          </svg>
        </div>
        <div>
          <h1>Code Topology & Radar</h1>
          <p class="subtitle">Visión general de repositorios indexados, calidad de arquitectura y auditoría de blast radius.</p>
        </div>
      </header>

      <template v-if="loading">
        <div class="gdash-skeleton">
          <div class="gdash-sk-card"></div>
          <div class="gdash-sk-card"></div>
          <div class="gdash-sk-card"></div>
          <div class="gdash-sk-card"></div>
        </div>
      </template>

      <template v-else>
        <div class="gdash-kpis">
          <div class="gdash-kpi-card">
            <span class="label">Proyectos</span>
            <span class="value">{{ projectStore.projects.length }}</span>
            <span class="desc">Total registrados</span>
          </div>
          <div class="gdash-kpi-card">
            <span class="label">Reviews pendientes</span>
            <span class="value" :class="pendingReviews.length > 0 ? 'warning' : ''">{{ pendingReviews.length }}</span>
            <span class="desc">Por revisar</span>
          </div>
          <div class="gdash-kpi-card">
            <span class="label">Cambios solicitados</span>
            <span class="value" :class="changesRequested.length > 0 ? 'error' : ''">{{ changesRequested.length }}</span>
            <span class="desc">Esperando ajustes</span>
          </div>
          <div class="gdash-kpi-card">
            <span class="label">Aprobados</span>
            <span class="value success">{{ approvedReviews.length }}</span>
            <span class="desc">Code reviews cerrados</span>
          </div>
        </div>

        <div class="gdash-grid">
          <div class="gdash-main-col">
            <div class="gdash-section">
              <div class="gdash-section-header">
                <div>
                  <h3>Proyectos recientes</h3>
                  <p class="card-subtitle">Últimos proyectos actualizados</p>
                </div>
              </div>
              <div class="gdash-section-body">
                <div v-if="recentProjects.length === 0" class="gdash-empty">
                  Todavía no tienes proyectos registrados.
                </div>
                <div v-else class="gdash-list">
                  <RouterLink v-for="p in recentProjects" :key="p.id" to="/projects" class="gdash-list-item" style="text-decoration:none;">
                    <div class="gdash-list-item-main">
                      <span class="gdash-list-item-title">{{ p.name }}</span>
                      <span class="gdash-list-item-meta">{{ p.conceptCount || 0 }} conceptos vinculados</span>
                    </div>
                    <span class="gdash-badge">{{ statusLabel(p.status) }}</span>
                  </RouterLink>
                </div>
              </div>
            </div>

            <div class="gdash-section">
              <div class="gdash-section-header">
                <div>
                  <h3>Code reviews pendientes</h3>
                  <p class="card-subtitle">Ordenados por fecha límite</p>
                </div>
                <span class="gdash-badge" :class="{ warning: pendingReviews.length > 0 }">{{ pendingReviews.length }}</span>
              </div>
              <div class="gdash-section-body">
                <div v-if="pendingReviewsPreview.length === 0" class="gdash-empty">
                  No hay code reviews pendientes.
                </div>
                <div v-else class="gdash-list">
                  <RouterLink v-for="r in pendingReviewsPreview" :key="r.id" to="/code-reviews" class="gdash-list-item" style="text-decoration:none;">
                    <div class="gdash-list-item-main">
                      <span class="gdash-list-item-title">{{ r.title }}</span>
                      <span class="gdash-list-item-meta">Vence {{ formatDate(r.due_date) }}</span>
                    </div>
                    <span class="gdash-badge warning">Pendiente</span>
                  </RouterLink>
                </div>
              </div>
            </div>

            <div class="gdash-section">
              <div class="gdash-section-header">
                <div>
                  <h3>Reviews por dev</h3>
                  <p class="card-subtitle">Pendientes + cambios pedidos, sin aprobadas</p>
                </div>
              </div>
              <div class="gdash-section-body">
                <div v-if="devLeaderboard.length === 0" class="gdash-empty">
                  No hay reviews sin aprobar.
                </div>
                <div v-else class="gdash-list">
                  <RouterLink v-for="d in devLeaderboard" :key="d.devId ?? 'sin-dev'" to="/code-reviews" class="gdash-list-item" style="text-decoration:none;">
                    <div class="gdash-list-item-main">
                      <span class="gdash-list-item-title">{{ d.name }}</span>
                      <span class="gdash-list-item-meta">{{ d.count === 1 ? '1 review atascada' : `${d.count} reviews atascadas` }}</span>
                    </div>
                    <span class="gdash-badge" :class="{ warning: d.count > 0 }">{{ d.count }}</span>
                  </RouterLink>
                </div>
              </div>
            </div>

            <div class="gdash-section">
              <div class="gdash-section-header">
                <div>
                  <h3>Experimentos activos</h3>
                  <p class="card-subtitle">Hipótesis en curso, de tus proyectos recientes</p>
                </div>
              </div>
              <div class="gdash-section-body">
                <div v-if="!loadingActivity && recentExperiments.length === 0" class="gdash-empty">
                  No hay experimentos registrados en tus proyectos recientes.
                </div>
                <div v-else class="gdash-list">
                  <RouterLink v-for="e in recentExperiments" :key="e.id" to="/projects" class="gdash-list-item" style="text-decoration:none;">
                    <div class="gdash-list-item-main">
                      <span class="gdash-list-item-title">{{ e.name }}</span>
                      <span class="gdash-list-item-meta">{{ e.projectName }} · {{ e.hypothesis }}</span>
                    </div>
                    <span class="gdash-badge" :class="{ warning: e.status === 'running' }">{{ experimentStatusLabel(e.status) }}</span>
                  </RouterLink>
                </div>
              </div>
            </div>

            <div class="gdash-section">
              <div class="gdash-section-header">
                <div>
                  <h3>Últimas decisiones</h3>
                  <p class="card-subtitle">Decisión y por qué se tomó</p>
                </div>
              </div>
              <div class="gdash-section-body">
                <div v-if="!loadingActivity && recentDecisions.length === 0" class="gdash-empty">
                  No hay decisiones registradas en tus proyectos recientes.
                </div>
                <div v-else class="gdash-list">
                  <RouterLink v-for="d in recentDecisions" :key="d.id" to="/projects" class="gdash-list-item" style="text-decoration:none;">
                    <div class="gdash-list-item-main">
                      <span class="gdash-list-item-title">{{ d.decision }}</span>
                      <span class="gdash-list-item-meta">{{ d.projectName }}{{ d.rationale ? ' · ' + d.rationale : '' }}</span>
                    </div>
                  </RouterLink>
                </div>
              </div>
            </div>
          </div>

          <div class="gdash-side-col">
            <div class="gdash-section">
              <div class="gdash-section-header">
                <h3>Acciones rápidas</h3>
              </div>
              <div class="gdash-section-body">
                <div class="gdash-actions-stack">
                  <RouterLink to="/projects" class="gdash-action-row">
                    <div class="gdash-action-icon">
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>
                    </div>
                    <div class="gdash-action-details">
                      <span class="title">Proyectos</span>
                      <span class="desc">Laboratorio de proyectos</span>
                    </div>
                  </RouterLink>
                  <RouterLink to="/coding" class="gdash-action-row">
                    <div class="gdash-action-icon">
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>
                    </div>
                    <div class="gdash-action-details">
                      <span class="title">Código</span>
                      <span class="desc">Ejercicios de programación</span>
                    </div>
                  </RouterLink>
                  <RouterLink to="/code-reviews" class="gdash-action-row">
                    <div class="gdash-action-icon">
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="18" r="3"></circle><circle cx="6" cy="6" r="3"></circle><path d="M13 6h3a2 2 0 0 1 2 2v7"></path><line x1="6" y1="9" x2="6" y2="21"></line></svg>
                    </div>
                    <div class="gdash-action-details">
                      <span class="title">Reviews</span>
                      <span class="desc">Seguimiento de code reviews</span>
                    </div>
                  </RouterLink>
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>
