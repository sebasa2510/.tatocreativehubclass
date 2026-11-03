export interface Metric {
  label: string;
  value: string | number;
  hint?: string;
}

/** MetricCards — a simple, labelled stat grid. */
export default function MetricCards({ metrics }: { metrics: Metric[] }) {
  return (
    <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {metrics.map((m) => (
        <div key={m.label} className="rounded-xl border border-slate-200 bg-white p-3">
          <dt className="text-xs font-medium text-navy-500">{m.label}</dt>
          <dd className="mt-1 text-xl font-semibold tabular-nums text-navy-900">{m.value}</dd>
          {m.hint ? <p className="mt-0.5 text-xs text-navy-400">{m.hint}</p> : null}
        </div>
      ))}
    </dl>
  );
}
