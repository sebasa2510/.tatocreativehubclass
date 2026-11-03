/**
 * sample-data.ts — DETERMINISTIC synthetic lead fixtures.
 *
 * ⚠️  SYNTHETIC ONLY. Every profile is invented (example.com addresses, 555
 * phone numbers) and tagged `isSample: true` so it can never receive real
 * outreach. This module is client-safe (no Prisma, no server-only imports) so
 * the dashboard can render in mock mode without a database.
 */

import { evaluateLead, resolveStage, type ConsentStatusValue } from '@/lib/scoring/evaluator';
import type { LeadStage } from '@/lib/leads/pipeline';
import type { LeadListItem, LeadMetrics } from '@/lib/leads/types';

export interface SyntheticProfile {
  id: string;
  businessName: string;
  contactName: string;
  email: string | null;
  phone: string | null;
  state: string;
  industry: string;
  entityType: string;
  sourceTag: string;
  formedRecently: boolean;
  intentConsultation: boolean;
  intentPricing: boolean;
  replied: boolean;
  engagementOpened: boolean;
  engagementClicked: boolean;
  engagementVisited: boolean;
  verification: { email: boolean; phone: boolean; business: boolean; address: boolean };
  doNotContact: boolean;
  consentStatus: ConsentStatusValue;
  assignedTo: string | null;
  createdAt: string;
  /** Force a stage for demo variety; otherwise derived from score. */
  stageOverride?: LeadStage;
  consultations?: number;
  conversions?: number;
}

const BUSINESSES = [
  'Brickell Builders LLC',
  'Coral Gables Consulting',
  'Little Havana Cafés',
  'South Beach Fitness',
  'Wynwood Design Studio',
  'Doral Logistics Co.',
  'Hialeah Auto Repair',
  'Key Biscayne Realty',
  'Aventura Wellness',
  'Miami Lakes Landscaping',
  'Homestead Growers',
  'Coconut Grove Bookkeeping',
  'Pinecrest Interiors',
  'North Miami Print Shop',
  'Opa-locka Trucking',
  'Sunny Isles Marketing',
  'Bayside Pet Care',
  'Edgewater Electric',
  'Palmetto Bay Catering',
  'Kendall Dental Group',
] as const;

const INDUSTRIES = [
  'construction',
  'professional services',
  'food services',
  'personal services',
  'creative services',
  'transportation',
  'retail',
  'real estate',
  'healthcare',
  'e-commerce',
] as const;

const ENTITIES = ['sole proprietor', 'LLC', 'S-corp', 'partnership', 'independent contractor'] as const;
const STATES = ['FL', 'FL', 'FL', 'GA', 'TX', 'NY', 'CA', 'FL'] as const;
const SOURCES = ['Referral', 'Website', 'CSV import', 'Event', 'Discovery'] as const;
const ASSIGNEES = ['A. Chen, EA', 'M. Alvarez, CPA', 'R. Patel, EA', null] as const;

/** Deterministic pseudo-variety without randomness. */
function pick<T>(arr: readonly T[], i: number): T {
  return arr[i % arr.length];
}

export function buildSyntheticProfile(i: number): SyntheticProfile {
  const businessName = `${pick(BUSINESSES, i)}`;
  const slug = businessName.toLowerCase().replace(/[^a-z0-9]+/g, '.');
  // Every 5th profile is deliberately incomplete (no verified contact).
  const incomplete = i % 5 === 4;
  const entityType = pick(ENTITIES, i);
  const industry = pick(INDUSTRIES, i);
  const state = pick(STATES, i);

  return {
    id: `lead_sample_${String(i + 1).padStart(3, '0')}`,
    businessName,
    contactName: `Owner ${String.fromCharCode(65 + (i % 26))}. Sample`,
    email: incomplete ? `owner${i}@example.com` : `${slug}@example.com`,
    phone: incomplete ? null : `+1305555${String(1000 + i).slice(-4)}`,
    state,
    industry,
    entityType,
    sourceTag: pick(SOURCES, i),
    formedRecently: i % 3 === 0,
    intentConsultation: i % 4 === 0,
    intentPricing: i % 6 === 0,
    replied: i % 7 === 0,
    engagementOpened: i % 2 === 0,
    engagementClicked: i % 8 === 0,
    engagementVisited: i % 3 === 0,
    verification: incomplete
      ? { email: false, phone: false, business: false, address: false }
      : { email: true, phone: true, business: true, address: i % 2 === 0 },
    doNotContact: i % 17 === 0,
    consentStatus: i % 9 === 0 ? 'UNKNOWN' : 'GRANTED',
    assignedTo: incomplete ? null : pick(ASSIGNEES, i),
    createdAt: new Date(Date.UTC(2026, 0, 2 + i)).toISOString(),
    stageOverride: undefined,
    consultations: i % 11 === 0 ? 1 : 0,
    conversions: i % 13 === 0 ? 1 : 0,
  };
}

