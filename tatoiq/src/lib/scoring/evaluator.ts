/**
 * evaluator.ts — central lead scoring engine.
 *
 * Shared by API routes and batch jobs (spec: one evaluator, no duplicated math).
 * Pure + deterministic so it is trivially unit-testable and safe to run in a
 * worker. Persistence is the caller's responsibility.
 *
 * Rules implemented here:
 *  - Score 0-100 from weighted criteria (service fit, buying intent, timing,
 *    market/service-area fit, engagement). See DEFAULT_WEIGHTS for the
 *    rationale behind each weight.
 *  - Unverified fields earn ZERO points and lower the confidence tag.
 *  - A lead with no verified contact field is state "insufficient information"
 *    and receives NO grade (never an artificial one).
 *  - Every result carries grade, score, reasons, evidence+source, missing info,
 *    confidence, recommended next action, and the evaluation date.
 */

import type { LeadStage } from '@/lib/leads/pipeline';

export type LeadGrade = 'A' | 'B' | 'C' | 'D' | 'F';
export type ScoreConfidence = 'HIGH' | 'MEDIUM' | 'LOW';
export type ConsentStatusValue = 'UNKNOWN' | 'GRANTED' | 'WITHDRAWN' | 'NOT_REQUIRED';

export interface ScoreWeights {
  serviceFit: number;
  buyingIntent: number;
  timing: number;
  marketFit: number;
  engagement: number;
}

/**
 * Default weights — TatoIQ rubric.
 *
 * Rationale, in order of influence on expected revenue per lead:
 *
 *  serviceFit 30 — A tax practice earns on return complexity. A Schedule C
 *    filer or an S-corp is worth several times a single-W-2 client and
 *    usually retains for years. Complexity is the largest signal.
 *  buyingIntent 28 — Intent is the strongest *behavioural* signal and, unlike
 *    timing, it is a choice the lead actually made. Someone who booked a
 *    consultation or asked for pricing is far down the funnel.
 *  marketFit 18 — A licensed practice can only serve where it is licensed.
 *    Out-of-area leads are not lower quality, they are simply unserviceable.
 *  timing 12 — Deliberately modest. Seasonality is real but it is noise the
 *    lead cannot control; a strong lead in July is still a strong lead. This
 *    is intentionally far below the instinct to overweight deadline proximity.
 *  engagement 12 — Email opens and link clicks are weak, cheap signals. They
 *    break ties; they should never drive a grade on their own.
 *
 * Sum: 100. Weights must always sum to 100 — `assertWeightsSum` guards this.
 */
export const DEFAULT_WEIGHTS: ScoreWeights = {
  serviceFit: 30,
  buyingIntent: 28,
  timing: 12,
  marketFit: 18,
  engagement: 12,
};

/** Throws when a caller supplies weights that do not sum to exactly 100. */
export function assertWeightsSum(weights: ScoreWeights): ScoreWeights {
  const sum = Object.values(weights).reduce((a, b) => a + b, 0);
  if (sum !== 100) {
    throw new Error(`ScoreWeights must sum to 100; received ${sum}.`);
  }
  return weights;
}

export const GRADE_BANDS: ReadonlyArray<{ grade: LeadGrade; min: number; max: number }> = [
  { grade: 'A', min: 90, max: 100 },
  { grade: 'B', min: 80, max: 89 },
  { grade: 'C', min: 70, max: 79 },
  { grade: 'D', min: 60, max: 69 },
  { grade: 'F', min: 0, max: 59 },
];

/** Map a 0-100 score to its letter grade (bands are inclusive). */
export function gradeForScore(score: number): LeadGrade {
  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  for (const band of GRADE_BANDS) {
    if (clamped >= band.min && clamped <= band.max) return band.grade;
  }
  return 'F';
}

export interface ScoreEvidence {
  field: string;
  value: string;
  source: string;
}

export interface CriterionResult {
  criterion: keyof ScoreWeights;
  label: string;
  points: number;
  max: number;
  reasons: string[];
  evidence: ScoreEvidence[];
  missing: string[];
}

