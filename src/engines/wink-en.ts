import type { TaggerEngine, EngineMeta } from './types';
import type { TaggedToken, UPos } from '../core/upos';
import { isUPos } from '../core/upos';

const meta: EngineMeta = {
  id: 'wink-en',
  label: 'English (fast)',
  languages: ['en'],
  tier: 1,
  downloadBytes: 0,
};

/**
 * English POS tagger powered by wink-nlp + wink-eng-lite-web-model.
 * wink outputs UPOS-style tags via `its.pos`; we verify and coerce unknowns to 'X'.
 */
export function createEngine(): TaggerEngine {
  let nlp: ReturnType<typeof import('wink-nlp')['default']> | null = null;
  let loaded = false;

  return {
    meta,

    async load() {
      if (loaded) return;
      const [winkNLP, model] = await Promise.all([
        import('wink-nlp').then((m) => m.default),
        import('wink-eng-lite-web-model').then((m) => m.default),
      ]);
      nlp = (winkNLP as (model: unknown) => typeof nlp)(model);
      loaded = true;
    },

    isLoaded() {
      return loaded;
    },

    async tag(text: string): Promise<TaggedToken[]> {
      if (!nlp) throw new Error('wink-en engine not loaded. Call load() first.');

      const doc = nlp.readDoc(text);
      const its = nlp.its;
      const tokens: TaggedToken[] = [];

      doc.tokens().each((token) => {
        const value = token.out(its.value) as string;
        const rawPos = token.out(its.pos) as string;
        const span = token.out(its.span) as unknown as [number, number];

        const upos: UPos = isUPos(rawPos) ? rawPos : 'X';
        const start = span[0] ?? 0;
        const end = (span[1] ?? start) + 1; // wink span end is inclusive

        tokens.push({ text: value, upos, start, end });
      });

      return tokens;
    },
  };
}
