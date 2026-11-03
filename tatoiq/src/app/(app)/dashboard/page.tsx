import type { Metadata } from "next";
import Link from "next/link";
import DashboardTabs from "@/components/app/dashboard-tabs";
import StatusBadge from "@/components/StatusBadge";
import { DEMO_RETURN } from "@/lib/demo/data";

export const metadata: Metadata = {
  title: "Dashboard",
  robots: { index: false, follow: false },
};

export default function DashboardPage() {
  const r = DEMO_RETURN;
  const firstName = r.clientName.split(" ")[0];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-navy-500">
            {r.returnType} · Tax year {r.taxYear}
          </p>
          <h2 className="mt-1 font-display text-2xl font-semibold tracking-tight text-navy-900 sm:text-3xl">
            Welcome back, {firstName}
          </h2>
          <p className="mt-1 text-sm text-navy-500">Prepared by {r.assignedPreparer}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <StatusBadge status={r.preparationStatus} />
          <Link
            href="/return"
            className="rounded-lg bg-navy-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-navy-800"
          >
            Review draft
          </Link>
          <Link
            href="/documents"
            className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-navy-800 transition hover:bg-slate-50"
          >
            Upload documents
          </Link>
        </div>
      </div>

      <DashboardTabs />

      <p className="text-xs text-navy-400">
        Demo workspace uses synthetic data only. Direct IRS transmission is disabled in this build.
      </p>
    </div>
  );
}
