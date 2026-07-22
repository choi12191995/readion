# 06 · Conventions, Dependencies & Testing — Readion

## 1. Code conventions

- **Language:** TypeScript strict (`"strict": true`, `noUncheckedIndexedAccess: true`). No `any`, no `@ts-ignore` (use `@ts-expect-error` with a comment if unavoidable).
- **Vue:** Composition API with `<script setup lang="ts">` only. Props/emits fully typed. No Options API, no mixins.
- **Naming:** files kebab-case (`lang-detect.ts`); components PascalCase (`ReaderView.vue`); composables `useX`; Pinia stores `useXStore` in `src/stores/x.ts`.
- **Styling:** plain CSS. Component-scoped styles in SFCs; global tokens in `src/styles/tokens.css`. No CSS framework, no preprocessor. Theme via CSS custom properties only (docs/04 §3).
- **Imports:** path alias `@/` → `src/`. Engine modules and views are dynamic imports (route-level code splitting).
- **Errors:** never swallow; surface via `ToastHost` or status state. `console.error` allowed only alongside user-visible handling.
- **Comments:** explain *why*, not *what*. Public contracts get TSDoc.
- **Commits:** Conventional Commits. One ticket = one PR/branch (`t05-wink-en`).

## 2. Dependency allowlist (v1)

Runtime: `vue`, `vue-router`, `pinia`, `markdown-it`, `dompurify`, `comlink`, `franc-min`, `wink-nlp`, `wink-eng-lite-web-model`, `jieba-wasm` (or `@isdk/nlp-jieba`), `kuromoji` (or maintained fork), `@huggingface/transformers`.
Dev: `vite`, `@vitejs/plugin-vue`, `vite-plugin-pwa`, `typescript`, `vue-tsc`, `vitest`, `@vue/test-utils`, `playwright`, `@axe-core/playwright`, `eslint` + vue/ts plugins, `prettier`, `rollup-plugin-visualizer`.

Anything else: flag in PR summary with justification. Prefer zero-dependency solutions for small utilities (e.g., write the contrast checker by hand, don't add a color lib).

## 3. Testing strategy

### Unit (Vitest)
- `core/`: UPOS guards, lang-detect fixtures, chunking edges, sanitize allowlist (XSS payload fixtures: `<script>`, `<img onerror>`, `javascript:` hrefs, `style` attrs — all stripped; `pos-*` spans preserved).
- `core/markdown`: fixture-based snapshot + property test (docs/05 T3).
- Engines: **shared contract suite** `tests/engines/contract.spec.ts` parameterized over every engine — invariants: output tags ∈ `UPOS_TAGS`; offsets ascending, non-overlapping, within bounds; CJK engines exactly tile input; same input twice → identical output. Plus per-engine fixtures (≥ 20 sentences with expected tags) and mapping-table unit tests.
- Themes: JSON schema validation; automated WCAG contrast ≥ 4.5:1 for every enabled tag color in every preset against its background (`#FFFFFF` / `#1E1E1E`) — implement relative-luminance math in the test, no dependency.
- Stores: settings persistence/migration (unknown version → defaults + console warning, never crash).

### Component (Vitest + @vue/test-utils)
Legend toggling, theme editor live CSS-var updates, engine manager states (available/downloading/installed), import/export round-trip, tooltip content from `data-upos`.

### E2E (Playwright — chromium, firefox, webkit)
1. Paste EN markdown sample → colored spans present, `pre code` descendants contain no `.pos-*` spans, first color < 1 s.
2. Upload `.md` file via file chooser and via drag-drop.
3. ZH + JA samples → correct script handling, colored output (after dictionary load).
4. Theme: switch preset, edit NOUN color, reload → persisted.
5. Offline: `context.setOffline(true)` after first load → EN flow fully works (service worker).
6. ONNX download flow with a mocked/tiny model route (`page.route` stub HF CDN in CI) → progress UI, then tagging path exercised.
7. Accessibility: axe scan on all views, no serious/critical violations.
8. Security: markdown containing raw HTML/script payloads renders inert.

### Performance guards (CI)
- Bundle: entry JS ≤ 300 KB gzip (visualizer + size-limit check); engine code absent from entry chunk.
- Long-task audit in e2e #1 with a 50k-word fixture: no main-thread task > 200 ms during tagging.

## 4. CI pipeline (`.github/workflows/ci.yml`)

`install → typecheck → lint → test (unit/component) → build → size check → e2e (3 browsers) → upload artifact`. Deploy job (T13): on `main`, build + deploy to GitHub Pages. All jobs must pass before merge (branch protection recommended).

## 5. Definition of done (every ticket)

1. Acceptance criteria of the ticket met and demonstrated by an automated test where feasible.
2. `pnpm typecheck && pnpm lint && pnpm test && pnpm build` green locally and in CI.
3. No new console errors/warnings in dev on the happy path.
4. Only owned paths modified (docs/05); contract changes reflected in docs/02 in the same PR.
5. Public functions of touched modules have TSDoc; README/docs updated if user-visible behavior changed.
6. No user text in any network request (verify in devtools for features touching workers/engines).
