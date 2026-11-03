import { NextResponse, type NextRequest } from 'next/server';

import { recordStageTransition } from '@/lib/leads/audit';
import { requireLeadsAccess, isGuardFailure } from '@/lib/auth/guard';
import { featureFlags } from '@/lib/flags';
import type { LeadStage } from '@/lib/leads/pipeline';
import { getLead, softDeleteLead, updateLead, type LeadInput } from '@/lib/leads/repository';

/** GET /api/leads/[id] — full lead detail. */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!featureFlags.leads) return NextResponse.json({ error: 'Leads are disabled.' }, { status: 404 });
  const guard = await requireLeadsAccess();
  if (isGuardFailure(guard)) return guard.response;

  const { id } = await params;
  const lead = await getLead(guard.session.organizationId, id);
  if (!lead) return NextResponse.json({ error: 'Lead not found.' }, { status: 404 });
  return NextResponse.json({ lead });
}

/** PATCH /api/leads/[id] — update fields or advance the stage. */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!featureFlags.leads) return NextResponse.json({ error: 'Leads are disabled.' }, { status: 404 });
  const guard = await requireLeadsAccess();
  if (isGuardFailure(guard)) return guard.response;

  const { id } = await params;
  let body: Partial<LeadInput> & { stage?: LeadStage };
  try {
    body = (await request.json()) as Partial<LeadInput> & { stage?: LeadStage };
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const before = await getLead(guard.session.organizationId, id);
  const result = await updateLead(guard.session.organizationId, guard.session.userId, id, body);
  if (!result.ok) return NextResponse.json({ error: result.reason ?? 'Update failed.' }, { status: 400 });

  if (body.stage && before && body.stage !== before.stage) {
    await recordStageTransition(id, before.stage, body.stage, guard.session.userId);
  }

  return NextResponse.json({ lead: result.item });
}

/** DELETE /api/leads/[id] — soft delete (never hard delete). */
export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!featureFlags.leads) return NextResponse.json({ error: 'Leads are disabled.' }, { status: 404 });
  const guard = await requireLeadsAccess();
  if (isGuardFailure(guard)) return guard.response;

  const { id } = await params;
  const ok = await softDeleteLead(guard.session.organizationId, id);
  if (!ok) return NextResponse.json({ error: 'Lead not found.' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
