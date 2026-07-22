import { describe, it, expect } from 'vitest';
import { extractSegments, renderHtml } from '@/core/markdown';

describe('extractSegments', () => {
  it('should extract text segments from markdown', () => {
    const input = '# Hello\n\nThis is a test.';
    const segments = extractSegments(input, 'markdown');
    expect(segments.length).toBeGreaterThan(0);
    expect(segments.some((s) => s.text.includes('Hello'))).toBe(true);
    expect(segments.some((s) => s.text.includes('This is a test.'))).toBe(true);
  });

  it('should not extract code blocks', () => {
    const input = '```\nconst x = 1;\n```\n\nNormal text.';
    const segments = extractSegments(input, 'markdown');
    expect(segments.some((s) => s.text.includes('const'))).toBe(false);
    expect(segments.some((s) => s.text.includes('Normal text.'))).toBe(true);
  });

  it('should not extract inline code', () => {
    const input = 'Use `console.log()` to debug.';
    const segments = extractSegments(input, 'markdown');
    expect(segments.some((s) => s.text.includes('console.log'))).toBe(false);
  });

  it('should have deterministic segment ids', () => {
    const input = 'Hello world. Goodbye world.';
    const s1 = extractSegments(input, 'markdown');
    const s2 = extractSegments(input, 'markdown');
    expect(s1).toEqual(s2);
  });

  it('should handle plain mode', () => {
    const input = 'First paragraph.\n\nSecond paragraph.';
    const segments = extractSegments(input, 'plain');
    expect(segments).toHaveLength(2);
    expect(segments[0]!.text).toBe('First paragraph.');
    expect(segments[1]!.text).toBe('Second paragraph.');
  });
});

describe('renderHtml', () => {
  it('should render uncolored when tags map is empty', () => {
    const input = 'Hello world.';
    const html = renderHtml(input, 'markdown', new Map());
    expect(html).toContain('Hello world.');
    expect(html).not.toContain('pos-');
  });

  it('should render with POS spans when tags are provided', () => {
    const input = 'Hello world.';
    const segments = extractSegments(input, 'markdown');
    const tags = new Map([
      [segments[0]!.id, [
        { text: 'Hello', upos: 'INTJ' as const, start: 0, end: 5 },
        { text: 'world', upos: 'NOUN' as const, start: 6, end: 11 },
        { text: '.', upos: 'PUNCT' as const, start: 11, end: 12 },
      ]],
    ]);
    const html = renderHtml(input, 'markdown', tags);
    expect(html).toContain('pos-intj');
    expect(html).toContain('pos-noun');
    expect(html).toContain('data-upos="INTJ"');
  });

  it('should preserve code blocks untouched', () => {
    const input = '```js\nconst x = 1;\n```';
    const html = renderHtml(input, 'markdown', new Map());
    expect(html).toContain('<pre>');
    expect(html).toContain('const x = 1;');
    expect(html).not.toContain('pos-');
  });

  it('should handle plain mode', () => {
    const input = 'First.\n\nSecond.';
    const html = renderHtml(input, 'plain', new Map());
    expect(html).toContain('<p>First.</p>');
    expect(html).toContain('<p>Second.</p>');
  });
});
