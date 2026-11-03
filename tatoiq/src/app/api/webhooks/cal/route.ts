import { NextResponse, type NextRequest } from 'next/server';

import { featureFlags } from '@/lib/flags';
import { recordStageTransition } from '@/lib/leads/audit';
import { getLead, recordConsultation, updateLead } from '@/lib/leads/repository';
import type { LeadStage } from '@/lib/leads/pipeline';

/**
 * POST /api/webhooks/cal — Cal.com booking/cancel/no-show → internal stage moves.
 *
 * booking        → CONSULTATION_BOOKED
 * cancellation   → NURTURE
 * verified no-show → FOLLOW_UP_NEEDED
 *
 * Dark until FEATURE_CONSULTATION_BOOKING is enabled.
 */

interface CalPayload {
  triggerEvent?: string;
  payload?: {
    uid?: string;
    title?: string;
    startTime?: string;
    metadata?: { leadId?: string };
    attendees?: Array<{ email?: string }>;
    noShow?: boolean;
  };
}

function targetStage(trigger: string, noShow: boolean): LeadStage | null {
  if (trigger === 'BOOKING_CREATED' || trigger === 'BOOKING_RESCHEDULED') return 'CONSULTATION_BOOKED';
  if (trigger === 'BOOKING_CANCELLED' || trigger === 'BOOKING_REJECTED') return 'NURTURE';
  if (trigger === 'MEETING_ENDED' || trigger === 'NO_SHOW') return noShow ? 'FOLLOW_UP_NEEDED' : 'FOLLOW_UP_NEEDED';
  return null;
}

export async function POST(request: NextRequest) {
  if (!featureFlags.consultationBooking) {
    return NextResponse.json({ error: 'Consultation booking is not enabled.' }, { status: 404 });
  }

  const raw = await request.text();
  const secret = process.env.CAL_WEBHOOK_SECRET;
  if (secret) {
    const provided = request.headers.get('x-cal-signature-256') ?? '';
    const { createHmac, timingSafeEqual } = await import('node:crypto');
    const expected = createHmac('sha256', secret).update(raw).digest('hex');
    if (provided.length !== expected.length || !timingSafeEqual(Buffer.from(provided), Buffer.from(expected))) {
      return NextResponse.json({ error: 'Invalid signature.' }, { status: 401 });
    }
  }

  let body: CalPayload;
  try {
    body = JSON.parse(raw) as CalPayload;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const trigger = body.triggerEvent ?? '';
  const data = body.payload ?? {};
  const stage = targetStage(trigger, Boolean(data.noShow));
  if (!stage) return NextResponse.json({ received: true, ignored: trigger });

  const organizationId = process.env.DEFAULT_ORGANIZATION_ID ?? 'org_demo';
  const leadId = data.metadata?.leadId;

  if (!leadId) {
    return NextResponse.json({ error: 'Webhook is missing metadata.leadId.' }, { status: 422 });
  }

  const lead = await getLead(organizationId, leadId);
  if (!lead) return NextResponse.json({ error: 'Unknown lead.' }, { status: 404 });

  const result = await updateLead(organizationId, null, leadId, { stage });
  await recordStageTransition(leadId, lead.stage, stage, null, `Cal.com ${trigger}.`);

  if (stage === 'CONSULTATION_BOOKED') {
    await recordConsultation({
      leadId,
      externalBookingId: data.uid ?? null,
      eventLink: data.metadata?.leadId ? `https://cal.com/booking/${data.uid ?? ''}` : null,
      scheduledAt: data.startTime ? new Date(data.startTime) : null,
      status: 'SCHEDULED',
      specialistNotes: data.title ?? null,
    });
  } else if (stage === 'NURTURE') {
    await recordConsultation({ leadId, externalBookingId: data.uid ?? null, status: 'CANCELLED' });
  } else if (stage === 'FOLLOW_UP_NEEDED') {
    await recordConsultation({ leadId, externalBookingId: data.uid ?? null, status: 'NO_SHOW' });
  }

  return NextResponse.json({ received: true, stage, applied: result.ok });
}
