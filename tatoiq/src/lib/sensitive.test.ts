import { describe, expect, it } from 'vitest';

import { isSensitiveFieldLabel, maskIdentifier } from '@/lib/sensitive';

/**
 * These tests pin the two privacy behaviours the dashboard depends on:
 * identifiers are classified correctly, and masking never leaks more than the
 * final four characters.
 */

describe('isSensitiveFieldLabel', () => {
  it.each([
    'Employer EIN',
    'Payer TIN',
    'Employee SSN',
    'Social Security number',
    'ITIN',
    'Preparer PTIN',
    'Taxpayer ID',
    'Taxpayer ID number',
    'Employer ID',
    'Bank account number',
    'Routing number',
  ])('flags %s as sensitive', (label) => {
    expect(isSensitiveFieldLabel(label)).toBe(true);
  });

  it('is case-insensitive', () => {
    expect(isSensitiveFieldLabel('employer ein')).toBe(true);
    expect(isSensitiveFieldLabel('PAYER tin')).toBe(true);
  });

  it.each([
    'Employer name',
    'Box 1 wages',
    'Box 2 federal tax withheld',
    'Nonemployee compensation',
    'Payer name',
    'Gross receipts',
  ])('does not flag the benign label %s', (label) => {
    expect(isSensitiveFieldLabel(label)).toBe(false);
  });

  it('does not match an identifier token embedded in a longer word', () => {
    // Guards against a substring match turning an unrelated label into a masked
    // field. "Einstein" contains "ein" but is not an employer ID.
    expect(isSensitiveFieldLabel('Einstein report')).toBe(false);
    expect(isSensitiveFieldLabel('Tinsel allowance')).toBe(false);
  });
});

describe('maskIdentifier', () => {
  it('reveals only the final four characters of an EIN', () => {
    const masked = maskIdentifier('88-1234567');
    expect(masked.endsWith('4567')).toBe(true);
    expect(masked).not.toContain('88-123');
    expect(masked.slice(0, -4)).toMatch(/^\u2022+$/);
  });

  it('reveals only the final four characters of a transit TIN', () => {
    expect(maskIdentifier('59-7654321').endsWith('4321')).toBe(true);
  });

  it('preserves length so the layout does not shift on reveal', () => {
    expect(maskIdentifier('88-1234567')).toHaveLength('88-1234567'.length);
    expect(maskIdentifier('123-45-6789')).toHaveLength('123-45-6789'.length);
  });

  it('masks an SSN without exposing the dashed middle groups', () => {
    const masked = maskIdentifier('123-45-6789');
    expect(masked).not.toContain('45');
    expect(masked.endsWith('6789')).toBe(true);
  });

  it('fully masks values of four characters or fewer', () => {
    expect(maskIdentifier('1234')).toBe('\u2022\u2022\u2022\u2022');
    expect(maskIdentifier('12')).toBe('\u2022\u2022\u2022\u2022');
    expect(maskIdentifier('')).toBe('\u2022\u2022\u2022\u2022');
  });

  it('never returns the original value unchanged for a real identifier', () => {
    for (const value of ['88-1234567', '59-7654321', '123-45-6789']) {
      expect(maskIdentifier(value)).not.toBe(value);
    }
  });
  it('ignores surrounding whitespace', () => {
    expect(maskIdentifier('  88-1234567  ')).toHaveLength('88-1234567'.length);
  });
});
