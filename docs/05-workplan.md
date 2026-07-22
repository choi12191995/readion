# 05 · Workplan — Milestones & Multi-Agent Tickets

Designed for parallel coding agents. Each ticket lists **owned paths** (only that ticket writes there), **depends on**, and **acceptance criteria**. Contracts in docs/02 are frozen: if a ticket needs a contract change, stop and update docs/02 first (single owner: whoever holds T2).

## Dependency graph

```
T1 scaffold ──► T2 core contracts ──┬─► T3 markdown pipeline ─┐
                                    ├─► T4 worker harness ────┤
                                    ├─► T5 wink-en ───────────┤
                                    ├─► T6 jieba-zh ──────────┼─► T10 integration & ReaderView wiring
                                    ├─► T7 kuromoji-ja ───────┤        │
                                    ├─► T8 onnx engine ───────┤        ▼
                                    └─► T9 UI shell/settings ─┘   T11 PWA/offline ─► T12 QA/e2e ─► T13 docs/release
```

Parallel waves: **Wave 1:** T1. **Wave 2:** T2. **Wave 3 (parallel):** T3, T4, T5, T6, T7, T8, T9. **Wave 4:** T10, T11. **Wave 5:** T12, T13.

---

### T1 · Project scaffold & CI
- **Owns:** repo root configs (`package.json`, `vite.config.ts`, `tsconfig*`, eslint/prettier, `.github/workflows/ci.yml`, `index.html`), `src/main.ts`, `src/router/`, empty view shells.
- **Depends:** —
- **Do:** pnpm + Vite + Vue 3 + TS strict + Pinia + Vue Router + vite-plugin-pwa + Vitest + Playwright + ESLint(flat)/Prettier. Routes `/`, `/settings`, `/about` with placeholder views. CI: install → typecheck → lint → test → build → e2e (chromium).
- **Accept:** `pnpm dev/build/typecheck/lint/test/test:e2e` all run green on the empty shell; CI passes.

### T2 · Core contracts & utilities
- **Owns:** `src/core/upos.ts`, `upos-labels.ts`, `src/engines/types.ts`, `src/engines/registry.ts` (stub list), `src/core/lang-detect.ts`, `src/core/chunking.ts`, `src/core/sanitize.ts`.
- **Depends:** T1.
- **Do:** implement exactly per docs/02 §2–3, §5 (lang-detect), DOMPurify profile per docs/02 §4. Registry with dynamic-import map, engines may be unimplemented stubs that throw.
- **Accept:** unit tests: UPOS type guard, lang-detect fixtures (en/zh/ja/ko/fr samples, Han-vs-kana rule), sanitize allowlist (script/style/event-handler stripped, pos spans kept), chunking boundaries.

### T3 · Markdown pipeline
- **Owns:** `src/core/markdown.ts`, `tests/core/markdown.spec.ts`, `tests/fixtures/markdown/`.
- **Depends:** T2.
- **Do:** `extractSegments` / `renderHtml` per docs/02 §4, markdown + plain modes.
- **Accept:** fixture suite incl. headings, nested lists, tables, blockquotes, links, images, inline code, fenced code, mixed CJK; property test (render with empty tag map ≡ plain markdown-it render modulo spans); code content never appears in segments; deterministic segment ids; round-trip offsets valid.

### T4 · Worker harness
- **Owns:** `src/workers/tagger.worker.ts`, `src/workers/client.ts` (main-thread Comlink wrapper), worker-related Vite config additions (coordinate with T1 owner if `vite.config.ts` edit needed).
- **Depends:** T2.
- **Do:** `TaggerWorkerApi` per docs/02 §5: job supersession (jobId), per-segment streaming callbacks, engine load/delete/progress plumbing, crash-restart wrapper in `client.ts`.
- **Accept:** unit/integration tests with a fake engine: streaming order, stale-job cancellation, progress events, one retry after simulated worker crash.

