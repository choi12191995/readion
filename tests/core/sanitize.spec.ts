import { describe, it, expect } from 'vitest';
import { sanitize } from '@/core/sanitize';

describe('sanitize', () => {
  it('should strip script tags', () => {
    const html = '<p>Hello</p><script>alert("xss")</script>';
    expect(sanitize(html)).not.toContain('<script');
    expect(sanitize(html)).toContain('Hello');
  });

  it('should strip event handlers', () => {
    const html = '<img src="x" onerror="alert(1)">';
    const result = sanitize(html);
    expect(result).not.toContain('onerror');
  });

  it('should strip style attributes', () => {
    const html = '<p style="color:red">text</p>';
    expect(sanitize(html)).not.toContain('style');
  });

  it('should preserve POS spans', () => {
    const html = '<span class="pos-noun" data-upos="NOUN">cat</span>';
    const result = sanitize(html);
    expect(result).toContain('pos-noun');
    expect(result).toContain('data-upos="NOUN"');
    expect(result).toContain('cat');
  });

  it('should preserve standard markdown elements', () => {
    const html = '<h1>Title</h1><p>Text with <strong>bold</strong> and <em>italic</em></p>';
    const result = sanitize(html);
    expect(result).toContain('<h1>');
    expect(result).toContain('<strong>');
    expect(result).toContain('<em>');
  });

  it('should strip iframe tags', () => {
    const html = '<iframe src="https://evil.com"></iframe>';
    expect(sanitize(html)).not.toContain('iframe');
  });

  it('should strip javascript: hrefs', () => {
    const html = '<a href="javascript:alert(1)">click</a>';
    const result = sanitize(html);
    expect(result).not.toContain('javascript:');
  });
});
