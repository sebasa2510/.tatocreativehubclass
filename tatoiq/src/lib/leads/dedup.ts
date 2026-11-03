/**
 * dedup.ts — exact-match deduplication on normalized email + phone.
 *
 * Policy (spec): duplicates are FLAGGED as pending review, never rejected and
 * never overwritten. We only report matches here; the importer decides to hold
 * them for a human.
 */

import { normalizeEmail, normalizePhone } from './normalize';

export interface DedupRecord {
  /** Stable identifier of an already-persisted lead, when known. */
  id?: string;
  email?: string | null;
  phone?: string | null;
  businessName?: string | null;
}

export type DuplicateField = 'email' | 'phone';
export type DuplicateScope = 'existing' | 'within_batch';

export interface DuplicateMatch {
  /** Index of the candidate row in the incoming batch. */
  index: number;
  scope: DuplicateScope;
  field: DuplicateField;
  normalizedValue: string;
  /** Id of the existing lead that matched (scope === 'existing'). */
  matchedLeadId?: string;
  /** Index of the earlier row in the same batch (scope === 'within_batch'). */
  matchedIndex?: number;
}

function indexRecords(records: DedupRecord[]) {
  const byEmail = new Map<string, number>();
  const byPhone = new Map<string, number>();
  records.forEach((r, i) => {
    const email = normalizeEmail(r.email);
    const phone = normalizePhone(r.phone);
    if (email && !byEmail.has(email)) byEmail.set(email, i);
    if (phone && !byPhone.has(phone)) byPhone.set(phone, i);
  });
  return { byEmail, byPhone };
}

/**
 * Detect duplicates of `incoming` rows against `existing` leads and against
 * each other. A row can produce more than one match (e.g. email AND phone).
 */
export function detectDuplicates(
  existing: DedupRecord[],
  incoming: DedupRecord[],
): DuplicateMatch[] {
  const existingIndex = indexRecords(existing);
  const matches: DuplicateMatch[] = [];

  const seenEmail = new Map<string, number>();
  const seenPhone = new Map<string, number>();

  incoming.forEach((row, index) => {
    const email = normalizeEmail(row.email);
    const phone = normalizePhone(row.phone);

    if (email) {
      const hit = existingIndex.byEmail.get(email);
      if (hit !== undefined) {
        matches.push({
          index,
          scope: 'existing',
          field: 'email',
          normalizedValue: email,
          matchedLeadId: existing[hit].id,
        });
      } else if (seenEmail.has(email)) {
        matches.push({
          index,
          scope: 'within_batch',
          field: 'email',
          normalizedValue: email,
          matchedIndex: seenEmail.get(email),
        });
      } else {
        seenEmail.set(email, index);
      }
    }

    if (phone) {
      const hit = existingIndex.byPhone.get(phone);
      if (hit !== undefined) {
        matches.push({
          index,
          scope: 'existing',
          field: 'phone',
          normalizedValue: phone,
          matchedLeadId: existing[hit].id,
        });
      } else if (seenPhone.has(phone)) {
        matches.push({
          index,
          scope: 'within_batch',
          field: 'phone',
          normalizedValue: phone,
          matchedIndex: seenPhone.get(phone),
        });
      } else {
        seenPhone.set(phone, index);
      }
    }
  });

  return matches;
}

/** Convenience: indices of incoming rows that have at least one duplicate. */
export function duplicateRowIndices(matches: DuplicateMatch[]): number[] {
  return [...new Set(matches.map((m) => m.index))].sort((a, b) => a - b);
}
