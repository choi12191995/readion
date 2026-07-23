/**
 * Minimal path.join implementation for browser/worker environments.
 * Only provides the subset kuromoji needs (joining URL path segments).
 */
export function join(...parts: string[]): string {
  return parts
    .map((part, i) => {
      if (i === 0) return part.replace(/\/+$/, '');
      return part.replace(/^\/+|\/+$/g, '');
    })
    .filter(Boolean)
    .join('/');
}

export function resolve(...parts: string[]): string {
  return join(...parts);
}

export function basename(p: string): string {
  return p.split('/').pop() ?? '';
}

export function dirname(p: string): string {
  const parts = p.split('/');
  parts.pop();
  return parts.join('/');
}

export default { join, resolve, basename, dirname };
