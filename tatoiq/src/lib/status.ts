/**
 * status.ts — preparation, filing, and refund statuses.
 *
 * The spec requires these modelled SEPARATELY: a return can be ACCEPTED for
 * processing while the refund is NOT_YET_ISSUED. Acceptance never implies a
 * refund was or will be issued.
 */

export const PREPARATION_STATUSES = [
  'NOT_STARTED',
  'INTAKE_IN_PROGRESS',
  'DOCUMENTS_REQUESTED',
  'INFORMATION_REVIEW_NEEDED',
  'PREPARATION_IN_PROGRESS',
  'AWAITING_CLIENT_RESPONSE',
  'AWAITING_PREPARER_REVIEW',
  'AWAITING_CLIENT_AUTHORIZATION',
  'READY_FOR_FILING',
  'SUBMITTED_FOR_FILING',
  'ACKNOWLEDGED',
  'REJECTED_OR_ACTION_REQUIRED',
  'ACCEPTED_FOR_PROCESSING',
  'COMPLETED',
] as const;

export type PreparationStatus = (typeof PREPARATION_STATUSES)[number];

export const PREPARATION_LABELS: Record<PreparationStatus, string> = {
  NOT_STARTED: 'Not started',
  INTAKE_IN_PROGRESS: 'Intake in progress',
  DOCUMENTS_REQUESTED: 'Documents requested',
  INFORMATION_REVIEW_NEEDED: 'Information review needed',
  PREPARATION_IN_PROGRESS: 'Preparation in progress',
  AWAITING_CLIENT_RESPONSE: 'Awaiting client response',
  AWAITING_PREPARER_REVIEW: 'Awaiting preparer review',
  AWAITING_CLIENT_AUTHORIZATION: 'Awaiting client authorization',
  READY_FOR_FILING: 'Ready for filing',
  SUBMITTED_FOR_FILING: 'Submitted for filing',
  ACKNOWLEDGED: 'Acknowledged by the receiving authority',
  REJECTED_OR_ACTION_REQUIRED: 'Rejected or action required',
  ACCEPTED_FOR_PROCESSING: 'Accepted for processing',
  COMPLETED: 'Completed',
};

export const FILING_STATUS_LABELS: Record<string, string> = {
  NOT_FILED: 'Not filed',
  SUBMITTED: 'Submitted',
  ACKNOWLEDGED: 'Acknowledged',
  REJECTED: 'Rejected',
  ACCEPTED: 'Accepted for processing',
};

export const REFUND_STATUS_LABELS: Record<string, string> = {
  NOT_APPLICABLE: 'Not applicable',
  NOT_YET_ISSUED: 'Not yet issued',
  ISSUED: 'Issued',
  CLIENT_CONFIRMED_RECEIVED: 'Client confirmed received',
};

/**
 * The six client-visible preparation milestones, in order. Several of the 14
 * underlying statuses happen "between" milestones, so the tracker shows these
 * while progress is still computed from the full status sequence.
 */
export const MILESTONES: Array<{ label: string; at: PreparationStatus }> = [
  { label: 'Intake', at: 'INTAKE_IN_PROGRESS' },
  { label: 'Documents', at: 'DOCUMENTS_REQUESTED' },
  { label: 'Preparation', at: 'PREPARATION_IN_PROGRESS' },
  { label: 'Review', at: 'AWAITING_PREPARER_REVIEW' },
  { label: 'Authorize', at: 'AWAITING_CLIENT_AUTHORIZATION' },
  { label: 'File', at: 'READY_FOR_FILING' },
];

/**
 * Single source of truth for preparation progress (0–100).
 *
 * Every surface — dashboard, status page, and the marketing preview — must call
 * this. Hardcoding a percentage elsewhere is how the portal ended up claiming
 * 46% in the app and 62% on the homepage for the same return.
 */
export function preparationProgress(status: PreparationStatus): number {
  const current = PREPARATION_STATUSES.indexOf(status);
  if (current <= 0) return 0;
  return Math.round((current / (PREPARATION_STATUSES.length - 1)) * 100);
}

/** Tone for a status badge (presentation only). */
export function statusTone(status: PreparationStatus): 'neutral' | 'progress' | 'attention' | 'good' {
  switch (status) {
    case 'NOT_STARTED':
    case 'INTAKE_IN_PROGRESS':
    case 'DOCUMENTS_REQUESTED':
    case 'PREPARATION_IN_PROGRESS':
      return 'progress';
    case 'INFORMATION_REVIEW_NEEDED':
    case 'AWAITING_CLIENT_RESPONSE':
    case 'AWAITING_PREPARER_REVIEW':
    case 'AWAITING_CLIENT_AUTHORIZATION':
    case 'REJECTED_OR_ACTION_REQUIRED':
      return 'attention';
    case 'READY_FOR_FILING':
    case 'SUBMITTED_FOR_FILING':
    case 'ACKNOWLEDGED':
    case 'ACCEPTED_FOR_PROCESSING':
    case 'COMPLETED':
      return 'good';
    default:
      return 'neutral';
  }
}
