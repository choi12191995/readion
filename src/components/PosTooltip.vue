<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue';
import { UPOS_LABELS } from '@/core/upos-labels';
import { isUPos } from '@/core/upos';

const props = defineProps<{
  target: HTMLElement | null;
}>();

const visible = ref(false);
const content = ref('');
const x = ref(0);
const y = ref(0);

let showTimer: ReturnType<typeof setTimeout> | null = null;
let tooltipEl: HTMLElement | null = null;

function show(el: HTMLElement): void {
  const upos = el.dataset['upos'] ?? '';
  if (!isUPos(upos)) return;

  const label = UPOS_LABELS[upos];
  const word = el.textContent ?? '';
  content.value = `${word} — ${upos} · ${label.name}`;

  const rect = el.getBoundingClientRect();
  x.value = rect.left + rect.width / 2;
  y.value = rect.top - 8;
  visible.value = true;
}

function hide(): void {
  visible.value = false;
  if (showTimer) {
    clearTimeout(showTimer);
    showTimer = null;
  }
}

watch(() => props.target, (el) => {
  if (showTimer) clearTimeout(showTimer);

  if (el) {
    showTimer = setTimeout(() => show(el), 300);
  } else {
    hide();
  }
});

function setTooltipRef(el: unknown): void {
  tooltipEl = el as HTMLElement;
}

onMounted(() => {
  void tooltipEl;
});
onUnmounted(hide);
</script>

<template>
  <Teleport to="body">
    <div
      v-if="visible"
      :ref="setTooltipRef"
      class="pos-tooltip"
      :style="{ left: `${x}px`, top: `${y}px` }"
      role="tooltip"
    >
      {{ content }}
    </div>
  </Teleport>
</template>

<style scoped>
.pos-tooltip {
  position: fixed;
  transform: translate(-50%, -100%);
  padding: 4px 10px;
  background: var(--color-text);
  color: var(--color-bg);
  font-size: 0.75rem;
  border-radius: var(--radius-sm);
  white-space: nowrap;
  pointer-events: none;
  z-index: 1000;
  box-shadow: var(--shadow-md);
}
</style>
