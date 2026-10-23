<script setup lang="ts">
withDefaults(defineProps<{
  show?: boolean;
  title?: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  maxWidth?: string;
}>(), {
  show: true,
  cancelLabel: 'Cancelar',
  destructive: false,
  maxWidth: '520px'
});

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'confirm'): void;
  (e: 'cancel'): void;
}>();

const handleCancel = () => {
  emit('cancel');
  emit('close');
};

const handleConfirm = () => {
  emit('confirm');
};
</script>

<template>
  <Teleport to="body">
    <div v-if="show !== false" class="modal-backdrop" @click.self="handleCancel">
      <div class="modal-dialog" :style="{ maxWidth }">
        <div v-if="title || $slots.header" class="modal-header">
          <slot name="header">
            <h3>{{ title }}</h3>
          </slot>
          <button class="modal-close-btn" @click="handleCancel" aria-label="Cerrar">&times;</button>
        </div>

        <div class="modal-body">
          <p v-if="message" class="modal-message">{{ message }}</p>
          <slot />
        </div>

        <div v-if="confirmLabel || $slots.footer" class="modal-footer">
          <slot name="footer">
            <button type="button" class="btn-modal btn-modal-secondary" @click="handleCancel">
              {{ cancelLabel }}
            </button>
            <button
              type="button"
              class="btn-modal"
              :class="destructive ? 'btn-modal-danger' : 'btn-modal-primary'"
              @click="handleConfirm"
            >
              {{ confirmLabel }}
            </button>
          </slot>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  background-color: rgba(7, 12, 15, 0.78);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 1.25rem;
}

.modal-dialog {
  background: var(--surface, #18262d);
  border: 1px solid var(--border, #2c3e44);
  border-radius: 14px;
  width: 100%;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 25px 60px -12px rgba(0, 0, 0, 0.55), 0 0 0 1px rgba(255, 255, 255, 0.04);
  color: var(--fg, #f4f0e9);
  animation: modalScaleIn 0.18s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes modalScaleIn {
  from {
    opacity: 0;
    transform: scale(0.96) translateY(6px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 18px 24px;
  border-bottom: 1px solid var(--border, #2c3e44);
  background: var(--surface, #18262d);
}

.modal-header h3 {
  margin: 0;
  font-family: 'Manrope', sans-serif;
  font-size: 1.15rem;
  font-weight: 800;
  color: var(--fg, #f4f0e9);
  letter-spacing: -0.02em;
}

.modal-close-btn {
  background: transparent;
  border: none;
  color: var(--muted, #aabbb9);
  font-size: 1.5rem;
  line-height: 1;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 8px;
  transition: all 0.15s ease;
}

.modal-close-btn:hover {
  color: var(--fg, #f4f0e9);
  background: rgba(255, 255, 255, 0.08);
}

.modal-body {
  padding: 24px;
  overflow-y: auto;
  flex: 1;
  color: var(--fg, #f4f0e9);
}

.modal-message {
  margin: 0;
  color: var(--muted, #aabbb9);
  font-size: 0.95rem;
  line-height: 1.55;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 10px;
  padding: 16px 24px;
  border-top: 1px solid var(--border, #2c3e44);
  background: var(--surface, #18262d);
}

.btn-modal {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-family: inherit;
  font-weight: 700;
  font-size: 0.88rem;
  padding: 10px 18px;
  border-radius: 9px;
  cursor: pointer;
  transition: all 0.18s ease;
  border: 1px solid transparent;
}

.btn-modal-secondary {
  background: var(--bg-card, #18262c);
  color: var(--fg, #d1dedb);
  border-color: var(--border, #2c3e44);
}

.btn-modal-secondary:hover {
  background: var(--bg-hover, #203138);
  border-color: var(--border-color, #3b5057);
  color: var(--fg, #f4f0e9);
}

.btn-modal-primary {
  background: var(--accent, #e4a876);
  color: #121d23;
  border-color: var(--accent, #e4a876);
  font-weight: 800;
}

.btn-modal-primary:hover {
  filter: brightness(1.08);
  box-shadow: 0 4px 14px rgba(228, 168, 118, 0.25);
}

.btn-modal-danger {
  background: var(--danger, #e58f88);
  color: #1a0e0d;
  border-color: var(--danger, #e58f88);
  font-weight: 800;
}

.btn-modal-danger:hover {
  filter: brightness(1.08);
}

:global([data-theme="light"]) .modal-backdrop {
  background-color: rgba(15, 23, 42, 0.45);
}

:global([data-theme="light"]) .modal-dialog {
  box-shadow: 0 25px 60px -12px rgba(15, 23, 42, 0.18), 0 0 0 1px rgba(0, 0, 0, 0.05);
}

:global([data-theme="light"]) .btn-modal-secondary {
  background: #f1f5f9;
  border-color: #cbd5e1;
  color: #1e293b;
}

:global([data-theme="light"]) .btn-modal-secondary:hover {
  background: #e2e8f0;
  border-color: #94a3b8;
  color: #0f172a;
}
</style>
