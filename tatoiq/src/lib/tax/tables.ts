/**
 * tables.2025.ts — VERSIONED, YEAR-SPECIFIC tax rules.
 *
 * SOURCE: IRS Revenue Procedure 2024-40 (tax year 2025 inflation adjustments).
 * Standard deduction confirmed against IRS VITA and CRS RL34498.
 *
 * RULE (from the TatoIQ spec): rules are versioned and year-specific. A new tax
 * year gets a NEW file/frozen constant — never edit historical values, because
 * finished returns must stay reproducible.
 *
 * IMPORTANT: figures must be re-verified against the official IRS publication
 * before any real filing. This file records its own source + version so every
 * CalculationRun can cite exactly what rules were used.
 */

export type FilingStatus = 'single' | 'mfj' | 'mfs' | 'hoh';

export interface Bracket {
  /** Upper bound of the bracket in taxable dollars; Infinity for the top bracket. */
  upTo: number;
  rate: number;
}

export interface YearRules {
  taxYear: number;
  ruleSource: string;
  engineVersion: string;
  standardDeduction: Record<FilingStatus, number>;
  /** Additional standard deduction for age >= 65 and/or blind. */
  additionalStandardDeduction: Record<FilingStatus, number>;
  brackets: Record<FilingStatus, Bracket[]>;
  socialSecurityWageBase: number;
  seTax: { socialSecurityRate: number; medicareRate: number };
  /** Portion of net profit subject to SE tax. */
  seNetEarningsFactor: number;
}

export const RULES_2025: YearRules = {
  taxYear: 2025,
  ruleSource: 'IRS Rev. Proc. 2024-40',
  engineVersion: 'tatoiq-engine-2025.1.0',
  standardDeduction: {
    single: 15750,
    mfs: 15750,
    hoh: 23625,
    mfj: 31500,
  },
  additionalStandardDeduction: {
    single: 2000,
    hoh: 2000,
    mfs: 1600,
    mfj: 1600,
  },
  brackets: {
    single: [
      { upTo: 11925, rate: 0.1 },
      { upTo: 48475, rate: 0.12 },
      { upTo: 103350, rate: 0.22 },
      { upTo: 197300, rate: 0.24 },
      { upTo: 250525, rate: 0.32 },
      { upTo: 626350, rate: 0.35 },
      { upTo: Infinity, rate: 0.37 },
    ],
    mfs: [
      { upTo: 11925, rate: 0.1 },
      { upTo: 48475, rate: 0.12 },
      { upTo: 103350, rate: 0.22 },
      { upTo: 197300, rate: 0.24 },
      { upTo: 250525, rate: 0.32 },
      { upTo: 375800, rate: 0.35 },
      { upTo: Infinity, rate: 0.37 },
    ],
    hoh: [
      { upTo: 17000, rate: 0.1 },
      { upTo: 64850, rate: 0.12 },
      { upTo: 103350, rate: 0.22 },
      { upTo: 197300, rate: 0.24 },
      { upTo: 250500, rate: 0.32 },
      { upTo: 626350, rate: 0.35 },
      { upTo: Infinity, rate: 0.37 },
    ],
    mfj: [
      { upTo: 23850, rate: 0.1 },
      { upTo: 96950, rate: 0.12 },
      { upTo: 206700, rate: 0.22 },
      { upTo: 394600, rate: 0.24 },
      { upTo: 501050, rate: 0.32 },
      { upTo: 751600, rate: 0.35 },
      { upTo: Infinity, rate: 0.37 },
    ],
  },
  socialSecurityWageBase: 176100,
  seTax: { socialSecurityRate: 0.124, medicareRate: 0.029 },
  seNetEarningsFactor: 0.9235,
};

export const RULES_BY_YEAR: Record<number, YearRules> = {
  2025: RULES_2025,
};

export function getRules(taxYear: number): YearRules {
  const rules = RULES_BY_YEAR[taxYear];
  if (!rules) {
    throw new Error(
      `No tax rules registered for tax year ${taxYear}. Add a frozen tables.${taxYear}.ts before calculating.`,
    );
  }
  return rules;
}
