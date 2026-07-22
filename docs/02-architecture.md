# 02 · Architecture — Readion

Single-page Vue 3 app, statically hosted, no backend. This document defines the module boundaries and the **frozen contracts** between them. Parallel agents build against these contracts; changing them requires updating this doc first.

## 1. System overview

```
Input (textarea / file)             main thread
  │
  ▼
core/markdown.ts  ── extractSegments() ──►  TextSegment[]
  │                                            │ postMessage (Comlink)
  │                                            ▼
  │                                   workers/tagger.worker.ts
  │                                     ├─ core/lang-detect.ts
  │                                     ├─ engines/registry.ts → TaggerEngine
  │                                     └─ returns TaggedToken[] per segment (streamed)
  ▼                                            │
core/markdown.ts  ── renderHtml(segments+tags) ◄┘
  │
  ▼
core/sanitize.ts (DOMPurify) ──► ReaderView output pane (v-html)
                                     ▲
stores/settings.ts ──► CSS custom properties (theming; no re-render needed)
```

- **Stack:** Vue 3.5+ (Composition API) · TypeScript strict · Vite · Pinia · Vue Router · vite-plugin-pwa · markdown-it · DOMPurify · Comlink · Vitest · Playwright. pnpm, Node ≥ 20.
- **Views:** `/` ReaderView · `/settings` SettingsView · `/about` AboutView.

## 2. UPOS — the universal currency

Everything downstream of an engine speaks **Universal POS** (Universal Dependencies v2). `src/core/upos.ts`:

```ts
export const UPOS_TAGS = [
  'ADJ','ADP','ADV','AUX','CCONJ','DET','INTJ','NOUN','NUM',
  'PART','PRON','PROPN','PUNCT','SCONJ','SYM','VERB','X',
] as const;
export type UPos = typeof UPOS_TAGS[number];

export interface TaggedToken {
  text: string;   // surface form as it appears in the segment
  upos: UPos;
  start: number;  // char offset within its segment (UTF-16 code units)
  end: number;    // exclusive
}
```

Rules: offsets are relative to the segment text passed to `tag()`, must be non-overlapping and ascending. Whitespace between tokens is not tokenized. Anything an engine can't classify → `X`. Human-readable tag names/descriptions for tooltips live in `src/core/upos-labels.ts`.

## 3. Engine contract — `src/engines/types.ts`

```ts
import type { TaggedToken } from '../core/upos';

export interface EngineMeta {
  id: string;             // 'wink-en' | 'jieba-zh' | 'kuromoji-ja' | 'onnx-de' | ...
  label: string;          // 'English (fast)', 'German (neural)'
  languages: string[];    // ISO 639-1 codes, e.g. ['en']
  tier: 1 | 2;            // 1 = bundled JS/WASM, 2 = downloadable ONNX
  downloadBytes: number;  // 0 for bundled; approximate for downloads (UI display)
}

export interface TaggerEngine {
  readonly meta: EngineMeta;
  load(onProgress?: (loadedBytes: number, totalBytes: number) => void): Promise<void>;
  isLoaded(): boolean;
  tag(text: string): Promise<TaggedToken[]>;  // text = one segment
  dispose?(): void;                            // free memory (Tier-2)
}
```

`src/engines/registry.ts`:

```ts
export interface EngineRegistry {
  list(): EngineMeta[];                                  // all known engines
  resolve(lang: string, prefer?: 'fast' | 'accurate'): EngineMeta | undefined;
  get(id: string): Promise<TaggerEngine>;                // lazy dynamic import; caches instance
}
```

Engines are **only ever instantiated inside the worker**. Engine modules are dynamic-import chunks so they never bloat the initial bundle. Per-engine specs and tag mappings: docs/03.

## 4. Markdown pipeline contract — `src/core/markdown.ts`

Two-phase, so parsing stays on the main thread and tagging in the worker:

```ts
export interface TextSegment {
  id: string;      // stable within a parse, e.g. 's0', 's1', ...
  text: string;    // plain text content to be tagged
}

export type InputMode = 'markdown' | 'plain';

// Phase 1: parse input, collect taggable text segments in document order.
export function extractSegments(input: string, mode: InputMode): TextSegment[];

// Phase 2: re-render input; for each text segment, wrap tokens using its tags.
// Segments missing from the map render uncolored (enables streaming).
export function renderHtml(
  input: string,
  mode: InputMode,
  tags: ReadonlyMap<string, TaggedToken[]>,
): string;  // UNSANITIZED — caller must pass through sanitize()
```

Implementation notes (markdown mode):
- markdown-it with `html: false`, `linkify: true`, `typographer: false`. GFM tables/strikethrough via core plugins if needed.
- Segments = the `content` of every `text` child token inside `inline` tokens. Skip entirely: `code_inline`, `fence`, `code_block`, `html_*`, autolink URLs, image alt text.
- `renderHtml` overrides the `text` renderer rule: emit token spans `<span class="pos-noun" data-upos="NOUN">word</span>` per TaggedToken; characters not covered by any token (whitespace, uncovered spans) are emitted escaped, unwrapped. Both phases must walk tokens identically — same traversal function, shared, deterministic segment IDs (increment in traversal order).
- Plain mode: split on blank lines into `<p>`; each paragraph is one segment; escape everything.
- **Both functions must be pure and deterministic** — property test: `extractSegments` then `renderHtml` with empty map ≡ normal render without spans (modulo spans).

