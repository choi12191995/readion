import type { TaggerEngine, EngineMeta } from './types';
import type { TaggedToken } from '../core/upos';
import { jiebaToUPos } from './mappings/jieba-upos';

const meta: EngineMeta = {
  id: 'jieba-zh',
  label: 'Chinese (jieba)',
  languages: ['zh'],
  tier: 1,
  downloadBytes: 0,
};

/**
 * Chinese POS tagger using jieba-wasm.
 * Segments Chinese text into words and assigns ICTCLAS-style POS flags,
 * then maps to UPOS.
 */
export function createEngine(): TaggerEngine {
  let jiebaModule: typeof import('jieba-wasm') | null = null;
  let loaded = false;

  return {
    meta,

    async load() {
      if (loaded) return;
      const mod = await import('jieba-wasm');
      // Initialize the WASM module with explicit URL that works in both dev and prod
      if (typeof mod.default === 'function') {
        const base = typeof self !== 'undefined' && 'location' in self
          ? self.location.origin
          : '';
        const wasmUrl = `${base}/wasm/jieba_rs_wasm_bg.wasm`;
        await mod.default(wasmUrl);
      }
      jiebaModule = mod;
      loaded = true;
    },

    isLoaded() {
      return loaded;
    },

    async tag(text: string): Promise<TaggedToken[]> {
      if (!jiebaModule) throw new Error('jieba-zh engine not loaded. Call load() first.');

      const tokens: TaggedToken[] = [];

      try {
        // Use jieba tag function for POS tagging
        const results = jiebaModule.tag(text);
        let offset = 0;

        for (const { word, tag } of results) {
          const idx = text.indexOf(word, offset);
          const start = idx >= 0 ? idx : offset;
          const end = start + word.length;

          tokens.push({
            text: word,
            upos: jiebaToUPos(tag),
            start,
            end,
          });

          offset = end;
        }
      } catch {
        // Fallback: use cut function for word segmentation only
        try {
          const words = jiebaModule.cut(text, true);
          let offset = 0;
          for (const word of words) {
            const idx = text.indexOf(word, offset);
            const start = idx >= 0 ? idx : offset;
            const end = start + word.length;
            tokens.push({ text: word, upos: 'X', start, end });
            offset = end;
          }
        } catch {
          // Last resort: character-by-character
          for (let i = 0; i < text.length; i++) {
            tokens.push({ text: text[i]!, upos: 'X', start: i, end: i + 1 });
          }
        }
      }

      return tokens;
    },
  };
}
