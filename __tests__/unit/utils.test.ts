import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { calculateRemainingDays, convertRMBtoEUR } from '@/lib/utils';

describe('Utility Functions', () => {
  describe('calculateRemainingDays', () => {
    beforeEach(() => {
      // Mock exactly April 21, 2026, 12:00:00
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2026, 3, 21, 12, 0, 0));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should correctly calculate days left when deadline is in the future', () => {
      const deadline = new Date(2026, 3, 26, 12, 0, 0).getTime(); // 5 days later
      expect(calculateRemainingDays(deadline)).toBe(5);
    });

    it('should return a negative number for past deadlines (delayed)', () => {
      const deadline = new Date(2026, 3, 20, 12, 0, 0).getTime(); // 1 day ago
      expect(calculateRemainingDays(deadline)).toBe(-1);
    });
  });

  describe('convertRMBtoEUR', () => {
    it('converts correctly at the default 0.13 rate', () => {
      expect(convertRMBtoEUR(1000)).toBe(130);
    });

    it('converts correctly at a custom rate', () => {
      expect(convertRMBtoEUR(1000, 0.15)).toBe(150);
    });
  });
});
