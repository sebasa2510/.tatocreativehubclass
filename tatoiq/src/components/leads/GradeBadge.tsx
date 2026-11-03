import type { LeadGrade } from '@/lib/scoring/evaluator';

/**
 * GradeBadge — a lead's letter grade.
 *
 * Accessibility: the grade is ALWAYS shown as text ("Grade A"), never by colour
 * alone. Colour is redundant reinforcement only.
 */

const TONES: Record<LeadGrade, string> = {
  A: 'bg-emerald-100 text-emerald-900 ring-emerald-300',
  B: 'bg-teal-100 text-teal-900 ring-teal-300',
  C: 'bg-gold-100 text-gold-900 ring-gold-300',
  D: 'bg-amber-100 text-amber-900 ring-amber-300',
  F: 'bg-rose-100 text-rose-900 ring-rose-300',
};

const DESCRIPTIONS: Record<LeadGrade, string> = {
  A: 'Grade A — excellent fit, prioritize',
  B: 'Grade B — strong fit',
  C: 'Grade C — moderate fit, nurture',
  D: 'Grade D — weak fit, needs research',
  F: 'Grade F — poor fit',
};

export default function GradeBadge({ grade, score }: { grade: LeadGrade | null; score?: number | null }) {
  if (!grade) {
    return (
      <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700 ring-1 ring-inset ring-slate-300">
        Ungraded
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${TONES[grade]}`}
      title={DESCRIPTIONS[grade]}
    >
      <span className="font-semibold">Grade {grade}</span>
      {typeof score === 'number' ? <span className="font-normal tabular-nums">{score}/100</span> : null}
    </span>
  );
}
