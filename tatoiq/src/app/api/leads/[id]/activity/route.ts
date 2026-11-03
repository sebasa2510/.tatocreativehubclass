import { NextResponse, type NextRequest } from 'next/server';

import { isGuardFailure, requireLeadsAccess } from '@/lib/auth/guard';
import { featureFlags } from '@/lib/flags';
import { addActivity } from '@/lib/leads/repository';

/** POST /api/leads/[id]/activity — append a note/activity to a lead. */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!featureFlags.leads) return NextResponse.json({ error: 'Leads are disabled.' }, { status: 404 });
  const guard = await requireLeadsAccess();
  if (isGuardFailure(guard)) return guard.response;

  const { id } = await params;
  let body: { body?: string; kind?: string };
  try {
    body = (await request.json()) as { body?: string; kind?: string };
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  if (!body.body || body.body.trim().length === 0) {
    return NextResponse.json({ error: 'Activity body is required.' }, { status: 400 });
  }

  const kind = ['NOTE', 'CALL', 'EMAIL', 'SYSTEM'].includes(body.kind ?? '') ? (body.kind as 'NOTE' | 'CALL' | 'EMAIL' | 'SYSTEM') : 'NOTE';
  const ok = await addActivity(guard.session.organizationId, guard.session.userId, id, body.body, kind);
  if (!ok) return NextResponse.json({ error: 'Lead not found.' }, { status: 404 });
  return NextResponse.json({ ok: true }, { status: 201 });
}
