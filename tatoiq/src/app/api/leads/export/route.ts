import { NextResponse } from 'next/server';

import { isGuardFailure, requireLeadsAccess } from '@/lib/auth/guard';
import { featureFlags } from '@/lib/flags';
import { LEAD_EXPORT_COLUMNS, toCsv } from '@/lib/leads/export';
import { listLeads } from '@/lib/leads/repository';

/** GET /api/leads/export — CSV export with formula-injection protection. */
export async function GET() {
  if (!featureFlags.leads) return NextResponse.json({ error: 'Leads are disabled.' }, { status: 404 });
  const guard = await requireLeadsAccess();
  if (isGuardFailure(guard)) return guard.response;

  const { items } = await listLeads(guard.session.organizationId, { pageSize: 100 });
  const csv = toCsv(items, LEAD_EXPORT_COLUMNS);

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="leads-export.csv"',
    },
  });
}
