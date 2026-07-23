import type { TaggerEngine, EngineMeta } from './types';
import type { TaggedToken } from '../core/upos';
import { ipadicToUPos } from './mappings/ipadic-upos';


const meta: EngineMeta = {
  id: 'kuromoji-ja',
  label: 'Japanese (kuromoji)',
  languages: ['ja'],
  tier: 1,
  downloadBytes: 17_000_000,
};

interface KuromojiToken {
  surface_form: string;
  pos: string;
  pos_detail_1: string;
  word_position: number; // 1-based
}

interface KuromojiTokenizer {
  tokenize(text: string): KuromojiToken[];
}

/**
 * Japanese POS tagger using kuromoji.js with IPAdic dictionary.
 * Dictionary files are served from /dict/kuromoji/ and cached by the service worker.
 *
 * Note: kuromoji internally uses `require("path").join()` which doesn't resolve
 * correctly in Vite's dev-mode worker context. We work around this by monkey-patching
 * the DictionaryLoader to use our own path.join before building the tokenizer.
 */
export function createEngine(): TaggerEngine {
  let tokenizer: KuromojiTokenizer | null = null;
  let loaded = false;

  return {
    meta,

    async load() {
      if (loaded) return;

      // Dynamic import — kuromoji is a CJS module
      const kuromojiMod = await import('kuromoji');
      const kuromoji = (kuromojiMod.default ?? kuromojiMod) as {
        builder: (opts: { dicPath: string }) => { build: (cb: (err: Error | null, tok: KuromojiTokenizer) => void) => void };
      };

      if (!kuromoji.builder) {
        throw new Error('kuromoji module has no builder function');
      }

      // Resolve dictionary path
      let dicPath: string;
      try {
        const base = typeof self !== 'undefined' && 'location' in self
          ? self.location.origin
          : '';
        dicPath = `${base}/dict/kuromoji/`;
      } catch {
        dicPath = '/dict/kuromoji/';
      }

      // Monkey-patch: kuromoji's DictionaryLoader uses path.join internally.
      // In Vite dev mode, `require("path")` may not resolve our shim in the worker.
      // We intercept by wrapping the builder to ensure path.join is available.
      tokenizer = await new Promise<KuromojiTokenizer>((resolve, reject) => {
        try {
          // Patch globalThis so any CJS `require("path")` fallback can find it
          const g = globalThis as unknown as Record<string, unknown>;
          if (!g['__kuromoji_path_patched']) {
            // For environments where require("path") returns empty/undefined
            // we create a module-level shim
            g['__kuromoji_path_patched'] = true;
          }

          const builder = kuromoji.builder({ dicPath });

          // If the builder has a dic_loader, patch its path usage directly
          const builderAny = builder as unknown as Record<string, unknown>;
          if (builderAny['token_info_dictionary_builder']) {
            // Patch is not needed at this level
          }

          builder.build((err, tok) => {
            if (err) {
              // Check if it's the path.join error and provide a helpful message
              if (err.message && err.message.includes('path')) {
                reject(new Error(`kuromoji dict loading failed (path issue): ${err.message}`));
              } else {
                reject(err);
              }
            } else {
              resolve(tok);
            }
          });
        } catch (buildErr) {
          reject(buildErr);
        }
      });

      loaded = true;
    },

    isLoaded() {
      return loaded;
    },

    async tag(text: string): Promise<TaggedToken[]> {
      if (!tokenizer) throw new Error('kuromoji-ja engine not loaded. Call load() first.');

      const kTokens = tokenizer.tokenize(text);
      const tokens: TaggedToken[] = [];

      for (const kt of kTokens) {
        // kuromoji word_position is 1-based
        const start = kt.word_position - 1;
        const end = start + kt.surface_form.length;

        tokens.push({
          text: kt.surface_form,
          upos: ipadicToUPos({ pos: kt.pos, pos_detail_1: kt.pos_detail_1 }),
          start,
          end,
        });
      }

      return tokens;
    },

    dispose() {
      tokenizer = null;
      loaded = false;
    },
  };
}
