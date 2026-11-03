import 'server-only';

import { Resend } from 'resend';

import { integrationConfig, thresholds } from '@/lib/flags';

/**
 * dispatch.ts — outbound email adapter + safety rails.
 *
 * Delivery goes through Resend when RESEND_API_KEY and an outbound domain are
 * configured. Otherwise it falls back to a clearly-labelled console transport
 * (never a fake "sent" status). All sends are gated by the caller (consent,
 * suppression, human approval, and the daily cap enforced here).
 */

export interface SendRequest {
  to: string;
  subject: string;
  body: string;
  unsubscribeUrl: string;
  from?: string;
}

export interface SendResult {
  ok: boolean;
  mock: boolean;
  providerMessageId?: string;
  error?: string;
}

export function emailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY) && Boolean(integrationConfig.outboundEmailDomain);
}

function escapeHtml(input: string): string {
  return input.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function bodyToHtml(body: string): string {
  return `<div>${escapeHtml(body).replace(/\n/g, '<br />')}</div>`;
}

export async function sendEmail(request: SendRequest): Promise<SendResult> {
  if (!emailConfigured()) {
    console.info('[outreach:console]', JSON.stringify({ to: request.to, subject: request.subject }));
    return { ok: true, mock: true, providerMessageId: `console_${Date.now().toString(36)}` };
  }

  const resend = new Resend(process.env.RESEND_API_KEY as string);
  const from = request.from ?? `TatoIQ <hello@${integrationConfig.outboundEmailDomain}>`;

  try {
    const { data, error } = await resend.emails.send({
      from,
      to: request.to,
      subject: request.subject,
      html: bodyToHtml(request.body),
      text: request.body,
      headers: { 'List-Unsubscribe': `<${request.unsubscribeUrl}>` },
    });
    if (error) return { ok: false, mock: false, error: error.message };
    return { ok: true, mock: false, providerMessageId: data?.id };
  } catch (error) {
    return { ok: false, mock: false, error: error instanceof Error ? error.message : 'Unknown send error.' };
  }
}

// ───────────────────────── Rate limiting ─────────────────────────
// In-memory counters. A shared store (Redis) should replace this in production;
// the interface stays the same.

interface GlobalRate {
  __tatoiqOutreachRate?: { day: string; count: number; lastSentAt: number };
}
const globalRate = globalThis as typeof globalThis & GlobalRate;

const MIN_GAP_MS = 3 * 60 * 1000;
const MAX_GAP_MS = 7 * 60 * 1000;

export function todayKey(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

/** Daily cap respecting warm-up: day one is limited to the warm-up ceiling. */
export function dailyCap(dayNumber: number): number {
  if (dayNumber <= 1) return Math.min(thresholds.outreachWarmupDayOne, thresholds.outreachMaxDailyEmails);
  return thresholds.outreachMaxDailyEmails;
}

/** Random 3-7 minute spacing before the next allowed send. */
export function nextAllowedAt(lastSentAt: number, rand: () => number = Math.random): number {
  return lastSentAt + MIN_GAP_MS + rand() * (MAX_GAP_MS - MIN_GAP_MS);
}

export function checkRateLimit(now = new Date()): { allowed: boolean; reason?: string; retryAfterMs?: number } {
  const day = todayKey(now);
  const state = globalRate.__tatoiqOutreachRate ?? { day, count: 0, lastSentAt: 0 };
  if (state.day !== day) {
    state.day = day;
    state.count = 0;
  }
  const cap = dailyCap(1);
  if (state.count >= cap) return { allowed: false, reason: `Daily send cap reached (${cap}).` };
  if (state.lastSentAt > 0) {
    const allowed = nextAllowedAt(state.lastSentAt);
    if (now.getTime() < allowed) return { allowed: false, reason: 'Spacing window not elapsed.', retryAfterMs: allowed - now.getTime() };
  }
  return { allowed: true };
}

export function recordSend(now = new Date()): void {
  const state = globalRate.__tatoiqOutreachRate ?? { day: todayKey(now), count: 0, lastSentAt: 0 };
  if (state.day !== todayKey(now)) {
    state.day = todayKey(now);
    state.count = 0;
  }
  state.count += 1;
  state.lastSentAt = now.getTime();
  globalRate.__tatoiqOutreachRate = state;
}
