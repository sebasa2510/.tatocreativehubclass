import 'server-only';

import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * unsubscribe.ts — signed one-click unsubscribe tokens.
 *
 * A token binds a lead id to an HMAC so the unsubscribe endpoint cannot be used
 * to suppress arbitrary contacts. The secret falls back to AUTH_SECRET.
 */

function secret(): string {
  return process.env.OUTREACH_UNSUBSCRIBE_SECRET || process.env.AUTH_SECRET || 'dev-unsubscribe-secret';
}

function hmac(value: string): string {
  return createHmac('sha256', secret()).update(value).digest('base64url');
}

export function signUnsubscribeToken(leadId: string): string {
  return `${Buffer.from(leadId).toString('base64url')}.${hmac(leadId)}`;
}

export function verifyUnsubscribeToken(token: string): string | null {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  let leadId: string;
  try {
    leadId = Buffer.from(parts[0], 'base64url').toString('utf8');
  } catch {
    return null;
  }
  const expected = hmac(leadId);
  const provided = Buffer.from(parts[1]);
  const expectedBuf = Buffer.from(expected);
  if (provided.length !== expectedBuf.length) return null;
  return timingSafeEqual(provided, expectedBuf) ? leadId : null;
}

export function unsubscribeUrl(baseUrl: string, leadId: string): string {
  return `${baseUrl.replace(/\/$/, '')}/api/unsubscribe?token=${encodeURIComponent(signUnsubscribeToken(leadId))}`;
}
