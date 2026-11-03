import { describe, it, expect } from 'vitest';
import { redactText, redactDeep } from './redact';

/**
 * These tests PROVE that no raw taxpayer identifier survives redaction.
 * (Spec requirement: "Write tests that prove the redaction works.")
 */
describe('redactText', () => {
  it('redacts a Social Security number', () => {
    const { text, counts } = redactText('My SSN is 123-45-6789.');
    expect(text).not.toContain('123-45-6789');
    expect(text).toContain('<SSN_1>');
    expect(counts.SSN).toBe(1);
  });

  it('maps the same value to the same token', () => {
    const { text } = redactText('SSN 111-22-3333 and again 111-22-3333.');
    expect(text).toBe('SSN <SSN_1> and again <SSN_1>.');
  });

  it('redacts EIN/TIN', () => {
    const { text } = redactText('Employer EIN 12-3456789 paid wages.');
    expect(text).not.toContain('12-3456789');
    expect(text).toContain('<TIN_1>');
  });

  it('redacts email and phone', () => {
    const { text } = redactText('Reach me at jane.doe@example.com or (305) 555-1234.');
    expect(text).not.toContain('jane.doe@example.com');
    expect(text).not.toContain('555-1234');
    expect(text).toContain('<EMAIL_1>');
    expect(text).toContain('<PHONE_1>');
  });

  it('redacts a street address', () => {
    const { text } = redactText('I live at 1234 Palm Beach Blvd, Miami.');
    expect(text).not.toContain('1234 Palm Beach Blvd');
    expect(text).toContain('<ADDRESS_1>');
  });

  it('redacts a bank account number', () => {
    const { text } = redactText('Deposit to account 123456789012.');
    expect(text).not.toContain('123456789012');
    expect(text).toContain('<BANK_1>');
  });

  it('leaves ordinary tax text untouched', () => {
    const input = 'What is the standard deduction for a single filer?';
    expect(redactText(input).text).toBe(input);
  });
});

describe('redactDeep', () => {
  it('preserves object shape while redacting values', () => {
    const out = redactDeep({
      name: 'W-2',
      fields: { ssn: '123-45-6789', email: 'a@b.com' },
      nested: [{ account: '123456789012' }],
    });
    expect(out.fields.ssn).toBe('<SSN_1>');
    expect(out.fields.email).toBe('<EMAIL_1>');
    expect(out.nested[0].account).toBe('<BANK_1>');
    expect(out.name).toBe('W-2');
  });
});
