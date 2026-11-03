import Link from 'next/link';

export default function AccessDeniedPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <div className="rounded-xl border border-rose-200 bg-rose-50 p-6">
        <h2 className="font-display text-xl font-semibold text-rose-900">Access denied</h2>
        <p className="mt-2 text-sm text-rose-800">
          Lead management is limited to authorized tax-team roles (admin, preparer, reviewer). If you believe you should
          have access, contact your administrator.
        </p>
        <Link href="/dashboard" className="mt-4 inline-block rounded-lg bg-navy-900 px-4 py-2 text-sm font-semibold text-white hover:bg-navy-800">
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
