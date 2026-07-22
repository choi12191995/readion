import { describe, it, expect } from 'vitest';
import { chunkSegments } from '@/core/chunking';
import type { TextSegment } from '@/core/markdown';

describe('chunkSegments', () => {
  it('should group short segments into one chunk', () => {
    const segments: TextSegment[] = [
      { id: 's0', text: 'Hello world.' },
      { id: 's1', text: 'Another sentence.' },
    ];
    const chunks = chunkSegments(segments, 2000);
    expect(chunks).toHaveLength(1);
    expect(chunks[0]).toHaveLength(2);
  });

  it('should split when exceeding target chars', () => {
    const segments: TextSegment[] = [
      { id: 's0', text: 'A'.repeat(1500) },
      { id: 's1', text: 'B'.repeat(1500) },
      { id: 's2', text: 'C'.repeat(500) },
    ];
    const chunks = chunkSegments(segments, 2000);
    expect(chunks.length).toBeGreaterThan(1);
  });

  it('should handle empty input', () => {
    const chunks = chunkSegments([], 2000);
    expect(chunks).toHaveLength(0);
  });

  it('should preserve all segments', () => {
    const segments: TextSegment[] = Array.from({ length: 10 }, (_, i) => ({
      id: `s${i}`,
      text: `Segment ${i} text`,
    }));
    const chunks = chunkSegments(segments, 20);
    const flat = chunks.flat();
    expect(flat).toHaveLength(10);
  });
});
