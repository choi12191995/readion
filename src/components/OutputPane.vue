<script setup lang="ts">
import { useDocumentStore } from '@/stores/document';
import PosTooltip from './PosTooltip.vue';
import { ref } from 'vue';

const doc = useDocumentStore();
const outputEl = ref<HTMLElement | null>(null);
const tooltipTarget = ref<HTMLElement | null>(null);

const SUPPORTED_LANGS = [
  { code: 'en', label: 'English' },
  { code: 'zh', label: 'Chinese' },
  { code: 'ja', label: 'Japanese' },
];

function handleMouseOver(e: Event): void {
  const target = e.target as HTMLElement;
  if (target.dataset['upos']) {
    tooltipTarget.value = target;
  }
}

function handleMouseOut(e: Event): void {
  const target = e.target as HTMLElement;
  if (target.dataset['upos']) {
    tooltipTarget.value = null;
  }
}

function setLangOverride(e: Event): void {
  const val = (e.target as HTMLSelectElement).value;
  doc.setLanguageOverride(val === 'auto' ? null : val);
}

async function copyAsHtml(): Promise<void> {
  if (!outputEl.value) return;
  try {
    const html = doc.getHtmlWithInlineStyles();
    const blob = new Blob([html], { type: 'text/html' });
    const textBlob = new Blob([outputEl.value.innerText], { type: 'text/plain' });
    await navigator.clipboard.write([
      new ClipboardItem({
        'text/html': blob,
        'text/plain': textBlob,
      }),
    ]);
    copyFeedback.value = 'Copied!';
    setTimeout(() => { copyFeedback.value = ''; }, 2000);
  } catch {
    try {
      const text = outputEl.value?.innerText ?? '';
      await navigator.clipboard.writeText(text);
      copyFeedback.value = 'Copied as text';
      setTimeout(() => { copyFeedback.value = ''; }, 2000);
    } catch {
      copyFeedback.value = 'Copy failed';
      setTimeout(() => { copyFeedback.value = ''; }, 2000);
    }
  }
}

const copyFeedback = ref('');

function printView(): void {
  window.print();
}
</script>

<template>
  <div class="output-pane">
    <div class="output-toolbar">
      <div class="output-status">
        <select
          class="lang-select"
          :value="doc.langOverride ?? 'auto'"
          title="Language"
          @change="setLangOverride"
        >
          <option value="auto">
            Auto ({{ doc.detectedLang.toUpperCase() }})
          </option>
          <option
            v-for="lang in SUPPORTED_LANGS"
            :key="lang.code"
            :value="lang.code"
          >
            {{ lang.label }}
          </option>
        </select>
        <span
          v-if="doc.currentEngineId"
          class="status-engine"
        >
          · {{ doc.currentEngineId }}
        </span>
        <span
          v-if="doc.wordCount > 0"
          class="status-words"
        >
          · {{ doc.wordCount.toLocaleString() }} words
        </span>
        <span
          v-if="doc.status === 'tagging'"
          class="status-progress"
        >
          · coloring… {{ doc.progress }}%
        </span>
        <span
          v-if="doc.truncated"
          class="status-truncated"
        >
          · truncated to 200k chars
        </span>
      </div>
      <div class="output-actions">
        <span
          v-if="copyFeedback"
          class="copy-feedback"
        >{{ copyFeedback }}</span>
        <button
          class="toolbar-btn"
          title="Copy as rich HTML"
          :disabled="!doc.renderedHtml"
          @click="copyAsHtml"
        >
          📋 Copy HTML
        </button>
        <button
          class="toolbar-btn"
          title="Print reading view"
          @click="printView"
        >
          🖨️ Print
        </button>
      </div>
    </div>

    <!-- Error banner -->
    <div
      v-if="doc.status === 'error'"
      class="error-banner"
    >
      ⚠️ {{ doc.errorMessage || 'An error occurred during tagging.' }}
    </div>

    <div
      v-if="doc.renderedHtml"
      ref="outputEl"
      class="output-content"
      role="document"
      aria-label="Highlighted reading view"
      @mouseover="handleMouseOver"
      @mouseout="handleMouseOut"
      v-html="doc.renderedHtml"
    />

    <div
      v-else
      class="output-empty"
    >
      <div class="empty-content">
        <h2>Highlight your text</h2>
        <p>
          Paste text or Markdown in the input pane, or drag and drop a file.
          Words will be colored by their part of speech — like syntax highlighting for human language.
        </p>
        <p class="empty-hint">
          Nouns, verbs, adjectives, and more — each gets its own color.
        </p>
      </div>
    </div>

    <PosTooltip :target="tooltipTarget" />
  </div>