export interface LeadScoringInput {
  verification: {
    email: boolean;
    phone: boolean;
    business: boolean;
    address: boolean;
  };
  business: {
    entityType?: string | null;
    industry?: string | null;
    state?: string | null;
    formedRecently?: boolean;
    source?: string;
  };
  intent: {
    requestedConsultation?: boolean;
    requestedPricing?: boolean;
    repliedToOutreach?: boolean;
  };
  timing: {
    taxDeadlineNear?: boolean;
  };
  engagement: {
    emailOpened?: boolean;
    linkClicked?: boolean;
    websiteVisited?: boolean;
  };
  targeting?: {
    serviceStates?: string[] | null;
    serviceIndustries?: string[] | null;
    serviceEntityTypes?: string[] | null;
  };
}

export interface ScoreResult {
  score: number;
  grade: LeadGrade | null;
  confidence: ScoreConfidence;
  reasons: string[];
  evidence: ScoreEvidence[];
  missingInfo: string[];
  recommendedAction: string;
  evaluatedAt: string;
  weights: ScoreWeights;
  criteria: CriterionResult[];
  /** Suggested stage before consent/legal overrides are applied. */
  proposedStage: LeadStage;
  hasVerifiedContact: boolean;
}

function matches(value: string | null | undefined, list: string[] | null | undefined): boolean {
  if (!value || !list || list.length === 0) return false;
  const v = value.trim().toLowerCase();
  return list.some((item) => item.trim().toLowerCase() === v);
}

