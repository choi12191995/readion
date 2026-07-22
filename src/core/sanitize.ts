import DOMPurify from 'dompurify';

/** Allowed HTML tags for the markdown-rendered output. */
const ALLOWED_TAGS = [
  // Markdown structure
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'p', 'br', 'hr',
  'ul', 'ol', 'li',
  'blockquote',
  'pre', 'code',
  'em', 'strong', 'del', 's',
  'a',
  'img',
  'table', 'thead', 'tbody', 'tr', 'th', 'td',
  // POS spans
  'span',
  // Other inline
  'sub', 'sup',
];

/** Allowed attributes per tag. */
const ALLOWED_ATTR = [
  'class', 'data-upos',
  'href', 'target', 'rel',
  'src', 'alt', 'title',
  'colspan', 'rowspan',
];

/**
 * Sanitize HTML for safe insertion into the DOM.
 * Allows standard markdown elements + POS-colored spans.
 * Strips all scripts, styles, event handlers, and dangerous attributes.
 */
export function sanitize(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOW_DATA_ATTR: false,
    ADD_ATTR: ['data-upos'],
    FORBID_TAGS: ['style', 'script', 'iframe', 'object', 'embed', 'form', 'input', 'textarea'],
    FORBID_ATTR: ['style', 'onerror', 'onclick', 'onload', 'onmouseover'],
  }) as string;
}
