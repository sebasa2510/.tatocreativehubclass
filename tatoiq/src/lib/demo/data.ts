/**
 * data.ts — SYNTHETIC demo data for the TatoIQ portal.
 *
 * ⚠️  SYNTHETIC ONLY. No real taxpayer data may ever appear in fixtures, demos,
 * screenshots, or repositories (spec: QA testing rules). "Jordan Rivera" is a
 * fictional persona.
 *
 * This is a client-safe, DB-free repository so the portal can run and demo
 * without a provisioned database. When DATABASE_URL is configured, the same
 * shapes are served by Prisma (see docs/ARCHITECTURE.md).
 */

import type { PreparationStatus } from '@/lib/status';

export interface DemoDocument {
  id: string;
  name: string;
  scanStatus: 'quarantined' | 'scanning' | 'clean' | 'infected';
  extractionFields: Array<{
    label: string;
    value: string;
    accepted: boolean;
    needsConfirmation?: boolean;
  }>;
}

export interface DemoTask {
  id: string;
  title: string;
  dueDate: string;
  completed: boolean;
}

export interface DemoMessage {
  id: string;
  from: string;
  body: string;
  at: string;
}

export interface DemoStatusEvent {
  status: PreparationStatus;
  at: string;
  actor: string;
  reason?: string;
  evidence?: string;
  manuallyRecorded?: boolean;
}

export interface DemoReturn {
  id: string;
  clientName: string;
  taxYear: number;
  returnType: string;
  preparationStatus: PreparationStatus;
  filingStatus: string;
  refundStatus: string;
  assignedPreparer: string;
  preparerPtinVerified: boolean;
  business: {
    grossReceipts: number;
    expenses: Array<{ label: string; amount: number }>;
  };
  documents: DemoDocument[];
  tasks: DemoTask[];
  messages: DemoMessage[];
  statusHistory: DemoStatusEvent[];
}

export const DEMO_RETURN: DemoReturn = {
  id: 'ret_demo_2025',
  clientName: 'Jordan Rivera',
  taxYear: 2025,
  returnType: 'Form 1040 + Schedule C + Schedule SE',
  preparationStatus: 'AWAITING_PREPARER_REVIEW',
  filingStatus: 'NOT_FILED',
  refundStatus: 'NOT_APPLICABLE',
  assignedPreparer: 'A. Chen, EA (PTIN verified)',
  preparerPtinVerified: true,
  business: {
    grossReceipts: 82000,
    expenses: [
      { label: 'Advertising', amount: 1800 },
      { label: 'Office expense', amount: 950 },
      { label: 'Software & subscriptions', amount: 2400 },
      { label: 'Business mileage', amount: 3120 },
      { label: 'Home office (simplified)', amount: 1500 },
    ],
  },
  documents: [
    {
      id: 'doc_w2',
      name: 'w2-2025-parttime.pdf',
      scanStatus: 'clean',
      extractionFields: [
        { label: 'Employer name', value: 'Coral Gables Studio LLC', accepted: true },
        { label: 'Box 1 wages', value: '12,400.00', accepted: true },
        { label: 'Box 2 federal tax withheld', value: '980.00', accepted: true },
        { label: 'Employer EIN', value: '88-1234567', accepted: false, needsConfirmation: true },
      ],
    },
    {
      id: 'doc_1099',
      name: '1099-nec-2025.pdf',
      scanStatus: 'clean',
      extractionFields: [
        { label: 'Payer name', value: 'Brightline Marketing', accepted: true },
        { label: 'Nonemployee compensation', value: '48,000.00', accepted: true },
        { label: 'Payer TIN', value: '59-7654321', accepted: false, needsConfirmation: true },
      ],
    },
    {
      id: 'doc_receipts',
      name: 'receipts-bundle-q3.pdf',
      scanStatus: 'scanning',
      extractionFields: [],
    },
  ],
  tasks: [
    {
      id: 'task_1',
      title: 'Confirm business mileage log (Jan–Dec)',
      dueDate: '2026-02-15',
      completed: false,
    },
    {
      id: 'task_2',
      title: 'Upload Q4 receipts',
      dueDate: '2026-02-20',
      completed: false,
    },
    {
      id: 'task_3',
      title: 'Review draft Schedule C',
      dueDate: '2026-03-01',
      completed: true,
    },
  ],
  messages: [
    {
      id: 'msg_1',
      from: 'A. Chen, EA',
      body: 'Hi Jordan — I reviewed your draft 1040 and Schedule C. Two extraction fields still need your confirmation in Documents.',
      at: '2026-01-28T15:04:00Z',
    },
    {
      id: 'msg_2',
      from: 'Jordan Rivera',
      body: 'Thanks! I will confirm those today.',
      at: '2026-01-28T18:12:00Z',
    },
  ],
  statusHistory: [
    { status: 'NOT_STARTED', at: '2026-01-05T09:00:00Z', actor: 'System' },
    { status: 'INTAKE_IN_PROGRESS', at: '2026-01-05T09:02:00Z', actor: 'Jordan Rivera' },
    { status: 'DOCUMENTS_REQUESTED', at: '2026-01-06T10:15:00Z', actor: 'A. Chen, EA' },
    { status: 'PREPARATION_IN_PROGRESS', at: '2026-01-20T13:40:00Z', actor: 'A. Chen, EA' },
    {
      status: 'AWAITING_PREPARER_REVIEW',
      at: '2026-01-27T16:20:00Z',
      actor: 'A. Chen, EA',
      reason: 'Draft complete; extraction confirmations pending',
      manuallyRecorded: true,
    },
  ],
};

/** Deadlines for the demo tax year (illustrative; sourced from IRS due dates). */
export const DEMO_DEADLINES = [
  { label: 'Federal filing deadline (individual)', date: '2026-04-15' },
  { label: 'Q4 estimated tax payment', date: '2026-01-15' },
];

export interface DemoDocumentStats {
  /** Documents on file. */
  documents: number;
  /** Documents whose malware scan finished clean. */
  scannedClean: number;
  /** Extraction fields found across all documents. */
  fields: number;
  /** Extraction fields the client has confirmed. */
  fieldsConfirmed: number;
  /** Fields still awaiting client confirmation. */
  fieldsPending: number;
}

/**
 * Single source of truth for document numbers. The dashboard, the documents
 * page, the status page, and the marketing preview all derive from this, so
 * they can never disagree about how many documents or confirmations exist.
 */
export function documentStats(returnData: DemoReturn = DEMO_RETURN): DemoDocumentStats {
  const allFields = returnData.documents.flatMap((d) => d.extractionFields);
  const fieldsConfirmed = allFields.filter((f) => f.accepted).length;
  return {
    documents: returnData.documents.length,
    scannedClean: returnData.documents.filter((d) => d.scanStatus === 'clean').length,
    fields: allFields.length,
    fieldsConfirmed,
    fieldsPending: allFields.length - fieldsConfirmed,
  };
}
