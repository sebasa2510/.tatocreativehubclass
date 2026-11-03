import type { Metadata } from "next";
import type { ReactNode } from "react";
import { DEMO_RETURN } from "@/lib/demo/data";

export const metadata: Metadata = {
  title: "Account Settings",
  robots: { index: false, follow: false },
};

function Row({ title, status, children }: { title: string; status: string; children: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-100 py-4 last:border-0">
      <div>
        <p className="text-sm font-medium text-navy-800">{title}</p>
        <p className="mt-1 text-sm text-navy-500">{children}</p>
      </div>
      <span className="shrink-0 rounded-full bg-navy-50 px-2.5 py-0.5 text-xs font-medium text-navy-700">
        {status}
      </span>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="font-display text-2xl font-semibold tracking-tight text-navy-900 sm:text-3xl">
        Account Settings
      </h1>
      <p className="mt-1 text-sm text-navy-500">{DEMO_RETURN.clientName} · Demo workspace</p>

      <section className="mt-6 rounded-xl border border-slate-200 bg-white px-6 py-2">
        <Row title="Multi-factor authentication" status="Recommended">
          Add a second factor to protect your account. Required for staff accounts.
        </Row>
        <Row title="Linked spouse" status="Not linked">
          A spouse gets separate credentials and separate consent for a joint return.
        </Row>
        <Row title="Bank connections (Plaid)" status="Not connected">
          Importing transactions is optional. Synced categories stay suggestions until you confirm
          them. Sandbox only in this build.
        </Row>
        <Row title="Billing (Stripe)" status="Test mode">
          Invoices are issued when a return reaches an agreed billing milestone. No card data is
          ever stored by TatoIQ.
        </Row>
        <Row title="Data & retention" status="7 years">
          Records are retained per IRS and firm policy. You can request an export or deletion.
        </Row>
      </section>

      <p className="mt-6 text-xs text-navy-400">
        Demo build — settings are illustrative and do not persist.
      </p>
    </div>
  );
}
