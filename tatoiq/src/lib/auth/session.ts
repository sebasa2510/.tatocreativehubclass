import 'server-only';

import { cookies } from 'next/headers';

import { readToken } from '@/lib/auth/credentials';

/**
 * session.ts — server-side session + role helper for the /leads route group.
 *
 * Auth.js is planned (AUTH_SECRET / AUTH_URL in .env.example) but not yet
 * installed, so this is a SAFE INTERFACE over the demo sign-in in credentials.ts:
 * the session cookie holds a signed token, and an unauthenticated visitor gets
 * no session at all.
 *
 * When Auth.js lands, only the body of `getSession` needs to change.
 */

export type SessionRole = 'ADMIN' | 'PREPARER' | 'REVIEWER' | 'BOOKKEEPER' | 'SUPPORT' | 'CLIENT';

export interface Session {
  userId: string;
  email: string;
  name: string;
  role: SessionRole;
  organizationId: string;
  isMock: boolean;
}

/** Roles permitted to access lead management (spec: admin + tax team). */
export const LEADS_ALLOWED_ROLES: readonly SessionRole[] = ['ADMIN', 'PREPARER', 'REVIEWER'];

export const SESSION_COOKIE = 'tatoiq_session';

export function roleCanAccessLeads(role: SessionRole | null | undefined): boolean {
  return Boolean(role) && LEADS_ALLOWED_ROLES.includes(role as SessionRole);
}

function mockAuthAllowed(): boolean {
  if (process.env.NODE_ENV !== 'production') return true;
  return ['1', 'true', 'yes', 'on'].includes((process.env.ALLOW_MOCK_AUTH ?? '').toLowerCase());
}

export function mockSession(): Session {
  return {
    userId: 'mock-admin',
    email: 'admin@tatoiq.local',
    name: 'Mock Admin',
    role: 'ADMIN',
    organizationId: process.env.DEFAULT_ORGANIZATION_ID ?? 'org_demo',
    isMock: true,
  };
}

/**
 * Resolve the current session from the request cookies.
 *
 * The cookie holds a SIGNED token (see credentials.ts), not raw JSON. It is
 * verified before use, so a visitor cannot edit the cookie to claim a role they
 * were not granted. An unsigned or tampered value resolves to null and the
 * caller denies access.
 *
 * There is deliberately no fallback to a mock session for an unauthenticated
 * visitor: doing that is what made the portal open to anyone and made the "Sign
 * in" link look broken. A visitor with no session is now redirected to /login.
 * Replace the body with `auth()` from next-auth when it lands — the public shape
 * must not change.
 */
export async function getSession(): Promise<Session | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  const decoded = readToken(token);
  if (!decoded) return null;

  return {
    userId: decoded.userId,
    email: decoded.email,
    name: decoded.name,
    role: decoded.role as SessionRole,
    organizationId: decoded.organizationId,
    isMock: false,
  };
}

export function authMode(): 'mock' | 'configured' {
  return mockAuthAllowed() ? 'mock' : 'configured';
}
