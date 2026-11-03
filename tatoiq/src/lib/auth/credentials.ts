import 'server-only';

import { createHmac, timingSafeEqual } from 'node:crypto';

import type { SessionRole } from '@/lib/auth/session';

/**
 * credentials.ts — verify demo sign-in credentials and mint a SESSION TOKEN.
 *
 * WHY THIS EXISTS
 * Before this module, nothing ever set the session cookie: `getSession()` found
 * no cookie and fell back to a mock ADMIN, so the portal was open to anyone and
 * the "Sign in" link appeared to do nothing. This adds a real sign-in step.
 *
 * WHAT THIS IS, AND IS NOT
 * This is a DEMONSTRATION sign-in. It is not a production identity system:
 *
 *   - Credentials are fixed constants, not per-user database records.
 *   - Passwords are compared as plain values. A real system stores a slow hash
 *     (bcrypt/scrypt/argon2) per user and never holds the password itself.
 *   - There is no account lockout, no rate limiting on attempts, no password
 *     reset, no MFA, no audit trail of sign-ins. Every one of those is required
 *     before real taxpayer data is behind this door.
 *
 * It is, however, NOT fake in the way that matters for the demo: the token is
 * HMAC-signed and verified with a constant-time comparison, so a visitor cannot
 * hand-edit the cookie to claim a role they were not granted. That keeps the
 * authorization model honest instead of merely looking gated.
 *
 * WHEN AUTH.JS LANDS
 * Replace `verifyCredentials` with the provider call and keep `issueToken` /
 * `readToken` (or swap them for the provider's own session cookie). Nothing
 * outside this module needs to change.
 */

export interface DemoUser {
  username: string;
  password: string;
  /** Shown on the login page so the class can sign in during a demo. */
  label: string;
  role: SessionRole;
  name: string;
  email: string;
}

/**
 * The seeded demo accounts.
 *
 * Deliberately two accounts with DIFFERENT roles: one that can reach lead
 * management and one that cannot. A demo where every account can do everything
 * hides the authorization model rather than showing it.
 */
export const DEMO_USERS: readonly DemoUser[] = [
  {
    username: 'admin',
    password: 'tatoiq-demo',
    label: 'Owner / admin — full access, including lead management',
    role: 'ADMIN',
    name: 'Jordan Rivera',
    email: 'admin@tatoiq.local',
  },
  {
    username: 'viewer',
    password: 'tatoiq-demo',
    label: 'Support — portal only, no lead management',
    role: 'SUPPORT',
    name: 'Sam Okafor',
    email: 'viewer@tatoiq.local',
  },
];

export interface SessionToken {
  userId: string;
  email: string;
  name: string;
  role: string;
  organizationId: string;
}

/**
 * The signing key.
 *
 * A fallback is used so the demo runs with no configuration, and it is marked
 * clearly because a well-known default key is a real vulnerability in anything
 * deployed for actual use: anyone reading the source could mint a valid token.
 * A production deployment must set SESSION_SECRET.
 */
const SECRET =
  process.env.SESSION_SECRET && process.env.SESSION_SECRET.length > 0
    ? process.env.SESSION_SECRET
    : 'tatoiq-demo-signing-key-do-not-use-in-production';

/** True when the signing key is the built-in demo default. */
export function usingDefaultSecret(): boolean {
  return SECRET.startsWith('tatoiq-demo-signing-key');
}

function base64url(input: Buffer | string): string {
  return Buffer.from(input).toString('base64url');
}

function sign(payload: string): string {
  return createHmac('sha256', SECRET).update(payload).digest('base64url');
}

/**
 * Constant-time string comparison.
 *
 * `timingSafeEqual` throws when the buffers differ in length, which would itself
 * leak the length. Comparing the expected value against itself first keeps the
 * runtime constant and the throw impossible.
 */
function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    timingSafeEqual(bufA, bufA);
    return false;
  }
  return timingSafeEqual(bufA, bufB);
}

/**
 * Check a username/password pair.
 *
 * Returns the user on success, or null. It does not distinguish "no such user"
 * from "wrong password" in its return value; the caller shows one message for
 * both, so the page does not confirm which usernames exist.
 */
export function verifyCredentials(username: string, password: string): DemoUser | null {
  const normalised = username.trim().toLowerCase();
  const match = DEMO_USERS.find((user) => user.username === normalised);
  if (!match) return null;
  if (!safeEqual(match.password, password)) return null;
  return match;
}

/** Mint a signed `payload.signature` token for the session cookie. */
export function issueToken(user: {
  userId: string;
  email: string;
  name: string;
  role: string;
  organizationId: string;
}): string {
  const payload = base64url(JSON.stringify(user));
  return `${payload}.${sign(payload)}`;
}

/**
 * Verify and decode a token, or return null if it is malformed or forged.
 *
 * The signature is checked BEFORE the payload is parsed, so a hostile token
 * never reaches JSON.parse.
 */
export function readToken(token: string | undefined | null): SessionToken | null {
  if (!token) return null;

  const separator = token.lastIndexOf('.');
  if (separator <= 0) return null;

  const payload = token.slice(0, separator);
  const signature = token.slice(separator + 1);
  if (!safeEqual(signature, sign(payload))) return null;

  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as SessionToken;
    if (!parsed?.userId || !parsed?.role) return null;
    return parsed;
  } catch {
    return null;
  }
}
