import { describe, it, expect } from 'vitest';
import { detectLanguage } from '@/core/lang-detect';

describe('detectLanguage', () => {
  it('should detect English text', async () => {
    const result = await detectLanguage('The quick brown fox jumps over the lazy dog.');
    expect(result.lang).toBe('en');
  });

  it('should detect Chinese text', async () => {
    const result = await detectLanguage('今天天气很好，我们去公园散步吧。');
    expect(result.lang).toBe('zh');
  });

  it('should detect Japanese text (with kana)', async () => {
    const result = await detectLanguage('今日はとても良い天気ですね。');
    expect(result.lang).toBe('ja');
  });

  it('should detect Korean text', async () => {
    const result = await detectLanguage('오늘 날씨가 아주 좋습니다.');
    expect(result.lang).toBe('ko');
  });

  it('should distinguish Japanese from Chinese (kana presence)', async () => {
    const ja = await detectLanguage('東京は日本の首都です。桜がきれいです。');
    expect(ja.lang).toBe('ja');

    const zh = await detectLanguage('北京是中国的首都。长城很壮观。');
    expect(zh.lang).toBe('zh');
  });

  it('should fall back to en for very short text', async () => {
    const result = await detectLanguage('Hi');
    expect(result.lang).toBe('en');
    expect(result.confidence).toBeLessThan(0.5);
  });
});
