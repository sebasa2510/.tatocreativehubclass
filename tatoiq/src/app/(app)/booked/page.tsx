import Link from 'next/link';

export default function BookedPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6">
        <h2 className="font-display text-xl font-semibold text-emerald-900">Your consultation is booked</h2>
        <p className="mt-2 text-sm text-emerald-900">
          Thank you — a licensed specialist will meet with you at the scheduled time. You will receive a confirmation with
          the event link.
        </p>
        <p className="mt-3 text-xs text-emerald-800">
          TatoIQ provides administrative matching and accounting technology; consultations are provided by licensed
          independent professionals.
        </p>
        <Link href="/dashboard" className="mt-4 inline-block rounded-lg bg-navy-900 px-4 py-2 text-sm font-semibold text-white hover:bg-navy-800">
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
