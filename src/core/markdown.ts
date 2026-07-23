import MarkdownIt from 'markdown-it';
import type { TaggedToken } from './upos';

export interface TextSegment {
  /** Stable ID within a parse (e.g. 's0', 's1'). */
  id: string;
  /** Plain text content to be tagged. */
  text: string;
}

export type InputMode = 'markdown' | 'plain';

const md = new MarkdownIt({
  html: false,
  linkify: true,
  typographer: false,
  breaks: true, // treat single newlines as <br>
});

/** Escape HTML special characters. */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Token types whose text content should NOT be tagged.
 * Code blocks, inline code, HTML blocks, autolinks.
 */
const SKIP_TOKEN_TYPES = new Set([
  'code_inline',
  'code_block',
  'fence',
  'html_block',
  'html_inline',
]);

/**
 * Walk inline token children and collect taggable text segments.
 * Skip code_inline and other non-taggable children.
 */
function collectInlineSegments(
  children: MarkdownIt.Token[],
  segments: TextSegment[],
  counter: { n: number },
): void {
  let skipAutolink = false;

  for (let i = 0; i < children.length; i++) {
    const child = children[i]!;

    if (skipAutolink) {
      if (child.type === 'link_close') skipAutolink = false;
      continue;
    }

    // Skip autolink content (the URL text inside autolinks)
    if (child.type === 'link_open' && child.markup === 'linkify') {
      skipAutolink = true;
      continue;
    }

    if (SKIP_TOKEN_TYPES.has(child.type)) {
      continue;
    }

    if (child.type === 'text' && child.content) {
      segments.push({
        id: `s${counter.n++}`,
        text: child.content,
      });
    }
  }
}

/**
 * Phase 1: Parse input, collect taggable text segments in document order.
 * Segments are the plain text portions that should be POS-tagged.
 */
export function extractSegments(input: string, mode: InputMode): TextSegment[] {
  const segments: TextSegment[] = [];
  const counter = { n: 0 };

  if (mode === 'plain') {
    // In plain mode, split on double newlines for paragraphs.
    // Preserve single newlines within paragraphs.
    const paragraphs = input.split(/\n\s*\n/);
    for (const para of paragraphs) {
      const trimmed = para.trim();
      if (trimmed) {
        segments.push({ id: `s${counter.n++}`, text: trimmed });
      }
    }
    return segments;
  }

  // Markdown mode
  const tokens = md.parse(input, {});

  for (const token of tokens) {
    if (SKIP_TOKEN_TYPES.has(token.type)) continue;

    if (token.type === 'inline' && token.children) {
      collectInlineSegments(token.children, segments, counter);
    }
  }

  return segments;
}

/**
 * Wrap text according to tagged tokens, producing HTML spans.
 */
function wrapWithTags(text: string, tokens: readonly TaggedToken[]): string {
  if (tokens.length === 0) return escapeHtml(text);

  let result = '';
  let lastEnd = 0;

  for (const t of tokens) {
    // Gap between tokens (whitespace, etc.)
    if (t.start > lastEnd) {
      result += escapeHtml(text.slice(lastEnd, t.start));
    }
    const tag = t.upos.toLowerCase();
    result += `<span class="pos-${tag}" data-upos="${t.upos}">${escapeHtml(t.text)}</span>`;
    lastEnd = t.end;
  }

  // Trailing text after last token
  if (lastEnd < text.length) {
    result += escapeHtml(text.slice(lastEnd));
  }

  return result;
}

/**
 * Convert newlines within plain text to <br> tags for proper rendering.
 */
function plainTextToHtml(text: string): string {
  return escapeHtml(text).replace(/\n/g, '<br>\n');
}

/**
 * Wrap plain text with tags, preserving newlines as <br>.
 */
function wrapPlainWithTags(text: string, tokens: readonly TaggedToken[]): string {
  if (tokens.length === 0) return plainTextToHtml(text);

  let result = '';
  let lastEnd = 0;

  for (const t of tokens) {
    if (t.start > lastEnd) {
      result += plainTextToHtml(text.slice(lastEnd, t.start));
    }
    const tag = t.upos.toLowerCase();
    result += `<span class="pos-${tag}" data-upos="${t.upos}">${escapeHtml(t.text)}</span>`;
    lastEnd = t.end;
  }

  if (lastEnd < text.length) {
    result += plainTextToHtml(text.slice(lastEnd));
  }

  return result;
}

/**
 * Render inline children back to HTML, wrapping tagged text segments with POS spans.
 *
 * IMPORTANT: The counter must increment under exactly the same conditions as
 * collectInlineSegments — only for text nodes with non-empty content that are
 * not inside autolink zones and not in SKIP_TOKEN_TYPES.
 */
