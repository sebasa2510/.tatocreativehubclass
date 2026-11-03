'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const ENTITY_OPTIONS = ['sole proprietor', 'LLC', 'S-corp', 'partnership', 'independent contractor', 'other'];
const CONSENT_OPTIONS = ['UNKNOWN', 'GRANTED', 'WITHDRAWN', 'NOT_REQUIRED'];

export default function NewLeadPage() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    businessName: '',
    contactName: '',
    email: '',
    phone: '',
    website: '',
    city: '',
    state: '',
    industry: '',
    entityType: 'LLC',
    sourceTag: 'Manual',
    consentStatus: 'UNKNOWN',
    verifiedEmail: false,
    verifiedPhone: false,
    verifiedBusiness: false,
    verifiedAddress: false,
  });

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? 'Could not create the lead.');
        return;
      }
      const data = (await res.json()) as { lead: { id: string } };
      router.push(`/leads/${data.lead.id}`);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link href="/leads" className="text-sm font-medium text-teal-700 underline-offset-2 hover:underline">
          ← Back to leads
        </Link>
        <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-navy-900">Add a lead</h2>
        <p className="mt-1 text-sm text-navy-500">
          Enter business contact information only. Never enter SSNs, bank credentials, or tax return data.
        </p>
      </div>

      <form onSubmit={submit} className="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col text-sm">
            <span className="mb-1 font-medium text-navy-700">Business name</span>
            <input value={form.businessName} onChange={(e) => set('businessName', e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-navy-900 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-200" />
          </label>
          <label className="flex flex-col text-sm">
            <span className="mb-1 font-medium text-navy-700">Contact name</span>
            <input value={form.contactName} onChange={(e) => set('contactName', e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-navy-900 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-200" />
          </label>
          <label className="flex flex-col text-sm">
            <span className="mb-1 font-medium text-navy-700">Email</span>
            <input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-navy-900 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-200" />
          </label>
          <label className="flex flex-col text-sm">
            <span className="mb-1 font-medium text-navy-700">Phone</span>
            <input value={form.phone} onChange={(e) => set('phone', e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-navy-900 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-200" />
          </label>
          <label className="flex flex-col text-sm">
            <span className="mb-1 font-medium text-navy-700">Industry</span>
            <input value={form.industry} onChange={(e) => set('industry', e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-navy-900 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-200" />
          </label>
          <label className="flex flex-col text-sm">
            <span className="mb-1 font-medium text-navy-700">Entity type</span>
            <select value={form.entityType} onChange={(e) => set('entityType', e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-navy-900 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-200">
              {ENTITY_OPTIONS.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col text-sm">
            <span className="mb-1 font-medium text-navy-700">City</span>
            <input value={form.city} onChange={(e) => set('city', e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-navy-900 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-200" />
          </label>
          <label className="flex flex-col text-sm">
            <span className="mb-1 font-medium text-navy-700">State</span>
            <input value={form.state} onChange={(e) => set('state', e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-navy-900 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-200" />
          </label>
          <label className="flex flex-col text-sm">
            <span className="mb-1 font-medium text-navy-700">Source</span>
            <input value={form.sourceTag} onChange={(e) => set('sourceTag', e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-navy-900 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-200" />
          </label>
          <label className="flex flex-col text-sm">
            <span className="mb-1 font-medium text-navy-700">Consent status</span>
            <select value={form.consentStatus} onChange={(e) => set('consentStatus', e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-navy-900 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-200">
              {CONSENT_OPTIONS.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </label>
        </div>

        <fieldset className="rounded-lg border border-slate-200 p-3">
          <legend className="px-1 text-sm font-medium text-navy-700">Verification (unverified fields earn zero points)</legend>
          <div className="mt-1 grid gap-2 sm:grid-cols-2">
            {(
              [
                ['verifiedEmail', 'Email verified'],
                ['verifiedPhone', 'Phone verified'],
                ['verifiedBusiness', 'Business verified'],
                ['verifiedAddress', 'Address verified'],
              ] as Array<[keyof typeof form, string]>
            ).map(([key, label]) => (
              <label key={key} className="flex items-center gap-2 text-sm text-navy-700">
                <input
                  type="checkbox"
                  checked={Boolean(form[key])}
                  onChange={(e) => set(key, e.target.checked as never)}
                  className="h-4 w-4 rounded border-slate-300"
                />
                {label}
              </label>
            ))}
          </div>
        </fieldset>

        {error ? (
          <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800">
            {error}
          </p>
        ) : null}

        <div className="flex gap-3">
          <button type="submit" disabled={busy} className="rounded-lg bg-navy-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-navy-800 disabled:opacity-50">
            {busy ? 'Saving…' : 'Create lead'}
          </button>
          <Link href="/leads" className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-navy-800 hover:bg-slate-50">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
