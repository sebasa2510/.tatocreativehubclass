import Link from 'next/link';

import { thresholds } from '@/lib/flags';
import type { LeadListItem } from '@/lib/leads/types';

import GradeBadge from './GradeBadge';
import SampleBadge from './SampleBadge';
import StageBadge from './StageBadge';

const STALE_RESEARCHING_DAYS = thresholds.staleResearchingDays;

/** Amber alert when a row has sat in Researching past the configured SLA. */
function isStuckInResearching(lead: LeadListItem): boolean {
  if (lead.stage !== 'RESEARCHING') return false;
  const lastTouch = new Date(lead.lastActivityAt ?? lead.createdAt).getTime();
  return (Date.now() - lastTouch) / 86_400_000 >= STALE_RESEARCHING_DAYS;
}

/** LeadTable — accessible list of leads. An empty state is rendered when there
 * are no matches so the page never looks broken. */
export default function LeadTable({ leads }: { leads: LeadListItem[] }) {
  if (leads.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">
        <p className="text-sm font-medium text-navy-800">No leads match these filters.</p>
        <p className="mt-1 text-sm text-navy-500">
          Try clearing the search, or import a CSV to add leads.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table className="min-w-full text-sm">
        <caption className="sr-only">Lead pipeline with grade, stage, source, and owner</caption>
        <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-navy-500">
          <tr>
            <th scope="col" className="px-4 py-3">Grade</th>
            <th scope="col" className="px-4 py-3">Business</th>
            <th scope="col" className="px-4 py-3">Contact</th>
            <th scope="col" className="px-4 py-3">Stage</th>
            <th scope="col" className="px-4 py-3">Source</th>
            <th scope="col" className="px-4 py-3">Assigned</th>
            <th scope="col" className="px-4 py-3">Next action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {leads.map((lead) => (
            <tr key={lead.id} className="hover:bg-slate-50">
              <td className="px-4 py-3 align-top">
                <div className="flex flex-col items-start gap-1">
                  <GradeBadge grade={lead.grade} score={lead.score} />
                  {lead.isSample ? <SampleBadge /> : null}
                </div>
              </td>
              <td className="px-4 py-3 align-top">
                <Link href={`/leads/${lead.id}`} className="font-medium text-navy-900 underline-offset-2 hover:underline">
                  {lead.businessName ?? 'Unnamed lead'}
                </Link>
                <p className="text-xs text-navy-500">
                  {[lead.industry, lead.state].filter(Boolean).join(' · ') || '—'}
                </p>
              </td>
              <td className="px-4 py-3 align-top text-navy-700">
                <p>{lead.contactName ?? '—'}</p>
                <p className="text-xs text-navy-500">{lead.email ?? lead.phone ?? 'No contact on file'}</p>
              </td>
              <td className="px-4 py-3 align-top">
                <div className="flex flex-col items-start gap-1">
                  <StageBadge stage={lead.stage} />
                  {lead.doNotContact ? (
                    <span className="text-xs font-medium text-rose-700">Do not contact</span>
                  ) : null}
                  {isStuckInResearching(lead) ? (
                    <span
                      className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-900 ring-1 ring-inset ring-amber-300"
                      title={`Stuck in Researching for more than ${STALE_RESEARCHING_DAYS} days`}
                    >
                      ⚠ Stuck in Researching
                    </span>
                  ) : null}
                </div>
              </td>
              <td className="px-4 py-3 align-top text-navy-700">{lead.sourceTag ?? '—'}</td>
              <td className="px-4 py-3 align-top text-navy-700">{lead.assignedTo ?? 'Unassigned'}</td>
              <td className="px-4 py-3 align-top text-navy-600">{lead.nextAction ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
