/**
 * guardrails.ts — pre-save checks for any outreach draft.
 *
 * Blocks promises of refunds, savings, or guaranteed outcomes, and blocks the
 * tax-compliance phrases the spec calls out. These run BEFORE a draft is saved,
 * and again before a send is prepared.
 */

export interface GuardrailFlag {
  code: string;
  message: string;
  severity: 'block' | 'warn';
}

export const BUSINESS_FILING_DISCLAIMER =
  'TatoIQ provides administrative matching and accounting technology; consultations are provided by licensed independent professionals.';

interface Pattern {
  code: string;
  re: RegExp;
  message: string;
  severity: 'block' | 'warn';
}

const PROMISE_PATTERNS: Pattern[] = [
  {
    code: 'GUARANTEE',
    re: /\bguarantee(d|s)?\b/i,
    message: 'Promises a guaranteed outcome.',
    severity: 'block',
  },
  {
    code: 'REFUND_PROMISE',
    re: /\b(guaranteed?\s+refund|refund\s+guarantee|maximi[sz]e\s+your\s+refund|biggest\s+refund|largest\s+refund)\b/i,
    message: 'Promises or implies a refund outcome.',
    severity: 'block',
  },
  {
    code: 'SAVINGS_PROMISE',
    re: /\b(save|savings)\s+(you\s+)?(up\s+to|thousands|hundreds|\$?\d)/i,
    message: 'Promises a dollar savings figure.',
    severity: 'block',
  },
  {
    code: 'OUTCOME_PROMISE',
    re: /\b(guaranteed?\s+(savings?|results?|outcomes?|approval)|risk[-\s]?free|no\s+risk)\b/i,
    message: 'Promises a guaranteed result.',
    severity: 'block',
  },
];

const COMPLIANCE_PATTERNS: Pattern[] = [
  {
    code: 'TAX_DEBT_RELIEF',
    re: /\btax\s+debt\s+relief\b/i,
    message: 'Uses the prohibited phrase "tax debt relief".',
    severity: 'block',
  },
  {
    code: 'AUDIT_DEFENSE',
    re: /\baudit\s+defense\b/i,
    message: 'Uses the prohibited phrase "audit defense".',
    severity: 'block',
  },
  {
    code: 'GUARANTEED_DEDUCTION',
    re: /\bguaranteed\s+deduction\b/i,
    message: 'Uses the prohibited phrase "guaranteed deduction".',
    severity: 'block',
  },
];

const BUSINESS_FILING_RE =
  /\b(business\s+tax|corporate\s+return|partnership\s+return|1120|1120s|1065|schedule\s+c|s[-\s]?corp|sole\s+proprietor|self[-\s]?employment)\b/i;
const IRS_NOTICE_RE =
  /\b(irs\s+notice|notice\s+from\s+the\s+irs|irs\s+audit|being\s+audited|audit\s+notice|cp2000|cp504|letter\s+from\s+the\s+irs)\b/i;

export interface GuardrailResult {
  ok: boolean;
  flags: GuardrailFlag[];
  requiresDisclaimer: boolean;
}

function collect(text: string, patterns: Pattern[]): GuardrailFlag[] {
  return patterns
    .filter((p) => p.re.test(text))
    .map((p) => ({ code: p.code, message: p.message, severity: p.severity }));
}

/** Run all guardrails over a draft body (and subject, if present). */
export function checkDraft(text: string): GuardrailResult {
  const haystack = text ?? '';
  const flags = [...collect(haystack, PROMISE_PATTERNS), ...collect(haystack, COMPLIANCE_PATTERNS)];
  return {
    ok: !flags.some((f) => f.severity === 'block'),
    flags,
    requiresDisclaimer: BUSINESS_FILING_RE.test(haystack),
  };
}

/** True when a lead's message references an active IRS notice/audit. */
export function mentionsIrsNoticeOrAudit(text: string): boolean {
  return IRS_NOTICE_RE.test(text ?? '');
}

/** Append the mandated disclaimer when a recommendation touches business filings. */
export function withDisclaimer(text: string): string {
  if (!BUSINESS_FILING_RE.test(text)) return text;
  if (text.includes(BUSINESS_FILING_DISCLAIMER)) return text;
  return `${text.trim()}\n\n${BUSINESS_FILING_DISCLAIMER}`;
}
