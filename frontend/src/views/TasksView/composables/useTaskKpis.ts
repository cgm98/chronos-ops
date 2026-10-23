import { ref } from 'vue';
import { TaskKpiService } from '../../../services/task-kpi.service';
import type { TaskKpis } from '../../../types/task-kpi.types';

// KPIs para el header de TasksView — ver GET /tasks/kpis.
export function useTaskKpis() {
  const kpis = ref<TaskKpis | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);

  const fetchKpis = async () => {
    loading.value = true;
    error.value = null;
    try {
      kpis.value = await TaskKpiService.get();
    } catch (e: any) {
      error.value = e.message || 'No se pudieron cargar los KPIs';
    } finally {
      loading.value = false;
    }
  };

  return { kpis, loading, error, fetchKpis };
}