</template>

<style scoped>
.output-pane {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--color-bg);
  position: relative;
}

.output-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-sm);
  border-bottom: 1px solid var(--color-border);
  flex-wrap: wrap;
  gap: var(--space-sm);
}

.output-status {
  font-size: 0.8rem;
  color: var(--color-muted);
  display: flex;
  align-items: center;
  gap: 2px;
}

.lang-select {
  font-size: 0.8rem;
  padding: 2px var(--space-xs);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  color: var(--color-text);
  cursor: pointer;
}

.status-truncated {
  color: var(--color-danger);
}

.output-actions {
  display: flex;
  gap: var(--space-xs);
  align-items: center;
}

.copy-feedback {
  font-size: 0.75rem;
  color: var(--color-success);
  font-weight: 500;
}

.toolbar-btn {
  padding: var(--space-xs) var(--space-sm);
  border-radius: var(--radius-sm);
  font-size: 0.8rem;
  color: var(--color-muted);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  transition: all 0.15s;
}

.toolbar-btn:hover:not(:disabled) {
  color: var(--color-text);
  border-color: var(--color-accent);
}

.toolbar-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.error-banner {
  padding: var(--space-sm) var(--space-md);
  background: #fef2f2;
  color: var(--color-danger);
  font-size: 0.85rem;
  border-bottom: 1px solid var(--color-danger);
}

.dark .error-banner {
  background: #3b1111;
}

.output-content {
  flex: 1;
  padding: var(--space-lg);
  max-width: var(--column-width);
  margin: 0 auto;
  width: 100%;
  overflow-y: auto;
  font-family: var(--font-body);
  line-height: var(--line-height);
}

.output-content :deep(h1) { font-size: 2rem; margin: 1em 0 0.5em; font-weight: 700; }
.output-content :deep(h2) { font-size: 1.5rem; margin: 1em 0 0.5em; font-weight: 600; }
.output-content :deep(h3) { font-size: 1.25rem; margin: 1em 0 0.5em; font-weight: 600; }
.output-content :deep(p) { margin: 0.75em 0; }
.output-content :deep(ul),
.output-content :deep(ol) { margin: 0.5em 0; padding-left: 1.5em; }
.output-content :deep(li) { margin: 0.25em 0; }
.output-content :deep(blockquote) {
  border-left: 3px solid var(--color-border);
  padding-left: var(--space-md);
  margin: 1em 0;
  color: var(--color-muted);
}
.output-content :deep(pre) {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  padding: var(--space-md);
  overflow-x: auto;
  margin: 1em 0;
}
.output-content :deep(code) {
  font-family: var(--font-mono);
  font-size: 0.9em;
}
.output-content :deep(:not(pre) > code) {
  background: var(--color-surface);
  padding: 0.15em 0.35em;
  border-radius: var(--radius-sm);
}
.output-content :deep(table) {
  border-collapse: collapse;
  width: 100%;
  margin: 1em 0;
}
.output-content :deep(th),
.output-content :deep(td) {
  border: 1px solid var(--color-border);
  padding: var(--space-sm);
  text-align: left;
}
.output-content :deep(th) {
  background: var(--color-surface);
  font-weight: 600;
}
.output-content :deep(hr) {
  border: none;
  border-top: 1px solid var(--color-border);
  margin: 1.5em 0;
}
.output-content :deep(a) {
  color: var(--color-accent);
}
.output-content :deep(img) {
  max-width: 100%;
  height: auto;
}

.output-empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-2xl);
}

.empty-content {
  text-align: center;
  max-width: 400px;
}

.empty-content h2 {
  font-size: 1.5rem;
  margin-bottom: var(--space-md);
  color: var(--color-text);
}

.empty-content p {
  color: var(--color-muted);
  line-height: 1.6;
  margin-bottom: var(--space-sm);
}

.empty-hint {
  font-size: 0.875rem;
  font-style: italic;
}
</style>
