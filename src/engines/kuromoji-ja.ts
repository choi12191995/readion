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

interface KuromojiBuilder {
  build(callback: (err: Error | null, tokenizer: KuromojiTokenizer) => void): void;
}

interface KuromojiModule {
  builder: (opts: { dicPath: string }) => KuromojiBuilder;
}

/**
 * Japanese POS tagger using kuromoji.js with IPAdic dictionary.
 * Dictionary files are served from /dict/kuromoji/ and cached by the service worker.
 */
export function createEngine(): TaggerEngine {
  let tokenizer: KuromojiTokenizer | null = null;
  let loaded = false;

  return {
    meta,

    async load() {
      if (loaded) return;

      // Dynamic import — kuromoji is a CJS module
      const kuromojiMod = await import('kuromoji' as string);
      const kuromoji: KuromojiModule = (kuromojiMod.default ?? kuromojiMod) as KuromojiModule;

      if (!kuromoji.builder) {
        throw new Error('kuromoji module has no builder function');
      }

      // Resolve dictionary path — must end with /
      // In worker context, import.meta.url points to the worker script
      // We need an absolute URL to the dict directory
      let dicPath: string;
      try {
        // Try to construct a proper URL for the dict path
        const base = typeof self !== 'undefined' && 'location' in self
          ? self.location.origin
          : '';
        dicPath = `${base}/dict/kuromoji/`;
      } catch {
        dicPath = '/dict/kuromoji/';
      }

      tokenizer = await new Promise<KuromojiTokenizer>((resolve, reject) => {
        try {
          kuromoji.builder({ dicPath }).build((err, tok) => {
            if (err) reject(err);
            else resolve(tok);
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
