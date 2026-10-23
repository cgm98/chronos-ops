import { defineStore } from 'pinia';
import { ref } from 'vue';
import { TaskService } from '../services/task.service';
import type { Task } from '../types/task.types';

export const useTaskStore = defineStore('task', () => {
  const tasks = ref<Task[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  async function fetchTasks() {
    loading.value = true;
    error.value = null;
    try {
      tasks.value = await TaskService.getAll();
    } catch (e: any) {
      error.value = e.message || 'Error al cargar tareas';
    } finally {
      loading.value = false;
    }
  }

  async function createTask(data: Partial<Task>) {
    loading.value = true;
    try {
      const created = await TaskService.create(data);
      tasks.value.unshift(created);
      return created;
    } finally {
      loading.value = false;
    }
  }

  async function updateTask(id: string, data: Partial<Task>) {
    loading.value = true;
    try {
      const updated = await TaskService.update(id, data);
      const idx = tasks.value.findIndex(t => t.id === id);
      if (idx !== -1) {
        tasks.value[idx] = updated;
      }
      return updated;
    } finally {
      loading.value = false;
    }
  }

  async function deleteTask(id: string) {
    loading.value = true;
    try {
      await TaskService.delete(id);
      tasks.value = tasks.value.filter(t => t.id !== id);
    } finally {
      loading.value = false;
    }
  }

  return { tasks, loading, error, fetchTasks, createTask, updateTask, deleteTask };
});