/** Sum weighted criteria into a single deterministic score + explanation. */
export function evaluateLead(input: LeadScoringInput, weights: ScoreWeights = DEFAULT_WEIGHTS): ScoreResult {
  const verifiedContactChannels = [input.verification.email, input.verification.phone].filter(Boolean).length;
  const hasVerifiedContact = verifiedContactChannels > 0;
  const businessTrusted = input.verification.business;
  const locationTrusted = input.verification.address || input.verification.business;
  const source = input.business.source ?? 'unverified self-report';

  const criteria: CriterionResult[] = [];

  // ── Service fit (business identity must be verified to earn points) ──
  {
    const max = weights.serviceFit;
    let points = 0;
    const reasons: string[] = [];
    const evidence: ScoreEvidence[] = [];
    const missing: string[] = [];
    if (!businessTrusted) {
      missing.push('Business identity not verified');
    } else {
      const entityMatch = matches(input.business.entityType, input.targeting?.serviceEntityTypes ?? ['sole proprietor', 'llc', 's-corp', 's corporation', 'partnership', 'self-employed', 'independent contractor']);
      const industryMatch = matches(input.business.industry, input.targeting?.serviceIndustries ?? ['construction', 'retail', 'consulting', 'real estate', 'food services', 'professional services', 'e-commerce', 'transportation', 'healthcare', 'personal services', 'creative services']);
      // Fixed 70/30 split. Entity drives the larger share: a pass-through
      // entity almost always means a 1040 plus a business schedule, i.e. a
      // materially larger fee. Awarding the remainder to a matching industry
      // would silently hand an unmatched entity a full-marks service fit.
      const entityPoints = entityMatch ? Math.round(max * 0.7) : 0;
      const industryPoints = industryMatch ? Math.round(max * 0.3) : 0;
      points = Math.min(max, entityPoints + industryPoints);
      if (entityMatch) {
        reasons.push(`Entity type "${input.business.entityType}" fits served client types.`);
        evidence.push({ field: 'entityType', value: String(input.business.entityType), source });
      }
      if (industryMatch) {
        reasons.push(`Industry "${input.business.industry}" fits served industries.`);
        evidence.push({ field: 'industry', value: String(input.business.industry), source });
      }
      if (!entityMatch && !industryMatch) missing.push('Entity type / industry not in served set');
    }
    criteria.push({ criterion: 'serviceFit', label: 'Service fit', points, max, reasons, evidence, missing });
  }

  // ── Buying intent (derived from a verified contact channel) ──
  {
    const max = weights.buyingIntent;
    let points = 0;
    const reasons: string[] = [];
    const evidence: ScoreEvidence[] = [];
    const missing: string[] = [];
    if (!hasVerifiedContact) {
      missing.push('No verified contact channel for intent signals');
    } else {
      if (input.intent.requestedConsultation) {
        points += Math.round(max * 0.55);
        reasons.push('Explicitly requested a consultation.');
        evidence.push({ field: 'intent', value: 'requested consultation', source: 'verified contact' });
      }
      if (input.intent.requestedPricing) {
        points += Math.round(max * 0.25);
        reasons.push('Asked about pricing.');
        evidence.push({ field: 'intent', value: 'asked pricing', source: 'verified contact' });
      }
      if (input.intent.repliedToOutreach) {
        points += Math.round(max * 0.2);
        reasons.push('Replied to prior outreach.');
        evidence.push({ field: 'intent', value: 'replied to outreach', source: 'verified contact' });
      }
      points = Math.min(max, points);
    }
    criteria.push({ criterion: 'buyingIntent', label: 'Buying intent', points, max, reasons, evidence, missing });
  }

  // ── Timing ──
  {
    const max = weights.timing;
    let points = 0;
    const reasons: string[] = [];
    const evidence: ScoreEvidence[] = [];
    const missing: string[] = [];
    if (!businessTrusted) {
      missing.push('Business identity not verified');
    } else {
      if (input.business.formedRecently) {
        points += Math.round(max * 0.5);
        reasons.push('Business recently formed — high intent window.');
        evidence.push({ field: 'formedRecently', value: 'true', source });
      }
      if (input.timing.taxDeadlineNear) {
        points += Math.round(max * 0.5);
        reasons.push('Tax deadline is near.');
        evidence.push({ field: 'taxDeadlineNear', value: 'true', source: 'calendar' });
      }
      points = Math.min(max, points);
    }
    criteria.push({ criterion: 'timing', label: 'Timing', points, max, reasons, evidence, missing });
  }

  // ── Market / service-area fit ──
  {
    const max = weights.marketFit;
    let points = 0;
    const reasons: string[] = [];
    const evidence: ScoreEvidence[] = [];
    const missing: string[] = [];
    const serviceStates = input.targeting?.serviceStates;
    if (!locationTrusted) {
      missing.push('Location not verified');
    } else if (!serviceStates || serviceStates.length === 0) {
      points = max; // No stated restriction → nationwide coverage.
      reasons.push('Served area is nationwide; no state restriction.');
    } else if (matches(input.business.state, serviceStates)) {
      points = max;
      reasons.push(`State "${input.business.state}" is covered by license coverage.`);
      evidence.push({ field: 'state', value: String(input.business.state), source });
    } else {
      reasons.push(`State "${input.business.state ?? 'unknown'}" is outside covered service area.`);
      missing.push('State outside service area');
    }
    criteria.push({ criterion: 'marketFit', label: 'Market / service-area fit', points, max, reasons, evidence, missing });
  }

  // ── Engagement ──
  {
    const max = weights.engagement;
    let points = 0;
    const reasons: string[] = [];
    const evidence: ScoreEvidence[] = [];
    const missing: string[] = [];
    if (!hasVerifiedContact) {
      missing.push('No verified contact channel for engagement');
    } else {
      if (input.engagement.emailOpened) {
        points += Math.round(max * 0.5);
        reasons.push('Opened a prior outreach email.');
        evidence.push({ field: 'engagement', value: 'email opened', source: 'verified contact' });
      }
      if (input.engagement.linkClicked) {
        points += Math.round(max * 0.3);
        reasons.push('Clicked a link in outreach.');
        evidence.push({ field: 'engagement', value: 'link clicked', source: 'verified contact' });
      }
      if (input.engagement.websiteVisited) {
        points += Math.round(max * 0.2);
        reasons.push('Visited the TatoIQ website.');
        evidence.push({ field: 'engagement', value: 'website visit', source: 'analytics' });
      }
      points = Math.min(max, points);
    }
    criteria.push({ criterion: 'engagement', label: 'Engagement', points, max, reasons, evidence, missing });
  }

  const reasons = criteria.flatMap((c) => c.reasons);
  const evidence = criteria.flatMap((c) => c.evidence);
  const missingInfo = [...new Set(criteria.flatMap((c) => c.missing))];

  // Confidence reflects how much of the picture is verified.
  let confidence: ScoreConfidence = 'LOW';
  if (businessTrusted && hasVerifiedContact && input.verification.address) confidence = 'HIGH';
  else if (businessTrusted && hasVerifiedContact) confidence = 'MEDIUM';

  const rawScore = criteria.reduce((sum, c) => sum + c.points, 0);

  // No verified contact field → no artificial grade.
  if (!hasVerifiedContact) {
    return {
      score: 0,
      grade: null,
      confidence: 'LOW',
      reasons: [...reasons, 'No verified contact field — cannot grade this lead.'],
      evidence,
      missingInfo: [...new Set([...missingInfo, 'Verified email or phone'])],
      recommendedAction: 'Enrich and verify a contact channel before qualifying.',
      evaluatedAt: new Date().toISOString(),
      weights,
      criteria,
      proposedStage: 'INSUFFICIENT_INFORMATION',
      hasVerifiedContact: false,
    };
  }

  const score = Math.max(0, Math.min(100, rawScore));
  const grade = gradeForScore(score);
  const proposedStage: LeadStage = score >= 70 ? 'QUALIFIED' : score >= 60 ? 'RESEARCHING' : 'POOR_FIT';

  return {
    score,
    grade,
    confidence,
    reasons,
    evidence,
    missingInfo,
    recommendedAction: recommendedActionFor(grade),
    evaluatedAt: new Date().toISOString(),
    weights,
    criteria,
    proposedStage,
    hasVerifiedContact: true,
  };
}

