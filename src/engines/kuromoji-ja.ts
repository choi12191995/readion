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

      const kuromoji = await import('kuromoji' as string) as {
        default?: { builder: (opts: { dicPath: string }) => KuromojiBuilder };
        builder?: (opts: { dicPath: string }) => KuromojiBuilder;
      };

      const builderFn = kuromoji.default?.builder ?? kuromoji.builder;
      if (!builderFn) throw new Error('kuromoji module has no builder function');

      const dicPath = `${import.meta.env.BASE_URL}dict/kuromoji/`;

      tokenizer = await new Promise<KuromojiTokenizer>((resolve, reject) => {
        builderFn({ dicPath }).build((err, tok) => {
          if (err) reject(err);
          else resolve(tok);
        });
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
