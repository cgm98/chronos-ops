<script setup lang="ts">
import Modal from '../Modal/Index.vue';
import type { Person } from '../../types/domain.types';

defineProps<{
  person: Person | null;
}>();

defineEmits<{
  (e: 'close'): void;
}>();
</script>

<template>
  <Modal :show="!!person" title="Detalle de Contacto" @close="$emit('close')">
    <div v-if="person" class="person-details">
      <p><strong>Nombre:</strong> {{ person.name }}</p>
      <p v-if="person.birthday"><strong>Cumpleaños:</strong> {{ person.birthday }}</p>
    </div>
  </Modal>
</template>

<style scoped>
.person-details p {
  margin: 0.5rem 0;
  color: #e5e7eb;
}
</style>
