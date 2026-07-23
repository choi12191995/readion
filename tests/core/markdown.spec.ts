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

  it('should keep segments in sync for lists with bold text', () => {
    const input = '1. **Visual recognition** — identifying letters\n2. **Phonological processing** — connecting text';
    const segments = extractSegments(input, 'markdown');
    // Each list item produces 2 segments: the bold text and the rest
    expect(segments.length).toBe(4);
    expect(segments[0]!.text).toBe('Visual recognition');
    expect(segments[1]!.text).toBe(' — identifying letters');
    expect(segments[2]!.text).toBe('Phonological processing');
    expect(segments[3]!.text).toBe(' — connecting text');

    // Build tags that preserve spaces via correct start/end positions
    const tags = new Map(segments.map((seg) => {
      const words = seg.text.split(/(\s+)/);
      let offset = 0;
      const tokenTags = words.filter((w) => w.trim()).map((w) => {
        const start = seg.text.indexOf(w, offset);
        const end = start + w.length;
        offset = end;
        return { text: w, upos: 'NOUN' as const, start, end };
      });
      return [seg.id, tokenTags] as const;
    }));

    const html = renderHtml(input, 'markdown', tags);
    // Verify spaces between words are preserved
    expect(html).toContain('>Visual</span>');
    expect(html).toContain('>recognition</span>');
    // The space between "Visual" and "recognition" should be in the HTML
    expect(html).toMatch(/Visual<\/span>\s+<span/);
    // Second list item should NOT contain text from the first
    expect(html).toContain('>Phonological</span>');
    // No hidden <p> tags inside tight list items
    expect(html).not.toMatch(/<li>\s*<p>/);
  });

  it('should handle tables correctly', () => {
    const input = '| A | B |\n|---|---|\n| cat | dog |';
    const segments = extractSegments(input, 'markdown');
    expect(segments.length).toBeGreaterThanOrEqual(4); // A, B, cat, dog

    const tags = new Map(segments.map((seg) => {
      return [seg.id, [{ text: seg.text, upos: 'NOUN' as const, start: 0, end: seg.text.length }]] as const;
    }));

    const html = renderHtml(input, 'markdown', tags);
    expect(html).toContain('<table>');
    expect(html).toContain('<th>');
    expect(html).toContain('<td>');
    expect(html).toContain('>cat</span>');
    expect(html).toContain('>dog</span>');
  });
});
