/**
 * types.ts — view-model shapes shared by the lead repository and UI.
 * Kept free of Prisma types so client components can import them safely.
 */

import type { LeadStage } from '@/lib/leads/pipeline';
import type { CriterionResult, LeadGrade, ScoreConfidence, ScoreEvidence, ConsentStatusValue } from '@/lib/scoring/evaluator';

export interface LeadListItem {
  id: string;
  businessName: string | null;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  state: string | null;
  industry: string | null;
  entityType: string | null;
  grade: LeadGrade | null;
  score: number | null;
  confidence: ScoreConfidence | null;
  stage: LeadStage;
  sourceTag: string | null;
  assignedTo: string | null;
  isSample: boolean;
  doNotContact: boolean;
  consentStatus: ConsentStatusValue;
  createdAt: string;
  gradedAt: string | null;
  lastActivityAt: string | null;
  nextAction: string | null;
}

export interface LeadActivityItem {
  id: string;
  kind: string;
  body: string;
  actor: string | null;
  createdAt: string;
}

export interface LeadConsultationItem {
  id: string;
  status: string;
  scheduledAt: string | null;
  eventLink: string | null;
  specialistNotes: string | null;
}

export interface LeadDraftItem {
  id: string;
  status: string;
  subject: string | null;
  body: string;
  createdAt: string;
  sentAt: string | null;
}

export interface LeadConversionItem {
  id: string;
  kind: string;
  revenueCents: number | null;
  occurredAt: string;
}

export interface LeadDetail extends LeadListItem {
  website: string | null;
  addressLine1: string | null;
  city: string | null;
  postalCode: string | null;
  sourceUrl: string | null;
  discoveryDate: string | null;
  verified: { email: boolean; phone: boolean; business: boolean; address: boolean };
  reasons: string[];
  evidence: ScoreEvidence[];
  missingInfo: string[];
  scoreBreakdown: CriterionResult[];
  activities: LeadActivityItem[];
  consultations: LeadConsultationItem[];
  drafts: LeadDraftItem[];
  conversions: LeadConversionItem[];
}

export interface LeadMetrics {
  total: number;
  gradeACount: number;
  gradeBCount: number;
  verificationQueue: number;
  followUps: number;
  consultationsBooked: number;
  conversions: number;
  conversionRate: number;
  gradeDistribution: Record<LeadGrade, number>;
  bySource: Array<{ source: string; count: number }>;
  byIndustry: Array<{ industry: string; count: number }>;
  funnel: Array<{ stage: LeadStage; count: number }>;
  isMock: boolean;
}

export interface LeadListFilters {
  q?: string;
  grade?: LeadGrade | 'ALL';
  stage?: LeadStage | 'ALL';
  source?: string | 'ALL';
  assigned?: string | 'ALL';
  sort?: 'score' | 'createdAt' | 'grade' | 'businessName';
  direction?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}
