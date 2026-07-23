<script setup lang="ts">
import { useSettingsStore, PRESETS, type TagStyle } from '@/stores/settings';
import { UPOS_TAGS, type UPos } from '@/core/upos';
import { ref } from 'vue';
import { useI18n } from '@/i18n';
import type { MessageKey } from '@/i18n';

const { t } = useI18n();
const settings = useSettingsStore();
const importText = ref('');
const importError = ref('');
const showImport = ref(false);

function applyPreset(preset: typeof PRESETS[number]): void {
  if (confirm(`Apply the "${preset.name}" preset? This will replace your current theme.`)) {
    settings.applyPreset(preset);
  }
}

function updateColor(tag: UPos, color: string): void {
  const mode = settings.isDark ? 'dark' : 'light';
  settings.setTagStyle(tag, mode, { color });
}

function updateStyle(tag: UPos, prop: keyof TagStyle, value: boolean): void {
  const mode = settings.isDark ? 'dark' : 'light';
  settings.setTagStyle(tag, mode, { [prop]: value });
}

function exportTheme(): void {
  const json = settings.exportTheme();
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `readion-theme-${settings.theme.name.toLowerCase().replace(/\s+/g, '-')}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function doImport(): void {
  importError.value = '';
  if (!importText.value.trim()) {
    importError.value = t('theme.importErrorEmpty');
    return;
  }
  const ok = settings.importTheme(importText.value);
  if (ok) {
    showImport.value = false;
    importText.value = '';
  } else {
    importError.value = t('theme.importErrorInvalid');
  }
}

function resetAll(): void {
  if (confirm(t('theme.resetConfirm'))) {
    localStorage.removeItem('readion:settings:v1');
    location.reload();
  }
}
</script>

<template>
  <div class="theme-editor">
    <section class="editor-section">
      <h3>{{ t('theme.presets') }}</h3>
      <div class="preset-grid">
        <button
          v-for="preset in PRESETS"
          :key="preset.name"
          class="preset-card"
          :class="{ active: settings.activePreset === preset.name }"
          @click="applyPreset(preset)"
        >
          <div class="preset-preview">
            <span
              v-for="tag in (['NOUN', 'VERB', 'ADJ', 'ADV', 'PRON', 'PROPN'] as UPos[])"
              :key="tag"
              :style="{ color: (settings.isDark ? preset.dark : preset.light)[tag]?.enabled ? (settings.isDark ? preset.dark : preset.light)[tag]?.color : 'inherit' }"
            >{{ tag.toLowerCase() }}</span>
          </div>
          <span class="preset-name">{{ preset.name }}</span>
        </button>
      </div>
    </section>

    <section class="editor-section">
      <h3>{{ t('theme.tagColors') }}</h3>
      <div class="tag-list">
        <div
          v-for="tag in UPOS_TAGS"
          :key="tag"
          class="tag-row"
        >
          <label class="tag-enable">
            <input
              type="checkbox"
              :checked="settings.currentPalette[tag]?.enabled"
              @change="settings.toggleTag(tag)"
            >
          </label>
          <span
            class="tag-name"
            :style="{ color: settings.currentPalette[tag]?.enabled ? settings.currentPalette[tag]?.color : 'inherit' }"
          >
            {{ tag }}
          </span>
          <span class="tag-desc">{{ t(`upos.${tag}` as MessageKey) }}</span>
          <input
            type="color"
            class="tag-color"
            :value="settings.currentPalette[tag]?.color === 'inherit' ? '#888888' : settings.currentPalette[tag]?.color"
            :disabled="!settings.currentPalette[tag]?.enabled"
            @input="(e) => updateColor(tag, (e.target as HTMLInputElement).value)"
          >
          <button
            class="style-btn"
            :class="{ active: settings.currentPalette[tag]?.bold }"
            :title="t('theme.bold')"
            @click="updateStyle(tag, 'bold', !settings.currentPalette[tag]?.bold)"
          >
            B
          </button>
          <button
            class="style-btn italic"
            :class="{ active: settings.currentPalette[tag]?.italic }"
            :title="t('theme.italic')"
            @click="updateStyle(tag, 'italic', !settings.currentPalette[tag]?.italic)"
          >
            I
          </button>
          <button
            class="style-btn underline"
            :class="{ active: settings.currentPalette[tag]?.underline }"
            :title="t('theme.underline')"
            @click="updateStyle(tag, 'underline', !settings.currentPalette[tag]?.underline)"
          >
            U
          </button>
        </div>
      </div>
    </section>

    <section class="editor-section">
      <h3>{{ t('theme.readingPrefs') }}</h3>
      <div class="pref-grid">
        <label class="pref-label">
          {{ t('theme.font') }}
          <select
            v-model="settings.font"
            class="pref-select"
          >
            <option value="sans">{{ t('theme.fontSans') }}</option>
            <option value="serif">{{ t('theme.fontSerif') }}</option>
            <option value="system">{{ t('theme.fontSystem') }}</option>
          </select>
        </label>
        <label class="pref-label">
          {{ t('theme.fontSize', { val: String(settings.fontSize) }) }}
          <input
            v-model.number="settings.fontSize"
            type="range"
            min="14"
            max="24"
            step="1"
          >
        </label>
        <label class="pref-label">
          {{ t('theme.lineHeight', { val: String(settings.lineHeight) }) }}
          <input
            v-model.number="settings.lineHeight"
            type="range"
            min="1.4"
            max="2.0"
            step="0.1"
          >
        </label>
        <label class="pref-label">
          {{ t('theme.columnWidth', { val: String(settings.columnWidth) }) }}
          <input
            v-model.number="settings.columnWidth"
            type="range"
            min="45"
            max="90"
            step="5"
          >
        </label>
      </div>
    </section>

    <section class="editor-section">
      <h3>{{ t('theme.data') }}</h3>
      <div class="data-actions">
        <button
          class="action-btn"
          @click="exportTheme"
        >
          {{ t('theme.export') }}
        </button>
        <button
          class="action-btn"
          @click="showImport = !showImport"
        >
          {{ t('theme.import') }}
        </button>
        <button
          class="action-btn danger"
          @click="resetAll"
        >
          {{ t('theme.reset') }}
        </button>
      </div>
      <div
        v-if="showImport"
        class="import-box"
      >
        <textarea
          v-model="importText"
          :placeholder="t('theme.importPlaceholder')"
          class="import-textarea"
        />
        <p
          v-if="importError"
          class="import-error"
        >
          {{ importError }}
        </p>
        <button
          class="action-btn"
          @click="doImport"
        >
          {{ t('theme.apply') }}
        </button>
      </div>
    </section>
  </div>
</template>

<style scoped>
.theme-editor {
  max-width: 700px;
}

.editor-section {
  margin-bottom: var(--space-xl);
}

.editor-section h3 {
  font-size: 1rem;
  margin-bottom: var(--space-md);
  color: var(--color-text);
}

.preset-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: var(--space-sm);
}

.preset-card {
  padding: var(--space-sm);
  border: 2px solid var(--color-border);
  border-radius: var(--radius);
  text-align: center;
  background: var(--color-bg);
  transition: all 0.15s;
}

.preset-card.active {
  border-color: var(--color-accent);
}

.preset-card:hover {
  border-color: var(--color-accent);
}

.preset-preview {
  display: flex;
  gap: 4px;
  justify-content: center;
  font-size: 0.7rem;
  font-weight: 600;
  margin-bottom: var(--space-xs);
  flex-wrap: wrap;
}

.preset-name {
  font-size: 0.8rem;
  color: var(--color-muted);
}

.tag-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.tag-row {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: 4px var(--space-sm);
  border-radius: var(--radius-sm);
}

.tag-row:hover {
  background: var(--color-surface);
}

.tag-enable input {
  cursor: pointer;
}

.tag-name {
  font-family: var(--font-mono);
  font-size: 0.8rem;
  font-weight: 600;
  width: 50px;
}

.tag-desc {
  font-size: 0.75rem;
  color: var(--color-muted);
  flex: 1;
  min-width: 80px;
}

.tag-color {
  width: 28px;
  height: 28px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  cursor: pointer;
  padding: 0;
  background: none;
}

.tag-color:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.style-btn {
  width: 26px;
  height: 26px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--color-muted);
  background: var(--color-bg);
}

.style-btn.active {
  background: var(--color-accent);
  color: var(--color-accent-text);
  border-color: var(--color-accent);
}

.style-btn.italic { font-style: italic; }
.style-btn.underline { text-decoration: underline; }

.pref-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: var(--space-md);
}

.pref-label {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
  font-size: 0.8rem;
  color: var(--color-muted);
}

.pref-select {
  padding: var(--space-xs) var(--space-sm);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-bg);
  color: var(--color-text);
  font: inherit;
}

.data-actions {
  display: flex;
  gap: var(--space-sm);
  flex-wrap: wrap;
}

.action-btn {
  padding: var(--space-xs) var(--space-md);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  font-size: 0.8rem;
  color: var(--color-text);
  background: var(--color-surface);
}

.action-btn:hover {
  border-color: var(--color-accent);
}

.action-btn.danger {
  color: var(--color-danger);
  border-color: var(--color-danger);
}

.import-box {
  margin-top: var(--space-md);
}

.import-textarea {
  width: 100%;
  height: 120px;
  padding: var(--space-sm);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  font-family: var(--font-mono);
  font-size: 0.8rem;
  resize: vertical;
  margin-bottom: var(--space-sm);
  color: var(--color-text);
  background: var(--color-bg);
}

.import-error {
  color: var(--color-danger);
  font-size: 0.8rem;
  margin-bottom: var(--space-sm);
}
</style>
