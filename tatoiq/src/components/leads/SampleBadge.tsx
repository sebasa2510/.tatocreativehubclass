/**
 * SampleBadge — persistent "Sample Data" marker on synthetic lead profiles.
 *
 * Muted grey so it never competes with real status, but always legible.
 */
export default function SampleBadge() {
  return (
    <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600 ring-1 ring-inset ring-slate-300">
      Sample Data
    </span>
  );
}
