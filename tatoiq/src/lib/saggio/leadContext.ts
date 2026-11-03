import 'server-only';

import type { LeadGrade, ScoreConfidence } from '@/lib/scoring/evaluator';
import type { LeadStage } from '@/lib/leads/pipeline';

/**
 * leadContext.ts — the narrow, read-only view of a lead that Saggio is allowed
 * to see when tailoring educational guidance.
 *
 * Hard boundary (spec): Saggio EDUCATES. It never diagnoses a tax liability,
 * never gives individualized tax advice, and never decides eligibility. The
 * agent discovers/verifies/grades; a human reviews individualized judgement.
 */

export interface SaggioLeadContextInput {
  stage: LeadStage;
  grade?: LeadGrade | null;
  confidence?: ScoreConfidence | null;
  industry?: string | null;
  entityType?: string | null;
  state?: string | null;
  missingInfo?: string[];
  nextAction?: string | null;
}

export interface SaggioLeadContext {
  summary: string;
  missingInfo: string[];
  nextAction: string;
  boundaries: string;
}

const BOUNDARIES =
  'Saggio may explain tax concepts and cite IRS sources. Saggio must not diagnose a tax liability, ' +
  'promise outcomes, or make individualized tax decisions — those require a licensed professional.';

/** Build a compact, non-sensitive context block for Saggio. */
export function buildLeadContext(input: SaggioLeadContextInput): SaggioLeadContext {
  const bits: string[] = [`stage: ${input.stage}`];
  if (input.grade) bits.push(`grade: ${input.grade} (${input.confidence ?? 'unknown'} confidence)`);
  if (input.entityType) bits.push(`entity: ${input.entityType}`);
  if (input.industry) bits.push(`industry: ${input.industry}`);
  if (input.state) bits.push(`state: ${input.state}`);

  return {
    summary: `Lead education context — ${bits.join('; ')}.`,
    missingInfo: input.missingInfo ?? [],
    nextAction: input.nextAction ?? 'Await human review.',
    boundaries: BOUNDARIES,
  };
}

/** System prompt fragment that keeps Saggio strictly educational for a lead. */
export function buildLeadSystemPrompt(context: SaggioLeadContext): string {
  const missing = context.missingInfo.length > 0 ? `Open questions the lead has: ${context.missingInfo.join(', ')}.` : '';
  return [
    'You are Saggio, TatoIQ\'s tax-education assistant.',
    context.summary,
    missing,
    `Suggested next step (for the human team, not the lead): ${context.nextAction}`,
    context.boundaries,
  ]
    .filter(Boolean)
    .join('\n');
}