`src/core/sanitize.ts`: single `sanitize(html: string): string` using DOMPurify with an allowlist profile (standard markdown elements + `span[class^=pos-][data-upos]`; no `style`, no event handlers, `a[href]` restricted to http/https/mailto plus `rel="noopener noreferrer" target="_blank"`).

## 5. Worker API — `src/workers/tagger.worker.ts`

Module worker exposed via Comlink:

```ts
export interface TaggerWorkerApi {
  detectLanguage(sample: string): Promise<{ lang: string; confidence: number }>;
  listEngines(): Promise<EngineMeta[]>;
  loadEngine(id: string): Promise<void>;          // progress via onDownloadProgress callback
  deleteEngineCache(id: string): Promise<void>;   // Tier-2 only
  /**
   * Tag segments with the given engine. Results are delivered per segment via
   * onResult as they complete (document order not guaranteed). A later call with
   * a higher jobId invalidates earlier jobs: the worker stops and drops them.
   */
  tagSegments(
    jobId: number,
    engineId: string,
    segments: TextSegment[],
    onResult: (segmentId: string, tags: TaggedToken[]) => void,
  ): Promise<void>;  // resolves when job completes or is superseded
  onDownloadProgress(cb: (engineId: string, loaded: number, total: number) => void): void;
}
```

Callbacks cross the boundary with `Comlink.proxy()`. `core/lang-detect.ts`: Unicode-script heuristic first (Han → zh, Hiragana/Katakana → ja, Hangul → ko, else run [`franc-min`](https://github.com/wooorm/franc) on the first ~2 kB), user override wins. Note: Han-only text can be ja — if Hiragana/Katakana present → ja, else zh.

## 6. Stores (Pinia)

| Store | State | Notes |
|---|---|---|
| `stores/document.ts` | `input`, `mode`, `langOverride`, `detectedLang`, `segments`, `tagsBySegment: Map<string, TaggedToken[]>`, `status: 'idle'\|'tagging'\|'done'\|'error'`, `jobId` | Orchestrates: input change → debounce 400 ms → extractSegments → worker.tagSegments → incremental renderHtml → sanitized html ref |
| `stores/settings.ts` | `theme` (per-tag color/enabled/fontStyle for light+dark), `activePreset`, `font`, `fontSize`, `lineHeight`, `columnWidth`, `darkMode: 'auto'\|'light'\|'dark'` | Persist to localStorage key `readion:settings:v1` (versioned, with migration guard). Applies theme by writing CSS custom properties to `:root` |
| `stores/engines.ts` | `available: EngineMeta[]`, `loaded: string[]`, `downloads: Map<string, {loaded,total}>`, `preferred: 'fast'\|'accurate'` | Wraps worker engine APIs |

## 7. Rendering & performance strategy

- Debounce input 400 ms; re-render output pane on each segment result batch (batch via `requestAnimationFrame` coalescing).
- Chunking: `core/chunking.ts` groups segments into worker batches of ~2,000 chars so first-screen results return fast.
- Very long docs: cap live render at first ~200k chars; beyond that require explicit "process whole document" click (guard against multi-MB pastes). Virtualized output is backlog.
- Theme changes touch CSS variables only — zero re-tagging, zero re-render.
- Output pane uses one `v-html` binding of sanitized HTML. Tooltips (F2.3) via event delegation on the pane (`data-upos` lookup), not per-span listeners.

## 8. PWA / caching

- vite-plugin-pwa (Workbox, `registerType: 'autoUpdate'`): precache app shell + all build chunks (includes wink model chunk → English offline out of the box).
- jieba/kuromoji dictionary assets served from `public/` → Workbox `CacheFirst` runtime route on first use.
- Tier-2 ONNX models: transformers.js built-in browser cache (Cache Storage `transformers-cache`). Engine Manager lists/deletes via Cache API + `navigator.storage.estimate()`; request `navigator.storage.persist()` after first model download.
- transformers.js config: `env.allowLocalModels` as needed; models fetched from Hugging Face CDN by default, overridable to self-hosted `/models/` path via a build-time env var (`VITE_MODELS_BASE_URL`).

## 9. Error handling

- Engine load failure → toast + fall back to `resolve(lang,'fast')` alternative if any; document stays readable uncolored.
- WebGPU init failure → automatic WASM fallback (transformers.js `device` option), log once to console, surface "running in compatibility mode" hint in Engine Manager.
- Unknown language → default to English engine with a dismissible notice.
- Worker crash → restart worker, re-dispatch current job (max 1 retry), then error state with reload suggestion.
