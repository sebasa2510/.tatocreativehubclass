/**
 * MiniBarChart — dependency-free horizontal bar chart.
 *
 * Values are printed next to each bar so the data is available without relying
 * on colour or vision. Includes an accessible description for screen readers.
 */

export interface BarDatum {
  label: string;
  value: number;
}

export default function MiniBarChart({
  title,
  data,
  emptyLabel = 'No data yet',
}: {
  title: string;
  data: BarDatum[];
  emptyLabel?: string;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const total = data.reduce((sum, d) => sum + d.value, 0);

  return (
    <figure className="rounded-xl border border-slate-200 bg-white p-4">
      <figcaption className="mb-3 text-sm font-semibold text-navy-900">{title}</figcaption>
      {total === 0 ? (
        <p className="text-sm text-navy-400">{emptyLabel}</p>
      ) : (
        <ul className="space-y-2">
          {data.map((d) => (
            <li key={d.label} className="grid grid-cols-[7rem_1fr_2.5rem] items-center gap-2 text-sm">
              <span className="truncate text-navy-700" title={d.label}>
                {d.label}
              </span>
              <span className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                <span
                  className="block h-2.5 rounded-full bg-teal-500"
                  style={{ width: `${Math.round((d.value / max) * 100)}%` }}
                />
              </span>
              <span className="text-right tabular-nums text-navy-700">{d.value}</span>
            </li>
          ))}
        </ul>
      )}
    </figure>
  );
}
