# 01 · Product Spec — Readion

**Readion** ("Rapid & Easy") is an open-source, frontend-only web app that syntax-highlights human language the way IDEs highlight code: every word colored by its part of speech. Fully offline-capable, no backend, user text never leaves the device.

## 1. Problem & positioning

IDEs make code scannable through color. Prose has grammatical "types" too (noun, verb, adjective…), but is rendered monochrome. Readion colors words by part of speech to make sentence structure visible at a glance.

**Positioning (use this wording):** a reading and learning aid for language learners, grammar teaching, editing, and readers who benefit from visual anchors (e.g., some dyslexic/ADHD readers). It *may* help reading speed for some people — never claim proven speed reading (evidence for similar methods like Bionic Reading is mixed).

**Differentiation vs prior art** (MS Immersive Reader, iwl.me, Rewordify): open source + offline PWA + Markdown-preserving + fully custom themes + multilingual with on-device ML. No existing tool combines these.

## 2. Target users

1. **Language learners** (EN/ZH/JA first) — see grammar structure while reading real content.
2. **Teachers** — project color-coded text in class; share themes.
3. **Readers with dyslexia/ADHD** — visual anchoring; colorblind-safe options required.
4. **Writers/editors** — spot adverb overuse, weak verbs, noun stacking.

## 3. Functional requirements

### F1. Text input
- F1.1 Textarea for paste/typing (plain text or Markdown).
- F1.2 File upload + drag-and-drop: `.md`, `.txt`, `.markdown` (≤ 5 MB). Read via File API; never uploaded anywhere.
- F1.3 Input mode toggle: **Markdown** (default) / **Plain text**.
- F1.4 Live re-highlight, debounced ~400 ms while typing.

### F2. Highlighted output
- F2.1 Every word wrapped in a span colored by its Universal POS tag (17 tags; see docs/02 §2).
- F2.2 Markdown structure preserved: headings, bold/italic, lists, blockquotes, links, tables render normally; their *text content* is additionally POS-colored. Code blocks/inline code are **never** POS-tagged.
- F2.3 Hovering a word shows its POS in a tooltip (e.g., "quickly — ADV · adverb").
- F2.4 Legend bar showing active tag colors; clicking a legend chip toggles that tag's coloring on/off.
- F2.5 First visible content colors in < 1 s for typical inputs; long documents stream in progressively (per-paragraph).

### F3. Languages & engines
- F3.1 Built-in (bundled/lightweight, work offline immediately): English (wink-nlp), Chinese (jieba WASM), Japanese (kuromoji.js).
- F3.2 Additional languages via downloadable on-device ONNX models (transformers.js, WebGPU with WASM fallback). Explicit opt-in download with size shown and progress bar; cached for offline reuse.
- F3.3 Automatic language detection with manual override (per document).
- F3.4 Mixed-language documents: MVP tags with the single detected/selected primary language; per-paragraph detection is a later enhancement (see docs/05 backlog).
- F3.5 Optional experimental WebLLM engine is **out of scope for v1** (backlog).

### F4. Theming & settings
- F4.1 Settings page: color per POS tag, enable/disable per tag, optional bold/italic/underline per tag.
- F4.2 Presets shipped: Light, Dark, Focus (only NOUN/PROPN/VERB/ADJ/ADV/PRON colored), Colorblind-safe. Details in docs/04.
- F4.3 Reading preferences: font family (serif/sans/system), font size, line height, column width.
- F4.4 Theme import/export as JSON; settings persist in localStorage.
- F4.5 Theme changes apply instantly via CSS custom properties (no re-tagging).

### F5. Offline / PWA
- F5.1 Installable PWA; app shell + built-in engines precached — EN/ZH/JA fully offline after first visit.
- F5.2 Downloaded ONNX models cached (Cache Storage) and listed in an Engine Manager UI with sizes and a delete option.
- F5.3 Zero network requests containing user text. Only static assets and model files are ever fetched.

### F6. Export & sharing (v1-lite)
- F6.1 Copy highlighted output as rich HTML.
- F6.2 Print stylesheet (print = colored reading view only).

## 4. Non-functional requirements

| Area | Requirement |
|---|---|
| Performance | Initial bundle ≤ 300 KB gzip (engines lazy-loaded). Tag 1,000 words ≤ 500 ms with Tier-1 engines on a 2020 laptop. 100k-word doc must not freeze UI (worker + streaming). |
| Accessibility | Never rely on color alone — per-tag underline/bold available; WCAG AA contrast for all preset palettes; keyboard navigable; ARIA labels. |
| Privacy | No telemetry, no cookies, no accounts. State in localStorage/Cache Storage only. |
| Browser support | Latest Chrome/Edge/Firefox/Safari. WebGPU optional (auto-fallback to WASM). |
| i18n (UI) | v1 UI in English; strings centralized so vue-i18n can be added later (backlog: zh/ja UI). |
| License | MIT. All deps MIT/Apache-2.0/BSD compatible. |

## 5. Out of scope for v1

Backend of any kind · accounts/sync · browser extension · EPUB/PDF input · per-word manual re-tagging UI · WebLLM engine · UI translations. All tracked in docs/05 backlog.

## 6. Acceptance criteria (v1 release)

1. Paste English Markdown article → headings/bold/lists intact, words colored, code blocks untouched, in < 1 s for 1k words.
2. Upload 50k-word `.txt` → UI stays responsive, coloring streams in.
3. Chinese and Japanese sample texts tag correctly offline (after first load) with the bundled engines.
4. Download one ONNX language pack → works, survives reload offline, deletable in Engine Manager.
5. Create custom theme → persists across reload; export/import round-trips losslessly.
6. Lighthouse: PWA installable, performance ≥ 90 on the reader page (desktop).
7. `pnpm build`, `typecheck`, `lint`, `test`, `test:e2e` all green in CI.
