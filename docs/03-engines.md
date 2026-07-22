# 03 · Tagger Engines — Readion

Each engine implements `TaggerEngine` (docs/02 §3), runs only inside the worker, is a lazy dynamic-import chunk, and maps its native tagset to UPOS internally. Unit tests per engine: fixture sentences → expected UPOS sequences (see docs/06 §3).

## E1 · `wink-en` — English, Tier 1

- Deps: `wink-nlp` + `wink-eng-lite-web-model` (npm, MIT). ~1 MB gzipped, bundled as lazy chunk (precached by PWA).
- winkNLP already outputs UPOS-style tags via `its.pos` — verify against `UPOS_TAGS`, coerce unknowns to `X`.
- Offsets: use wink's token offsets (`its.offset`/span API); include punctuation tokens as `PUNCT`.
- Expected quality: ~95% accuracy, >100k tokens/s — this is the default engine and the reference implementation others copy.

## E2 · `jieba-zh` — Chinese, Tier 1

- Dep: `jieba-wasm` (or `@isdk/nlp-jieba` if plain `jieba-wasm` lacks POS in the chosen version — implementer verifies; requirement is `tag`/posseg output with word + flag). WASM binary ships in the chunk / `public/`, runtime-cached.
- Map jieba/ICTCLAS-style flags → UPOS in `engines/mappings/jieba-upos.ts`. Core mapping (fallback for prefix families — match on first letter):

| jieba | UPOS | | jieba | UPOS |
|---|---|---|---|---|
| n, nz, ng | NOUN | | v, vg, vd | VERB |
| nr | PROPN | | vn | NOUN |
| ns, nt | PROPN | | a, ag, ad | ADJ |
| t, s, f | NOUN | | an | NOUN |
| m, mq | NUM | | d, dg | ADV |
| q | NOUN | | p | ADP |
| r | PRON | | c | CCONJ |
| u (的/了/着…) | PART | | xc, y | PART |
| e | INTJ | | o | INTJ |
| w, x (punct) | PUNCT | | eng | X |
| unmatched | X | | | |

- Chinese has no spaces: offsets = cumulative char positions of segmented words. Tokens must exactly tile the input (jieba segmentation is lossless — assert in tests).

## E3 · `kuromoji-ja` — Japanese, Tier 1

- Dep: `kuromoji` npm (or maintained fork `@sglkc/kuromoji` — implementer picks the one that builds cleanly with Vite; document choice). IPADIC dictionary (~17 MB) placed in `public/dict/kuromoji/`, loaded via `dicPath`, Workbox CacheFirst → offline after first use. `downloadBytes` ≈ 17 MB (loads lazily on first JA document, not at install).
- Map IPAdic 品詞 (pos + pos_detail_1) → UPOS in `engines/mappings/ipadic-upos.ts`:

| IPAdic | UPOS |
|---|---|
| 名詞 (general) | NOUN |
| 名詞/固有名詞 | PROPN |
| 名詞/代名詞 | PRON |
| 名詞/数 | NUM |
| 動詞 | VERB |
| 形容詞 | ADJ |
| 副詞 | ADV |
| 助詞 (case/binding) | ADP (格助詞・係助詞) / SCONJ (接続助詞) / PART (others) |
| 助動詞 | AUX |
| 連体詞 | DET |
| 接続詞 | CCONJ |
| 感動詞 | INTJ |
| 記号 | PUNCT / SYM (句点・読点 → PUNCT) |
| 接頭詞・その他 | PART / X |

- Offsets from kuromoji `word_position` (1-based → convert to 0-based).

## E4 · `onnx-*` — Neural multilingual, Tier 2

- Dep: `@huggingface/transformers` (transformers.js v3+), pipeline `token-classification`, `{ device: 'webgpu' }` with automatic/explicit fallback to `'wasm'` (catch init error → retry with wasm).
- Models: per-language UPOS token-classification models from the Universal Dependencies ecosystem (e.g. the KoichiYasuoka `*-upos` family on Hugging Face), converted to quantized ONNX (q8) with HF Optimum. Model licenses must be checked per model (most are MIT/Apache; record in a `MODELS.md`).
- One engine class parameterized by a **model manifest** `src/engines/onnx-manifest.ts`:

```ts
export interface OnnxModelSpec {
  engineId: string;      // 'onnx-de'
  lang: string;          // 'de'
  label: string;
  hfRepo: string;        // 'org/model-name' (ONNX-converted repo)
  approxBytes: number;   // shown in Engine Manager before download
}
export const ONNX_MODELS: OnnxModelSpec[] = [ /* start: de, fr, es, ko; extend freely */ ];
```

- Post-processing: pipeline returns sub-word tokens with `B-`/`I-` style or plain UPOS labels and char offsets. Aggregate sub-words to words: merge consecutive tokens without intervening whitespace; word label = label of first sub-word. Strip `B-`/`I-` prefixes; anything not in `UPOS_TAGS` → `X`.
- Chunk long segments to the model's max sequence length (typically 512 tokens) with sentence-boundary-aware splitting (split on `. ! ? … 。 ！ ？` before hard cut).
- v1 ships the manifest with ~4 languages; adding a language = one manifest entry + fixture test. Keep per-model q8 size under ~150 MB; prefer distilled/base models.

## Registry resolution rules — `engines/registry.ts`

1. `resolve(lang, prefer)`: exact language match; `prefer:'fast'` → lowest tier wins; `prefer:'accurate'` → Tier 2 if available for that language, else Tier 1.
2. English default engine: `wink-en`. Unknown language: return `undefined` (caller falls back to `wink-en` + notice, per docs/02 §9).
3. `get(id)` dynamic-imports the engine module, caches the instance, calls nothing else — `load()` is invoked explicitly by callers so the UI can show progress.

## Adding a new engine (contributor guide seed)

1. Implement `TaggerEngine` in `src/engines/<id>.ts`; native→UPOS mapping in `src/engines/mappings/`.
2. Register in registry list + (Tier 2) manifest entry.
3. Add fixture tests: ≥ 20 sentences with expected UPOS, offset-tiling assertion, and the shared contract test suite (`tests/engines/contract.spec.ts` — runs every engine against invariants: ascending non-overlapping offsets, tags ∈ UPOS_TAGS, deterministic output).
