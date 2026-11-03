import { NextResponse, type NextRequest } from 'next/server';

import { requireLeadsAccess, isGuardFailure } from '@/lib/auth/guard';
import { featureFlags } from '@/lib/flags';
import type { LeadStage } from '@/lib/leads/pipeline';
import { createLead, listLeads, type LeadInput } from '@/lib/leads/repository';
import type { LeadGrade } from '@/lib/scoring/evaluator';

/** GET /api/leads — filtered, sorted, paginated lead list. */
export async function GET(request: NextRequest) {
  if (!featureFlags.leads) return NextResponse.json({ error: 'Leads are disabled.' }, { status: 404 });
  const guard = await requireLeadsAccess();
  if (isGuardFailure(guard)) return guard.response;

  const sp = request.nextUrl.searchParams;
  const result = await listLeads(guard.session.organizationId, {
    q: sp.get('q') ?? undefined,
    grade: (sp.get('grade') as LeadGrade | 'ALL' | null) ?? 'ALL',
    stage: (sp.get('stage') as LeadStage | 'ALL' | null) ?? 'ALL',
    source: sp.get('source') ?? 'ALL',
    assigned: sp.get('assigned') ?? 'ALL',
    sort: (sp.get('sort') as 'score' | 'createdAt' | 'grade' | 'businessName' | null) ?? 'score',
    direction: (sp.get('direction') as 'asc' | 'desc' | null) ?? 'desc',
    page: Number.parseInt(sp.get('page') ?? '1', 10) || 1,
    pageSize: Number.parseInt(sp.get('pageSize') ?? '25', 10) || 25,
  });

  return NextResponse.json(result);
}

/** POST /api/leads — create a single lead (manual entry). */
export async function POST(request: NextRequest) {
  if (!featureFlags.leads) return NextResponse.json({ error: 'Leads are disabled.' }, { status: 404 });
  const guard = await requireLeadsAccess();
  if (isGuardFailure(guard)) return guard.response;

  let body: LeadInput;
  try {
    body = (await request.json()) as LeadInput;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  if (!body.businessName && !body.email && !body.phone) {
    return NextResponse.json({ error: 'Provide at least a business name, email, or phone.' }, { status: 400 });
  }

  const lead = await createLead(guard.session.organizationId, guard.session.userId, body);
  return NextResponse.json({ lead }, { status: 201 });
}
