# Readion

**Rapid & Easy** — read text the way developers read code.

Readion colors words by their part of speech (nouns, verbs, adjectives…), the same way an IDE syntax-highlights code. Paste text or Markdown, get a highlighted reading view, customize your own color theme. Works fully offline, in your browser, with no backend and no account.

> Readion is a reading and learning aid. Color-coded grammar can make structure easier to see — helpful for language learners, grammar teaching, editing, and readers who benefit from visual anchors. It may help some readers read faster; we make no medical or scientific speed-reading claims.

## Features

- Paste or upload plain text / Markdown — Markdown formatting is preserved, words gain color
- Syntax highlighting for human language, normalized to the 17 [Universal POS tags](https://universaldependencies.org/u/pos/)
- Fully customizable themes (per-tag color/toggle, light/dark, colorblind-safe presets, import/export)
- Multi-language: English, Chinese, Japanese built in
- 100% client-side: offline PWA, no server, no telemetry, your text never leaves your device

## Quickstart

```bash
# Requirements: Node >= 20, pnpm >= 9
pnpm install
pnpm dev        # http://localhost:5173
```

## Commands

```bash
pnpm dev        # Vite dev server
pnpm build      # production build
pnpm typecheck  # vue-tsc --noEmit
pnpm lint       # eslint . --fix
pnpm test       # vitest run (unit)
pnpm test:e2e   # playwright test
```

## Tech Stack

Vue 3 · TypeScript · Vite · Pinia · vite-plugin-pwa · markdown-it · DOMPurify · Comlink · wink-nlp (English) · jieba-wasm (Chinese) · kuromoji.js (Japanese)

## Architecture

All processing runs client-side in a Web Worker. See the [architecture doc](./docs/02-architecture.md) for details.

```
Input → markdown-it parser → text segments → Web Worker (POS tagging) → colored HTML → DOMPurify → rendered output
```

Engines are lazy-loaded chunks — only the engine for your language is downloaded.

## Project Documents

| Doc | Purpose |
|---|---|
| [AGENTS.md](./AGENTS.md) | Guide for coding agents: commands, conventions, guardrails |
| [docs/01-product-spec.md](./docs/01-product-spec.md) | Product requirements, features, acceptance criteria |
| [docs/02-architecture.md](./docs/02-architecture.md) | Architecture, module contracts, data flow |
| [docs/03-engines.md](./docs/03-engines.md) | Tagger engine specs and UPOS mappings |
| [docs/04-ui-theming.md](./docs/04-ui-theming.md) | Pages, components, theme system, palettes |
| [docs/05-workplan.md](./docs/05-workplan.md) | Milestones + parallel workstream tickets |
| [docs/06-conventions-testing.md](./docs/06-conventions-testing.md) | Code style, testing strategy, definition of done |

## License

MIT
