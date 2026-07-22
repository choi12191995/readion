import { describe, it, expect } from 'vitest';
import { UPOS_TAGS, isUPos } from '@/core/upos';

describe('UPOS', () => {
  it('should define exactly 17 tags', () => {
    expect(UPOS_TAGS).toHaveLength(17);
  });

  it('should accept valid UPOS tags', () => {
    for (const tag of UPOS_TAGS) {
      expect(isUPos(tag)).toBe(true);
    }
  });

  it('should reject invalid tags', () => {
    expect(isUPos('INVALID')).toBe(false);
    expect(isUPos('')).toBe(false);
    expect(isUPos('noun')).toBe(false);
    expect(isUPos('NN')).toBe(false);
  });
});
