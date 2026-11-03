import { PREPARATION_LABELS, statusTone, type PreparationStatus } from "@/lib/status";

const TONES: Record<string, string> = {
  neutral: "bg-slate-100 text-navy-600 ring-slate-200",
  progress: "bg-teal-50 text-teal-700 ring-teal-200",
  attention: "bg-gold-50 text-gold-700 ring-gold-200",
  good: "bg-emerald-50 text-emerald-700 ring-emerald-200",
};

export default function StatusBadge({ status }: { status: PreparationStatus }) {
  const tone = statusTone(status);
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${TONES[tone]}`}
    >
      {PREPARATION_LABELS[status]}
    </span>
  );
}
