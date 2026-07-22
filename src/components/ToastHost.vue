<script setup lang="ts">
import { ref } from 'vue';

export interface Toast {
  id: number;
  message: string;
  type: 'info' | 'error' | 'success';
}

const toasts = ref<Toast[]>([]);
let nextId = 0;

function addToast(message: string, type: Toast['type'] = 'info', duration = 4000): void {
  const id = nextId++;
  toasts.value.push({ id, message, type });
  setTimeout(() => {
    toasts.value = toasts.value.filter((t) => t.id !== id);
  }, duration);
}

function dismiss(id: number): void {
  toasts.value = toasts.value.filter((t) => t.id !== id);
}

defineExpose({ addToast });
</script>

<template>
  <Teleport to="body">
    <div
      class="toast-host"
      aria-live="polite"
    >
      <div
        v-for="toast in toasts"
        :key="toast.id"
        class="toast"
        :class="'toast-' + toast.type"
        @click="dismiss(toast.id)"
      >
        {{ toast.message }}
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.toast-host {
  position: fixed;
  bottom: var(--space-lg);
  right: var(--space-lg);
  display: flex;
  flex-direction: column-reverse;
  gap: var(--space-sm);
  z-index: 9999;
  pointer-events: none;
}

.toast {
  padding: var(--space-sm) var(--space-md);
  border-radius: var(--radius);
  font-size: 0.85rem;
  box-shadow: var(--shadow-md);
  cursor: pointer;
  pointer-events: auto;
  animation: slideIn 0.2s ease-out;
  max-width: 360px;
}

.toast-info {
  background: var(--color-text);
  color: var(--color-bg);
}

.toast-error {
  background: var(--color-danger);
  color: white;
}

.toast-success {
  background: var(--color-success);
  color: white;
}

@keyframes slideIn {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}
</style>
