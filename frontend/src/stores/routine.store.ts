import { defineStore } from 'pinia';
import { ref } from 'vue';
import { RoutineService } from '../services/routine.service';
import type { RoutineWithStatus, Routine } from '../types/routine.types';

export const useRoutineStore = defineStore('routine', () => {
  const routines = ref<RoutineWithStatus[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  async function fetchRoutines() {
    loading.value = true;
    error.value = null;
    try {
      routines.value = await RoutineService.getAll();
    } catch (e: any) {
      error.value = e.message || 'Error al cargar rutinas';
    } finally {
      loading.value = false;
    }
  }

  async function createRoutine(data: Partial<Routine>) {
    loading.value = true;
    try {
      await RoutineService.create(data);
      await fetchRoutines();
    } finally {
      loading.value = false;
    }
  }

  async function updateRoutine(id: string, data: Partial<Routine>) {
    loading.value = true;
    try {
      await RoutineService.update(id, data);
      await fetchRoutines();
    } finally {
      loading.value = false;
    }
  }

  async function deleteRoutine(id: string) {
    loading.value = true;
    try {
      await RoutineService.delete(id);
      routines.value = routines.value.filter(r => r.id !== id);
    } finally {
      loading.value = false;
    }
  }

  async function toggleToday(id: string) {
    try {
      const res = await RoutineService.toggleToday(id);
      const r = routines.value.find(item => item.id === id);
      if (r) {
        r.doneToday = res.doneToday;
        if (res.doneToday) r.currentStreak += 1;
        else r.currentStreak = Math.max(0, r.currentStreak - 1);
      }
      return res;
    } catch (e) {
      await fetchRoutines();
      throw e;
    }
  }

  return { routines, loading, error, fetchRoutines, createRoutine, updateRoutine, deleteRoutine, toggleToday };
});
