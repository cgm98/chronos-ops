import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useCodeReviewStore = defineStore('codeReview', () => {
  const codeReviews = ref<any[]>([]);
  const loading = ref(false);

  async function fetchCodeReviews() {
    loading.value = true;
    try {
      codeReviews.value = [];
    } finally {
      loading.value = false;
    }
  }

  return { codeReviews, loading, fetchCodeReviews };
});
