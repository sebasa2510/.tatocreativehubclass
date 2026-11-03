import { NextResponse, type NextRequest } from 'next/server';

import { isGuardFailure, requireLeadsAccess } from '@/lib/auth/guard';
import { featureFlags } from '@/lib/flags';
import { getLead, scoreLead } from '@/lib/leads/repository';

/** POST /api/leads/[id]/score — re-evaluate a lead with the shared evaluator. */
export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!featureFlags.leads) return NextResponse.json({ error: 'Leads are disabled.' }, { status: 404 });
  const guard = await requireLeadsAccess();
  if (isGuardFailure(guard)) return guard.response;

  const { id } = await params;
  const existing = await getLead(guard.session.organizationId, id);
  if (!existing) return NextResponse.json({ error: 'Lead not found.' }, { status: 404 });

  const result = await scoreLead(guard.session.organizationId, id);
  if (!result.ok) return NextResponse.json({ error: 'Scoring failed.' }, { status: 500 });
  return NextResponse.json({ ok: true });
}
