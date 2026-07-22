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
  const truncated = ref(false);

  const client = getTaggerClient();
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  /** Effective language: override wins, then detected. */
  function effectiveLang(): string {
    return langOverride.value ?? detectedLang.value;
  }

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
      truncated.value = false;
      return;
    }

    // Guard: cap at MAX_LIVE_CHARS
    truncated.value = text.length > MAX_LIVE_CHARS;
    const processText = truncated.value ? text.slice(0, MAX_LIVE_CHARS) : text;

    // Phase 1: extract segments (main thread, fast)
    const newSegments = extractSegments(processText, mode.value);
    segments.value = newSegments;

    // Count words (CJK-aware: count characters for non-space scripts)
    wordCount.value = newSegments.reduce((n, s) => {
      const spaceWords = s.text.split(/\s+/).filter(Boolean).length;
      // Count CJK characters individually
      const cjkChars = (s.text.match(/[\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff\uac00-\ud7af]/g) ?? []).length;
      return n + (cjkChars > 0 ? cjkChars : spaceWords);
    }, 0);

    // Resolve engine
    const lang = effectiveLang();
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
      await client.loadEngine(engineId);

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
        renderedHtml.value = sanitize(renderHtml(processText, mode.value, tagsBySegment.value));
      }
    }
  }

  /** Debounced input change handler. */
  function scheduleProcess(): void {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      void processInput();
    }, 400);
  }

  /** Detect language from current input, then re-tag if language changed. */
  async function detectAndProcess(): Promise<void> {
    if (!input.value.trim()) return;
    try {
      const result = await client.detectLanguage(input.value.slice(0, 2048));
      const prevLang = detectedLang.value;
      detectedLang.value = result.lang;

      // If language changed and no manual override, re-tag with the new engine
      if (!langOverride.value && prevLang !== result.lang) {
        void processInput();
      }
    } catch (err) {
      console.error('Language detection failed:', err);
    }
  }

  /** Set input text and trigger processing. */
  function setInput(text: string): void {
    input.value = text;
  }

  /** Set manual language override. */
  function setLanguageOverride(lang: string | null): void {
    langOverride.value = lang;
  }

  /** Get the current rendered HTML with inline styles for copy/export. */
  function getHtmlWithInlineStyles(): string {
    // Resolve CSS custom properties to inline styles for external pasting
    const el = document.createElement('div');
    el.innerHTML = renderedHtml.value;
    const spans = el.querySelectorAll('[data-upos]');
    for (const span of spans) {
      const htmlSpan = span as HTMLElement;
      const computed = getComputedStyle(document.querySelector(`.pos-${htmlSpan.dataset['upos']?.toLowerCase()}`) ?? document.body);
      const color = computed.color;
      if (color && color !== 'inherit') {
        htmlSpan.style.color = color;
      }
    }
    return el.innerHTML;
  }

  // Watch input and mode changes — detect language first, then debounce processing
  watch([input, mode], () => {
    void detectAndProcess();
    scheduleProcess();
  });

  // Watch manual language override
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
    truncated,
    setInput,
    setLanguageOverride,
    processInput,
    getHtmlWithInlineStyles,
  };
});
