import { describe, it, expect } from 'vitest';
import { computeReturn } from './engine';

/**
 * Smoke tests for the 2025 engine. These are hand-computed examples, NOT a
 * substitute for the full regression suite against verified IRS examples
 * (see TatoIQ-AUDIT-AND-PLAN.md, Phase 8).
 */
describe('computeReturn (tax year 2025)', () => {
  it('computes a single filer with $60,000 Schedule C profit', () => {
    const r = computeReturn({
      taxYear: 2025,
      filingStatus: 'single',
      businessGrossReceipts: 60000,
      businessExpenses: [],
    });

    // Schedule C
    expect(r.scheduleC.netProfit).toBe(60000);

    // Schedule SE: base = 60000 * 0.9235 = 55410
    expect(r.scheduleSE.netEarnings).toBe(55410);
    // SS = 55410 * 0.124 = 6870.84 ; Medicare = 55410 * 0.029 = 1606.89
    expect(r.scheduleSE.socialSecurityPortion).toBe(6870.84);
    expect(r.scheduleSE.medicarePortion).toBe(1606.89);
    expect(r.scheduleSE.seTax).toBe(8477.73);
    expect(r.scheduleSE.deductibleHalf).toBe(4238.87);

    // 1040
    expect(r.form1040.adjustedGrossIncome).toBe(55761.13);
    expect(r.form1040.standardDeduction).toBe(15750);
    expect(r.form1040.taxableIncome).toBe(40011.13);
    // Income tax: 1192.50 + 12% * (40011.13 - 11925) = 4562.84
    expect(r.form1040.incomeTax).toBe(4562.84);
    // Total = 4562.84 + 8477.73
    expect(r.form1040.totalTax).toBe(13040.57);
    expect(r.form1040.marginalRate).toBe(0.12);
    expect(r.estimate).toBe(true);
  });

  it('uses the MFJ standard deduction and no SE tax with only W-2 wages', () => {
    const r = computeReturn({ taxYear: 2025, filingStatus: 'mfj', w2Wages: 100000 });
    expect(r.scheduleSE.seTax).toBe(0);
    expect(r.form1040.standardDeduction).toBe(31500);
    expect(r.form1040.taxableIncome).toBe(68500);
    // MFJ tax: 10% * 23850 + 12% * (68500 - 23850) = 2385 + 5358 = 7743
    expect(r.form1040.incomeTax).toBe(7743);
    expect(r.form1040.marginalRate).toBe(0.12);
  });

  it('adds the additional standard deduction for age 65+', () => {
    const r = computeReturn({ taxYear: 2025, filingStatus: 'single', w2Wages: 40000, over65: true });
    expect(r.form1040.standardDeduction).toBe(17750); // 15750 + 2000
  });

  it('never produces negative tax or negative net profit', () => {
    const r = computeReturn({
      taxYear: 2025,
      filingStatus: 'single',
      businessGrossReceipts: 1000,
      businessExpenses: [{ label: 'Supplies', amount: 5000 }],
    });
    expect(r.scheduleC.netProfit).toBe(0);
    expect(r.form1040.totalTax).toBe(0);
  });

  it('throws for an unregistered tax year (no guessing)', () => {
    expect(() => computeReturn({ taxYear: 1999, filingStatus: 'single' })).toThrow(
      /No tax rules registered/,
    );
  });

  it('flags when business income is entered with no expenses', () => {
    const r = computeReturn({ taxYear: 2025, filingStatus: 'single', businessGrossReceipts: 5000 });
    expect(r.flags.join(' ')).toMatch(/No business expenses/);
  });
});
