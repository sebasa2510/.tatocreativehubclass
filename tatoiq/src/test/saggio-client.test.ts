import { readdirSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  buildClientReply,
  classifyClientIntent,
  summarizeClientInteraction,
} from '@/lib/saggio/client-agent';
import {
  extractEmail,
  isClientRecord,
  isValidEmail,
  normalizeEmail,
  type CustomerRecord,
} from '@/lib/saggio/client-records';
import { SITE_GUIDE, findGuideEntry } from '@/lib/saggio/site-guide';
import { fallbackTriage, routingSentence } from '@/lib/saggio/triage';

function record(overrides: Partial<CustomerRecord> = {}): CustomerRecord {
  return {
    id: 'customer_test_1',
    email: 'client@example.com',
    name: 'Dana Client',
    businessName: 'Client Co.',
    status: 'active',
    services: ['Business tax return', 'Monthly bookkeeping'],
    engagementSummary: '2025 S-corp return and monthly bookkeeping.',
    projectStatus: 'The return is in preparer review.',
    projectStage: 'preparer_review',
    nextMilestone: 'Preparer review call',
    nextMilestoneDate: 'the week of November 9, 2026',
    owner: 'A. Chen, EA',
    team: 'Business tax',
    kickoffChecklist: [
      { id: 'one', label: 'Send the Q3 payroll report', done: false },
      { id: 'two', label: 'Connect the bank account', done: true },
    ],
    ...overrides,
  };
}

describe('client records', () => {
  it('treats only onboarding and active as clients', () => {
    for (const status of ['onboarding', 'active', 'ACTIVE', ' Onboarding ']) {
      expect(isClientRecord(record({ status }))).toBe(true);
    }
    for (const status of ['lead', 'paused', 'former', 'archived', '']) {
      expect(isClientRecord(record({ status }))).toBe(false);
    }
    expect(isClientRecord(null)).toBe(false);
  });

  it('normalizes and extracts email without inventing one', () => {
    expect(normalizeEmail('  Dana@Example.COM ')).toBe('dana@example.com');
    expect(extractEmail('Hi, I am dana@example.com — thanks')).toBe('dana@example.com');
    expect(extractEmail('no address here')).toBeNull();
    expect(isValidEmail('dana@example.com')).toBe(true);
    expect(isValidEmail('dana@example')).toBe(false);
    expect(isValidEmail('not an email')).toBe(false);
  });
});

describe('client intent classification', () => {
  it('puts handoffs before status answers', () => {
    expect(classifyClientIntent('I want to cancel because I was overcharged')).toBe('unhappy');
    expect(classifyClientIntent('Why is my invoice higher this month?')).toBe('billing');
    expect(classifyClientIntent('This is the third delay and I am frustrated')).toBe('unhappy');
    expect(classifyClientIntent('I am taking my business elsewhere')).toBe('unhappy');
    expect(classifyClientIntent('where is my project status?')).toBe('project_status');
    expect(classifyClientIntent('help me understand my status')).toBe('project_status');
    expect(classifyClientIntent('what can you do for me?')).toBe('capabilities');
    expect(classifyClientIntent('what is still outstanding?')).toBe('checklist');
    expect(classifyClientIntent('where do I upload documents?')).toBe('navigation');
    expect(classifyClientIntent('can I deduct my home office?')).toBe('tax_question');
  });
});

