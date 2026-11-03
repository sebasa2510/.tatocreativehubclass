'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import { LEAD_STAGES, LEAD_STAGE_LABELS } from '@/lib/leads/pipeline';

/**
 * LeadFilters — filter/sort controls that live entirely in the URL query string.
 *
 * Because state is in the URL, any filtered view is shareable and survives a
 * reload or bookmark.
 */

const GRADES = ['ALL', 'A', 'B', 'C', 'D', 'F'] as const;
const SORTS = [
  { value: 'score', label: 'Score' },
  { value: 'createdAt', label: 'Date added' },
  { value: 'grade', label: 'Grade' },
  { value: 'businessName', label: 'Business name' },
] as const;

export default function LeadFilters({ sources, assignees }: { sources: string[]; assignees: string[] }) {
  const router = useRouter();
  const sp = useSearchParams();
  const [query, setQuery] = useState(sp.get('q') ?? '');

  function apply(changes: Record<string, string | null>) {
    const params = new URLSearchParams(sp.toString());
    for (const [key, value] of Object.entries(changes)) {
      if (!value || value === 'ALL') params.delete(key);
      else params.set(key, value);
    }
    params.delete('page');
    router.push(`/leads?${params.toString()}`);
  }

  return (
    <form
      className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4"
      onSubmit={(event) => {
        event.preventDefault();
        apply({ q: query });
      }}
      role="search"
    >
      <div className="flex flex-col">
        <label htmlFor="lead-search" className="mb-1 text-xs font-medium text-navy-600">
          Search
        </label>
        <input
          id="lead-search"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Business, contact, or email"
          className="w-56 rounded-lg border border-slate-300 px-3 py-2 text-sm text-navy-900 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-200"
        />
      </div>

      <div className="flex flex-col">
        <label htmlFor="lead-grade" className="mb-1 text-xs font-medium text-navy-600">
          Grade
        </label>
        <select
          id="lead-grade"
          defaultValue={sp.get('grade') ?? 'ALL'}
          onChange={(event) => apply({ grade: event.target.value })}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-navy-900 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-200"
        >
          {GRADES.map((g) => (
            <option key={g} value={g}>
              {g === 'ALL' ? 'All grades' : `Grade ${g}`}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col">
        <label htmlFor="lead-stage" className="mb-1 text-xs font-medium text-navy-600">
          Stage
        </label>
        <select
          id="lead-stage"
          defaultValue={sp.get('stage') ?? 'ALL'}
          onChange={(event) => apply({ stage: event.target.value })}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-navy-900 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-200"
        >
          <option value="ALL">All stages</option>
          {LEAD_STAGES.map((s) => (
            <option key={s} value={s}>
              {LEAD_STAGE_LABELS[s]}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col">
        <label htmlFor="lead-source" className="mb-1 text-xs font-medium text-navy-600">
          Source
        </label>
        <select
          id="lead-source"
          defaultValue={sp.get('source') ?? 'ALL'}
          onChange={(event) => apply({ source: event.target.value })}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-navy-900 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-200"
        >
          <option value="ALL">All sources</option>
          {sources.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col">
        <label htmlFor="lead-assignee" className="mb-1 text-xs font-medium text-navy-600">
          Assigned
        </label>
        <select
          id="lead-assignee"
          defaultValue={sp.get('assigned') ?? 'ALL'}
          onChange={(event) => apply({ assigned: event.target.value })}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-navy-900 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-200"
        >
          <option value="ALL">Anyone</option>
          {assignees.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col">
        <label htmlFor="lead-sort" className="mb-1 text-xs font-medium text-navy-600">
          Sort by
        </label>
        <div className="flex gap-2">
          <select
            id="lead-sort"
            defaultValue={sp.get('sort') ?? 'score'}
            onChange={(event) => apply({ sort: event.target.value })}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-navy-900 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-200"
          >
            {SORTS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
          <select
            aria-label="Sort direction"
            defaultValue={sp.get('direction') ?? 'desc'}
            onChange={(event) => apply({ direction: event.target.value })}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-navy-900 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-200"
          >
            <option value="desc">Descending</option>
            <option value="asc">Ascending</option>
          </select>
        </div>
      </div>

      <button
        type="submit"
        className="rounded-lg bg-navy-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-navy-800"
      >
        Search
      </button>
    </form>
  );
}
