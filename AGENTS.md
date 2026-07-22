# CLAUDE.md — Agent Guide for Readion

Readion is a frontend-only Vue 3 PWA that syntax-highlights human language by part of speech. Read `docs/01-product-spec.md` for what to build and `docs/05-workplan.md` for your assigned ticket. **Only touch files owned by your ticket** (ownership listed per ticket) to avoid conflicts with parallel agents.

## Commands

```bash
pnpm install          # Node >= 20, pnpm >= 9
pnpm dev              # Vite dev server
pnpm build            # production build (must pass with 0 type errors)
pnpm typecheck        # vue-tsc --noEmit
pnpm lint             # eslint . --fix
pnpm test             # vitest run (unit)
pnpm test:e2e         # playwright test
```

## Hard rules (guardrails)

1. **No backend. Ever.** No API calls except static asset/model downloads (Hugging Face CDN or `/models/`). No analytics, no telemetry, no accounts.
2. **User text never leaves the device.** No network request may contain user input.
3. **All engine output must be normalized to the 17 UPOS tags** defined in `src/core/upos.ts`. Never leak engine-native tags (Penn Treebank, jieba, IPAdic) outside an engine module.
4. **Never render unsanitized HTML.** Every HTML string that reaches the DOM goes through DOMPurify in `src/core/sanitize.ts`.
5. **Tagging runs in the Web Worker**, never on the main thread.
6. **Never commit model/dictionary binaries** to git. They are npm deps, `public/` assets fetched at build time, or runtime downloads.
7. **Bundle budget:** initial JS ≤ 300 KB gzip (engines excluded — engines are lazy-loaded chunks).
8. **Do not add dependencies** beyond those listed in `docs/06-conventions-testing.md` without flagging it in your PR/summary.
9. Keep the tone of user-facing copy modest: Readion is a reading *aid*; no speed-reading or medical claims.

## Conventions (summary — full version in docs/06)

- Vue 3 Composition API, `<script setup lang="ts">` only. TypeScript strict, no `any`.
- Files kebab-case; components PascalCase (`ReaderView.vue`); Pinia stores `use*Store`.
- CSS: plain CSS + custom properties (no Tailwind/UI framework). Theme vars: `--pos-noun`, `--pos-verb`, … POS span classes: `pos-noun`, plus `data-upos="NOUN"`.
- Conventional commits (`feat:`, `fix:`, `docs:`…).
- Definition of done: typecheck + lint + tests pass, acceptance criteria of your ticket met, no console errors/warnings in dev.

## Repo layout

```
src/
├─ components/   # UI components (see docs/04)
├─ views/        # ReaderView, SettingsView, AboutView
├─ core/         # upos.ts, markdown.ts, sanitize.ts, lang-detect.ts, chunking.ts
├─ engines/      # types.ts, registry.ts, wink-en.ts, jieba-zh.ts, kuromoji-ja.ts, onnx.ts
├─ workers/      # tagger.worker.ts (Comlink)
├─ stores/       # settings.ts, document.ts, engines.ts
├─ themes/       # preset JSON files
└─ router/
tests/           # unit fixtures per language
e2e/             # Playwright specs
public/models/   # (gitignored contents) optional self-hosted dictionaries/models
```

## Key contracts (do not change without updating docs/02)

- `TaggerEngine`, `EngineMeta`, `TaggedToken`, `UPos` — `src/engines/types.ts` / `src/core/upos.ts`, defined verbatim in `docs/02-architecture.md` §3.
- Markdown pipeline: `extractSegments()` / `renderHtml()` — `docs/02-architecture.md` §4.
- Worker API — `docs/02-architecture.md` §5.
