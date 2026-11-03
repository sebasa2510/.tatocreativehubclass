import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * proxy.ts — Next.js 16 renamed `middleware.ts` to `proxy.ts` (same behavior).
 *
 * Optimistic gate for the /leads route group and /api/leads APIs: verifies the
 * session role against the allowed list and redirects (pages) or 403s (APIs).
 * This is defence-in-depth ONLY — every server action and route handler also
 * re-checks authorization via requireLeadsAccess().
 */

const LEADS_ALLOWED_ROLES = ['ADMIN', 'PREPARER', 'REVIEWER'];
const SESSION_COOKIE = 'tatoiq_session';

function resolveRole(request: NextRequest): string | null {
  const raw = request.cookies.get(SESSION_COOKIE)?.value;
  if (raw) {
    try {
      const parsed = JSON.parse(decodeURIComponent(raw)) as { role?: string };
      if (parsed.role) return String(parsed.role);
    } catch {
      // Malformed cookie → fall through.
    }
  }
  // Mock auth outside production mirrors lib/auth/session.ts.
  if (process.env.NODE_ENV !== 'production') return 'ADMIN';
  return null;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isLeadsPage = pathname === '/leads' || pathname.startsWith('/leads/');
  const isLeadsApi = pathname.startsWith('/api/leads');

  if (!isLeadsPage && !isLeadsApi) return NextResponse.next();

  const role = resolveRole(request);
  if (role && LEADS_ALLOWED_ROLES.includes(role)) return NextResponse.next();

  if (isLeadsApi) {
    return NextResponse.json({ error: 'Forbidden: insufficient role.' }, { status: 403 });
  }

  const url = request.nextUrl.clone();
  url.pathname = '/access-denied';
  url.search = `?from=${encodeURIComponent(pathname)}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ['/leads', '/leads/:path*', '/api/leads/:path*'],
};
