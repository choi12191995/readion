import type { TextSegment } from './markdown';

/**
 * Group segments into batches of approximately `targetChars` total characters.
 * This ensures the first-screen results return fast from the worker.
 */
export function chunkSegments(
  segments: readonly TextSegment[],
  targetChars: number = 2000,
): TextSegment[][] {
  const chunks: TextSegment[][] = [];
  let current: TextSegment[] = [];
  let currentLen = 0;

  for (const seg of segments) {
    current.push(seg);
    currentLen += seg.text.length;

    if (currentLen >= targetChars) {
      chunks.push(current);
      current = [];
      currentLen = 0;
    }
  }

  if (current.length > 0) {
    chunks.push(current);
  }

  return chunks;
}
