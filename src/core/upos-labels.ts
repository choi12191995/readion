import type { UPos } from './upos';

export interface UPosLabel {
  tag: UPos;
  name: string;
  description: string;
  example: string;
}

/** Human-readable labels, descriptions and examples for each UPOS tag. */
export const UPOS_LABELS: Record<UPos, UPosLabel> = {
  ADJ: {
    tag: 'ADJ',
    name: 'adjective',
    description: 'Describes or modifies a noun.',
    example: 'the **big** dog',
  },
  ADP: {
    tag: 'ADP',
    name: 'adposition',
    description: 'Connects a noun phrase to another word (prepositions, postpositions).',
    example: 'went **to** the store',
  },
  ADV: {
    tag: 'ADV',
    name: 'adverb',
    description: 'Modifies a verb, adjective, or another adverb.',
    example: 'runs **quickly**',
  },
  AUX: {
    tag: 'AUX',
    name: 'auxiliary',
    description: 'Helps form tense, mood, or voice of another verb.',
    example: 'she **has** gone',
  },
  CCONJ: {
    tag: 'CCONJ',
    name: 'coordinating conjunction',
    description: 'Connects words or phrases of equal status.',
    example: 'cats **and** dogs',
  },
  DET: {
    tag: 'DET',
    name: 'determiner',
    description: 'Introduces or quantifies a noun.',
    example: '**the** cat, **some** water',
  },
  INTJ: {
    tag: 'INTJ',
    name: 'interjection',
    description: 'An exclamation or filler word.',
    example: '**oh**, I see',
  },
  NOUN: {
    tag: 'NOUN',
    name: 'noun',
    description: 'A person, place, thing, or concept.',
    example: 'the **cat** sat on the **mat**',
  },
  NUM: {
    tag: 'NUM',
    name: 'numeral',
    description: 'A number or numeric expression.',
    example: '**three** cats, **42** answers',
  },
  PART: {
    tag: 'PART',
    name: 'particle',
    description: 'A function word that does not fit other categories.',
    example: 'do **not** go, to **\'s** (possessive)',
  },
  PRON: {
    tag: 'PRON',
    name: 'pronoun',
    description: 'Stands in for a noun.',
    example: '**she** went home, **it** is raining',
  },
  PROPN: {
    tag: 'PROPN',
    name: 'proper noun',
    description: 'The name of a specific entity.',
    example: '**Alice** visited **Paris**',
  },
  PUNCT: {
    tag: 'PUNCT',
    name: 'punctuation',
    description: 'A punctuation mark.',
    example: 'Hello**,** world**!**',
  },
  SCONJ: {
    tag: 'SCONJ',
    name: 'subordinating conjunction',
    description: 'Introduces a subordinate clause.',
    example: '**if** you come, **because** I said so',
  },
  SYM: {
    tag: 'SYM',
    name: 'symbol',
    description: 'A symbol like $, %, or emoji.',
    example: '10**%**, **$**5',
  },
  VERB: {
    tag: 'VERB',
    name: 'verb',
    description: 'An action, state, or occurrence.',
    example: 'she **runs**, they **built** a house',
  },
  X: {
    tag: 'X',
    name: 'other',
    description: 'A word that cannot be assigned a POS tag.',
    example: 'foreign words, typos',
  },
};
