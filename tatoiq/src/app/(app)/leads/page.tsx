import Link from 'next/link';

import LeadFilters from '@/components/leads/LeadFilters';
import LeadTable from '@/components/leads/LeadTable';
import MetricCards from '@/components/leads/MetricCards';
import MiniBarChart from '@/components/leads/MiniBarChart';
import { getSession, roleCanAccessLeads } from '@/lib/auth/session';
import { featureFlags } from '@/lib/flags';
import { LEAD_STAGES, LEAD_STAGE_LABELS } from '@/lib/leads/pipeline';
import { getMetrics, listLeads } from '@/lib/leads/repository';
import type { LeadGrade } from '@/lib/scoring/evaluator';

export const dynamic = 'force-dynamic';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function one(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function LeadsPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await getSession();
  if (!session || !roleCanAccessLeads(session.role)) {
    return (
      <div className="mx-auto max-w-3xl">
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-6">
          <h2 className="text-lg font-semibold text-rose-900">Access denied</h2>
          <p className="mt-1 text-sm text-rose-800">
            Your role ({session?.role ?? 'none'}) does not permit access to lead management.
          </p>
        </div>
      </div>
    );
  }

  const sp = await searchParams;
  const organizationId = session.organizationId;

  if (!featureFlags.leads) {
    return (
      <div className="mx-auto max-w-3xl">
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-navy-900">Lead management is disabled</h2>
          <p className="mt-1 text-sm text-navy-600">
            Set <code className="rounded bg-slate-100 px-1">FEATURE_LEADS=true</code> to enable this area.
          </p>
        </div>
      </div>
    );
  }

  const grade = one(sp.grade) as LeadGrade | 'ALL' | undefined;
  const stage = one(sp.stage) as (typeof LEAD_STAGES)[number] | 'ALL' | undefined;
  const page = Number.parseInt(one(sp.page) ?? '1', 10) || 1;

  const [list, metrics] = await Promise.all([
    listLeads(organizationId, {
      q: one(sp.q),
      grade: grade ?? 'ALL',
      stage: stage ?? 'ALL',
      source: one(sp.source) ?? 'ALL',
      assigned: one(sp.assigned) ?? 'ALL',
      sort: (one(sp.sort) as 'score' | 'createdAt' | 'grade' | 'businessName' | undefined) ?? 'score',
      direction: (one(sp.direction) as 'asc' | 'desc' | undefined) ?? 'desc',
      page,
      pageSize: 25,
    }),
    getMetrics(organizationId),
  ]);

  const sources = metrics.bySource.map((s) => s.source);
  const assignees = [...new Set(list.items.map((l) => l.assignedTo).filter((a): a is string => Boolean(a)))];

  const gradeData = (['A', 'B', 'C', 'D', 'F'] as LeadGrade[]).map((g) => ({
    label: `Grade ${g}`,
    value: metrics.gradeDistribution[g] ?? 0,
  }));

  const funnelData = LEAD_STAGES.map((s) => ({
    label: LEAD_STAGE_LABELS[s],
    value: metrics.funnel.find((f) => f.stage === s)?.count ?? 0,
  })).filter((d) => d.value > 0);

  const totalPages = Math.max(1, Math.ceil(list.total / list.pageSize));
  const pageHref = (target: number) => {
    const params = new URLSearchParams();
    Object.entries(sp).forEach(([k, v]) => {
      const value = one(v);
      if (value && k !== 'page') params.set(k, value);
    });
    params.set('page', String(target));
    return `/leads?${params.toString()}`;
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-navy-500">Discover → Verify → Qualify → Score → Contact → Convert</p>
          <h2 className="mt-1 font-display text-2xl font-semibold tracking-tight text-navy-900 sm:text-3xl">
            Lead management
          </h2>
          <p className="mt-1 text-sm text-navy-500">
            {list.total} lead{list.total === 1 ? '' : 's'} · signed in as {session.name} ({session.role})
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link href="/leads/new" className="rounded-lg bg-navy-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-navy-800">
            Add lead
          </Link>
          <Link href="/leads/import" className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-navy-800 transition hover:bg-slate-50">
            Import CSV
          </Link>
          {/* A plain anchor is correct for a file download; this is not page navigation. */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a href="/api/leads/export" className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-navy-800 transition hover:bg-slate-50">
            Export CSV
          </a>
        </div>
      </div>

      {list.mode === 'mock' ? (
        <p className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-xs text-navy-600">
          Running without a database — showing synthetic sample data. Connect <code className="rounded bg-white px-1">DATABASE_URL</code> to work with live records.
        </p>
      ) : null}

      <MetricCards
        metrics={[
          { label: 'Total leads', value: metrics.total },
          { label: 'Grade A', value: metrics.gradeACount, hint: 'Prioritize' },
          { label: 'Grade B', value: metrics.gradeBCount },
          { label: 'In verification', value: metrics.verificationQueue },
          { label: 'Consultations', value: metrics.consultationsBooked },
          { label: 'Conversion rate', value: `${metrics.conversionRate}%`, hint: `${metrics.conversions} converted` },
        ]}
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <MiniBarChart title="Grade distribution" data={gradeData} />
        <MiniBarChart title="Leads by source" data={metrics.bySource.map((s) => ({ label: s.source, value: s.count }))} />
        <MiniBarChart title="Pipeline funnel" data={funnelData} />
      </div>

      <LeadFilters sources={sources} assignees={assignees} />

      <LeadTable leads={list.items} />

      {totalPages > 1 ? (
        <nav className="flex items-center justify-between text-sm" aria-label="Pagination">
          <span className="text-navy-500">
            Page {list.page} of {totalPages}
          </span>
          <div className="flex gap-2">
            {list.page > 1 ? (
              <Link href={pageHref(list.page - 1)} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-medium text-navy-800 hover:bg-slate-50">
                Previous
              </Link>
            ) : null}
            {list.page < totalPages ? (
              <Link href={pageHref(list.page + 1)} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-medium text-navy-800 hover:bg-slate-50">
                Next
              </Link>
            ) : null}
          </div>
        </nav>
      ) : null}

      <p className="text-xs text-navy-400">
        Grades are evidence-backed. Consent, suppression, and eligibility always override grade — do-not-contact leads are never contacted.
      </p>
    </div>
  );
}
