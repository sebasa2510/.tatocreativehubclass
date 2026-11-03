/**
 * consent.ts — the single gate for "may we contact / act on this lead?".
 *
 * Consent, suppression, legal restrictions, and sample-data flags override
 * grade and stage at EVERY layer (API, UI, and dispatch). Callers must not
 * prepare or send outreach unless `allowed` is true.
 */

import type { LeadStage } from '@/lib/leads/pipeline';
import type { ConsentStatusValue } from '@/lib/scoring/evaluator';

export interface ConsentInput {
  doNotContact?: boolean;
  suppressed?: boolean;
  consentStatus?: ConsentStatusValue;
  legalRestriction?: boolean;
  isSample?: boolean;
  /** Stricter when true: missing consent blocks. */
  requiresOutreach?: boolean;
}

export interface ConsentDecision {
  allowed: boolean;
  reason?: string;
  stateOverride?: LeadStage;
}

export function evaluateConsent(input: ConsentInput): ConsentDecision {
  if (input.doNotContact || input.suppressed) {
    return { allowed: false, reason: 'Contact is suppressed or marked do-not-contact.', stateOverride: 'DO_NOT_CONTACT' };
  }
  if (input.legalRestriction) {
    return { allowed: false, reason: 'A legal restriction blocks automated contact.', stateOverride: 'DO_NOT_CONTACT' };
  }
  if (input.consentStatus === 'WITHDRAWN') {
    return { allowed: false, reason: 'Consent was withdrawn.', stateOverride: 'NO_CONSENT' };
  }
  if (input.isSample && input.requiresOutreach) {
    // Synthetic fixtures may be shown, but never contacted.
    return { allowed: false, reason: 'Sample fixture — outreach disabled.' };
  }
  if (input.requiresOutreach && (input.consentStatus ?? 'UNKNOWN') === 'UNKNOWN') {
    return { allowed: false, reason: 'No recorded consent for outreach.', stateOverride: 'NO_CONSENT' };
  }
  return { allowed: true };
}
