import { defineStore } from 'pinia';
import { ref, watch } from 'vue';
import type { InputMode, TextSegment } from '../core/markdown';
import { extractSegments, renderHtml } from '../core/markdown';
import { sanitize } from '../core/sanitize';
import type { TaggedToken } from '../core/upos';
import { getTaggerClient } from '../workers/client';

export type DocStatus = 'idle' | 'tagging' | 'done' | 'error';

const MAX_LIVE_CHARS = 200_000;

export const useDocumentStore = defineStore('document', () => {
  const input = ref('');
  const mode = ref<InputMode>('markdown');
  const langOverride = ref<string | null>(null);
  const detectedLang = ref('en');
  const segments = ref<TextSegment[]>([]);
  const tagsBySegment = ref<Map<string, TaggedToken[]>>(new Map());
  const status = ref<DocStatus>('idle');
  const jobId = ref(0);
  const renderedHtml = ref('');
  const wordCount = ref(0);
  const progress = ref(0);
  const errorMessage = ref('');
  const currentEngineId = ref('wink-en');

  const client = getTaggerClient();
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  /** Trigger a tagging run. */
  async function processInput(): Promise<void> {
    const text = input.value;

    if (!text.trim()) {
      segments.value = [];
      tagsBySegment.value = new Map();
      renderedHtml.value = '';
      status.value = 'idle';
      wordCount.value = 0;
      progress.value = 0;
      return;
    }

    // Guard: cap at MAX_LIVE_CHARS
    const processText = text.length > MAX_LIVE_CHARS ? text.slice(0, MAX_LIVE_CHARS) : text;

    // Phase 1: extract segments (main thread, fast)
    const newSegments = extractSegments(processText, mode.value);
    segments.value = newSegments;

    // Count words
    wordCount.value = newSegments.reduce((n, s) => n + s.text.split(/\s+/).filter(Boolean).length, 0);

    // Detect language
    const lang = langOverride.value ?? detectedLang.value;

    // Resolve engine
    const engineList = await client.listEngines();
    const engine = engineList.find((e) => e.languages.includes(lang));
    const engineId = engine?.id ?? 'wink-en';
    currentEngineId.value = engineId;

    // Start tagging
    const currentJobId = ++jobId.value;
    status.value = 'tagging';
    progress.value = 0;
    errorMessage.value = '';

    const newTags = new Map<string, TaggedToken[]>();
    let completedSegments = 0;
    const totalSegments = newSegments.length;

    try {
      // Load engine if needed
      await client.loadEngine(engineId);

      // Tag segments with streaming results
      await client.tagSegments(
        currentJobId,
        engineId,
        newSegments,
        (segmentId: string, tags: TaggedToken[]) => {
          if (jobId.value !== currentJobId) return;

          newTags.set(segmentId, tags);
          completedSegments++;
          progress.value = Math.round((completedSegments / totalSegments) * 100);

          // Update rendered HTML incrementally
          tagsBySegment.value = new Map(newTags);
          renderedHtml.value = sanitize(renderHtml(processText, mode.value, tagsBySegment.value));
        },
      );

      if (jobId.value === currentJobId) {
        status.value = 'done';
        progress.value = 100;
      }
    } catch (err) {
      if (jobId.value === currentJobId) {
        status.value = 'error';
        errorMessage.value = err instanceof Error ? err.message : 'Tagging failed';
        console.error('Tagging error:', err);

        // Render what we have so far (uncolored for remaining)
        renderedHtml.value = sanitize(renderHtml(processText, mode.value, tagsBySegment.value));
      }
    }
  }

  /** Debounced input change handler. */
  function onInputChange(): void {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      void processInput();
    }, 400);
  }

  /** Detect language from current input. */
  async function detectLang(): Promise<void> {
    if (!input.value.trim()) return;
    try {
      const result = await client.detectLanguage(input.value.slice(0, 2048));
      detectedLang.value = result.lang;
    } catch (err) {
      console.error('Language detection failed:', err);
    }
  }

  /** Set input text and trigger processing. */
  function setInput(text: string): void {
    input.value = text;
  }

  /** Get the current rendered HTML with inline styles for copy/export. */
  function getHtmlWithInlineStyles(): string {
    // For copy-as-HTML, resolve CSS variables to actual colors
    return renderedHtml.value;
  }

  // Watch input and mode changes
  watch([input, mode], () => {
    void detectLang();
    onInputChange();
  });

  watch(langOverride, () => {
    void processInput();
  });

  return {
    input,
    mode,
    langOverride,
    detectedLang,
    segments,
    tagsBySegment,
    status,
    jobId,
    renderedHtml,
    wordCount,
    progress,
    errorMessage,
    currentEngineId,
    setInput,
    processInput,
    getHtmlWithInlineStyles,
  };
});