function recommendedActionFor(grade: LeadGrade): string {
  switch (grade) {
    case 'A':
      return 'Assign to a licensed specialist and approve outreach promptly.';
    case 'B':
      return 'Assign to the outreach queue for human-approved contact.';
    case 'C':
      return 'Nurture with educational content before outreach.';
    case 'D':
      return 'Research further to confirm service fit and intent.';
    case 'F':
      return 'Mark poor fit; do not contact.';
    default:
      return 'Review manually.';
  }
}

export interface EligibilityContext {
  suppressed?: boolean;
  doNotContact?: boolean;
  consentStatus?: ConsentStatusValue;
  legalRestriction?: boolean;
  mentionsIrsNoticeOrAudit?: boolean;
  /** Set when outreach is actually being prepared (stricter). */
  requiresOutreach?: boolean;
}

export interface FinalDecision {
  stage: LeadStage;
  grade: LeadGrade | null;
  overrideReason?: string;
}

/**
 * Layer consent, suppression, legal, and eligibility over a score result.
 * These ALWAYS override the grade-derived stage.
 */
export function resolveStage(score: ScoreResult, ctx: EligibilityContext = {}): FinalDecision {
  if (ctx.doNotContact || ctx.suppressed) {
    return { stage: 'DO_NOT_CONTACT', grade: score.grade, overrideReason: 'Do-not-contact / suppressed contact.' };
  }
  if (ctx.legalRestriction) {
    return { stage: 'DO_NOT_CONTACT', grade: score.grade, overrideReason: 'Legal restriction on contact.' };
  }
  if (ctx.consentStatus === 'WITHDRAWN') {
    return { stage: 'NO_CONSENT', grade: score.grade, overrideReason: 'Consent withdrawn.' };
  }
  if (ctx.mentionsIrsNoticeOrAudit) {
    return { stage: 'SPECIALIST_REVIEW', grade: score.grade, overrideReason: 'Mentions an active IRS notice or audit — routed to Specialist Review.' };
  }
  if (ctx.requiresOutreach && (ctx.consentStatus ?? 'UNKNOWN') === 'UNKNOWN') {
    return { stage: 'NO_CONSENT', grade: score.grade, overrideReason: 'No recorded consent for outreach.' };
  }
  if (!score.hasVerifiedContact) {
    return { stage: 'INSUFFICIENT_INFORMATION', grade: null, overrideReason: 'No verified contact field.' };
  }
  return { stage: score.proposedStage, grade: score.grade };
}