describe('client replies', () => {
  it('greets a client from the record and does not pitch', () => {
    const reply = buildClientReply(record(), 'hi');
    expect(reply.intent).toBe('greeting');
    expect(reply.answer.text).toContain('Dana');
    expect(reply.answer.text).toContain('The return is in preparer review.');
    expect(reply.answer.text).not.toMatch(/book a consultation|pricing|free/i);
  });

  it('quotes the scope instead of inventing one', () => {
    const reply = buildClientReply(record(), 'what did I hire you for?');
    expect(reply.intent).toBe('scope');
    expect(reply.answer.text).toContain('Business tax return');
    expect(reply.answer.text).toContain('Monthly bookkeeping');
  });

  it('describes only record-grounded help when asked what it can do', () => {
    const reply = buildClientReply(record(), 'what can you do?');
    expect(reply.intent).toBe('capabilities');
    expect(reply.answer.text).toContain('project status');
    expect(reply.answer.text).not.toMatch(/book a consultation|pricing|upgrade/i);
  });

  it('says the record is silent and records the question', () => {
    const reply = buildClientReply(record({ projectStatus: undefined, projectStage: undefined }), 'what is my status?');
    expect(reply.intent).toBe('unrecorded');
    expect(reply.answer.text).toContain("I don't have a project status");
    expect(reply.openQuestion).toBeTruthy();
    expect(reply.needsTriage).toBe(false);
  });

  it('lists only open kickoff items', () => {
    const reply = buildClientReply(record(), 'what is still outstanding?');
    expect(reply.intent).toBe('checklist');
    expect(reply.answer.text).toContain('Send the Q3 payroll report');
    expect(reply.answer.text).not.toContain('Connect the bank account');
  });

  it('repeats the recorded milestone without promising a new date', () => {
    const reply = buildClientReply(record(), 'what happens next?');
    expect(reply.intent).toBe('next_step');
    expect(reply.answer.text).toContain('the week of November 9, 2026');
    expect(reply.answer.text).toContain("I won't promise a date");
  });

  it('does not invent a next step when none is recorded', () => {
    const reply = buildClientReply(record({ nextMilestone: undefined, nextMilestoneDate: undefined }), 'what happens next?');
    expect(reply.intent).toBe('unrecorded');
    expect(reply.openQuestion).toBeTruthy();
  });

  it('links only to the verified page that matches the request', () => {
    const reply = buildClientReply(record(), 'where do I upload documents?');
    expect(reply.answer.kind).toBe('guide');
    expect(reply.answer.links).toEqual([{ label: 'Documents', href: '/documents' }]);
    expect(reply.answer.text).toContain('Documents');
  });

  it('hands off billing and unhappy clients instead of solving', () => {
    const billing = buildClientReply(record(), 'why was I charged twice?');
    expect(billing.intent).toBe('billing');
    expect(billing.answer.kind).toBe('handoff');
    expect(billing.handoff?.reason).toBe('billing');
    expect(billing.needsTriage).toBe(false);

    const unhappy = buildClientReply(record(), 'I am frustrated and thinking about leaving');
    expect(unhappy.answer.kind).toBe('handoff');
    expect(unhappy.handoff?.reason).toBe('unhappy or leaving');
    expect(unhappy.answer.text).not.toMatch(/\bhere is how\b|\byou should\b|\btry\b/i);
  });

  it('routes tax and problem questions through triage', () => {
    const tax = buildClientReply(record(), 'can I deduct my home office?');
    expect(tax.needsTriage).toBe(true);
    expect(tax.intent).toBe('tax_question');
    expect(tax.answer.text).not.toMatch(/deduct/i);

    const problem = buildClientReply(record(), 'the upload keeps failing with an error');
    expect(problem.needsTriage).toBe(true);
    expect(problem.intent).toBe('problem');
  });

  it('refuses to build a client reply for a non-client record', () => {
    expect(() => buildClientReply(record({ status: 'lead' }), 'hi')).toThrow();
  });

  it('does not claim a record write when persistence failed', () => {
    const silent = buildClientReply(
      record({ projectStatus: undefined, projectStage: undefined }),
      'what is my status?',
      [],
      false,
    );
    expect(silent.answer.text).toContain("couldn't save this question");
    expect(silent.answer.text).not.toContain("I've added");

    const handoff = buildClientReply(record(), 'why was I charged twice?', [], false);
    expect(handoff.answer.text).toContain("couldn't save this");
    expect(handoff.answer.text).not.toContain("I've flagged");
    expect(handoff.answer.links).toEqual([{ label: 'Messages', href: '/messages' }]);
  });
});

describe('triage fallback and routing language', () => {
  it('routes by intent and never invents a response window', () => {
    const result = fallbackTriage({ message: 'a tax question', intent: 'tax_question', record: record({ responseWindow: undefined }) });
    expect(result.mode).toBe('fallback');
    expect(result.team).toBe('Business tax');
    expect(result.responseWindow).toBeUndefined();
    const sentence = routingSentence(result);
    expect(sentence).toContain('A. Chen, EA');
    expect(sentence).toContain("won't promise");
  });

  it('uses a response window only when the record already has one', () => {
    const result = fallbackTriage({
      message: 'a tax question',
      intent: 'tax_question',
      record: record({ responseWindow: 'within two business days' }),
    });
    expect(routingSentence(result)).toContain('within two business days');
  });
});

describe('conversation summaries', () => {
  it('writes a one-line summary for each outcome', () => {
    expect(summarizeClientInteraction('greeting', 'hi')).toBe('Client checked in; greeted from their record.');
    expect(summarizeClientInteraction('billing', 'why charged twice', { handoff: true, handoffReason: 'billing' })).toContain(
      'handed off',
    );
    expect(
      summarizeClientInteraction('tax_question', 'home office?', { routedTo: 'A. Chen, EA' }),
    ).toContain('routed to A. Chen, EA');
    expect(
      summarizeClientInteraction('unrecorded', 'what about the audit?', { openQuestion: true }),
    ).toContain('Asked:');
    expect(summarizeClientInteraction('greeting', 'hi')).not.toContain('\n');
  });
});

describe('site guide', () => {
  const appDir = path.resolve(process.cwd(), 'src', 'app');

  function pagesUnder(dir: string): string[] {
    return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) return pagesUnder(full);
      return entry.isFile() && entry.name === 'page.tsx' ? [full] : [];
    });
  }

  const pages = pagesUnder(appDir);

  it('points every link at a page that exists in this repo', () => {
    const normalized = pages.map((page) => page.replace(/\\/g, '/'));
    for (const entry of SITE_GUIDE) {
      const suffix = `${entry.href.replace(/^\//, '').replace(/\/$/, '')}/page.tsx`;
      expect(
        normalized.some((page) => page.endsWith(suffix)),
        `missing page for ${entry.href} (found ${normalized.length} pages)`,
      ).toBe(true);
    }
  });

  it('matches a request to the most specific page', () => {
    expect(findGuideEntry('where do I upload my W-2?')?.href).toBe('/documents');
    expect(findGuideEntry('where can I see my refund status?')?.href).toBe('/status');
    expect(findGuideEntry('I need to message my preparer')?.href).toBe('/messages');
    expect(findGuideEntry('what is the weather?')).toBeNull();
  });
});
