import { describe, it, expect } from 'vitest';

import { evaluateConsent } from './consent';

describe('evaluateConsent', () => {
  it('allows a lead with granted consent', () => {
    expect(evaluateConsent({ consentStatus: 'GRANTED' }).allowed).toBe(true);
  });

  it('blocks do-not-contact and overrides to DO_NOT_CONTACT', () => {
    const decision = evaluateConsent({ doNotContact: true, consentStatus: 'GRANTED' });
    expect(decision.allowed).toBe(false);
    expect(decision.stateOverride).toBe('DO_NOT_CONTACT');
  });

  it('blocks suppressed contacts', () => {
    const decision = evaluateConsent({ suppressed: true });
    expect(decision.allowed).toBe(false);
    expect(decision.stateOverride).toBe('DO_NOT_CONTACT');
  });

  it('blocks a legal restriction', () => {
    const decision = evaluateConsent({ legalRestriction: true });
    expect(decision.allowed).toBe(false);
    expect(decision.stateOverride).toBe('DO_NOT_CONTACT');
  });

  it('blocks withdrawn consent with a NO_CONSENT override', () => {
    const decision = evaluateConsent({ consentStatus: 'WITHDRAWN' });
    expect(decision.allowed).toBe(false);
    expect(decision.stateOverride).toBe('NO_CONSENT');
  });

  it('never allows outreach to a sample fixture', () => {
    const decision = evaluateConsent({ isSample: true, consentStatus: 'GRANTED', requiresOutreach: true });
    expect(decision.allowed).toBe(false);
  });

  it('requires recorded consent when outreach is being prepared', () => {
    expect(evaluateConsent({ consentStatus: 'UNKNOWN', requiresOutreach: true }).allowed).toBe(false);
    expect(evaluateConsent({ consentStatus: 'UNKNOWN', requiresOutreach: false }).allowed).toBe(true);
  });
});
