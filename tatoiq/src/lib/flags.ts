import 'server-only';

/**
 * flags.ts — environment-driven feature flags + configurable thresholds.
 *
 * Phase gating (spec): incomplete integration routes stay DARK behind these
 * flags. Everything is overridable via env so no code change is needed.
 */

function envFlag(name: string, fallback: boolean): boolean {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(raw.trim().toLowerCase());
}

function envInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export const featureFlags = {
  /** Phase 1 */
  leads: envFlag('FEATURE_LEADS', true),
  leadImport: envFlag('FEATURE_LEAD_IMPORT', true),
  /** Phase 2 */
  discovery: envFlag('FEATURE_DISCOVERY', false),
  aiDrafting: envFlag('FEATURE_AI_DRAFTING', false),
  outreachDispatch: envFlag('FEATURE_OUTREACH_DISPATCH', false),
  consultationBooking: envFlag('FEATURE_CONSULTATION_BOOKING', false),
  /** Phase 3 */
  calibration: envFlag('FEATURE_CALIBRATION', false),
} as const;

export const thresholds = {
  phase2UnlockValidatedLeads: envInt('PHASE2_UNLOCK_VALIDATED_LEADS', 50),
  calibrationMinConversions: envInt('CALIBRATION_MIN_CLOSED_CONVERSIONS', 50),
  outreachMaxDailyEmails: envInt('OUTREACH_MAX_DAILY_EMAILS', 100),
  outreachWarmupDayOne: envInt('OUTREACH_WARMUP_DAY_ONE', 20),
  reassignAfterHours: envInt('LEAD_REASSIGN_AFTER_HOURS', 24),
  slaWarnAfterHours: envInt('LEAD_SLA_WARN_AFTER_HOURS', 24),
  staleResearchingDays: envInt('LEAD_STALE_RESEARCHING_DAYS', 14),
} as const;

export const integrationConfig = {
  outboundEmailDomain: process.env.OUTBOUND_EMAIL_DOMAIN ?? '',
  bookingConfirmationPath: process.env.BOOKING_CONFIRMATION_PATH ?? '/booked',
  billingSystem: process.env.BILLING_SYSTEM ?? 'manual',
  dataProvider: process.env.LEAD_DATA_PROVIDER ?? '',
  alertChannel: process.env.LEAD_ALERT_CHANNEL ?? 'in_app',
} as const;

/** Discovery runs against mock payloads until a real provider is configured. */
export function isDiscoveryInMockMode(): boolean {
  return featureFlags.discovery && !integrationConfig.dataProvider;
}
