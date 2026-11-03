import { describe, it, expect } from 'vitest';

import {
  DEFAULT_WEIGHTS,
  assertWeightsSum,
  evaluateLead,
  gradeForScore,
  resolveStage,
  type LeadScoringInput,
} from './evaluator';

/** A fully-verified, high-intent, in-area business — should score 100 / grade A. */
function strongInput(): LeadScoringInput {
  return {
    verification: { email: true, phone: true, business: true, address: true },
    business: { entityType: 'LLC', industry: 'construction', state: 'FL', formedRecently: true, source: 'state registry' },
    intent: { requestedConsultation: true, requestedPricing: true, repliedToOutreach: true },
    timing: { taxDeadlineNear: true },
    engagement: { emailOpened: true, linkClicked: true, websiteVisited: true },
    targeting: { serviceStates: ['FL'], serviceIndustries: ['construction'], serviceEntityTypes: ['LLC'] },
  };
}

describe('gradeForScore — boundary values', () => {
  it.each([
    [0, 'F'],
    [58, 'F'],
    [59, 'F'],
    [60, 'D'],
    [69, 'D'],
    [70, 'C'],
    [79, 'C'],
    [80, 'B'],
    [89, 'B'],
    [90, 'A'],
    [95, 'A'],
    [100, 'A'],
  ] as Array<[number, string]>)('score %i → grade %s', (score, expected) => {
    expect(gradeForScore(score)).toBe(expected);
  });

  it('clamps out-of-range scores', () => {
    expect(gradeForScore(-10)).toBe('F');
    expect(gradeForScore(1000)).toBe('A');
  });
});

