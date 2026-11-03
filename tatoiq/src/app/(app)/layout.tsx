import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';

import AppShell from '@/components/app/app-shell';
import SaggioChat from '@/components/SaggioChat';
import { getSession } from '@/lib/auth/session';

/**
 * The portal layout requires a session.
 *
 * This is the gate that was missing: previously `getSession()` fell back to a
 * mock admin, so every portal page rendered for an anonymous visitor and the
 * "Sign in" link appeared to do nothing. Now an unauthenticated request is sent
 * to /login, which returns here once signed in.
 *
 * The same `getSession()` runs again inside each page and API handler, so this
 * redirect is a convenience for humans rather than the only check.
 */
export const dynamic = 'force-dynamic';

export default async function AppLayout({ children }: { children: ReactNode }) {
  const session = await getSession();
  if (!session) redirect('/login');

  return (
    <>
      <AppShell>{children}</AppShell>
      <SaggioChat clientEmail={session.email} />
    </>
  );
}
