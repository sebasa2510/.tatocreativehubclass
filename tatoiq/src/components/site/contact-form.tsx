'use client';

import { useState } from 'react';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';

type Status = 'idle' | 'submitting' | 'success' | 'error';

/**
 * The triage endpoint lives on Netlify (`/api/contacts/triage`). Set
 * NEXT_PUBLIC_CONTACT_TRIAGE_URL to the full Netlify URL when this form is
 * served from the static Firebase mirror. If it is unreachable the submission
 * is already saved; the owner still sees it, just without a triage decision.
 */
const TRIAGE_URL = process.env.NEXT_PUBLIC_CONTACT_TRIAGE_URL || '/api/contacts/triage';

function requestTriage(contactId: string) {
  try {
    void fetch(TRIAGE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contact_id: contactId }),
      keepalive: true,
    }).catch(() => {
      // Triage is a follow-up, never a condition of a successful submission.
    });
  } catch {
    // Same: the record is saved.
  }
}

export default function ContactForm() {
  const [status, setStatus] = useState<Status>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus('submitting');
    setErrorMsg('');

    const form = e.currentTarget;
    const data = new FormData(form);

    // Simple bot trap. It is never written to Firestore.
    if (String(data.get('website') || '').trim()) {
      setStatus('success');
      form.reset();
      return;
    }

    const payload = {
      name: String(data.get('name') || '').trim(),
      businessName: String(data.get('businessName') || '').trim(),
      email: String(data.get('email') || '').trim(),
      service: String(data.get('service') || '').trim(),
      industry: String(data.get('industry') || '').trim(),
      budget: String(data.get('budget') || '').trim(),
      timeline: String(data.get('timeline') || '').trim(),
      bottleneck: String(data.get('bottleneck') || '').trim(),
      source: 'website-contact',
      createdAt: new Date().toISOString(),
    };

    try {
      const saved = await addDoc(collection(db, 'contacts'), payload);
      requestTriage(saved.id);
      setStatus('success');
      form.reset();
    } catch (err) {
      setStatus('error');
      setErrorMsg(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    }
  }

  if (status === 'success') {
    return (
      <div className="text-center py-10" role="status" aria-live="polite">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-teal-50">
          <svg className="h-6 w-6 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="mt-4 font-display text-xl font-semibold text-navy-900">Message sent!</h2>
        <p className="mt-2 text-navy-600">
          Thanks for reaching out. We&apos;ll get back to you soon.
        </p>
        <button
          onClick={() => setStatus('idle')}
          className="mt-6 rounded-lg bg-navy-900 px-4 py-2 text-sm font-semibold text-white hover:bg-navy-800"
        >
          Send another message
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="hidden" aria-hidden="true">
        <label htmlFor="website">Website</label>
        <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-navy-900">
            Full Name *
          </label>
          <input
            type="text"
            id="name"
            name="name"
            required
            maxLength={120}
            autoComplete="name"
            className="mt-1.5 w-full rounded-lg border border-navy-200 px-3 py-2 text-navy-900 focus:border-navy-900 focus:outline-none focus:ring-1 focus:ring-navy-900"
          />
        </div>
        <div>
          <label htmlFor="businessName" className="block text-sm font-medium text-navy-900">
            Business Name *
          </label>
          <input
            type="text"
            id="businessName"
            name="businessName"
            required
            maxLength={160}
            autoComplete="organization"
            className="mt-1.5 w-full rounded-lg border border-navy-200 px-3 py-2 text-navy-900 focus:border-navy-900 focus:outline-none focus:ring-1 focus:ring-navy-900"
          />
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-navy-900">
            Email Address *
          </label>
          <input
            type="email"
            id="email"
            name="email"
            required
            maxLength={254}
            autoComplete="email"
            className="mt-1.5 w-full rounded-lg border border-navy-200 px-3 py-2 text-navy-900 focus:border-navy-900 focus:outline-none focus:ring-1 focus:ring-navy-900"
          />
        </div>
        <div>
          <label htmlFor="industry" className="block text-sm font-medium text-navy-900">
            Industry *
          </label>
          <input
            type="text"
            id="industry"
            name="industry"
            required
            maxLength={120}
            autoComplete="organization-title"
            placeholder="e.g., Home services, Retail, etc."
            className="mt-1.5 w-full rounded-lg border border-navy-200 px-3 py-2 text-navy-900 focus:border-navy-900 focus:outline-none focus:ring-1 focus:ring-navy-900"
          />
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <label htmlFor="service" className="block text-sm font-medium text-navy-900">
            Service Needed *
          </label>
          <select
            id="service"
            name="service"
            required
            className="mt-1.5 w-full rounded-lg border border-navy-200 px-3 py-2 text-navy-900 focus:border-navy-900 focus:outline-none focus:ring-1 focus:ring-navy-900"
          >
            <option value="">Select a service</option>
            <option value="Individuals & families">Individuals & families</option>
            <option value="Self-employed & 1099">Self-employed & 1099</option>
            <option value="Small business">Small business</option>
            <option value="IRS notice support">IRS notice support</option>
            <option value="Other">Other</option>
          </select>
        </div>
        <div>
          <label htmlFor="budget" className="block text-sm font-medium text-navy-900">
            Budget *
          </label>
          <select
            id="budget"
            name="budget"
            required
            className="mt-1.5 w-full rounded-lg border border-navy-200 px-3 py-2 text-navy-900 focus:border-navy-900 focus:outline-none focus:ring-1 focus:ring-navy-900"
          >
            <option value="">Select budget range</option>
            <option value="Under $1,000">Under $1,000</option>
            <option value="$1,000 - $2,500">$1,000 - $2,500</option>
            <option value="$2,500 - $5,000">$2,500 - $5,000</option>
            <option value="$5,000+">$5,000+</option>
            <option value="Not sure">Not sure</option>
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="timeline" className="block text-sm font-medium text-navy-900">
          Timeline *
        </label>
        <select
          id="timeline"
          name="timeline"
          required
          className="mt-1.5 w-full rounded-lg border border-navy-200 px-3 py-2 text-navy-900 focus:border-navy-900 focus:outline-none focus:ring-1 focus:ring-navy-900"
        >
          <option value="">When do you need this done?</option>
          <option value="ASAP">ASAP</option>
          <option value="1-3 months">1-3 months</option>
          <option value="3-6 months">3-6 months</option>
          <option value="Flexible">Flexible</option>
        </select>
      </div>

      <div>
        <label htmlFor="bottleneck" className="block text-sm font-medium text-navy-900">
          What&apos;s your biggest tax challenge? *
        </label>
        <textarea
          id="bottleneck"
          name="bottleneck"
          required
          rows={4}
          maxLength={2000}
          placeholder="Tell us about your situation..."
          className="mt-1.5 w-full rounded-lg border border-navy-200 px-3 py-2 text-navy-900 focus:border-navy-900 focus:outline-none focus:ring-1 focus:ring-navy-900"
        />
      </div>

      {status === 'error' && (
        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700" role="alert">
          {errorMsg}
        </div>
      )}

      <button
        type="submit"
        disabled={status === 'submitting'}
        className="w-full rounded-lg bg-navy-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-navy-800 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {status === 'submitting' ? 'Sending...' : 'Send Message'}
      </button>
    </form>
  );
}
