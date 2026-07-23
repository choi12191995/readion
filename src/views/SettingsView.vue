<script setup lang="ts">
import ThemeEditor from '@/components/ThemeEditor.vue';
import EngineManager from '@/components/EngineManager.vue';
import { useI18n, LOCALE_LABELS, type Locale } from '@/i18n';

const { t, localeOverride, setLocale } = useI18n();

function handleLocaleChange(e: Event): void {
  const val = (e.target as HTMLSelectElement).value;
  setLocale(val === 'auto' ? null : val as Locale);
}
</script>

<template>
  <div class="settings-view">
    <h1>{{ t('settings.title') }}</h1>

    <div class="locale-setting">
      <label for="ui-lang">{{ t('settings.uiLanguage') }}</label>
      <select
        id="ui-lang"
        class="locale-select"
        :value="localeOverride ?? 'auto'"
        @change="handleLocaleChange"
      >
        <option value="auto">
          {{ t('settings.uiLangAuto') }}
        </option>
        <option
          v-for="(label, code) in LOCALE_LABELS"
          v-show="code !== 'auto'"
          :key="code"
          :value="code"
        >
          {{ label }}
        </option>
      </select>
    </div>

    <hr class="section-divider">
    <ThemeEditor />
    <hr class="section-divider">
    <EngineManager />
  </div>
</template>

<style scoped>
.settings-view {
  max-width: 800px;
  margin: 0 auto;
  padding: var(--space-xl) var(--space-md);
}

.settings-view h1 {
  font-size: 1.5rem;
  margin-bottom: var(--space-xl);
}

.locale-setting {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  margin-bottom: var(--space-md);
}

.locale-setting label {
  font-weight: 500;
  white-space: nowrap;
}

.locale-select {
  padding: var(--space-xs) var(--space-sm);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  color: var(--color-text);
  font-size: 0.875rem;
}

.section-divider {
  border: none;
  border-top: 1px solid var(--color-border);
  margin: var(--space-xl) 0;
}
</style>
