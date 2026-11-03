import { describe, it, expect } from 'vitest';
import { answer, detectEscalation, retrieve, KNOWLEDGE_BASE } from './core';

describe('Saggio escalation triggers', () => {
  it('escalates foreign earned income', () => {
    expect(detectEscalation('I have foreign earned income this year')).toMatch(/Foreign/);
  });
  it('escalates an IRS notice', () => {
    expect(detectEscalation('I got an IRS notice CP2000')).toMatch(/notice/i);
  });
  it('escalates an audit', () => {
    expect(detectEscalation('I am being audited')).toMatch(/Audit/i);
  });
  it('does not escalate a plain education question', () => {
    expect(detectEscalation('What is the standard deduction?')).toBeNull();
  });
});

describe('Saggio grounding', () => {
  it('answers a standard-deduction question with a citation', () => {
    const a = answer('What is the standard deduction for a single filer?');
    expect(a.kind).toBe('answer');
    expect(a.citations.length).toBeGreaterThan(0);
    expect(a.citations[0].source).toMatch(/Rev\. Proc|1040/);
  });

  it('refuses to answer when no source supports it', () => {
    const a = answer('What is the weather in Miami tomorrow?');
    expect(a.kind).toBe('no_source');
    expect(a.citations).toHaveLength(0);
  });

  it('gives a labelled general answer for an uncovered tax question', () => {
    const a = answer('What is your overall philosophy on tax strategy?');
    expect(a.kind).toBe('general');
    expect(a.citations).toHaveLength(0);
    expect(a.text).toMatch(/general information, not a sourced IRS citation/i);
  });

  it('does not dress a non-tax question up as general tax guidance', () => {
    for (const q of [
      'Will it rain tomorrow?',
      'Who won the game last night?',
      'What should I cook for dinner?',
    ]) {
      const a = answer(q);
      expect(a.kind, q).toBe('no_source');
      expect(a.citations, q).toHaveLength(0);
    }
  });

  it('general answers never carry citations, and cited answers always do', () => {
    const questions = [
      'What is your overall philosophy on tax strategy?',
      'How should I feel about all of this?',
      'Explain your general worldview.',
      'What is the standard deduction?',
      'How is self-employment tax calculated?',
    ];
    for (const q of questions) {
      const a = answer(q);
      if (a.kind === 'general') expect(a.citations, q).toHaveLength(0);
      if (a.kind === 'answer') expect(a.citations.length, q).toBeGreaterThan(0);
    }
  });

  it('returns an escalation card and locks advice on a trigger', () => {
    const a = answer('Can you help me with an offer in compromise?');
    expect(a.kind).toBe('escalation');
    expect(a.escalationReason).toBeTruthy();
  });

  it('every retrieved chunk belongs to the knowledge base', () => {
    const chunks = retrieve('schedule c business expense mileage');
    for (const c of chunks) {
      expect(KNOWLEDGE_BASE.some((k) => k.id === c.id)).toBe(true);
    }
  });

  it('covers a broad spread of common topics with citations', () => {
    const probes = [
      'how much is the child tax credit',
      'can I deduct my mortgage interest',
      'what is form 1099-k for venmo',
      'when do I have to file an extension',
      'is unemployment taxable',
      'how do I amend my return',
      'what is an ITIN',
      'do I pay tax on selling my house',
    ];
    for (const q of probes) {
      const a = answer(q);
      expect(a.kind, q).toBe('answer');
      expect(a.citations.length, q).toBeGreaterThan(0);
    }
  });

  it('tolerates typos in the question', () => {
    const a = answer('what is the standerd deducton');
    expect(a.kind).toBe('answer');
    expect(a.citations.length).toBeGreaterThan(0);
  });

  it('matches short forms, plurals, and exact filing phrases', () => {
    const probes = [
      'What is a W-2?',
      'Do I need to file a tax return?',
      'How are RSUs taxed?',
      'Are tips taxable?',
      'What is a K-1?',
      'What is the QBI deduction?',
      'How does a 529 plan work?',
      'What is form 1099-DA?',
      'What is the EV tax credit?',
      'What is reasonable compensation for an S corp?',
      'Is my hobby a business?',
      'What is the estimated tax safe harbor?',
      'Who can I claim as a dependent?',
      'What is my tax bracket?',
      'Can I deduct self-employed health insurance?',
      'What is a SEP IRA?',
      'What is the adoption credit?',
      'What is the sales tax deduction?',
      'What is payroll tax?',
      'What is worker classification?',
      'What is cancellation of debt?',
      'What is a 1099-B?',
      'What is a 1099-MISC?',
      'What is a 1099-S?',
    ];
    for (const q of probes) {
      const a = answer(q);
      expect(a.kind, q).toBe('answer');
      expect(a.citations.length, q).toBeGreaterThan(0);
    }
  });

  it('does not apply 2025 figures to a different tax year', () => {
    const a = answer('What is the standard deduction for 2026?');
    expect(a.kind).toBe('general');
    expect(a.citations).toHaveLength(0);
    expect(a.text).toMatch(/2025/);
    expect(a.text).toMatch(/2026/);
  });

  it('has no duplicate chunk ids and every chunk has a source', () => {
    const ids = KNOWLEDGE_BASE.map((k) => k.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const k of KNOWLEDGE_BASE) {
      expect(k.source.length, k.id).toBeGreaterThan(0);
      expect(k.keywords.length, k.id).toBeGreaterThan(0);
    }
  });
});
