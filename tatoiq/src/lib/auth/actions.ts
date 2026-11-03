'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { issueToken, verifyCredentials } from '@/lib/auth/credentials';
import { SESSION_COOKIE } from '@/lib/auth/session';

/**
 * actions.ts — the Server Actions behind sign-in and sign-out.
 *
 * WHY NOT IN THE (auth) ROUTE GROUP
 * The static export used by Firebase Hosting parks the whole (auth) group,
 * because a static host cannot run `cookies()` or a Server Action. The portal
 * shell is still part of that export, though, and it needs the sign-out button
 * to have something to submit to. Keeping the actions in `lib/auth` means the
 * shell always compiles; only the /login PAGE is parked, and the sign-out
 * button degrades to a no-op form on the static mirror, which is the correct
 * behaviour there because there is no server session to end.
 *
 * The credential check and the cookie write stay on the server: the form posts
 * to these actions, and the action returns only a message or a redirect, never
 * the user record.
 */

export interface SignInState {
  error?: string;
}

/** Only same-origin, single-slash paths may be used as a post-login target. */
function safeRedirect(target: string | undefined): string {
  if (!target) return '/dashboard';
  // Reject absolute URLs and protocol-relative URLs ("//evil.com"), which would
  // turn the login form into an open redirect.
  if (!target.startsWith('/') || target.startsWith('//')) return '/dashboard';
  return target;
}

export async function signIn(
  _previous: SignInState,
  formData: FormData,
): Promise<SignInState> {
  const username = String(formData.get('username') ?? '');
  const password = String(formData.get('password') ?? '');
  const next = safeRedirect(String(formData.get('next') ?? '/dashboard'));

  // One message for both "no such user" and "wrong password": the form must not
  // confirm which usernames exist.
  if (!username.trim() || !password) {
    return { error: 'Enter both a username and a password.' };
  }

  const user = verifyCredentials(username, password);
  if (!user) {
    return { error: 'That username and password did not match.' };
  }

  const token = issueToken({
    userId: `demo-${user.username}`,
    email: user.email,
    name: user.name,
    role: user.role,
    organizationId: process.env.DEFAULT_ORGANIZATION_ID ?? 'org_demo',
  });

  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 8,
  });

  redirect(next);
}

export async function signOut(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
  redirect('/login');
}

/**
 * Sign out without the redirect.
 *
 * The static export has no server session and no /login page, so a redirect
 * there would send a visitor to a 404. This variant clears the cookie only,
 * which is all a static host can do, and the caller stays put.
 */
export async function signOutLocally(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}
