import { NextResponse, type NextRequest } from 'next/server';

import { isGuardFailure, requireLeadsAccess } from '@/lib/auth/guard';
import { featureFlags } from '@/lib/flags';

/** Roles allowed to approve outbound (account managers / team leads). */
const APPROVER_ROLES = ['ADMIN', 'PREPARER'];

/**
 * POST /api/outreach/[id]/approve — human approval for a draft (Phase 2).
 *
 * All outbound requires human approval. Reviewers (viewers) cannot approve.
 */
export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!featureFlags.outreachDispatch) {
    return NextResponse.json({ error: 'Outreach dispatch is not enabled.' }, { status: 404 });
  }
  const guard = await requireLeadsAccess();
  if (isGuardFailure(guard)) return guard.response;

  if (!APPROVER_ROLES.includes(guard.session.role)) {
    return NextResponse.json({ error: 'You do not have permission to approve outbound messages.' }, { status: 403 });
  }

  const { id } = await params;
  return NextResponse.json({ ok: true, draftId: id, approvedBy: guard.session.userId, status: 'APPROVED', mock: true });
}
