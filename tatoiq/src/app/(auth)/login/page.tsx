import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import Logo from '@/components/site/logo';
import { DEMO_USERS, usingDefaultSecret } from '@/lib/auth/credentials';
import { getSession } from '@/lib/auth/session';

import SignInForm from './sign-in-form';

export const metadata: Metadata = {
  title: 'Sign in',
  description: 'Sign in to the TatoIQ client portal.',
  // A login page must never be indexed.
  robots: { index: false, follow: false },
};

/** The session cookie is read per request, so this page cannot be prerendered. */
export const dynamic = 'force-dynamic';

/** Only a same-origin path may be used as a post-login target. */
function safeNext(value: string | string[] | undefined): string {
  const target = Array.isArray(value) ? value[0] : value;
  if (!target || !target.startsWith('/') || target.startsWith('//')) return '/dashboard';
  return target;
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;

  // Already signed in? Skip the form rather than showing it to someone who does
  // not need it.
  const session = await getSession();
  if (session) redirect(safeNext(params.next));

  const next = safeNext(params.next);

  return (
    <div className="flex min-h-screen flex-col bg-navy-950">
      <div className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <div className="text-center">
            <div className="flex justify-center">
              <Logo variant="light" />
            </div>
            <h1 className="mt-6 font-display text-2xl font-semibold tracking-tight text-white">
              Sign in to your portal
            </h1>
            <p className="mt-2 text-sm text-navy-300">
              Access your return, documents, and messages.
            </p>
          </div>

          <div className="mt-8 rounded-2xl border border-navy-800 bg-white p-6 shadow-xl sm:p-8">
            <SignInForm next={next} />

            {/* Demo credentials, shown deliberately so the class can sign in.
                This block must be REMOVED before any real deployment: it
                publishes working credentials. */}
            <div className="mt-6 rounded-xl border border-gold-200 bg-gold-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-gold-800">
                Demonstration accounts
              </p>
              <p className="mt-1 text-xs text-gold-900">
                This build has no user database. Use one of these to sign in:
              </p>
              <ul className="mt-3 space-y-2">
                {DEMO_USERS.map((user) => (
                  <li key={user.username} className="text-xs text-gold-900">
                    <span className="font-mono font-semibold">{user.username}</span>
                    <span className="mx-1.5 text-gold-700">/</span>
                    <span className="font-mono font-semibold">{user.password}</span>
                    <span className="mt-0.5 block text-gold-800">{user.label}</span>
                  </li>
                ))}
              </ul>
            </div>

            {usingDefaultSecret() && (
              <p className="mt-4 text-xs leading-relaxed text-navy-500">
                Sessions are signed with the built-in demo key. Set{' '}
                <code className="font-mono">SESSION_SECRET</code> before deploying this
                anywhere real, or anyone reading the source could forge a session.
              </p>
            )}
          </div>

          <p className="mt-6 text-center text-sm text-navy-300">
            <Link href="/" className="transition hover:text-gold-300">
              ← Back to the site
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
