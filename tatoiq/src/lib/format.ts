export function usd(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(n);
}

export function pct(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}

/**
 * True for a calendar date with no time component, e.g. "2026-04-15".
 * These are authored as plain dates and must never be shifted by a timezone.
 */
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Format an ISO date for display.
 *
 * Date-only strings ("2026-04-15") are read in LOCAL time. This matters: a
 * date-only string parsed by `new Date()` is interpreted as UTC midnight, so
 * rendering it in any western timezone shows the PREVIOUS day. That bug made
 * every IRS deadline in the portal display one day early. Reading the
 * components directly (via the "T00:00" local form) removes the shift.
 *
 * Full timestamps keep their instant and are rendered in the firm's timezone
 * (America/New_York), so a status event recorded late in the day doesn't jump
 * to the next calendar date for a viewer in a different zone.
 */
export function shortDate(iso: string): string {
  if (DATE_ONLY.test(iso)) {
    const d = new Date(`${iso}T00:00:00`);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "America/New_York",
  });
}

/** Day-of-month for a date-only string, with no timezone shift. */
export function dayOfMonth(iso: string): number {
  if (DATE_ONLY.test(iso)) return Number(iso.slice(8, 10));
  return new Date(iso).getDate();
}
