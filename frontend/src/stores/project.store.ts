import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { Project } from '../types/domain.types';

export const useProjectStore = defineStore('project', () => {
  const projects = ref<Project[]>([]);
  const loading = ref(false);

  async function fetchProjects() {
    loading.value = true;
    try {
      projects.value = [];
    } finally {
      loading.value = false;
    }
  }

  return { projects, loading, fetchProjects };
});
