/**
 * sensitive.ts — CLASSIFY and MASK taxpayer identifiers for on-screen display.
 *
 * WHY THIS IS A SEPARATE MODULE
 * The masking rule is a privacy behaviour, not a rendering detail, so it is kept
 * pure and testable rather than buried in a component (the same split as
 * `src/lib/redact.ts`, which governs what leaves the process; this module
 * governs what reaches the screen).
 *
 * TWO DISTINCT CONCERNS — do not confuse them:
 *   - `redact.ts`  protects DATA IN TRANSIT to a model provider.
 *   - this module  protects DATA ON SCREEN from shoulder-surfing and screenshots.
 * A value can be safely redacted upstream and still be displayed in full here,
 * so both layers are required and neither substitutes for the other.
 *
 * WHAT MASKING IS NOT
 * Masking is a display control only. It is NOT encryption and NOT authorization.
 * Real identifiers must be encrypted at rest and released only to a role
 * permitted to see them (spec: sensitive identifiers encrypted, access limited by
 * role). This module never decides who may see a value; it decides what appears
 * until someone deliberately asks to see it.
 */

/**
 * Labels whose value is a taxpayer identifier.
 *
 * Matched against the human-readable field label so a document type we have not
 * seen before — "Employee SSN", "Sole-proprietor EIN" — is masked without a code
 * change. Deliberately broad: masking a benign field is a minor annoyance, while
 * showing an identifier is a disclosure.
 */
const SENSITIVE_LABEL_RE =
  /\b(ssn|tin|ein|itin|ptin|social security|taxpayer i\.?d|employer i\.?d|account number|routing number)\b/i;

/** True when a field label names a taxpayer identifier that must be masked. */
export function isSensitiveFieldLabel(label: string): boolean {
  return SENSITIVE_LABEL_RE.test(label);
}

/**
 * Mask all but the final four characters of an identifier.
 *
 * The last four are retained on purpose: they are what a preparer uses to
 * distinguish two records, and partial disclosure of SSN/TIN/EIN tail digits is
 * the conventional practice on correspondence. Values of four characters or
 * fewer are masked entirely rather than partly shown, because a short value
 * leaves little to hide.
 *
 * The mask preserves the value's original length, so the layout does not shift
 * when a value is revealed.
 */
export function maskIdentifier(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length <= 4) return "\u2022".repeat(Math.max(trimmed.length, 4));
  return "\u2022".repeat(trimmed.length - 4) + trimmed.slice(-4);
}
