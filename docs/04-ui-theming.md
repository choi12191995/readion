# 04 · UI & Theming — Readion

Design principles: content-first (the reading pane is the product), instant feedback, calm chrome, no UI framework — hand-rolled components with plain CSS + custom properties. Must look clean, not "bootstrap-y". System font stack by default.

## 1. Pages & layout

### `/` ReaderView
- Two-pane layout ≥ 1024 px: left `InputPane` (textarea + toolbar), right `OutputPane` (rendered highlight). Draggable splitter (CSS `resize` acceptable for v1). Below 1024 px: tabbed Input/Output.
- Toolbar (top): input mode toggle (Markdown/Plain), language auto-detect chip with override dropdown, engine indicator (e.g. "English · wink"), file open button (+ whole-window drag-drop target), sample-text button ("Try a sample"), copy-HTML button, print button.
- `PosLegend` bar above output: one chip per *enabled-in-theme* tag, chip = color dot + tag label; click toggles that tag's coloring (writes `settings.theme[tag].enabled`); "all on/off" shortcut.
- Status line: word count, detected language, tagging progress ("coloring… 43%") while streaming.
- Empty state: short pitch + sample-text button + drop hint.

### `/settings` SettingsView
- Sections: **Theme** (preset picker + per-tag editor), **Reading** (font family serif/sans/system, size 14–24, line-height 1.4–2.0, column width 45–90 ch), **Engines** (opens `EngineManager`), **Data** (export/import theme JSON, reset all).
- Per-tag editor: rows of all 17 tags → enable checkbox, color swatch (native `<input type="color">`), style toggles (B/I/U). Live preview paragraph pinned alongside, re-colored instantly.
- Preset picker: Light / Dark / Focus / Colorblind-safe cards with mini-preview. Selecting a preset overwrites current theme after confirm.

### `/about` AboutView
- What Readion does, honest "reading aid, not proven speed reading" note, privacy statement (everything on-device), UPOS legend with plain-language explanations + example sentence, credits/licenses, GitHub link.

### `EngineManager` (dialog, reachable from toolbar engine chip + settings)
- Table: engine label, languages, tier badge ("built-in" / "download"), size, status (available / downloading x% / installed), action button (Download / Delete). Storage usage footer (`navigator.storage.estimate()`). Compatibility hint if WebGPU unavailable ("will run in compatibility mode").

## 2. Components inventory

`AppShell` (header: logo "Readion — Rapid & Easy", nav, dark-mode toggle) · `ReaderView` · `InputPane` · `OutputPane` · `PosLegend` · `PosTooltip` (single floating tooltip, event-delegated) · `SettingsView` · `ThemeEditor` · `PresetCard` · `EngineManager` · `AboutView` · `ToastHost` · `ProgressBar`.

## 3. Theme model

```ts
export interface TagStyle { color: string; enabled: boolean; bold: boolean; italic: boolean; underline: boolean; }
export interface Theme {
  name: string;
  version: 1;                      // schema version for import/export
  light: Record<UPos, TagStyle>;   // colors for light background
  dark: Record<UPos, TagStyle>;    // colors for dark background
}
```

- Applied as CSS custom properties on `:root`: `--pos-noun`, `--pos-propn`, `--pos-verb`, … (lowercased tag). `settings` store swaps light/dark sets based on mode.
- Output CSS (generated once, static):

```css
.pos-noun  { color: var(--pos-noun); font-weight: var(--pos-noun-fw, inherit); /* etc. */ }
/* one rule per tag; disabled tag → variable set to inherit */
```

- Export/import: `Theme` JSON, validated on import (zod or hand-rolled guard), reject unknown `version`.

## 4. Preset palettes (exact values — implement as `src/themes/*.json`)

Contrast requirement: every enabled color ≥ 4.5:1 against `#FFFFFF` (light) / `#1E1E1E` (dark). CI test asserts this (docs/06 §3). If a value below fails the automated check, darken/lighten minimally and note it in the PR.

### `light.json` (default) — background #FFFFFF, base text #24292F

| Tag | Color | | Tag | Color |
|---|---|---|---|---|
| NOUN | `#1565C0` | | ADP | `#616161` |
| PROPN | `#6A1B9A` | | DET | `#5D4037` |
| VERB | `#C62828` | | CCONJ | `#37474F` |
| AUX | `#E65100` | | SCONJ | `#37474F` |
| ADJ | `#2E7D32` | | PART | `#6D4C41` |
| ADV | `#00838F` | | INTJ | `#D81B60` |
| PRON | `#AD1457` | | NUM | `#4527A0` |
| PUNCT | inherit (disabled) | | SYM | inherit (disabled) |
| X | inherit (disabled) | | | |

### `dark.json` — background #1E1E1E, base text #D4D4D4 (VS Code Dark+ inspired)

| Tag | Color | | Tag | Color |
|---|---|---|---|---|
| NOUN | `#9CDCFE` | | ADP | `#9E9E9E` |
| PROPN | `#4EC9B0` | | DET | `#D7BA7D` |
| VERB | `#F48771` | | CCONJ | `#B0BEC5` |
| AUX | `#CE9178` | | SCONJ | `#B0BEC5` |
| ADJ | `#B5CEA8` | | PART | `#BCAAA4` |
| ADV | `#4FC1FF` | | INTJ | `#F48FB1` |
| PRON | `#C586C0` | | NUM | `#B39DDB` |
| PUNCT/SYM/X | inherit (disabled) | | | |

### `focus.json`
Same colors as light/dark but **only** NOUN, PROPN, VERB, ADJ, ADV, PRON enabled — everything else inherits. This is the recommended default preset on first run (17 colors is visual noise; Focus shows the idea best).

### `colorblind.json`
Okabe–Ito derived, adjusted for AA text contrast; additionally uses styles, not just hue: NOUN `#0072B2`, VERB `#B2182B` **+ bold**, ADJ `#117733` **+ italic**, ADV `#661100` **+ underline**, PROPN `#0072B2` + bold, PRON `#882255`; all other tags disabled. (Dark variant: lighten each ~25%, keep styles.)

First-run default: `focus` preset, dark mode `auto`.

## 5. Interaction details

- Tooltip (hover ≥ 300 ms or keyboard focus): "word — VERB · verb". Tag descriptions from `upos-labels.ts`. Touch: tap toggles tooltip.
- Debounced live typing (400 ms). While tagging, previously colored output stays; new/changed segments appear uncolored then color in (no flash-of-uncolored for unchanged segments — keyed by segment id + text hash).
- Copy as HTML: writes sanitized fragment + inline `style="color:…"` resolved from current theme (so it survives pasting into docs/email).
- Print stylesheet: hides chrome, output pane only, forces light palette.
- Keyboard: `Cmd/Ctrl+O` open file, `Cmd/Ctrl+,` settings, `Esc` closes dialogs.
- A11y: legend chips are buttons with `aria-pressed`; output pane `role="document"`; tooltips `aria-describedby`; all interactive elements focus-visible; honor `prefers-reduced-motion`.

## 6. Visual identity

- Logo/wordmark: "Readion" set in a mono-ish font with the letters themselves POS-colored (Read=verb red, ion suffix neutral) — simple SVG in `public/`; a favicon variant. Keep it minimal; a designer can replace later.
- Chrome palette: neutral grays; accent `#1565C0` (matches NOUN blue). Border radius 8 px; subtle shadows; generous whitespace. Reading pane max-width default 68 ch.