/** Score a synthetic profile and shape it into a UI list item. */
export function profileToListItem(profile: SyntheticProfile): LeadListItem {
  const scoreResult = evaluateLead({
    verification: profile.verification,
    business: {
      entityType: profile.entityType,
      industry: profile.industry,
      state: profile.state,
      formedRecently: profile.formedRecently,
      source: 'synthetic fixture',
    },
    intent: {
      requestedConsultation: profile.intentConsultation,
      requestedPricing: profile.intentPricing,
      repliedToOutreach: profile.replied,
    },
    timing: { taxDeadlineNear: true },
    engagement: {
      emailOpened: profile.engagementOpened,
      linkClicked: profile.engagementClicked,
      websiteVisited: profile.engagementVisited,
    },
  });

  const decision = resolveStage(scoreResult, {
    doNotContact: profile.doNotContact,
    consentStatus: profile.consentStatus,
    requiresOutreach: false,
  });

  return {
    id: profile.id,
    businessName: profile.businessName,
    contactName: profile.contactName,
    email: profile.email,
    phone: profile.phone,
    state: profile.state,
    industry: profile.industry,
    entityType: profile.entityType,
    grade: decision.grade,
    score: scoreResult.hasVerifiedContact ? scoreResult.score : null,
    confidence: scoreResult.confidence,
    stage: profile.stageOverride ?? decision.stage,
    sourceTag: profile.sourceTag,
    assignedTo: profile.assignedTo,
    isSample: true,
    doNotContact: profile.doNotContact,
    consentStatus: profile.consentStatus,
    createdAt: profile.createdAt,
    gradedAt: scoreResult.hasVerifiedContact ? profile.createdAt : null,
    lastActivityAt: profile.createdAt,
    nextAction: scoreResult.recommendedAction,
  };
}

/** A stable, diverse set of 18 synthetic leads for the mock dashboard. */
export function buildSyntheticLeads(count = 18): LeadListItem[] {
  return Array.from({ length: count }, (_, i) => profileToListItem(buildSyntheticProfile(i)));
}

export const SAMPLE_LEADS: LeadListItem[] = buildSyntheticLeads(18);

/** All 50 synthetic profiles used by the Prisma seed. */
export function buildSyntheticProfiles(count = 50): SyntheticProfile[] {
  return Array.from({ length: count }, (_, i) => buildSyntheticProfile(i));
}

export function computeMetrics(leads: LeadListItem[], isMock = true): LeadMetrics {
  const gradeDistribution = { A: 0, B: 0, C: 0, D: 0, F: 0 } as Record<'A' | 'B' | 'C' | 'D' | 'F', number>;
  const bySourceMap = new Map<string, number>();
  const byIndustryMap = new Map<string, number>();
  const funnelMap = new Map<LeadStage, number>();

  let consultationsBooked = 0;
  let conversions = 0;
  let verificationQueue = 0;
  let followUps = 0;

  for (const lead of leads) {
    if (lead.grade) gradeDistribution[lead.grade] += 1;
    bySourceMap.set(lead.sourceTag ?? 'Unknown', (bySourceMap.get(lead.sourceTag ?? 'Unknown') ?? 0) + 1);
    byIndustryMap.set(lead.industry ?? 'Unknown', (byIndustryMap.get(lead.industry ?? 'Unknown') ?? 0) + 1);
    funnelMap.set(lead.stage, (funnelMap.get(lead.stage) ?? 0) + 1);

    if (lead.stage === 'CONSULTATION_BOOKED') consultationsBooked += 1;
    if (lead.stage === 'CONVERTED') conversions += 1;
    if (lead.stage === 'RESEARCHING' || lead.stage === 'INSUFFICIENT_INFORMATION' || lead.stage === 'NEW') verificationQueue += 1;
    if (lead.stage === 'FOLLOW_UP_NEEDED' || lead.stage === 'NURTURE') followUps += 1;
  }

  const total = leads.length;
  return {
    total,
    gradeACount: gradeDistribution.A,
    gradeBCount: gradeDistribution.B,
    verificationQueue,
    followUps,
    consultationsBooked,
    conversions,
    conversionRate: total === 0 ? 0 : Math.round((conversions / total) * 1000) / 10,
    gradeDistribution,
    bySource: [...bySourceMap.entries()].map(([source, count]) => ({ source, count })).sort((a, b) => b.count - a.count),
    byIndustry: [...byIndustryMap.entries()].map(([industry, count]) => ({ industry, count })).sort((a, b) => b.count - a.count),
    funnel: [...funnelMap.entries()].map(([stage, count]) => ({ stage, count })),
    isMock,
  };
}
