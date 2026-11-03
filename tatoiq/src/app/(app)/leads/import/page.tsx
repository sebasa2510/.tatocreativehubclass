'use client';

import { useState } from 'react';
import Link from 'next/link';

interface ImportResult {
  filename: string;
  rowCount: number;
  importedCount: number;
  duplicateCount: number;
  errorCount: number;
  status: string;
  duplicates: Array<{ line: number; reason: string }>;
  errors: Array<{ line: number; message: string }>;
}

export default function ImportLeadsPage() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const input = event.currentTarget.elements.namedItem('file') as HTMLInputElement | null;
    const file = input?.files?.[0];
    if (!file || busy) return;

    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const body = new FormData();
      body.append('file', file);
      const res = await fetch('/api/leads/import', { method: 'POST', body });
      const data = (await res.json().catch(() => ({}))) as ImportResult & { error?: string };
      if (!res.ok) {
        setError(data.error ?? 'Import failed.');
        return;
      }
      setResult(data);
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
        <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-navy-900">Import leads from CSV</h2>
        <p className="mt-1 text-sm text-navy-500">
          Recognized columns include business name, contact name, email, phone, website, city, state, industry, and entity type.
          Duplicates are flagged for review — never overwritten.
        </p>
      </div>

      <form onSubmit={submit} className="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-navy-700">CSV file</span>
          <input
            type="file"
            name="file"
            accept=".csv,text/csv"
            required
            className="block w-full cursor-pointer rounded-lg border border-slate-300 px-3 py-2 text-sm text-navy-900 file:mr-3 file:rounded-md file:border-0 file:bg-navy-900 file:px-3 file:py-1.5 file:text-white"
          />
        </label>
        {error ? (
          <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800">
            {error}
          </p>
        ) : null}
        <button type="submit" disabled={busy} className="rounded-lg bg-navy-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-navy-800 disabled:opacity-50">
          {busy ? 'Importing…' : 'Import CSV'}
        </button>
      </form>

      {result ? (
        <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5" role="status">
          <h3 className="text-sm font-semibold text-navy-900">
            {result.filename} — {result.status}
          </h3>
          <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            <div>
              <dt className="text-xs text-navy-500">Rows</dt>
              <dd className="font-semibold text-navy-900">{result.rowCount}</dd>
            </div>
            <div>
              <dt className="text-xs text-navy-500">Imported</dt>
              <dd className="font-semibold text-emerald-700">{result.importedCount}</dd>
            </div>
            <div>
              <dt className="text-xs text-navy-500">Duplicates</dt>
              <dd className="font-semibold text-gold-700">{result.duplicateCount}</dd>
            </div>
            <div>
              <dt className="text-xs text-navy-500">Errors</dt>
              <dd className="font-semibold text-rose-700">{result.errorCount}</dd>
            </div>
          </dl>

          {result.duplicates.length > 0 ? (
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wide text-navy-500">Pending review (duplicates)</h4>
              <ul className="mt-1 space-y-1 text-sm text-navy-700">
                {result.duplicates.map((d) => (
                  <li key={`dup-${d.line}`}>
                    Row {d.line}: {d.reason}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {result.errors.length > 0 ? (
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wide text-navy-500">Row errors</h4>
              <ul className="mt-1 space-y-1 text-sm text-rose-800">
                {result.errors.map((e) => (
                  <li key={`err-${e.line}`}>
                    Row {e.line}: {e.message}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
