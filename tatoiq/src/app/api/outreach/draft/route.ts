import { NextResponse, type NextRequest } from 'next/server';

import { generateDraft } from '@/lib/ai/client';
import { isGuardFailure, requireLeadsAccess } from '@/lib/auth/guard';
import { featureFlags } from '@/lib/flags';
import { getLead, createDraft } from '@/lib/leads/repository';
import { buildLeadContext, buildLeadSystemPrompt } from '@/lib/saggio/leadContext';
import { checkDraft, withDisclaimer } from '@/lib/outreach/guardrails';

/**
 * POST /api/outreach/draft — generate an outreach draft (Phase 2).
 *
 * Dark until FEATURE_AI_DRAFTING is enabled. Drafts are saved as
 * PENDING_APPROVAL; NOTHING is ever sent from here. Guardrail violations return
 * 422 and are never persisted.
 */
export async function POST(request: NextRequest) {
  if (!featureFlags.aiDrafting) {
    return NextResponse.json({ error: 'AI drafting is not enabled.' }, { status: 404 });
  }
  const guard = await requireLeadsAccess();
  if (isGuardFailure(guard)) return guard.response;

  let body: { leadId?: string; intent?: string };
  try {
    body = (await request.json()) as { leadId?: string; intent?: string };
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }
  if (!body.leadId) return NextResponse.json({ error: 'leadId is required.' }, { status: 400 });

  const lead = await getLead(guard.session.organizationId, body.leadId);
  if (!lead) return NextResponse.json({ error: 'Lead not found.' }, { status: 404 });
  if (!lead.email) return NextResponse.json({ error: 'Lead has no email address.' }, { status: 400 });

  const context = buildLeadContext({
    stage: lead.stage,
    grade: lead.grade,
    confidence: lead.confidence,
    entityType: lead.entityType,
    industry: lead.industry,
    state: lead.state,
    missingInfo: lead.missingInfo,
    nextAction: lead.nextAction,
  });

  const draftResponse = await generateDraft({
    system: buildLeadSystemPrompt(context),
    user: body.intent ?? `Draft a short, compliant outreach email to ${lead.contactName ?? 'the owner'} at ${lead.businessName ?? 'the business'}.`,
  });

  const draftBody = withDisclaimer(draftResponse.text);
  const guardrailResult = checkDraft(draftBody);
  if (!guardrailResult.ok) {
    return NextResponse.json({ error: 'Draft blocked by guardrails.', flags: guardrailResult.flags }, { status: 422 });
  }

  const created = await createDraft(guard.session.organizationId, guard.session.userId, {
    leadId: lead.id,
    subject: `A quick question about ${lead.businessName ?? 'your business'}`,
    body: draftBody,
    guardrailFlags: guardrailResult.flags,
    aiModel: draftResponse.model,
  });

  return NextResponse.json(
    {
      draft: { id: created.id, status: created.status, body: draftBody, mock: draftResponse.mock },
      flags: guardrailResult.flags,
    },
    { status: 201 },
  );
}
