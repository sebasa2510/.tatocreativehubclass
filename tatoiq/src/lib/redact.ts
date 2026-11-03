/**
 * redact.ts — server-side PII redaction for Saggio.
 *
 * PURPOSE
 *   Nothing that leaves this process for an LLM provider may contain raw
 *   taxpayer identifiers. This module replaces sensitive values with stable
 *   CATEGORY TOKENS (e.g. <SSN_1>) before any model call.
 *
 * DESIGN NOTES
 *   - Tokens are numbered per-category so the model can still reason about
 *     "same person" / "different document" without seeing the real value.
 *   - This is deliberately conservative: false positives (redacting too much)
 *     are safe; false negatives (leaking an SSN) are not.
 *   - TAXPAYER EDUCATION ONLY. Do not send real data until the data-flow
 *     review in TatoIQ-AUDIT-AND-PLAN.md (R1) is approved.
 */

export interface RedactionResult {
  text: string;
  /** category -> number of distinct values replaced */
  counts: Record<string, number>;
}

// Ordered so that longer / more specific patterns run first (SSN before phone,
// full address before zip, etc.).
const PATTERNS: Array<{ category: string; re: RegExp }> = [
  // SSN: 123-45-6789, 123 45 6789, or bare 9 digits (conservative: dashed/spaced first)
  { category: 'SSN', re: /\b\d{3}[-\s]\d{2}[-\s]\d{4}\b/g },
  // EIN / TIN: 12-3456789
  { category: 'TIN', re: /\b\d{2}-\d{7}\b/g },
  // Bank routing (9 digits) and long account numbers
  { category: 'BANK', re: /\b\d{9,17}\b/g },
  // Email
  { category: 'EMAIL', re: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g },
  // Phone (US)
  { category: 'PHONE', re: /\b(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g },
  // Street address (number + street name + suffix)
  {
    category: 'ADDRESS',
    re: /\b\d{1,6}\s+[A-Za-z0-9.'-]+(?:\s+[A-Za-z0-9.'-]+){0,4}\s+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln|Drive|Dr|Court|Ct|Way|Place|Pl|Terrace|Ter)\.?\b/gi,
  },
  // ZIP
  { category: 'ZIP', re: /\b\d{5}(?:-\d{4})?\b/g },
];

/**
 * Redact a single string. Same input value always maps to the same token
 * within one call, so context is preserved without exposing the value.
 */
export function redactText(input: string): RedactionResult {
  let text = input;
  const counts: Record<string, number> = {};

  for (const { category, re } of PATTERNS) {
    const seen = new Map<string, string>();
    text = text.replace(re, (match) => {
      let token = seen.get(match);
      if (!token) {
        const n = (seen.size + 1).toString();
        token = `<${category}_${n}>`;
        seen.set(match, token);
      }
      return token;
    });
    if (seen.size > 0) counts[category] = seen.size;
  }

  return { text, counts };
}

/**
 * Redact a nested object/array structure (e.g. a request body or a document
 * field map) while preserving shape.
 */
export function redactDeep<T>(value: T): T {
  if (typeof value === 'string') return redactText(value).text as unknown as T;
  if (Array.isArray(value)) return value.map((v) => redactDeep(v)) as unknown as T;
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = redactDeep(v);
    }
    return out as unknown as T;
  }
  return value;
}
