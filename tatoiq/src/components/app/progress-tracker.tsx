import type { PreparationStatus } from "@/lib/status";
import { MILESTONES, PREPARATION_STATUSES, preparationProgress } from "@/lib/status";

export default function ProgressTracker({ status }: { status: PreparationStatus }) {
  const current = PREPARATION_STATUSES.indexOf(status);
  const pct = preparationProgress(status);

  const reached = MILESTONES.map((m) => current >= PREPARATION_STATUSES.indexOf(m.at));
  const currentIndex = reached.lastIndexOf(true);

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-base font-semibold text-navy-900">Preparation progress</h2>
        <span className="font-display text-sm font-semibold text-navy-900">{pct}%</span>
      </div>

      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-gradient-to-r from-teal-500 to-navy-800"
          style={{ width: `${Math.max(pct, 4)}%` }}
        />
      </div>

      <ol className="mt-6 grid grid-cols-3 gap-y-5 sm:grid-cols-6">
        {MILESTONES.map((m, i) => {
          const done = reached[i];
          const isCurrent = i === currentIndex;
          return (
            <li key={m.label} className="flex flex-col items-center text-center">
              <span
                className={`grid h-8 w-8 place-items-center rounded-full ring-1 ring-inset ${
                  done
                    ? "bg-navy-900 text-gold-300 ring-navy-900"
                    : "bg-white text-navy-300 ring-slate-200"
                } ${isCurrent ? "ring-2 ring-teal-500" : ""}`}
              >
                {done ? (
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                    <path d="m5 13 4 4L19 7" />
                  </svg>
                ) : (
                  <span className="text-xs font-semibold">{i + 1}</span>
                )}
              </span>
              <span
                className={`mt-2 text-[11px] font-medium ${
                  isCurrent ? "text-teal-700" : done ? "text-navy-800" : "text-navy-400"
                }`}
              >
                {m.label}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
