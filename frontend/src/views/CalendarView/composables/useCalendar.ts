import { ref, computed } from 'vue';
import { CalendarService } from '../../../services/calendar.service';
import { currentPeriod } from '../../../lib/recurrence';
import type { CalendarEvent } from '../../../types/calendar.types';

// Trae los eventos del mes agregados desde Finanzas/Contactos/Tareas/
// Rutinas — ver GET /calendar.
export function useCalendar() {
  const currentMonth = ref(currentPeriod());
  const events = ref<CalendarEvent[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  const fetchMonth = async () => {
    // shiftMonth()/goToToday() mutan currentMonth y refetchean sin cancelar
    // el request anterior; si el usuario clickea las flechas rápido, una
    // respuesta vieja puede llegar después que una nueva y pisarla (mismo
    // fix que expense.store.ts). Se descarta cualquier respuesta que ya no
    // corresponda al mes actualmente seleccionado.
    const requestedMonth = currentMonth.value;
    loading.value = true;
    error.value = null;
    try {
      const data = await CalendarService.getMonth(requestedMonth);
      if (currentMonth.value !== requestedMonth) return;
      events.value = data;
    } catch (e: any) {
      if (currentMonth.value !== requestedMonth) return;
      error.value = e.message || 'No se pudo cargar el calendario';
    } finally {
      if (currentMonth.value === requestedMonth) loading.value = false;
    }
  };

  const shiftMonth = async (delta: number) => {
    const [y, m] = currentMonth.value.split('-').map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    currentMonth.value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    await fetchMonth();
  };

  const eventsByDate = computed(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const e of events.value) {
      if (!map.has(e.date)) map.set(e.date, []);
      map.get(e.date)!.push(e);
    }
    return map;
  });

  return { currentMonth, events, eventsByDate, loading, error, fetchMonth, shiftMonth };
}
