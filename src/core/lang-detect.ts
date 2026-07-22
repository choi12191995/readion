/**
 * Language detection: Unicode-script heuristic first, then franc-min fallback.
 * Used inside the worker to auto-detect the language of input text.
 */

export interface DetectionResult {
  lang: string;
  confidence: number;
}

/**
 * Count characters belonging to major Unicode script blocks in the first ~2 KB.
 */
function scriptHeuristic(text: string): DetectionResult | null {
  const sample = text.slice(0, 2048);
  let han = 0;
  let hiragana = 0;
  let katakana = 0;
  let hangul = 0;
  let latin = 0;
  let total = 0;

  for (const ch of sample) {
    const cp = ch.codePointAt(0);
    if (cp === undefined) continue;

    // Skip whitespace and ASCII punctuation/digits
    if (cp <= 0x40 || (cp >= 0x5b && cp <= 0x60) || (cp >= 0x7b && cp <= 0x7f)) continue;

    total++;

    if (cp >= 0x4e00 && cp <= 0x9fff) han++;
    else if (cp >= 0x3400 && cp <= 0x4dbf) han++; // CJK Ext A
    else if (cp >= 0x3040 && cp <= 0x309f) hiragana++;
    else if (cp >= 0x30a0 && cp <= 0x30ff) katakana++;
    else if (cp >= 0xac00 && cp <= 0xd7af) hangul++;
    else if ((cp >= 0x41 && cp <= 0x5a) || (cp >= 0x61 && cp <= 0x7a)) latin++;
    else if (cp >= 0xc0 && cp <= 0x24f) latin++; // Latin Extended
  }

  if (total < 5) return null;

  const kana = hiragana + katakana;

  // Japanese: presence of Hiragana/Katakana is definitive
  if (kana > 0 && (kana + han) / total > 0.3) {
    return { lang: 'ja', confidence: 0.95 };
  }

  // Korean: significant Hangul
  if (hangul / total > 0.3) {
    return { lang: 'ko', confidence: 0.9 };
  }

  // Chinese: Han characters dominate without kana
  if (han / total > 0.3 && kana === 0) {
    return { lang: 'zh', confidence: 0.9 };
  }

  // High Latin content — defer to franc for language specifics
  if (latin / total > 0.5) {
    return null; // let franc decide between en/fr/de/es/etc.
  }

  return null;
}

/**
 * Detect the primary language of the given text.
 * Falls back to 'en' if detection is uncertain.
 */
export async function detectLanguage(text: string): Promise<DetectionResult> {
  // Fast Unicode script check
  const scriptResult = scriptHeuristic(text);
  if (scriptResult) return scriptResult;

  // franc-min for Latin-script languages
  try {
    const { franc } = await import('franc-min');
    const detected = franc(text, { minLength: 10 });

    if (detected && detected !== 'und') {
      // franc uses ISO 639-3; map common codes to ISO 639-1
      const iso3to1: Record<string, string> = {
        eng: 'en', fra: 'fr', deu: 'de', spa: 'es', por: 'pt',
        ita: 'it', nld: 'nl', rus: 'ru', pol: 'pl', swe: 'sv',
        dan: 'da', nor: 'no', fin: 'fi', tur: 'tr', ron: 'ro',
        hun: 'hu', ces: 'cs', ell: 'el', bul: 'bg', hrv: 'hr',
        slk: 'sk', slv: 'sl', ukr: 'uk', cat: 'ca', eus: 'eu',
        glg: 'gl', ind: 'id', msa: 'ms', vie: 'vi', tha: 'th',
        cmn: 'zh', jpn: 'ja', kor: 'ko', ara: 'ar', heb: 'he',
        hin: 'hi', ben: 'bn', urd: 'ur', tam: 'ta', tel: 'te',
      };
      const lang = iso3to1[detected] ?? detected.slice(0, 2);
      return { lang, confidence: 0.7 };
    }
  } catch {
    // franc not available — fall through
  }

  return { lang: 'en', confidence: 0.3 };
}
