import { describe, it, expect } from 'vitest';

import { normalizeEmail, normalizePhone, normalizeContact } from './normalize';

describe('normalizeEmail', () => {
  it('lowercases and trims', () => {
    expect(normalizeEmail('  Jane.Doe@Example.COM ')).toBe('jane.doe@example.com');
  });

  it('rejects invalid addresses', () => {
    expect(normalizeEmail('not-an-email')).toBeNull();
    expect(normalizeEmail('a@b')).toBeNull();
    expect(normalizeEmail('a b@example.com')).toBeNull();
    expect(normalizeEmail('')).toBeNull();
    expect(normalizeEmail(null)).toBeNull();
  });
});

describe('normalizePhone', () => {
  it('converts a 10-digit US number to E.164', () => {
    expect(normalizePhone('(305) 555-1234')).toBe('+13055551234');
  });

  it('accepts an 11-digit US number with a leading 1', () => {
    expect(normalizePhone('1-305-555-1234')).toBe('+13055551234');
  });

  it('preserves an explicit international + prefix', () => {
    expect(normalizePhone('+44 20 7946 0958')).toBe('+442079460958');
  });

  it('rejects unusable input', () => {
    expect(normalizePhone('123')).toBeNull();
    expect(normalizePhone('')).toBeNull();
    expect(normalizePhone(null)).toBeNull();
  });
});

describe('normalizeContact', () => {
  it('normalizes both channels together', () => {
    expect(normalizeContact({ email: 'A@B.com', phone: '3055551234' })).toEqual({
      email: 'a@b.com',
      phone: '+13055551234',
    });
  });
});
