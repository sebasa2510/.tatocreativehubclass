"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import * as Tabs from "@radix-ui/react-tabs";
import StatusBadge from "@/components/StatusBadge";
import ProgressTracker from "@/components/app/progress-tracker";
import { DEMO_RETURN, DEMO_DEADLINES, documentStats } from "@/lib/demo/data";
import { FILING_STATUS_LABELS, REFUND_STATUS_LABELS } from "@/lib/status";
import { shortDate, usd, dayOfMonth } from "@/lib/format";
import {
  IconAlert,
  IconClock,
  IconFile,
  IconReceipt,
  IconWallet,
} from "@/components/icons";

const SCAN_TONE: Record<string, string> = {
  clean: "bg-teal-50 text-teal-700 ring-teal-200",
  scanning: "bg-slate-100 text-navy-600 ring-slate-200",
  quarantined: "bg-gold-50 text-gold-700 ring-gold-200",
  infected: "bg-red-50 text-red-700 ring-red-200",
};

const SCAN_LABEL: Record<string, string> = {
  clean: "Scan clean",
  scanning: "Scanning…",
  quarantined: "Quarantined",
  infected: "Infected",
};

function Tab({
  value,
  children,
  count,
}: {
  value: string;
  children: React.ReactNode;
  count?: number;
}) {
  return (
    <Tabs.Trigger
      value={value}
      className="inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium text-navy-600 outline-none transition data-[state=active]:bg-white data-[state=active]:text-navy-900 data-[state=active]:shadow-sm"
    >
      {children}
      {typeof count === "number" && (
        <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[11px] font-semibold text-navy-700 data-[state=active]:bg-navy-100">
          {count}
        </span>
      )}
    </Tabs.Trigger>
  );
}