### T5 · Engine: wink-en  ·  T6 · Engine: jieba-zh  ·  T7 · Engine: kuromoji-ja  ·  T8 · Engine: onnx
- **Owns (each):** `src/engines/<id>.ts`, its `src/engines/mappings/*`, `tests/engines/<id>.spec.ts`, fixtures; T8 also `src/engines/onnx-manifest.ts` + `MODELS.md`. Each ticket registers itself in the registry list (append-only edit — one line, coordinate via separate PRs).
- **Depends:** T2 (T8 also benefits from T4's progress plumbing but can develop against the interface).
- **Do:** per docs/03 (E1–E4). T7 must document dictionary asset placement (`public/dict/kuromoji/`). T8: WebGPU→WASM fallback, sub-word aggregation, seq-length chunking, 4 launch languages in manifest.
- **Accept (each):** shared contract test suite passes (offset tiling, tags ∈ UPOS, deterministic); ≥ 20-sentence fixture with expected UPOS ≥ 90% match for Tier 1 (fixtures written to be unambiguous), exact-match for mapping unit tests; engine chunk lazy-loads (bundle analyzer shows no engine code in entry chunk). T8: model download progress events fire; works offline after first download (dev-tools offline check).

### T9 · UI shell, settings, theming
- **Owns:** `src/components/`, `src/views/`, `src/stores/settings.ts`, `src/themes/*.json`, global CSS, `src/stores/engines.ts` (UI-facing; against T4's client interface).
- **Depends:** T2 (types only) — builds against mocked worker client + mocked tags.
- **Do:** everything in docs/04: AppShell, ReaderView layout w/ panes + toolbar + legend + status, SettingsView with ThemeEditor + presets (exact palettes), EngineManager, AboutView, tooltip, toasts, print CSS, a11y, localStorage persistence with versioned key.
- **Accept:** component tests (legend toggle writes store; theme edit updates CSS vars live; import/export round-trip; preset apply-confirm); axe a11y scan clean on all views; palette contrast test (≥ 4.5:1, automated) passes for all presets; Storybook not required.

### T10 · Integration — document store & wiring
- **Owns:** `src/stores/document.ts`, final ReaderView wiring (replaces T9's mocks), sample texts `src/assets/samples/` (en/zh/ja markdown).
- **Depends:** T3, T4, T5, T9 (T6–T8 plug in as they land).
- **Do:** orchestration per docs/02 §6–7: debounce, extract → tag (streamed) → incremental sanitized render, language auto-detect + override chip, engine resolution, unchanged-segment cache (id + text hash), 200k-char guard, copy-as-HTML with inline colors.
- **Accept:** e2e happy path: paste EN markdown sample → colored output < 1 s, code blocks uncolored, legend chip toggles live, typing re-colors only changed paragraph (assert via DOM node identity), 50k-word doc keeps main thread responsive (long-task audit < 200 ms tasks).

### T11 · PWA & offline
- **Owns:** PWA section of `vite.config.ts`, manifest + icons (`public/`), Workbox runtime routes, storage persistence prompts in EngineManager (with T9 owner's review).
- **Depends:** T10 (app must work first).
- **Accept:** Lighthouse PWA installable; offline reload → EN fully works; JA works offline after one JA use; ONNX language works offline after download; update flow (new SW) doesn't lose user settings.

### T12 · QA hardening & e2e suite
- **Owns:** `e2e/`, `tests/` additions, bug fixes anywhere (small diffs, after Wave-3 owners merged).
- **Depends:** T10, T11.
- **Do/Accept:** full acceptance list of docs/01 §6 automated where feasible; cross-browser run (chromium, firefox, webkit); 5 MB file guard; malformed markdown fuzz (no crash, sanitizer holds — inject `<script>`/`onerror` payload fixtures); memory check: process 3 large docs sequentially, heap returns to < 1.5× baseline.

### T13 · Docs, demo & release
- **Owns:** `README.md` (expand), `CONTRIBUTING.md`, `docs/adding-a-language.md`, screenshots/GIF, GitHub Pages deploy workflow, v0.1.0 tag + changelog.
- **Depends:** T12.
- **Accept:** public demo URL live from `main`; README quickstart verified on clean clone; contributor guide covers adding an engine + a theme.

---

## Milestone mapping

| Milestone | Tickets | Outcome |
|---|---|---|
| M1 English MVP | T1–T5, T9, T10 | Paste/upload EN text+markdown, colored, themed, offline shell |
| M2 CJK | T6, T7 | zh/ja built-in |
| M3 Neural languages | T8 | Downloadable languages, WebGPU/WASM |
| M4 Ship | T11–T13 | PWA, QA, public demo, v0.1.0 |

## Backlog (post-v1, do not build now)

Per-paragraph language detection for mixed documents · per-word manual re-tag (click to correct) · virtualized rendering for book-length docs · EPUB/PDF import · UI translations (vue-i18n) · theme gallery/sharing site · WebLLM experimental engine · browser extension · reader stats (word-class distribution charts for editors).
