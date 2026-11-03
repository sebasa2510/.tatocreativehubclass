import { NextResponse } from 'next/server';

import { isGuardFailure, requireLeadsAccess } from '@/lib/auth/guard';
import { featureFlags } from '@/lib/flags';
import { getMetrics } from '@/lib/leads/repository';

/** GET /api/leads/metrics — dashboard metrics derived from real records. */
export async function GET() {
  if (!featureFlags.leads) return NextResponse.json({ error: 'Leads are disabled.' }, { status: 404 });
  const guard = await requireLeadsAccess();
  if (isGuardFailure(guard)) return guard.response;

  const metrics = await getMetrics(guard.session.organizationId);
  return NextResponse.json({ metrics });
}
