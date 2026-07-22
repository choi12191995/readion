import type { UPos } from '../../core/upos';

/**
 * Map IPAdic 品詞 (part-of-speech) categories to Universal POS tags.
 * Uses pos (品詞) and pos_detail_1 (品詞細分類1) from kuromoji output.
 */

interface IpadicToken {
  pos: string;
  pos_detail_1: string;
}

/** Mapping table: [pos, pos_detail_1 (or '*' for any)] → UPos */
const IPADIC_MAP: Array<[string, string, UPos]> = [
  // 名詞 (Noun) subcategories
  ['名詞', '固有名詞', 'PROPN'],
  ['名詞', '代名詞', 'PRON'],
  ['名詞', '数', 'NUM'],
  ['名詞', '*', 'NOUN'],

  // 動詞 (Verb)
  ['動詞', '*', 'VERB'],

  // 形容詞 (Adjective)
  ['形容詞', '*', 'ADJ'],

  // 副詞 (Adverb)
  ['副詞', '*', 'ADV'],

  // 助詞 (Particle) subcategories
  ['助詞', '格助詞', 'ADP'],
  ['助詞', '係助詞', 'ADP'],
  ['助詞', '接続助詞', 'SCONJ'],
  ['助詞', '*', 'PART'],

  // 助動詞 (Auxiliary verb)
  ['助動詞', '*', 'AUX'],

  // 連体詞 (Pre-noun adjectival / Determiner)
  ['連体詞', '*', 'DET'],

  // 接続詞 (Conjunction)
  ['接続詞', '*', 'CCONJ'],

  // 感動詞 (Interjection)
  ['感動詞', '*', 'INTJ'],

  // 記号 (Symbol) subcategories
  ['記号', '句点', 'PUNCT'],
  ['記号', '読点', 'PUNCT'],
  ['記号', '括弧開', 'PUNCT'],
  ['記号', '括弧閉', 'PUNCT'],
  ['記号', '*', 'SYM'],

  // 接頭詞 (Prefix)
  ['接頭詞', '*', 'PART'],

  // フィラー (Filler)
  ['フィラー', '*', 'INTJ'],
];

/**
 * Map kuromoji IPAdic token fields to a UPOS tag.
 */
export function ipadicToUPos(token: IpadicToken): UPos {
  // Try specific match first (pos + pos_detail_1)
  for (const [pos, detail, upos] of IPADIC_MAP) {
    if (token.pos === pos) {
      if (detail === '*' || token.pos_detail_1 === detail) {
        return upos;
      }
    }
  }

  // Wildcard fallback for matched pos
  for (const [pos, detail, upos] of IPADIC_MAP) {
    if (token.pos === pos && detail === '*') {
      return upos;
    }
  }

  return 'X';
}
