import { LEAD_STAGE_LABELS, stageTone, type LeadStage } from '@/lib/leads/pipeline';

/**
 * StageBadge — a lead's pipeline stage.
 *
 * Accessibility: the stage name is always rendered as text; tone is redundant.
 */

const TONES: Record<string, string> = {
  neutral: 'bg-slate-100 text-navy-700 ring-slate-300',
  progress: 'bg-teal-50 text-teal-800 ring-teal-300',
  attention: 'bg-gold-50 text-gold-800 ring-gold-300',
  good: 'bg-emerald-50 text-emerald-800 ring-emerald-300',
  blocked: 'bg-rose-50 text-rose-800 ring-rose-300',
  done: 'bg-navy-100 text-navy-800 ring-navy-300',
};

export default function StageBadge({ stage }: { stage: LeadStage }) {
  const tone = stageTone(stage);
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${TONES[tone]}`}>
      {LEAD_STAGE_LABELS[stage]}
    </span>
  );
}
