/**
 * normalize.ts — canonical contact normalization for dedup + suppression.
 *
 * Emails are trimmed and lowercased. Phones are reduced to E.164. These exact
 * normalized values are what the LeadConsent unique indexes key on, so the SAME
 * normalization MUST be used by import, dedup, export, and suppression checks.
 */

const US_COUNTRY_CODE = '1';

/** Lowercase + trim an email; return null when it is not a usable address. */
export function normalizeEmail(email: string | null | undefined): string | null {
  if (typeof email !== 'string') return null;
  const trimmed = email.trim().toLowerCase();
  if (!trimmed || /\s/.test(trimmed)) return null;

  const parts = trimmed.split('@');
  if (parts.length !== 2) return null;
  const [local, domain] = parts;
  if (!local || !domain || !domain.includes('.')) return null;
  return trimmed;
}

/**
 * Reduce a phone number to E.164. 10-digit US numbers get the default country
 * code (+1); numbers that already carry a "+" keep their digits verbatim.
 * Returns null when the input cannot be interpreted as a phone number.
 */
export function normalizePhone(
  phone: string | null | undefined,
  opts: { defaultCountryCode?: string } = {},
): string | null {
  if (typeof phone !== 'string') return null;
  const raw = phone.trim();
  if (!raw) return null;

  const hadPlus = raw.startsWith('+');
  const digits = raw.replace(/\D/g, '');
  if (!digits) return null;

  const cc = opts.defaultCountryCode ?? US_COUNTRY_CODE;

  if (hadPlus) {
    if (digits.length < 8 || digits.length > 15) return null;
    return `+${digits}`;
  }
  if (digits.length === 10) return `+${cc}${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  if (digits.length >= 11 && digits.length <= 15) return `+${digits}`;
  return null;
}

export interface NormalizedContact {
  email: string | null;
  phone: string | null;
}

/** Normalize both contact channels at once. */
export function normalizeContact(input: {
  email?: string | null;
  phone?: string | null;
}): NormalizedContact {
  return {
    email: normalizeEmail(input.email),
    phone: normalizePhone(input.phone),
  };
}
