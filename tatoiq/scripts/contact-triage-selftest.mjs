/**
 * contact-triage-selftest.mjs - dependency-free checks for contact-form triage.
 *
 * Run with:
 *   node --test scripts/contact-triage-selftest.mjs
 * or:
 *   npm run test:contact-triage
 *
 * No OpenAI key, no Firestore, no Resend: every network call is a fake.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  CATEGORY_OWNER,
  enforceRules,
} from '../netlify/functions/_lib/cco-triage-core.mjs';
import {
  REVIEW_REASON,
  TRIAGE_STATUS,
  buildContactMessage,
  decide,
  guardContact,
  renderReply,
  renderReviewPage,
} from '../netlify/functions/_lib/contact-triage-core.mjs';
import {
  REPLY_KINDS,
  bodyFor,
  findForbiddenPhrase,
  subjectFor,
} from '../netlify/functions/_lib/contact-replies.mjs';
import {
  emailConfigured,
  runContactTriage,
  sendReply,
} from '../netlify/functions/_lib/contact-triage-run.mjs';
import {
  decodeFields,
  encodeFields,
  getDocument,
  patchDocument,
} from '../netlify/functions/_lib/firestore-rest.mjs';

const NOW = Date.parse('2026-11-02T15:00:00.000Z');
const CONTACT_ID = 'Q3vT9mKpLx2cR8sN4wBz';

const BASE_CONTACT = {
  name: 'Ana Ruiz',
  businessName: 'Ruiz Studio',
  email: 'ana@example.com',
  service: 'Bookkeeping',
  industry: 'Design',
  budget: '$5k-$10k',
  timeline: 'This quarter',
  bottleneck: 'My books are three months behind and I am not sure what is deductible.',
  source: 'website-contact',
  createdAt: new Date(NOW - 60_000).toISOString(),
};

function triageFor(category, overrides = {}) {
  return {
    intent_one_line: 'Wants bookkeeping help before the quarter closes.',
    category,
    urgency: 'medium',
    urgency_why: 'A real request that can wait a business day.',
    human_required_before_reply: false,
    human_required_why: 'A routine acknowledgement is safe.',
    ...overrides,
  };
}

function fakeStore(contact, options = {}) {
  const patches = [];
  return {
    patches,
    getDocument: async () => contact,
    patchDocument: async ({ data }) => {
      patches.push(data);
      return true;
    },
    lookupCustomerByEmail: async () =>
      options.lookup || { matched: true, customerId: 'cust_ana' },
  };
}

function fakeTriage(category, overrides = {}) {
  return async () => ({ triage: triageFor(category, overrides), model: 'fake-model' });
}

function runWith({ contact, category, overrides, storeOptions, env, mailer, triage } = {}) {
  const resolved = contact === undefined ? { id: CONTACT_ID, data: BASE_CONTACT } : contact;
  const store = fakeStore(resolved, storeOptions);
  const calls = [];
  return runContactTriage({
    contactId: CONTACT_ID,
    now: NOW,
    env: {
      RESEND_API_KEY: 're_test',
      OUTBOUND_EMAIL_DOMAIN: 'example.com',
      ...env,
    },
    deps: {
      store,
      triage: triage || fakeTriage(category || 'new_business', overrides),
      sendReply: async (payload) => {
        calls.push(payload);
        if (mailer === 'throw') throw new Error('resend_500');
        return { id: 'email_1' };
      },
    },
  }).then((result) => ({ result, store, calls }));
}

// ── Decision table ────────────────────────────────────────────────────────

test('new business goes to the CSO with the new-business reply', async () => {
  const { result, calls } = await runWith({ category: 'new_business' });
  assert.equal(result.status, 200);
  assert.equal(result.body.triage.category, 'new_business');
  assert.equal(result.body.triage.owner, 'cso');
  assert.equal(result.body.reply.kind, REPLY_KINDS.CSO_NEW_BUSINESS);
  assert.equal(result.body.reply.status, 'sent');
  assert.equal(result.body.needsReview, false);
  assert.equal(calls.length, 1);
  assert.match(calls[0].text, /new engagements at TatoIQ/);
});

test('support from an existing client goes to the CCO', async () => {
  const { result, calls } = await runWith({ category: 'support' });
  assert.equal(result.body.triage.owner, 'cco');
  assert.equal(result.body.reply.kind, REPLY_KINDS.CCO_SUPPORT);
  assert.equal(result.body.needsReview, false);
  assert.match(calls[0].text, /client care team/i);
});

test('support from a sender who is not a client is flagged for a read', async () => {
  const { result, store } = await runWith({
    category: 'support',
    storeOptions: { lookup: { matched: false, customerId: null } },
  });
  assert.equal(result.body.reply.kind, REPLY_KINDS.CCO_SUPPORT);
  assert.equal(result.body.needsReview, true);
  assert.equal(store.patches[0].reviewReason, REVIEW_REASON.SUPPORT_UNKNOWN_SENDER);
});

test('a failed client lookup is not treated as "not a client"', async () => {
  const { result, store } = await runWith({
    category: 'support',
    storeOptions: { lookup: { matched: null, customerId: null } },
  });
  assert.equal(store.patches[0].existingClient, null);
  assert.equal(result.body.needsReview, false);
});

test('money gets one short note and lands on the owner list', async () => {
  const { result, calls, store } = await runWith({ category: 'billing_or_money' });
  assert.equal(result.body.triage.owner, 'owner');
  assert.equal(result.body.reply.kind, REPLY_KINDS.BILLING_HOLD);
  assert.equal(result.body.needsReview, true);
  assert.equal(store.patches[0].reviewReason, REVIEW_REASON.MONEY_OWNER);
  assert.match(calls[0].text, /I will come back to you on it myself\./);
  // "and nothing else": no routing, no next steps, no team signature.
  assert.doesNotMatch(calls[0].text, /team|next step|scope|call|upload/i);
});

test('spam gets no reply at all', async () => {
  const { result, calls, store } = await runWith({ category: 'spam' });
  assert.equal(result.body.reply.kind, REPLY_KINDS.NONE);
  assert.equal(result.body.reply.status, 'none');
  assert.equal(calls.length, 0);
  assert.equal(result.body.needsReview, false);
  assert.equal(store.patches[0].reply.status, 'none');
});

test('an unclear message gets the plain thank-you and a review flag', async () => {
  const { result, calls, store } = await runWith({ category: 'unclear' });
  assert.equal(store.patches[0].triage.owner, 'owner');
  assert.equal(store.patches[0].category, 'unclear');
  assert.equal(result.body.needsReview, true);
  assert.equal(store.patches[0].reviewReason, REVIEW_REASON.TRIAGE_UNCLEAR);
  assert.match(calls[0].text, /someone will read it and get back to you/i);
});

test('partnership and press have no auto-reply policy: thank-you plus review', async () => {
  const { result, store } = await runWith({ category: 'partnership_or_press' });
  assert.equal(result.body.triage.owner, 'cmo');
  assert.equal(result.body.reply.kind, REPLY_KINDS.THANK_YOU);
  assert.equal(result.body.needsReview, true);
  assert.equal(store.patches[0].reviewReason, REVIEW_REASON.PARTNERSHIP);
});

test('every category maps to a fixed owner, never a model-chosen one', () => {
  for (const category of Object.keys(CATEGORY_OWNER)) {
    const decision = decide({ triage: triageFor(category) });
    assert.equal(decision.owner, CATEGORY_OWNER[category], category);
  }
});

// ── Triage outage: the owner's fallback rule ──────────────────────────────

test('a triage failure still sends the plain thank-you and flags the record', async () => {
  const { result, calls, store } = await runWith({
    triage: async () => {
      const error = new Error('provider down');
      error.code = 'provider_error';
      throw error;
    },
  });

  assert.equal(result.status, 200);
  assert.equal(result.body.triage.status, TRIAGE_STATUS.UNAVAILABLE);
  assert.equal(result.body.triage.category, 'unclear');
  assert.equal(result.body.triage.owner, 'owner');
  assert.equal(result.body.reply.kind, REPLY_KINDS.THANK_YOU);
  assert.equal(result.body.needsReview, true);
  assert.equal(store.patches[0].reviewReason, REVIEW_REASON.TRIAGE_UNAVAILABLE);
  assert.equal(store.patches[0].triage.error, 'provider_error');
  assert.equal(calls.length, 1);
});

// ── Failure and idempotency behaviour ─────────────────────────────────────

test('without Resend configured the decision is saved and no email is attempted', async () => {
  const { result, calls, store } = await runWith({
    category: 'new_business',
    env: { RESEND_API_KEY: '', OUTBOUND_EMAIL_DOMAIN: '' },
  });
  assert.equal(result.body.reply.status, 'skipped');
  assert.equal(calls.length, 0);
  assert.equal(store.patches[0].reply.status, 'skipped');
  assert.equal(store.patches[0].reply.error, 'email_not_configured');
});

test('a failed send is recorded and pushed onto the reading list', async () => {
  const { result, store } = await runWith({ category: 'new_business', mailer: 'throw' });
  assert.equal(result.body.reply.status, 'failed');
  assert.equal(result.body.needsReview, true);
  assert.equal(store.patches.at(-1).reply.status, 'failed');
  assert.equal(store.patches.at(-1).needsReview, true);
  assert.equal(store.patches.at(-1).reviewReason, REVIEW_REASON.REPLY_FAILED);
});

test('a second call for the same contact does nothing', async () => {
  const contact = {
    id: CONTACT_ID,
    data: { ...BASE_CONTACT, triage: { category: 'new_business', owner: 'cso' } },
  };
  const { result, store, calls } = await runWith({ contact });
  assert.equal(result.body.duplicate, true);
  assert.equal(store.patches.length, 0);
  assert.equal(calls.length, 0);
});

test('stale or non-form records are refused before any model call', async () => {
  const stale = {
    id: CONTACT_ID,
    data: { ...BASE_CONTACT, createdAt: new Date(NOW - 60 * 60 * 1000).toISOString() },
  };
  const staleRun = await runWith({ contact: stale });
  assert.equal(staleRun.result.status, 409);
  assert.equal(staleRun.result.body.error, 'too_old');

  const otherSource = { id: CONTACT_ID, data: { ...BASE_CONTACT, source: 'import' } };
  const otherRun = await runWith({ contact: otherSource });
  assert.equal(otherRun.result.status, 409);
  assert.equal(otherRun.result.body.error, 'not_a_contact_form_submission');
});

test('a missing record is a 404, not an invented decision', async () => {
  const { result } = await runWith({ contact: null });
  assert.equal(result.status, 404);
});

// ── Guard, message building, reply copy ──────────────────────────────────

test('guard accepts a fresh form record and rejects the rest', () => {
  const fresh = { id: CONTACT_ID, data: BASE_CONTACT };
  assert.equal(guardContact(fresh, NOW).ok, true);

  assert.equal(
    guardContact({ id: CONTACT_ID, data: { ...BASE_CONTACT, createdAt: 'not-a-date' } }, NOW).reason,
    'bad_timestamp',
  );
  assert.equal(
    guardContact(
      { id: CONTACT_ID, data: { ...BASE_CONTACT, createdAt: new Date(NOW + 60 * 60 * 1000).toISOString() } },
      NOW,
    ).reason,
    'bad_timestamp',
  );
  assert.equal(guardContact(null, NOW).reason, 'not_found');
});

test('the message sent to triage carries the request and the context', () => {
  const message = buildContactMessage(BASE_CONTACT);
  assert.match(message, /books are three months behind/);
  assert.match(message, /Business: Ruiz Studio/);
  assert.match(message, /Budget: \$5k-\$10k/);
});

test('identifiers are redacted before the message leaves the system', () => {
  const message = buildContactMessage({
    ...BASE_CONTACT,
    bottleneck: 'My SSN is 123-45-6789 and my email is ana@example.com, call 305-555-1212.',
  });
  assert.doesNotMatch(message, /123-45-6789/);
  assert.doesNotMatch(message, /ana@example\.com/);
  assert.doesNotMatch(message, /305-555-1212/);
  assert.match(message, /\[redacted/);
});

test('no fixed reply promises money, a deadline, or an outcome', () => {
  for (const kind of Object.values(REPLY_KINDS)) {
    if (kind === REPLY_KINDS.NONE) continue;
    const body = bodyFor(kind, { name: 'Ana Ruiz', businessName: 'Ruiz Studio' });
    assert.equal(findForbiddenPhrase(body), null, `${kind}: ${findForbiddenPhrase(body)}`);
    assert.ok(subjectFor(kind), `${kind} has a subject`);
    assert.ok(body.trim().length > 20, `${kind} is not empty`);
  }
});

test('spam renders no reply body at all', () => {
  assert.equal(renderReply({ replyKind: REPLY_KINDS.NONE }), null);
});

// ── Review page ──────────────────────────────────────────────────────────

test('the review page shows the decision, the reply, and escapes the message', () => {
  const docs = [
    {
      id: 'a1',
      data: {
        ...BASE_CONTACT,
        name: '<script>alert(1)</script>',
        needsReview: true,
        reviewReason: REVIEW_REASON.MONEY_OWNER,
        existingClient: true,
        triage: {
          status: 'ok',
          intent: 'Wants a payment plan.',
          category: 'billing_or_money',
          urgency: 'high',
          owner: 'owner',
        },
        reply: { kind: 'billing_hold', status: 'sent' },
      },
    },
    {
      id: 'a2',
      data: {
        ...BASE_CONTACT,
        name: 'Ana Ruiz',
        needsReview: false,
        triage: {
          status: 'ok',
          intent: 'Wants bookkeeping.',
          category: 'new_business',
          urgency: 'medium',
          owner: 'cso',
        },
        reply: { kind: 'cso_new_business', status: 'sent' },
      },
    },
  ];

  const html = renderReviewPage({ docs, now: new Date(NOW) });
  assert.match(html, /\$?1 need your read|1<\/strong> need your read/);
  assert.match(html, /billing_or_money/);
  assert.match(html, /cso_new_business/);
  assert.match(html, /money_owner/);
  assert.doesNotMatch(html, /<script>alert\(1\)<\/script>/);
  assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
});

test('the needs-only filter hides routine rows', () => {
  const docs = [
    { id: 'a1', data: { ...BASE_CONTACT, needsReview: true } },
    { id: 'a2', data: { ...BASE_CONTACT, needsReview: false, name: 'Routine Row' } },
  ];
  const html = renderReviewPage({ docs, needsOnly: true, now: new Date(NOW) });
  assert.doesNotMatch(html, /Routine Row/);
});

// ── Resend adapter ───────────────────────────────────────────────────────

test('the Resend call uses one idempotency key per contact', async () => {
  const requests = [];
  const fetchImpl = async (url, init) => {
    requests.push({ url, init });
    return { ok: true, json: async () => ({ id: 'email_1' }) };
  };

  await sendReply({
    env: { RESEND_API_KEY: 're_test', OUTBOUND_EMAIL_DOMAIN: 'example.com' },
    contactId: CONTACT_ID,
    to: 'ana@example.com',
    subject: 'Thanks',
    text: 'Hello',
    html: '<p>Hello</p>',
    fetchImpl,
  });

  assert.equal(requests.length, 1);
  assert.equal(requests[0].url, 'https://api.resend.com/emails');
  assert.equal(requests[0].init.headers['Idempotency-Key'], `contact-triage-${CONTACT_ID}`);
  const payload = JSON.parse(requests[0].init.body);
  assert.equal(payload.from, 'TatoIQ <hello@example.com>');
  assert.deepEqual(payload.to, ['ana@example.com']);
});

test('email is only considered configured with a key and a from-domain', () => {
  assert.equal(emailConfigured({ RESEND_API_KEY: 're_test', OUTBOUND_EMAIL_DOMAIN: 'example.com' }), true);
  assert.equal(emailConfigured({ RESEND_API_KEY: 're_test', CONTACT_REPLY_FROM: 'TatoIQ <hi@x.com>' }), true);
  assert.equal(emailConfigured({ OUTBOUND_EMAIL_DOMAIN: 'example.com' }), false);
  assert.equal(emailConfigured({}), false);
});

// ── Triage Agent contract ────────────────────────────────────────────────

test('the model output is still enforced by the existing triage rules', () => {
  const enforced = enforceRules(triageFor('billing_or_money', {
    human_required_before_reply: false,
    human_required_why: '',
  }));
  assert.equal(enforced.human_required_before_reply, true);
  assert.equal(enforced.owner, 'owner');
});

// ── Firestore REST adapter ───────────────────────────────────────────────

test('Firestore values round-trip, including nested maps and arrays', () => {
  const data = {
    intent: 'Wants bookkeeping.',
    needsReview: true,
    count: 3,
    customerId: null,
    triage: { category: 'new_business', urgency: 'medium', nested: { ok: false } },
    tags: ['a', 2, true],
  };
  assert.deepEqual(decodeFields(encodeFields(data)), data);
});

test('a patch sends a field mask and a merge payload', async () => {
  const requests = [];
  const fetchImpl = async (url, init) => {
    requests.push({ url, init });
    return { ok: true, status: 200, json: async () => ({}) };
  };

  await patchDocument({
    env: { FIREBASE_ACCESS_TOKEN: 'test-token', FIREBASE_PROJECT_ID: 'web-app---tato' },
    collection: 'contacts',
    id: 'doc123',
    data: { needsReview: true, reply: { kind: 'thank_you', status: 'sent' } },
    fetchImpl,
  });

  const { url, init } = requests[0];
  assert.equal(init.method, 'PATCH');
  assert.equal(init.headers.Authorization, 'Bearer test-token');
  assert.deepEqual(new URL(url).searchParams.getAll('updateMask.fieldPaths'), ['needsReview', 'reply']);
  const body = JSON.parse(init.body);
  assert.equal(body.fields.needsReview.booleanValue, true);
  assert.equal(body.fields.reply.mapValue.fields.kind.stringValue, 'thank_you');
  assert.equal(new URL(url).pathname.endsWith('/contacts/doc123'), true);
});

test('reading a missing document returns null instead of throwing', async () => {
  const fetchImpl = async () => ({ ok: false, status: 404, json: async () => ({}) });
  const found = await getDocument({
    env: { FIREBASE_ACCESS_TOKEN: 'test-token' },
    collection: 'contacts',
    id: 'missing',
    fetchImpl,
  });
  assert.equal(found, null);
});
