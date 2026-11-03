import { describe, it, expect } from 'vitest';

import { thresholds } from '@/lib/flags';

import { dailyCap, nextAllowedAt } from './dispatch';

describe('dailyCap — warm-up ramp', () => {
  it('caps day one at the warm-up ceiling', () => {
    expect(dailyCap(1)).toBe(Math.min(thresholds.outreachWarmupDayOne, thresholds.outreachMaxDailyEmails));
  });

  it('never exceeds the configured maximum on later days', () => {
    expect(dailyCap(30)).toBe(thresholds.outreachMaxDailyEmails);
    expect(dailyCap(1)).toBeLessThanOrEqual(thresholds.outreachMaxDailyEmails);
  });
});

describe('nextAllowedAt — random 3-7 minute spacing', () => {
  const last = 1_000_000;

  it('is at least 3 minutes after the last send when rand = 0', () => {
    expect(nextAllowedAt(last, () => 0)).toBe(last + 3 * 60 * 1000);
  });

  it('is at most 7 minutes after the last send when rand → 1', () => {
    expect(nextAllowedAt(last, () => 1)).toBe(last + 7 * 60 * 1000);
  });

  it('stays within the 3-7 minute window for any rand value', () => {
    for (const r of [0, 0.25, 0.5, 0.75, 0.999]) {
      const delta = nextAllowedAt(last, () => r) - last;
      expect(delta).toBeGreaterThanOrEqual(3 * 60 * 1000);
      expect(delta).toBeLessThanOrEqual(7 * 60 * 1000);
    }
  });
});