function renderInlineChildren(
  children: MarkdownIt.Token[],
  tags: ReadonlyMap<string, TaggedToken[]>,
  counter: { n: number },
): string {
  let html = '';
  let skipAutolink = false;

  for (let i = 0; i < children.length; i++) {
    const child = children[i]!;

    if (skipAutolink) {
      if (child.type === 'link_close') {
        html += '</a>';
        skipAutolink = false;
      } else if (child.type === 'text') {
        html += escapeHtml(child.content);
      }
      continue;
    }

    switch (child.type) {
      case 'text': {
        // Must match collectInlineSegments: only count non-empty text nodes
        if (!child.content) break;
        const segId = `s${counter.n++}`;
        const segTags = tags.get(segId);
        if (segTags) {
          html += wrapWithTags(child.content, segTags);
        } else {
          html += escapeHtml(child.content);
        }
        break;
      }
      case 'code_inline':
        html += `<code>${escapeHtml(child.content)}</code>`;
        break;
      case 'softbreak':
        html += '<br>\n';
        break;
      case 'hardbreak':
        html += '<br>\n';
        break;
      case 'link_open': {
        if (child.markup === 'linkify') {
          skipAutolink = true;
        }
        const href = child.attrGet('href') ?? '';
        html += `<a href="${escapeHtml(href)}" rel="noopener noreferrer" target="_blank">`;
        break;
      }
      case 'link_close':
        html += '</a>';
        break;
      case 'image': {
        const src = child.attrGet('src') ?? '';
        const alt = child.attrGet('alt') ?? child.content ?? '';
        const title = child.attrGet('title');
        html += `<img src="${escapeHtml(src)}" alt="${escapeHtml(alt)}"${title ? ` title="${escapeHtml(title)}"` : ''}>`;
        break;
      }
      case 'em_open':
      case 's_open':
        html += `<${child.tag}>`;
        break;
      case 'em_close':
      case 's_close':
        html += `</${child.tag}>`;
        break;
      case 'strong_open':
        html += '<strong>';
        break;
      case 'strong_close':
        html += '</strong>';
        break;
      case 'html_inline':
        html += child.content;
        break;
      default:
        if (child.content) {
          html += escapeHtml(child.content);
        }
        break;
    }
  }

  return html;
}

/**
 * Phase 2: Re-render input; for each text segment, wrap tokens using its tags.
 * Segments missing from the map render uncolored (enables progressive streaming).
 *
 * WARNING: The returned HTML is UNSANITIZED — caller must pass through sanitize().
 */
export function renderHtml(
  input: string,
  mode: InputMode,
  tags: ReadonlyMap<string, TaggedToken[]>,
): string {
  if (mode === 'plain') {
    const paragraphs = input.split(/\n\s*\n/);
    const counter = { n: 0 };
    let html = '';

    for (const para of paragraphs) {
      const trimmed = para.trim();
      if (!trimmed) continue;

      const segId = `s${counter.n++}`;
      const segTags = tags.get(segId);
      const content = segTags
        ? wrapPlainWithTags(trimmed, segTags)
        : plainTextToHtml(trimmed);
      html += `<p>${content}</p>\n`;
    }

    return html;
  }

  // Markdown mode — walk the token tree identically to extractSegments
  const rendererTokens = md.parse(input, {});
  const counter = { n: 0 };

  let html = '';

  for (const token of rendererTokens) {
    if (SKIP_TOKEN_TYPES.has(token.type)) {
      // Render code blocks as-is
      if (token.type === 'fence') {
        const info = token.info ? ` class="language-${escapeHtml(token.info.trim())}"` : '';
        html += `<pre><code${info}>${escapeHtml(token.content)}</code></pre>\n`;
      } else if (token.type === 'code_block') {
        html += `<pre><code>${escapeHtml(token.content)}</code></pre>\n`;
      } else if (token.type === 'html_block') {
        html += token.content;
      }
      continue;
    }

    if (token.type === 'inline' && token.children) {
      html += renderInlineChildren(token.children, tags, counter);
      continue;
    }

    // Skip hidden tokens (e.g. tight-list paragraph wrappers)
    if (token.hidden) continue;

    // Block-level open/close tokens
    if (token.nesting === 1) {
      let attrs = '';
      if (token.type === 'ordered_list_open') {
        const start = token.attrGet('start');
        if (start && start !== '1') attrs = ` start="${start}"`;
      }
      // Preserve inline style attrs (e.g. table cell alignment)
      const style = token.attrGet('style');
      if (style) attrs += ` style="${escapeHtml(style)}"`;
      html += `<${token.tag}${attrs}>`;
      if (token.block) html += '\n';
    } else if (token.nesting === -1) {
      html += `</${token.tag}>`;
      if (token.block) html += '\n';
    } else if (token.nesting === 0) {
      if (token.type === 'hr') {
        html += '<hr>\n';
      } else if (token.content) {
        html += escapeHtml(token.content);
      }
    }
  }

  return html;
}
