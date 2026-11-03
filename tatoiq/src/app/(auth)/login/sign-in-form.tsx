'use client';

import { useActionState } from 'react';

import { signIn, type SignInState } from '@/lib/auth/actions';

/**
 * SignInForm — the credential form.
 *
 * Client-side only for the pending state and the error message; the check itself
 * runs in the server action, so no credential logic reaches the browser.
 */

const INITIAL: SignInState = {};

export default function SignInForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(signIn, INITIAL);

  return (
    <form action={action} className="mt-6 space-y-4">
      <input type="hidden" name="next" value={next} />

      <div>
        <label htmlFor="username" className="block text-sm font-medium text-navy-800">
          Username
        </label>
        <input
          id="username"
          name="username"
          type="text"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          required
          aria-invalid={state.error ? true : undefined}
          className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-navy-900 transition focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
        />
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-navy-800">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          aria-invalid={state.error ? true : undefined}
          className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-navy-900 transition focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
        />
      </div>

      {state.error && (
        <p
          role="alert"
          className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800"
        >
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-navy-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-navy-800 disabled:opacity-60"
      >
        {pending ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  );
}