export default function DashboardTabs() {
  const r = DEMO_RETURN;
  const [tasks, setTasks] = useState(r.tasks);

  const docs = documentStats(r);
  const docsReceived = docs.scannedClean;
  const openTasks = tasks.filter((t) => !t.completed).length;
  const tasksDone = tasks.length - openTasks;
  const unconfirmed = docs.fieldsPending;

  const totalExpenses = useMemo(
    () => r.business.expenses.reduce((sum, e) => sum + e.amount, 0),
    [r.business.expenses],
  );
  const netProfit = r.business.grossReceipts - totalExpenses;

  return (
    <Tabs.Root defaultValue="overview">
      <Tabs.List className="inline-flex flex-wrap gap-1 rounded-xl border border-slate-200 bg-slate-100 p-1">
        <Tab value="overview">Overview</Tab>
        <Tab value="documents" count={r.documents.length}>
          Documents
        </Tab>
        <Tab value="tasks" count={openTasks}>
          Tasks
        </Tab>
        <Tab value="messages" count={r.messages.length}>
          Messages
        </Tab>
      </Tabs.List>

      {/* ───────────── Overview ───────────── */}
      <Tabs.Content value="overview" className="mt-6 space-y-6 outline-none">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-navy-500">
                Preparation
              </p>
              <IconClock className="h-4 w-4 text-navy-400" />
            </div>
            <div className="mt-3">
              <StatusBadge status={r.preparationStatus} />
            </div>
            <p className="mt-3 text-xs text-navy-500">From the return status history</p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-navy-500">Filing</p>
              <IconFile className="h-4 w-4 text-navy-400" />
            </div>
            <p className="mt-3 font-display text-lg font-semibold text-navy-900">
              {FILING_STATUS_LABELS[r.filingStatus]}
            </p>
            <p className="mt-3 text-xs text-navy-500">Tracked separately from preparation</p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-navy-500">Refund</p>
              <IconWallet className="h-4 w-4 text-navy-400" />
            </div>
            <p className="mt-3 font-display text-lg font-semibold text-navy-900">
              {REFUND_STATUS_LABELS[r.refundStatus]}
            </p>
            <p className="mt-3 text-xs text-navy-500">Acceptance ≠ refund issued</p>
          </div>
        </div>

        {unconfirmed > 0 && (
          <div className="flex items-start gap-3 rounded-xl border border-gold-200 bg-gold-50 p-4">
            <IconAlert className="mt-0.5 h-5 w-5 shrink-0 text-gold-700" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-gold-900">Action needed</p>
              <p className="mt-1 text-sm text-gold-800">
                {unconfirmed} extracted {unconfirmed === 1 ? "field needs" : "fields need"} your
                confirmation before they can enter your return.
              </p>
            </div>
            <Link
              href="/documents"
              className="shrink-0 rounded-lg bg-navy-900 px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-navy-800"
            >
              Review
            </Link>
          </div>
        )}

        <ProgressTracker status={r.preparationStatus} />

        <div className="grid gap-6 lg:grid-cols-3">
          <section className="rounded-xl border border-slate-200 bg-white shadow-sm p-5 lg:col-span-2">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-base font-semibold text-navy-900">
                Schedule C summary
              </h2>
              <IconReceipt className="h-4 w-4 text-navy-400" />
            </div>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-navy-600">Gross receipts</dt>
                <dd className="font-medium text-navy-900">{usd(r.business.grossReceipts)}</dd>
              </div>
              {r.business.expenses.map((e) => (
                <div key={e.label} className="flex justify-between">
                  <dt className="text-navy-600">{e.label}</dt>
                  <dd className="text-navy-700">−{usd(e.amount)}</dd>
                </div>
              ))}
              <div className="flex justify-between border-t border-slate-200 pt-2 font-semibold">
                <dt className="text-navy-900">Net profit</dt>
                <dd className="text-navy-900">{usd(netProfit)}</dd>
              </div>
            </dl>
            <p className="mt-4 text-xs text-navy-400">
              Figures shown are confirmed inputs only. Estimates are produced by the versioned
              engine, not the assistant.
            </p>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white shadow-sm p-5">
            <h2 className="font-display text-base font-semibold text-navy-900">Deadlines</h2>
            <ul className="mt-4 space-y-4">
              {DEMO_DEADLINES.map((d) => (
                <li key={d.label} className="flex gap-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-navy-50 text-xs font-semibold text-navy-700">
                    {dayOfMonth(d.date)}
                  </span>
                  <div>
                    <p className="text-sm text-navy-800">{d.label}</p>
                    <p className="text-xs text-navy-500">{shortDate(d.date)}</p>
                  </div>
                </li>
              ))}
            </ul>
            <Link
              href="/tasks"
              className="mt-5 inline-block text-sm font-medium text-teal-700 hover:underline"
            >
              All tasks →
            </Link>
          </section>
        </div>
      </Tabs.Content>

      {/* ───────────── Documents ───────────── */}
      <Tabs.Content value="documents" className="mt-6 outline-none">
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-navy-500">
              <tr>
                <th scope="col" className="px-5 py-3 font-semibold">Document</th>
                <th scope="col" className="px-5 py-3 font-semibold">Scan</th>
                <th scope="col" className="px-5 py-3 font-semibold">Extracted</th>
                <th scope="col" className="px-5 py-3 font-semibold">Confirmed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {r.documents.map((d) => {
                const total = d.extractionFields.length;
                const accepted = d.extractionFields.filter((f) => f.accepted).length;
                return (
                  <tr key={d.id} className="hover:bg-slate-50/60">
                    <td className="px-5 py-3.5 font-medium text-navy-900">{d.name}</td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${SCAN_TONE[d.scanStatus]}`}
                      >
                        {SCAN_LABEL[d.scanStatus]}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-navy-600">{total}</td>
                    <td className="px-5 py-3.5">
                      {total === 0 ? (
                        <span className="text-navy-400">—</span>
                      ) : (
                        <span
                          className={
                            accepted === total ? "font-medium text-teal-700" : "text-gold-700"
                          }
                        >
                          {accepted}/{total}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3.5">
            <p className="text-xs text-navy-500">
              {docsReceived} of {r.documents.length} documents scanned clean.
            </p>
            <Link
              href="/documents"
              className="text-sm font-medium text-teal-700 hover:underline"
            >
              Open document review →
            </Link>
          </div>
        </div>
      </Tabs.Content>

      {/* ───────────── Tasks ───────────── */}
      <Tabs.Content value="tasks" className="mt-6 outline-none">
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-base font-semibold text-navy-900">Open tasks</h2>
            <span className="text-xs text-navy-500">
              {tasksDone}/{tasks.length} complete
            </span>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-teal-500"
              style={{ width: `${(tasksDone / tasks.length) * 100}%` }}
            />
          </div>
          <ul className="mt-5 space-y-3">
            {tasks.map((t) => (
              <li
                key={t.id}
                className="flex items-start gap-3 rounded-lg border border-slate-100 p-3.5"
              >
                <input
                  id={`dash-${t.id}`}
                  type="checkbox"
                  checked={t.completed}
                  onChange={() =>
                    setTasks((prev) =>
                      prev.map((x) => (x.id === t.id ? { ...x, completed: !x.completed } : x)),
                    )
                  }
                  className="mt-1 h-4 w-4 accent-teal-600"
                />
                <div className="flex-1">
                  <label
                    htmlFor={`dash-${t.id}`}
                    className={`block text-sm ${
                      t.completed ? "text-navy-400 line-through" : "text-navy-800"
                    }`}
                  >
                    {t.title}
                  </label>
                  <p className="text-xs text-navy-500">Due {shortDate(t.dueDate)}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </Tabs.Content>

      {/* ───────────── Messages ───────────── */}
      <Tabs.Content value="messages" className="mt-6 outline-none">
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-5">
          <ul className="divide-y divide-slate-100">
            {r.messages.map((m) => (
              <li key={m.id} className="py-4 first:pt-0 last:pb-0">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-navy-900">{m.from}</p>
                  <p className="text-xs text-navy-400">{shortDate(m.at)}</p>
                </div>
                <p className="mt-1.5 text-sm text-navy-600">{m.body}</p>
              </li>
            ))}
          </ul>
          <Link
            href="/messages"
            className="mt-4 inline-block text-sm font-medium text-teal-700 hover:underline"
          >
            Open all messages →
          </Link>
        </div>
      </Tabs.Content>
    </Tabs.Root>
  );
}
