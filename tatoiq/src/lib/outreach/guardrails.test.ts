import { describe, it, expect } from 'vitest';

import {
  BUSINESS_FILING_DISCLAIMER,
  checkDraft,
  mentionsIrsNoticeOrAudit,
  withDisclaimer,
} from './guardrails';

describe('checkDraft — promise guardrails', () => {
  it.each([
    'We guarantee a bigger refund.',
    'This is a guaranteed refund.',
    'We can maximize your refund.',
    'Save you up to $5,000 in taxes.',
    'A guaranteed savings of thousands.',
    'Our risk-free service.',
    'No risk to you at all.',
  ])('blocks a promise-like claim: %s', (text) => {
    const result = checkDraft(text);
    expect(result.ok).toBe(false);
    expect(result.flags.some((f) => f.severity === 'block')).toBe(true);
  });
});

describe('checkDraft — prohibited compliance phrases', () => {
  it.each(['We offer tax debt relief.', 'Ask about our audit defense.', 'Get a guaranteed deduction.'])(
    'blocks the prohibited phrase: %s',
    (phrase) => {
      expect(checkDraft(phrase).ok).toBe(false);
    },
  );
});

describe('checkDraft — clean copy', () => {
  it('accepts a compliant, non-promissory message', () => {
    const result = checkDraft('Happy to help you get organized for the season. Would a short call help?');
    expect(result.ok).toBe(true);
    expect(result.flags).toEqual([]);
  });

  it('flags that a disclaimer is required when business filings are referenced', () => {
    expect(checkDraft('Filing your S-corp return is easy with us.').requiresDisclaimer).toBe(true);
    expect(checkDraft('Would a short call help?').requiresDisclaimer).toBe(false);
  });
});

describe('mentionsIrsNoticeOrAudit', () => {
  it.each(['I got a notice from the IRS', 'being audited', 'An IRS audit letter', 'Form CP2000 arrived', 'CP504'])(
    'detects: %s',
    (text) => {
      expect(mentionsIrsNoticeOrAudit(text)).toBe(true);
    },
  );

  it('is false for unrelated text', () => {
    expect(mentionsIrsNoticeOrAudit('Just filed my return on time.')).toBe(false);
  });
});

describe('withDisclaimer', () => {
  it('appends the mandated disclaimer for business-filing copy', () => {
    const out = withDisclaimer('We can prepare your corporate return.');
    expect(out).toContain(BUSINESS_FILING_DISCLAIMER);
  });

  it('does not duplicate the disclaimer', () => {
    const once = withDisclaimer('We can prepare your corporate return.');
    expect(withDisclaimer(once)).toBe(once);
  });

  it('leaves unrelated copy untouched', () => {
    expect(withDisclaimer('Would a short call help?')).toBe('Would a short call help?');
  });
});
