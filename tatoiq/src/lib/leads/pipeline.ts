/**
 * pipeline.ts — lead stage vocabulary, labels, tones, and transitions.
 *
 * Kept in sync with the `LeadState` enum in prisma/schema.prisma.
 */

export const LEAD_STAGES = [
  'NEW',
  'RESEARCHING',
  'VERIFIED',
  'QUALIFIED',
  'CONTACTED',
  'NURTURE',
  'FOLLOW_UP_NEEDED',
  'CONSULTATION_BOOKED',
  'CONVERTED',
  'SPECIALIST_REVIEW',
  'POOR_FIT',
  'INSUFFICIENT_INFORMATION',
  'NO_CONSENT',
  'DO_NOT_CONTACT',
] as const;

export type LeadStage = (typeof LEAD_STAGES)[number];

export const LEAD_STAGE_LABELS: Record<LeadStage, string> = {
  NEW: 'New',
  RESEARCHING: 'Researching',
  VERIFIED: 'Verified',
  QUALIFIED: 'Qualified',
  CONTACTED: 'Contacted',
  NURTURE: 'Nurture',
  FOLLOW_UP_NEEDED: 'Follow-up needed',
  CONSULTATION_BOOKED: 'Consultation booked',
  CONVERTED: 'Converted',
  SPECIALIST_REVIEW: 'Specialist review',
  POOR_FIT: 'Poor fit',
  INSUFFICIENT_INFORMATION: 'Insufficient information',
  NO_CONSENT: 'No consent',
  DO_NOT_CONTACT: 'Do not contact',
};

export type StageTone = 'neutral' | 'progress' | 'attention' | 'good' | 'blocked' | 'done';

export function stageTone(stage: LeadStage): StageTone {
  switch (stage) {
    case 'NEW':
    case 'RESEARCHING':
      return 'progress';
    case 'VERIFIED':
    case 'QUALIFIED':
      return 'neutral';
    case 'CONTACTED':
      return 'progress';
    case 'NURTURE':
    case 'FOLLOW_UP_NEEDED':
    case 'SPECIALIST_REVIEW':
    case 'INSUFFICIENT_INFORMATION':
      return 'attention';
    case 'CONSULTATION_BOOKED':
      return 'good';
    case 'CONVERTED':
      return 'done';
    case 'POOR_FIT':
    case 'NO_CONSENT':
    case 'DO_NOT_CONTACT':
      return 'blocked';
    default:
      return 'neutral';
  }
}

/**
 * Stages that end the automated pipeline. Consent/legal states are hard stops:
 * a lead in one of them is never auto-contacted.
 */
export const TERMINAL_STAGES: LeadStage[] = [
  'CONVERTED',
  'POOR_FIT',
  'NO_CONSENT',
  'DO_NOT_CONTACT',
];

export const CONSENT_BLOCKED_STAGES: LeadStage[] = [
  'NO_CONSENT',
  'DO_NOT_CONTACT',
  'SPECIALIST_REVIEW',
];

export function isTerminal(stage: LeadStage): boolean {
  return TERMINAL_STAGES.includes(stage);
}

export function isConsentBlocked(stage: LeadStage): boolean {
  return CONSENT_BLOCKED_STAGES.includes(stage);
}

const TRANSITIONS: Record<LeadStage, LeadStage[]> = {
  NEW: ['RESEARCHING', 'VERIFIED', 'INSUFFICIENT_INFORMATION', 'POOR_FIT', 'NO_CONSENT', 'DO_NOT_CONTACT', 'SPECIALIST_REVIEW'],
  RESEARCHING: ['VERIFIED', 'INSUFFICIENT_INFORMATION', 'POOR_FIT', 'QUALIFIED', 'SPECIALIST_REVIEW', 'DO_NOT_CONTACT', 'NO_CONSENT'],
  VERIFIED: ['QUALIFIED', 'POOR_FIT', 'INSUFFICIENT_INFORMATION', 'SPECIALIST_REVIEW', 'DO_NOT_CONTACT', 'NO_CONSENT'],
  QUALIFIED: ['CONTACTED', 'NURTURE', 'FOLLOW_UP_NEEDED', 'CONSULTATION_BOOKED', 'SPECIALIST_REVIEW', 'DO_NOT_CONTACT', 'NO_CONSENT', 'POOR_FIT'],
  CONTACTED: ['NURTURE', 'FOLLOW_UP_NEEDED', 'CONSULTATION_BOOKED', 'CONVERTED', 'SPECIALIST_REVIEW', 'DO_NOT_CONTACT', 'NO_CONSENT'],
  NURTURE: ['CONTACTED', 'FOLLOW_UP_NEEDED', 'CONSULTATION_BOOKED', 'CONVERTED', 'POOR_FIT', 'DO_NOT_CONTACT', 'NO_CONSENT'],
  FOLLOW_UP_NEEDED: ['CONTACTED', 'NURTURE', 'CONSULTATION_BOOKED', 'CONVERTED', 'SPECIALIST_REVIEW', 'DO_NOT_CONTACT', 'NO_CONSENT'],
  CONSULTATION_BOOKED: ['CONVERTED', 'NURTURE', 'FOLLOW_UP_NEEDED', 'SPECIALIST_REVIEW', 'DO_NOT_CONTACT', 'NO_CONSENT'],
  CONVERTED: [],
  SPECIALIST_REVIEW: ['CONSULTATION_BOOKED', 'CONVERTED', 'NURTURE', 'POOR_FIT', 'DO_NOT_CONTACT', 'NO_CONSENT'],
  POOR_FIT: ['NURTURE', 'DO_NOT_CONTACT', 'NO_CONSENT'],
  INSUFFICIENT_INFORMATION: ['RESEARCHING', 'VERIFIED', 'POOR_FIT', 'DO_NOT_CONTACT', 'NO_CONSENT'],
  NO_CONSENT: ['DO_NOT_CONTACT'],
  DO_NOT_CONTACT: [],
};

export function canTransition(from: LeadStage, to: LeadStage): boolean {
  if (from === to) return true;
  return (TRANSITIONS[from] ?? []).includes(to);
}
