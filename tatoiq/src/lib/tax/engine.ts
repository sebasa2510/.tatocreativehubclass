/**
 * engine.ts — deterministic Form 1040 + Schedule C + Schedule SE estimator.
 *
 * GUARDRAILS (from the TatoIQ spec):
 *   - NEVER invent taxpayer facts. Every number here comes from the input.
 *   - NEVER promise a refund or outcome. Output is an ESTIMATE and is labelled so.
 *   - Keep assumptions/unresolved questions visible (returned in `flags`).
 *   - Fully separate from the AI. Saggio never computes; it only explains this.
 *   - Reproducible: the output records taxYear, ruleSource and engineVersion.
 *
 * All monetary math is done in CENTS (integers) and converted back, to avoid
 * floating-point drift. Rounding is half-up to the cent.
 */

import { FilingStatus, getRules, type YearRules } from './tables';

export interface ScheduleCLine {
  /** Plain-language label shown to the taxpayer. */
  label: string;
  amount: number;
}

export interface TaxInput {
  taxYear: number;
  filingStatus: FilingStatus;
  /** Form W-2 box 1 wages. */
  w2Wages?: number;
  /** Schedule C gross receipts. */
  businessGrossReceipts?: number;
  /** Schedule C expenses (already confirmed by the taxpayer). */
  businessExpenses?: ScheduleCLine[];
  /** Other ordinary income (interest, etc.) — MVP: informational only. */
  otherIncome?: number;
  /** Age 65+ (affects standard deduction). */
  over65?: boolean;
  /** Legally blind (affects standard deduction). */
  blind?: boolean;
}

export interface TaxComputation {
  taxYear: number;
  ruleSource: string;
  engineVersion: string;
  filingStatus: FilingStatus;
  estimate: true;
  // Schedule C
  scheduleC: {
    grossReceipts: number;
    totalExpenses: number;
    netProfit: number;
    lines: ScheduleCLine[];
  };
  // Schedule SE
  scheduleSE: {
    netEarnings: number;
    socialSecurityPortion: number;
    medicarePortion: number;
    seTax: number;
    deductibleHalf: number;
  };
  // Form 1040
  form1040: {
    totalIncome: number;
    adjustments: number;
    adjustedGrossIncome: number;
    standardDeduction: number;
    taxableIncome: number;
    incomeTax: number;
    selfEmploymentTax: number;
    totalTax: number;
    effectiveRate: number;
    marginalRate: number;
  };
  flags: string[];
}

const toCents = (d: number) => Math.round((d || 0) * 100);
const toDollars = (c: number) => Math.round(c) / 100;
const round2 = (d: number) => Math.round(d * 100) / 100;

function progressiveTax(taxableCents: number, rules: YearRules, status: FilingStatus): number {
  const brackets = rules.brackets[status];
  let tax = 0;
  let lower = 0;
  const taxable = taxableCents;
  for (const b of brackets) {
    const upper = toCents(b.upTo === Infinity ? Number.MAX_SAFE_INTEGER / 100 : b.upTo);
    if (taxable <= lower) break;
    const slice = Math.min(taxable, upper) - lower;
    if (slice > 0) tax += slice * b.rate;
    lower = upper;
  }
  return tax; // cents
}

function marginalRate(taxableCents: number, rules: YearRules, status: FilingStatus): number {
  for (const b of rules.brackets[status]) {
    if (taxableCents <= toCents(b.upTo === Infinity ? Number.MAX_SAFE_INTEGER / 100 : b.upTo)) {
      return b.rate;
    }
  }
  return rules.brackets[status][rules.brackets[status].length - 1].rate;
}

export function computeReturn(input: TaxInput): TaxComputation {
  const rules = getRules(input.taxYear);
  const flags: string[] = [];

  // ── Schedule C ────────────────────────────────────────────────────────────
  const grossCents = toCents(input.businessGrossReceipts || 0);
  const expenseLines = (input.businessExpenses || []).map((l) => ({
    label: l.label,
    amount: round2(l.amount),
  }));
  const totalExpenseCents = expenseLines.reduce((s, l) => s + toCents(l.amount), 0);
  const netProfitCents = Math.max(0, grossCents - totalExpenseCents);
  if (grossCents > 0 && expenseLines.length === 0) {
    flags.push('No business expenses entered — confirm this is correct before filing.');
  }

  // ── Schedule SE ───────────────────────────────────────────────────────────
  const netEarningsCents = Math.round(netProfitCents * rules.seNetEarningsFactor);
  const ssBaseCents = Math.min(netEarningsCents, toCents(rules.socialSecurityWageBase));
  const socialSecurityCents = Math.round(ssBaseCents * rules.seTax.socialSecurityRate);
  const medicareCents = Math.round(netEarningsCents * rules.seTax.medicareRate);
  const seTaxCents = socialSecurityCents + medicareCents;
  const deductibleHalfCents = Math.round(seTaxCents / 2);
  if (netEarningsCents > toCents(rules.socialSecurityWageBase)) {
    flags.push('Net earnings exceed the Social Security wage base — only Medicare applies above it.');
  }

  // ── Form 1040 ─────────────────────────────────────────────────────────────
  const wagesCents = toCents(input.w2Wages || 0);
  const otherCents = toCents(input.otherIncome || 0);
  const totalIncomeCents = wagesCents + netProfitCents + otherCents;
  const adjustmentsCents = deductibleHalfCents;
  const agiCents = Math.max(0, totalIncomeCents - adjustmentsCents);

  const additional = (input.over65 ? 1 : 0) + (input.blind ? 1 : 0);
  const standardDeductionCents =
    toCents(rules.standardDeduction[input.filingStatus]) +
    additional * toCents(rules.additionalStandardDeduction[input.filingStatus]);

  const taxableCents = Math.max(0, agiCents - standardDeductionCents);
  const incomeTaxCents = progressiveTax(taxableCents, rules, input.filingStatus);
  const totalTaxCents = incomeTaxCents + seTaxCents;

  return {
    taxYear: rules.taxYear,
    ruleSource: rules.ruleSource,
    engineVersion: rules.engineVersion,
    filingStatus: input.filingStatus,
    estimate: true,
    scheduleC: {
      grossReceipts: toDollars(grossCents),
      totalExpenses: toDollars(totalExpenseCents),
      netProfit: toDollars(netProfitCents),
      lines: expenseLines,
    },
    scheduleSE: {
      netEarnings: toDollars(netEarningsCents),
      socialSecurityPortion: toDollars(socialSecurityCents),
      medicarePortion: toDollars(medicareCents),
      seTax: toDollars(seTaxCents),
      deductibleHalf: toDollars(deductibleHalfCents),
    },
    form1040: {
      totalIncome: toDollars(totalIncomeCents),
      adjustments: toDollars(adjustmentsCents),
      adjustedGrossIncome: toDollars(agiCents),
      standardDeduction: toDollars(standardDeductionCents),
      taxableIncome: toDollars(taxableCents),
      incomeTax: toDollars(incomeTaxCents),
      selfEmploymentTax: toDollars(seTaxCents),
      totalTax: toDollars(totalTaxCents),
      effectiveRate: agiCents > 0 ? round2(toDollars(totalTaxCents) / toDollars(agiCents)) : 0,
      marginalRate: marginalRate(taxableCents, rules, input.filingStatus),
    },
    flags,
  };
}
