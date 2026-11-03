import 'server-only';

import { getSession, roleCanAccessLeads, type Session } from '@/lib/auth/session';

/**
 * guard.ts — per-request authorization for lead route handlers + server actions.
 *
 * Proxy (src/proxy.ts) does an optimistic cookie check; this is the authoritative
 * check that runs inside every handler.
 */

export type GuardResult = { session: Session } | { response: Response };

export async function requireLeadsAccess(): Promise<GuardResult> {
  const session = await getSession();
  if (!session) {
    return { response: Response.json({ error: 'Unauthorized.' }, { status: 401 }) };
  }
  if (!roleCanAccessLeads(session.role)) {
    return { response: Response.json({ error: 'Forbidden: insufficient role.' }, { status: 403 }) };
  }
  return { session };
}

export function isGuardFailure(result: GuardResult): result is { response: Response } {
  return 'response' in result;
}
