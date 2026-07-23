<script setup lang="ts">
import { useSettingsStore } from '@/stores/settings';
import { UPOS_TAGS, type UPos } from '@/core/upos';
import { useI18n } from '@/i18n';
import type { MessageKey } from '@/i18n';

const settings = useSettingsStore();
const { t } = useI18n();

function getChipStyle(tag: UPos) {
  const style = settings.currentPalette[tag];
  if (!style || !style.enabled) return {};
  return { '--chip-color': style.color };
}
</script>

<template>
  <div
    class="pos-legend"
    role="toolbar"
    :aria-label="t('legend.ariaLabel')"
  >
    <div class="legend-controls">
      <button
        class="legend-toggle-all"
        :title="t('legend.allTitle')"
        @click="settings.setAllTags(true)"
      >
        {{ t('legend.all') }}
      </button>
      <button
        class="legend-toggle-all"
        :title="t('legend.noneTitle')"
        @click="settings.setAllTags(false)"
      >
        {{ t('legend.none') }}
      </button>
    </div>
    <div class="legend-chips">
      <button
        v-for="tag in UPOS_TAGS"
        :key="tag"
        class="legend-chip"
        :class="{ disabled: !settings.currentPalette[tag]?.enabled }"
        :style="getChipStyle(tag)"
        :aria-pressed="settings.currentPalette[tag]?.enabled ?? false"
        :title="t('legend.chipTitle', { name: t(`upos.${tag}` as MessageKey) })"
        @click="settings.toggleTag(tag)"
      >
        <span class="chip-dot" />
        <span class="chip-label">{{ tag }}</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.pos-legend {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-xs) var(--space-sm);
  border-bottom: 1px solid var(--color-border);
  overflow-x: auto;
  flex-shrink: 0;
}

.legend-controls {
  display: flex;
  gap: 2px;
  flex-shrink: 0;
}

.legend-toggle-all {
  padding: 2px var(--space-xs);
  font-size: 0.7rem;
  border-radius: var(--radius-sm);
  color: var(--color-muted);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
}

.legend-toggle-all:hover {
  color: var(--color-text);
}

.legend-chips {
  display: flex;
  gap: 4px;
  flex-wrap: nowrap;
}

.legend-chip {
  display: flex;
  align-items: center;
  gap: 3px;
  padding: 2px 6px;
  border-radius: 12px;
  font-size: 0.7rem;
  font-weight: 500;
  color: var(--color-text);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  white-space: nowrap;
  transition: all 0.15s;
}

.legend-chip:hover {
  border-color: var(--color-accent);
}

.legend-chip.disabled {
  opacity: 0.4;
}

.chip-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--chip-color, var(--color-muted));
  flex-shrink: 0;
}

.legend-chip.disabled .chip-dot {
  background: var(--color-muted);
}

.chip-label {
  font-family: var(--font-mono);
  letter-spacing: 0.02em;
}
</style>
