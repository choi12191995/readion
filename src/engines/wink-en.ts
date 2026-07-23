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

      // Track character offset to compute correct positions in the original text.
      // wink-nlp's its.span gives token-level indices, not character offsets,
      // so we locate each token's text in the original string instead.
      let charOffset = 0;

      doc.tokens().each((token) => {
        const value = token.out(its.value) as string;
        const rawPos = token.out(its.pos) as string;

        const upos: UPos = isUPos(rawPos) ? rawPos : 'X';

        // Find this token in the original text, starting from our current offset
        const idx = text.indexOf(value, charOffset);
        const start = idx >= 0 ? idx : charOffset;
        const end = start + value.length;

        tokens.push({ text: value, upos, start, end });
        charOffset = end;
      });

      return tokens;
    },
  };
}
