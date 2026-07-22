/** The 17 Universal POS tags (Universal Dependencies v2). */
export const UPOS_TAGS = [
  'ADJ', 'ADP', 'ADV', 'AUX', 'CCONJ', 'DET', 'INTJ', 'NOUN', 'NUM',
  'PART', 'PRON', 'PROPN', 'PUNCT', 'SCONJ', 'SYM', 'VERB', 'X',
] as const;

export type UPos = typeof UPOS_TAGS[number];

const uposSet = new Set<string>(UPOS_TAGS);

/** Type-guard: returns true if the string is a valid UPOS tag. */
export function isUPos(tag: string): tag is UPos {
  return uposSet.has(tag);
}

/**
 * A single tagged token: surface text, its UPOS tag, and character offsets
 * relative to the segment text passed to `tag()`.
 */
export interface TaggedToken {
  /** Surface form as it appears in the segment. */
  text: string;
  /** Universal POS tag. */
  upos: UPos;
  /** Start char offset within its segment (UTF-16 code units). */
  start: number;
  /** End char offset, exclusive. */
  end: number;
}
