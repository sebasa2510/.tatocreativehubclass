import type { Metadata } from "next";
import StatusBadge from "@/components/StatusBadge";
import { DEMO_RETURN } from "@/lib/demo/data";
import { FILING_STATUS_LABELS, REFUND_STATUS_LABELS } from "@/lib/status";
import { shortDate } from "@/lib/format";

export const metadata: Metadata = {
  title: "Tax Status",
  robots: { index: false, follow: false },
};

export default function TaxStatusPage() {
  const r = DEMO_RETURN;
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="font-display text-2xl font-semibold tracking-tight text-navy-900 sm:text-3xl">
        Tax Status
      </h1>
      <p className="mt-1 text-sm text-navy-500">
        Status history with actor, timestamp, and evidence. Manual entries are labelled
        &ldquo;Manually recorded.&rdquo;
      </p>

      {/* Filing + refund, separate from preparation */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-navy-500">Filing status</p>
          <p className="mt-1 font-display text-lg font-semibold text-navy-900">
            {FILING_STATUS_LABELS[r.filingStatus]}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-navy-500">Refund status</p>
          <p className="mt-1 font-display text-lg font-semibold text-navy-900">
            {REFUND_STATUS_LABELS[r.refundStatus]}
          </p>
          <p className="mt-1 text-xs text-navy-500">
            A refund is never implied by an accepted return.
          </p>
        </div>
      </div>

      {/* Timeline */}
      <section className="mt-6 rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="font-display text-base font-semibold text-navy-900">Preparation history</h2>
        <ol className="mt-4 space-y-5 border-l border-slate-200 pl-5">
          {r.statusHistory.map((e, i) => (
            <li key={i} className="relative">
              <span className="absolute -left-[1.65rem] top-1.5 h-3 w-3 rounded-full bg-navy-900 ring-2 ring-teal-500/40" />
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={e.status} />
                {e.manuallyRecorded && (
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-navy-500">
                    Manually recorded
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs text-navy-500">
                {e.actor} · {shortDate(e.at)}
              </p>
              {e.reason && <p className="text-sm text-navy-600">{e.reason}</p>}
            </li>
          ))}
        </ol>
        <p className="mt-4 text-xs text-navy-400">
          Later statuses (Ready for filing and beyond) require a verified PTIN and a completed
          checklist.
        </p>
      </section>

      {/* IRS refund link */}
      <section className="mt-6 rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="font-display text-base font-semibold text-navy-900">
          Checking your federal refund
        </h2>
        <p className="mt-2 text-sm text-navy-600">
          The IRS processes refunds on its own schedule. Use the official IRS tool to check status —
          TatoIQ links to it and never stores your refund query data or pre-fills your SSN.
        </p>
        <a
          href="https://www.irs.gov/wheres-my-refund"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-block rounded-lg bg-navy-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-navy-800"
        >
          Open IRS Where&rsquo;s My Refund? ↗
        </a>
        <p className="mt-3 text-xs text-navy-400">
          The IRS does not offer a public API and TatoIQ cannot see private IRS records.
        </p>
      </section>
    </div>
  );
}
