import Link from 'next/link';
import { notFound } from 'next/navigation';

import GradeBadge from '@/components/leads/GradeBadge';
import LeadNoteForm from '@/components/leads/LeadNoteForm';
import SampleBadge from '@/components/leads/SampleBadge';
import StageBadge from '@/components/leads/StageBadge';
import { getSession, roleCanAccessLeads } from '@/lib/auth/session';
import { getLead } from '@/lib/leads/repository';

export const dynamic = 'force-dynamic';

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || !roleCanAccessLeads(session.role)) {
    return (
      <div className="mx-auto max-w-3xl rounded-xl border border-rose-200 bg-rose-50 p-6">
        <h2 className="text-lg font-semibold text-rose-900">Access denied</h2>
        <p className="mt-1 text-sm text-rose-800">Your role does not permit access to lead management.</p>
      </div>
    );
  }

  const { id } = await params;
  const lead = await getLead(session.organizationId, id);
  if (!lead) notFound();

  const outreachBlocked = lead.doNotContact || lead.consentStatus === 'WITHDRAWN';

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <Link href="/leads" className="text-sm font-medium text-teal-700 underline-offset-2 hover:underline">
          ← Back to leads
        </Link>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-display text-2xl font-semibold tracking-tight text-navy-900">
              {lead.businessName ?? 'Unnamed lead'}
            </h2>
            {lead.isSample ? <SampleBadge /> : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <GradeBadge grade={lead.grade} score={lead.score} />
            <StageBadge stage={lead.stage} />
            {lead.doNotContact ? (
              <span className="inline-flex items-center rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-semibold text-rose-900 ring-1 ring-inset ring-rose-300">
                Do not contact
              </span>
            ) : null}
          </div>
        </div>
        <div className="text-right text-sm text-navy-600">
          <p>Source: {lead.sourceTag ?? '—'}</p>
          <p>Added {new Date(lead.createdAt).toLocaleDateString()}</p>
          <p>Owner: {lead.assignedTo ?? 'Unassigned'}</p>
        </div>
      </div>

      {outreachBlocked ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
          Outreach is blocked for this lead (do-not-contact or consent withdrawn). Grade does not override this.
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="space-y-4 lg:col-span-2">
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h3 className="text-sm font-semibold text-navy-900">Contact &amp; business</h3>
            <dl className="mt-3 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
              {[
                ['Contact', lead.contactName],
                ['Email', lead.email],
                ['Phone', lead.phone],
                ['Website', lead.website],
                ['Industry', lead.industry],
                ['Entity', lead.entityType],
                ['City / State', [lead.city, lead.state].filter(Boolean).join(', ')],
                ['Address', lead.addressLine1],
              ].map(([label, value]) => (
                <div key={label as string}>
                  <dt className="text-xs font-medium text-navy-500">{label}</dt>
                  <dd className="text-navy-800">{value || '—'}</dd>
                </div>
              ))}
            </dl>
            <div className="mt-4 flex flex-wrap gap-2">
              {(
                [
                  ['Email verified', lead.verified.email],
                  ['Phone verified', lead.verified.phone],
                  ['Business verified', lead.verified.business],
                  ['Address verified', lead.verified.address],
                ] as Array<[string, boolean]>
              ).map(([label, ok]) => (
                <span
                  key={label}
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${
                    ok ? 'bg-emerald-50 text-emerald-800 ring-emerald-300' : 'bg-slate-100 text-slate-600 ring-slate-300'
                  }`}
                >
                  {ok ? '✓' : '○'} {label}
                </span>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h3 className="text-sm font-semibold text-navy-900">Score breakdown</h3>
            <ul className="mt-3 space-y-3">
              {lead.scoreBreakdown.map((criterion) => (
                <li key={criterion.criterion}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-navy-800">{criterion.label}</span>
                    <span className="tabular-nums text-navy-600">
                      {criterion.points}/{criterion.max}
                    </span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-2 rounded-full bg-teal-500" style={{ width: `${Math.round((criterion.points / Math.max(1, criterion.max)) * 100)}%` }} />
                  </div>
                  {criterion.reasons.length > 0 ? (
                    <ul className="mt-1 list-disc pl-5 text-xs text-navy-600">
                      {criterion.reasons.map((r) => (
                        <li key={r}>{r}</li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              ))}
              {lead.scoreBreakdown.length === 0 ? <li className="text-sm text-navy-500">No score recorded yet.</li> : null}
            </ul>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h3 className="text-sm font-semibold text-navy-900">Evidence</h3>
            {lead.evidence.length === 0 ? (
              <p className="mt-2 text-sm text-navy-500">No evidence captured.</p>
            ) : (
              <ul className="mt-3 space-y-1 text-sm text-navy-700">
                {lead.evidence.map((e, i) => (
                  <li key={`${e.field}-${i}`}>
                    <span className="font-medium">{e.field}</span>: {e.value} <span className="text-navy-400">(source: {e.source})</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h3 className="text-sm font-semibold text-navy-900">Activity history</h3>
            <ol className="mt-3 space-y-3">
              {lead.activities.map((a) => (
                <li key={a.id} className="border-l-2 border-slate-200 pl-3">
                  <p className="text-xs text-navy-400">
                    {new Date(a.createdAt).toLocaleString()} · {a.kind}
                  </p>
                  <p className="text-sm text-navy-800">{a.body}</p>
                </li>
              ))}
              {lead.activities.length === 0 ? <li className="text-sm text-navy-500">No activity yet.</li> : null}
            </ol>
            <div className="mt-4 border-t border-slate-100 pt-4">
              <LeadNoteForm leadId={lead.id} />
            </div>
          </div>
        </section>

        <aside className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h3 className="text-sm font-semibold text-navy-900">Consent &amp; eligibility</h3>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between gap-2">
                <dt className="text-navy-500">Consent</dt>
                <dd className="font-medium text-navy-800">{lead.consentStatus}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-navy-500">Do not contact</dt>
                <dd className="font-medium text-navy-800">{lead.doNotContact ? 'Yes' : 'No'}</dd>
              </div>
            </dl>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h3 className="text-sm font-semibold text-navy-900">Recommended next step</h3>
            <p className="mt-2 text-sm text-navy-700">{lead.nextAction ?? 'Await human review.'}</p>
          </div>

          {lead.missingInfo.length > 0 ? (
            <div className="rounded-xl border border-gold-200 bg-gold-50 p-5">
              <h3 className="text-sm font-semibold text-gold-900">Missing information</h3>
              <ul className="mt-2 list-disc pl-5 text-sm text-gold-900">
                {lead.missingInfo.map((m) => (
                  <li key={m}>{m}</li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h3 className="text-sm font-semibold text-navy-900">Consultations</h3>
            {lead.consultations.length === 0 ? (
              <p className="mt-2 text-sm text-navy-500">None scheduled.</p>
            ) : (
              <ul className="mt-2 space-y-2 text-sm text-navy-700">
                {lead.consultations.map((c) => (
                  <li key={c.id}>
                    <p className="font-medium">{c.status}</p>
                    <p className="text-xs text-navy-500">
                      {c.scheduledAt ? new Date(c.scheduledAt).toLocaleString() : 'No time set'}
                    </p>
                    {c.eventLink ? (
                      <a href={c.eventLink} className="text-xs text-teal-700 underline-offset-2 hover:underline">
                        Event link
                      </a>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {lead.conversions.length > 0 ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5">
              <h3 className="text-sm font-semibold text-emerald-900">Conversions</h3>
              <ul className="mt-2 space-y-1 text-sm text-emerald-900">
                {lead.conversions.map((c) => (
                  <li key={c.id}>
                    {c.kind}
                    {typeof c.revenueCents === 'number' ? ` · $${(c.revenueCents / 100).toLocaleString()}` : ''}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