describe('evaluateLead', () => {
  it('awards a top grade for a fully verified, high-intent lead', () => {
    const result = evaluateLead(strongInput());
    expect(result.score).toBe(100);
    expect(result.grade).toBe('A');
    expect(result.confidence).toBe('HIGH');
    expect(result.hasVerifiedContact).toBe(true);
    expect(result.recommendedAction).toMatch(/assign/i);
    expect(result.evaluatedAt).toBeTruthy();
  });

  it('uses the documented default weights', () => {
    expect(DEFAULT_WEIGHTS).toEqual({ serviceFit: 30, buyingIntent: 28, timing: 12, marketFit: 18, engagement: 12 });
    const sum = Object.values(DEFAULT_WEIGHTS).reduce((a, b) => a + b, 0);
    expect(sum).toBe(100);
  });

  it('assertWeightsSum rejects weights that do not total 100', () => {
    expect(() => assertWeightsSum({ ...DEFAULT_WEIGHTS, timing: 11 })).toThrow(/sum to 100/);
    expect(assertWeightsSum(DEFAULT_WEIGHTS)).toBe(DEFAULT_WEIGHTS);
  });

  it('never assigns an artificial grade without a verified contact field', () => {
    const result = evaluateLead({
      verification: { email: false, phone: false, business: false, address: false },
      business: { entityType: 'LLC', industry: 'construction', state: 'FL' },
      intent: { requestedConsultation: true },
      timing: {},
      engagement: { websiteVisited: true },
    });
    expect(result.grade).toBeNull();
    expect(result.score).toBe(0);
    expect(result.proposedStage).toBe('INSUFFICIENT_INFORMATION');
    expect(result.hasVerifiedContact).toBe(false);
    expect(result.missingInfo).toContain('Verified email or phone');
  });

  it('gives zero service-fit points when the business is unverified', () => {
    const result = evaluateLead({
      verification: { email: true, phone: true, business: false, address: false },
      business: { entityType: 'LLC', industry: 'construction', state: 'FL' },
      intent: { requestedPricing: true },
      timing: { taxDeadlineNear: true },
      engagement: { emailOpened: true },
    });
    const serviceFit = result.criteria.find((c) => c.criterion === 'serviceFit');
    expect(serviceFit?.points).toBe(0);
    expect(result.missingInfo).toContain('Business identity not verified');
  });

  it('records evidence with a source for every awarded criterion', () => {
    const result = evaluateLead(strongInput());
    expect(result.evidence.length).toBeGreaterThan(0);
    for (const e of result.evidence) {
      expect(e.source).toBeTruthy();
      expect(e.field).toBeTruthy();
    }
  });

  it('weights entity type above industry inside service fit', () => {
    const base = {
      verification: { email: true, phone: true, business: true, address: true },
      intent: {},
      timing: {},
      engagement: {},
    };

    const entityOnly = evaluateLead({
      ...base,
      business: { entityType: 'LLC', industry: null, state: 'FL' },
      targeting: { serviceEntityTypes: ['LLC'], serviceStates: ['FL'] },
    });
    const industryOnly = evaluateLead({
      ...base,
      business: { entityType: null, industry: 'construction', state: 'FL' },
      targeting: { serviceIndustries: ['construction'], serviceStates: ['FL'] },
    });

    const entityPoints = entityOnly.criteria.find((c) => c.criterion === 'serviceFit')!.points;
    const industryPoints = industryOnly.criteria.find((c) => c.criterion === 'serviceFit')!.points;

    // 70/30 split: a pass-through entity must outweigh a matching industry.
    expect(entityPoints).toBe(21);
    expect(industryPoints).toBe(9);
    expect(entityPoints).toBeGreaterThan(industryPoints);
  });

  it('ranks a consultation request above pricing and a reply', () => {
    const base = {
      verification: { email: true, phone: true, business: true, address: true },
      business: { entityType: 'LLC', industry: 'construction', state: 'FL' },
      timing: {},
      engagement: {},
    };
    const intentPoints = (intent: LeadScoringInput['intent']) =>
      evaluateLead({ ...base, intent }).criteria.find((c) => c.criterion === 'buyingIntent')!.points;

    expect(intentPoints({ requestedConsultation: true })).toBe(15);
    expect(intentPoints({ requestedPricing: true })).toBe(7);
    expect(intentPoints({ repliedToOutreach: true })).toBe(6);
    // A consultation alone outranks pricing + reply combined.
    expect(intentPoints({ requestedConsultation: true })).toBeGreaterThan(
      intentPoints({ requestedPricing: true, repliedToOutreach: true }),
    );
  });

  it('keeps timing the smallest lever in the rubric', () => {
    // Timing must not be able to lift a weak lead on its own.
    const weakButUrgent = evaluateLead({
      verification: { email: true, phone: true, business: true, address: true },
      business: { entityType: 'n/a', industry: 'n/a', state: 'FL', formedRecently: true },
      intent: {},
      timing: { taxDeadlineNear: true },
      engagement: {},
      targeting: { serviceEntityTypes: [], serviceIndustries: [], serviceStates: ['FL'] },
    });
    const timing = weakButUrgent.criteria.find((c) => c.criterion === 'timing')!;
    expect(timing.points).toBe(timing.max);
    // Full timing + full market fit still cannot reach a B without service fit.
    expect(weakButUrgent.score).toBeLessThan(80);
  });
});

describe('resolveStage — consent/legal overrides beat grade', () => {
  const strong = evaluateLead(strongInput());

  it('forces DO_NOT_CONTACT even for an A lead', () => {
    expect(strong.grade).toBe('A');
    expect(resolveStage(strong, { doNotContact: true }).stage).toBe('DO_NOT_CONTACT');
  });

  it('forces DO_NOT_CONTACT when suppressed', () => {
    expect(resolveStage(strong, { suppressed: true }).stage).toBe('DO_NOT_CONTACT');
  });

  it('forces DO_NOT_CONTACT on a legal restriction', () => {
    expect(resolveStage(strong, { legalRestriction: true }).stage).toBe('DO_NOT_CONTACT');
  });

  it('forces NO_CONSENT when consent is withdrawn', () => {
    expect(resolveStage(strong, { consentStatus: 'WITHDRAWN' }).stage).toBe('NO_CONSENT');
  });

  it('routes an IRS notice/audit mention to SPECIALIST_REVIEW', () => {
    expect(resolveStage(strong, { mentionsIrsNoticeOrAudit: true }).stage).toBe('SPECIALIST_REVIEW');
  });

  it('blocks outreach when consent is unknown and outreach is required', () => {
    expect(resolveStage(strong, { consentStatus: 'UNKNOWN', requiresOutreach: true }).stage).toBe('NO_CONSENT');
  });

  it('qualifies an A lead with consent and no restrictions', () => {
    expect(resolveStage(strong, { consentStatus: 'GRANTED' }).stage).toBe('QUALIFIED');
  });
});
