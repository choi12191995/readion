import type { UPos } from '../../core/upos';

/**
 * Map jieba/ICTCLAS POS flags to Universal POS tags.
 * Match on prefix (first letter/letters) for flag families.
 */
const EXACT_MAP: Record<string, UPos> = {
  // Nouns
  n: 'NOUN',
  nz: 'NOUN',
  ng: 'NOUN',
  nr: 'PROPN',
  ns: 'PROPN',
  nt: 'PROPN',
  nrt: 'PROPN',
  nrfg: 'PROPN',
  t: 'NOUN',
  s: 'NOUN',
  f: 'NOUN',
  vn: 'NOUN',
  an: 'NOUN',

  // Verbs
  v: 'VERB',
  vg: 'VERB',
  vd: 'VERB',
  vi: 'VERB',

  // Adjectives
  a: 'ADJ',
  ag: 'ADJ',
  ad: 'ADJ',

  // Adverbs
  d: 'ADV',
  dg: 'ADV',

  // Other
  m: 'NUM',
  mq: 'NUM',
  q: 'NOUN',
  r: 'PRON',
  p: 'ADP',
  c: 'CCONJ',
  u: 'PART',
  xc: 'PART',
  y: 'PART',
  e: 'INTJ',
  o: 'INTJ',
  w: 'PUNCT',
  x: 'PUNCT',
  eng: 'X',
};

/**
 * Resolve a jieba POS flag to a UPOS tag.
 * Tries exact match first, then first-letter prefix match.
 */
export function jiebaToUPos(flag: string): UPos {
  const exact = EXACT_MAP[flag];
  if (exact) return exact;

  // Prefix fallback: try first 2 chars, then first char
  if (flag.length >= 2) {
    const prefix2 = EXACT_MAP[flag.slice(0, 2)];
    if (prefix2) return prefix2;
  }

  if (flag.length >= 1) {
    const prefix1 = EXACT_MAP[flag[0]!];
    if (prefix1) return prefix1;
  }

  return 'X';
}
