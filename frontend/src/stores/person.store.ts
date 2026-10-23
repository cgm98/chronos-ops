import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { Person } from '../types/domain.types';

export const usePersonStore = defineStore('person', () => {
  const people = ref<Person[]>([]);
  const loading = ref(false);

  async function fetchPeople() {
    loading.value = true;
    try {
      people.value = [];
    } finally {
      loading.value = false;
    }
  }

  return { people, loading, fetchPeople };
});
