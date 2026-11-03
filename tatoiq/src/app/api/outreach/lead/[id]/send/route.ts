import { NextResponse, type NextRequest } from 'next/server';

import { isGuardFailure, requireLeadsAccess } from '@/lib/auth/guard';
import { featureFlags, integrationConfig } from '@/lib/flags';
import { checkDraft } from '@/lib/outreach/guardrails';
import { checkRateLimit, emailConfigured, recordSend, sendEmail } from '@/lib/outreach/dispatch';
import { evaluateConsent } from '@/lib/leads/consent';
import { getLead, isContactSuppressed } from '@/lib/leads/repository';
import { unsubscribeUrl } from '@/lib/outreach/unsubscribe';

/**
 * POST /api/outreach/lead/[id]/send — dispatch approved outreach for a lead.
 *
 * Every send re-checks consent, suppression, sample-data, and guardrails first.
 * Do-not-contact / suppressed / sample leads are refused with 403 and no
 * outbound job is created.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!featureFlags.outreachDispatch) {
    return NextResponse.json({ error: 'Outreach dispatch is not enabled.' }, { status: 404 });
  }
  const guard = await requireLeadsAccess();
  if (isGuardFailure(guard)) return guard.response;

  const { id } = await params;
  const lead = await getLead(guard.session.organizationId, id);
  if (!lead) return NextResponse.json({ error: 'Lead not found.' }, { status: 404 });

  const decision = evaluateConsent({
    doNotContact: lead.doNotContact,
    consentStatus: lead.consentStatus,
    isSample: lead.isSample,
    requiresOutreach: true,
  });
  if (!decision.allowed) {
    return NextResponse.json({ error: decision.reason ?? 'Outreach not permitted.' }, { status: 403 });
  }

  if (await isContactSuppressed(lead.email, lead.phone)) {
    return NextResponse.json({ error: 'Contact is on the suppression list.' }, { status: 403 });
  }

  const rate = checkRateLimit();
  if (!rate.allowed) return NextResponse.json({ error: rate.reason }, { status: 429 });

  if (!lead.email) return NextResponse.json({ error: 'Lead has no email address.' }, { status: 400 });

  let body: { subject?: string; body?: string };
  try {
    body = (await request.json()) as { subject?: string; body?: string };
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }
  if (!body.body) return NextResponse.json({ error: 'Message body is required.' }, { status: 400 });

  const guardrails = checkDraft(`${body.subject ?? ''}\n${body.body}`);
  if (!guardrails.ok) {
    return NextResponse.json({ error: 'Message blocked by guardrails.', flags: guardrails.flags }, { status: 422 });
  }

  const origin = process.env.APP_URL ?? request.nextUrl.origin;
  const result = await sendEmail({
    to: lead.email,
    subject: body.subject ?? `A quick question about ${lead.businessName ?? 'your business'}`,
    body: body.body,
    unsubscribeUrl: unsubscribeUrl(origin, lead.id),
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error ?? 'Send failed.', transport: emailConfigured() ? 'resend' : 'console' }, { status: 502 });
  }

  recordSend();
  return NextResponse.json({
    ok: true,
    transport: emailConfigured() ? 'resend' : 'console',
    mock: result.mock,
    providerMessageId: result.providerMessageId,
    domain: integrationConfig.outboundEmailDomain || null,
  });
}
