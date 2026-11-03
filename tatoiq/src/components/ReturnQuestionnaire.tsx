"use client";

import { useMemo, useState } from "react";
import { computeReturn } from "@/lib/tax/engine";
import type { FilingStatus } from "@/lib/tax/tables";
import { usd, pct } from "@/lib/format";

const DEFAULT_EXPENSES = [
  { label: "Advertising", amount: 1800 },
  { label: "Office expense", amount: 950 },
  { label: "Software & subscriptions", amount: 2400 },
  { label: "Business mileage", amount: 3120 },
  { label: "Home office (simplified)", amount: 1500 },
];

const STEPS = ["Filing status", "Income", "Business expenses", "Review & estimate"];

const inputClass =
  "mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-navy-800 focus:border-teal-500 focus:outline-none";

export default function ReturnQuestionnaire() {
  const [step, setStep] = useState(0);
  const [filingStatus, setFilingStatus] = useState<FilingStatus>("single");
  const [w2Wages, setW2Wages] = useState(12400);
  const [grossReceipts, setGrossReceipts] = useState(82000);
  const [expenses, setExpenses] = useState(DEFAULT_EXPENSES);

  const result = useMemo(
    () =>
      computeReturn({
        taxYear: 2025,
        filingStatus,
        w2Wages,
        businessGrossReceipts: grossReceipts,
        businessExpenses: expenses,
      }),
    [filingStatus, w2Wages, grossReceipts, expenses],
  );

  function updateExpense(i: number, amount: number) {
    setExpenses((prev) => prev.map((e, idx) => (idx === i ? { ...e, amount } : e)));
  }

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="font-display text-2xl font-semibold tracking-tight text-navy-900 sm:text-3xl">
        My Tax Return
      </h1>
      <p className="mt-1 text-sm text-navy-500">
        Form 1040 with Schedule C and Schedule SE · Tax year 2025
      </p>

      {/* Step progress */}
      <ol className="mt-6 flex flex-wrap gap-2 text-xs">
        {STEPS.map((s, i) => (
          <li
            key={s}
            className={`rounded-full px-3 py-1.5 font-medium ${
              i === step
                ? "bg-navy-900 text-white"
                : i < step
                  ? "bg-teal-50 text-teal-700 ring-1 ring-inset ring-teal-200"
                  : "bg-slate-100 text-navy-500"
            }`}
          >
            {i + 1}. {s}
          </li>
        ))}
      </ol>

      <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6">
        {step === 0 && (
          <fieldset>
            <legend className="font-display text-lg font-semibold text-navy-900">
              What is your filing status?
            </legend>
            <p className="mt-1 text-sm text-navy-500">
              This affects your standard deduction and tax brackets.
            </p>
            <div className="mt-4 space-y-2">
              {(
                [
                  ["single", "Single"],
                  ["mfj", "Married filing jointly"],
                  ["mfs", "Married filing separately"],
                  ["hoh", "Head of household"],
                ] as const
              ).map(([value, label]) => (
                <label
                  key={value}
                  className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition ${
                    filingStatus === value
                      ? "border-teal-500 bg-teal-50/50"
                      : "border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <input
                    type="radio"
                    name="filingStatus"
                    checked={filingStatus === value}
                    onChange={() => setFilingStatus(value)}
                    className="accent-teal-600"
                  />
                  <span className="text-sm text-navy-800">{label}</span>
                </label>
              ))}
            </div>
          </fieldset>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <div>
              <label htmlFor="w2" className="text-sm font-medium text-navy-700">
                W-2 wages (Form 1040 line 1a)
              </label>
              <p className="text-xs text-navy-500">
                We ask because wage income changes your total income.
              </p>
              <input
                id="w2"
                type="number"
                value={w2Wages}
                onChange={(e) => setW2Wages(Number(e.target.value))}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="gross" className="text-sm font-medium text-navy-700">
                Business gross receipts (Schedule C line 1)
              </label>
              <p className="text-xs text-navy-500">
                Total you were paid for your business before expenses.
              </p>
              <input
                id="gross"
                type="number"
                value={grossReceipts}
                onChange={(e) => setGrossReceipts(Number(e.target.value))}
                className={inputClass}
              />
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <h2 className="font-display text-lg font-semibold text-navy-900">
              Business expenses (Schedule C, Part II)
            </h2>
            <p className="mt-1 text-sm text-navy-500">
              Enter confirmed expenses only. Unconfirmed amounts are kept separate and flagged.
            </p>
            <div className="mt-4 space-y-3">
              {expenses.map((e, i) => (
                <div key={e.label} className="flex items-center gap-3">
                  <label htmlFor={`exp-${i}`} className="flex-1 text-sm text-navy-700">
                    {e.label}
                  </label>
                  <input
                    id={`exp-${i}`}
                    type="number"
                    value={e.amount}
                    onChange={(ev) => updateExpense(i, Number(ev.target.value))}
                    className="w-40 rounded-lg border border-slate-300 px-3 py-2 text-sm text-navy-800 focus:border-teal-500 focus:outline-none"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <h2 className="font-display text-lg font-semibold text-navy-900">
              Review &amp; estimate
            </h2>
            <p className="mt-1 text-sm text-navy-500">
              Information used, unresolved questions, and the estimated result.
            </p>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="rounded-lg border border-slate-200 p-4">
                <h3 className="text-sm font-semibold text-navy-800">Schedule C</h3>
                <dl className="mt-2 space-y-1 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-navy-600">Gross receipts</dt>
                    <dd className="text-navy-900">{usd(result.scheduleC.grossReceipts)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-navy-600">Total expenses</dt>
                    <dd className="text-navy-900">−{usd(result.scheduleC.totalExpenses)}</dd>
                  </div>
                  <div className="flex justify-between font-medium">
                    <dt className="text-navy-900">Net profit</dt>
                    <dd className="text-navy-900">{usd(result.scheduleC.netProfit)}</dd>
                  </div>
                </dl>
              </div>
              <div className="rounded-lg border border-slate-200 p-4">
                <h3 className="text-sm font-semibold text-navy-800">Schedule SE</h3>
                <dl className="mt-2 space-y-1 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-navy-600">Net earnings</dt>
                    <dd className="text-navy-900">{usd(result.scheduleSE.netEarnings)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-navy-600">Self-employment tax</dt>
                    <dd className="text-navy-900">{usd(result.scheduleSE.seTax)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-navy-600">Deductible half</dt>
                    <dd className="text-navy-900">{usd(result.scheduleSE.deductibleHalf)}</dd>
                  </div>
                </dl>
              </div>
            </div>

            <div className="mt-4 rounded-lg border border-slate-200 p-4">
              <h3 className="text-sm font-semibold text-navy-800">Form 1040</h3>
              <dl className="mt-2 grid gap-1 text-sm sm:grid-cols-2">
                <div className="flex justify-between">
                  <dt className="text-navy-600">Total income</dt>
                  <dd className="text-navy-900">{usd(result.form1040.totalIncome)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-navy-600">Adjustments</dt>
                  <dd className="text-navy-900">−{usd(result.form1040.adjustments)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-navy-600">Adjusted gross income</dt>
                  <dd className="text-navy-900">{usd(result.form1040.adjustedGrossIncome)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-navy-600">Standard deduction</dt>
                  <dd className="text-navy-900">{usd(result.form1040.standardDeduction)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-navy-600">Taxable income</dt>
                  <dd className="text-navy-900">{usd(result.form1040.taxableIncome)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-navy-600">Income tax</dt>
                  <dd className="text-navy-900">{usd(result.form1040.incomeTax)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-navy-600">Self-employment tax</dt>
                  <dd className="text-navy-900">{usd(result.form1040.selfEmploymentTax)}</dd>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-1 font-semibold">
                  <dt className="text-navy-900">Total tax (estimate)</dt>
                  <dd className="text-navy-900">{usd(result.form1040.totalTax)}</dd>
                </div>
              </dl>
              <p className="mt-2 text-xs text-navy-500">
                Marginal rate {pct(result.form1040.marginalRate)} · Effective rate{" "}
                {pct(result.form1040.effectiveRate)}
              </p>
            </div>

            {result.flags.length > 0 && (
              <div className="mt-4 rounded-lg border border-gold-200 bg-gold-50 p-4 text-sm text-gold-900">
                <p className="font-medium">Unresolved questions</p>
                <ul className="mt-1 list-disc pl-5">
                  {result.flags.map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4 text-xs text-navy-600">
              <p>
                <strong className="text-navy-800">Estimate only.</strong> This is not a filed return
                and not a promise of a refund or outcome.
              </p>
              <p className="mt-1">
                Rule source: {result.ruleSource} · Engine: {result.engineVersion} · Tax year{" "}
                {result.taxYear}
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="mt-6 flex justify-between">
        <button
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0}
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-navy-700 transition hover:bg-slate-50 disabled:opacity-40"
        >
          Back
        </button>
        <button
          onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}
          disabled={step === STEPS.length - 1}
          className="rounded-lg bg-navy-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-navy-800 disabled:opacity-40"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
