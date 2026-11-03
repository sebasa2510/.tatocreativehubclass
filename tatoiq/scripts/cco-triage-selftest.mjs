/**
 * cco-triage-selftest.mjs — dependency-free checks for the CCO triage core.
 *
 * Run with:
 *   node --test scripts/cco-triage-selftest.mjs
 * or:
 *   npm run test:cco
 *
 * These tests never call OpenAI. The model and the Blobs store are fakes.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  CATEGORIES,
  applyTriage,
  deriveCustomerId,
  enforceRules,
  handleTriageRequest,
  parseModelOutput,
  redact,
  triageMessage,
} from '../netlify/functions/_lib/cco-triage-core.mjs';

const NOW = Date.parse('2026-10-29T12:00:00.000Z');
const SITE = 'https://tatoiq.netlify.app';

const SUPPORT = {
  intent_one_line: 'Cannot open the document upload page.',
  category: 'support',
  urgency: 'medium',
  urgency_why: 'The customer is blocked from uploading a document.',
  human_required_before_reply: false,
  human_required_why: 'A routine acknowledgement is safe.',
};

function env(overrides = {}) {
  return {
    URL: SITE,
    OPENAI_API_KEY: 'test-key',
    CCO_RATE_LIMIT_PER_10MIN: '0',
    ...overrides,
  };
}

function request(body, headers = {}) {
  return new Request(`${SITE}/api/cco/triage`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      origin: SITE,
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

function model(content) {
  return async () => ({
    ok: true,
    async json() {
      return { choices: [{ message: { content: JSON.stringify(content) } }] };
    },
  });
}

function failingModel() {
  return async () => {
    throw new Error('network down');
  };
}

function memoryStore(seed = {}) {
  const map = new Map(Object.entries(seed).map(([key, value]) => [key, structuredClone(value)]));
  return {
    async get(key) {
      return map.has(key) ? structuredClone(map.get(key)) : null;
    },
    async setJSON(key, value) {
      map.set(key, structuredClone(value));
    },
    peek(key) {
      return map.get(key);
    },
    size() {
      return map.size;
    },
  };
}

test('deriveCustomerId is stable and lowercases the email', () => {
  assert.equal(deriveCustomerId('Jane@Example.com'), deriveCustomerId('jane@example.com'));
  assert.match(deriveCustomerId('jane@example.com'), /^email_[a-f0-9]{24}$/);
});

test('redact removes SSN, EIN, email, phone, and account numbers', () => {
  const cleaned = redact(
    'SSN 123-45-6789 EIN 12-3456789 email jane@example.com phone 305-555-1212 card 4111 1111 1111 1111',
  );
  assert.match(cleaned, /\[redacted SSN\]/);
  assert.match(cleaned, /\[redacted EIN\]/);
  assert.match(cleaned, /\[redacted email\]/);
  assert.match(cleaned, /\[redacted phone\]/);
  assert.match(cleaned, /\[redacted account\]/);
  assert.doesNotMatch(cleaned, /jane@example\.com/);
});

test('parseModelOutput rejects an unknown category instead of guessing', () => {
  assert.throws(
    () => parseModelOutput(JSON.stringify({ ...SUPPORT, category: 'sales' })),
    /unusable result/,
  );
});

test('parseModelOutput rejects a missing intent', () => {
  assert.throws(
    () => parseModelOutput(JSON.stringify({ ...SUPPORT, intent_one_line: '   ' })),
    /unusable result/,
  );
});

test('parseModelOutput accepts a fenced JSON response', () => {
  const parsed = parseModelOutput('```json\n' + JSON.stringify(SUPPORT) + '\n```');
  assert.equal(parsed.category, 'support');
});

test('every category maps to the documented owner', () => {
  const expected = {
    new_business: 'cso',
    support: 'cco',
    billing_or_money: 'owner',
    partnership_or_press: 'cmo',
    spam: 'cco',
    unclear: 'owner',
  };
  for (const category of CATEGORIES) {
    const result = enforceRules({
      ...SUPPORT,
      category,
      human_required_before_reply: false,
      human_required_why: 'Routine.',
    });
    assert.equal(result.owner, expected[category], category);
  }
});

test('money and unclear force a human; spam forces no human', () => {
  const money = enforceRules({
    ...SUPPORT,
    category: 'billing_or_money',
    human_required_before_reply: false,
    human_required_why: 'Routine.',
  });
  assert.equal(money.human_required_before_reply, true);
  assert.match(money.human_required_why, /money/);

  const unclear = enforceRules({
    ...SUPPORT,
    category: 'unclear',
    human_required_before_reply: false,
    human_required_why: 'Routine.',
  });
  assert.equal(unclear.human_required_before_reply, true);

  const spam = enforceRules({
    ...SUPPORT,
    category: 'spam',
    human_required_before_reply: true,
    human_required_why: 'Needs a look.',
  });
  assert.equal(spam.human_required_before_reply, false);
  assert.match(spam.human_required_why, /No reply/);
});

test('applyTriage caps history at 20 messages', () => {
  let record = null;
  for (let i = 0; i < 25; i += 1) {
    record = applyTriage(
      record,
      { ...SUPPORT, owner: 'cco' },
      {
        now: new Date(NOW + i * 1000).toISOString(),
        source: 'chatbot',
        channelRef: `msg_${i}`,
        redactedMessage: `message ${i}`,
        customerId: 'email_test',
      },
    );
  }
  assert.equal(record.messages.length, 20);
  assert.equal(record.messages.at(-1).channel_ref, 'msg_24');
});

test('triageMessage fails closed when the key is missing', async () => {
  await assert.rejects(
    () => triageMessage({ message: 'hi', source: 'chatbot', env: {}, fetchImpl: failingModel() }),
    (error) => error.code === 'no_key' && error.status === 503,
  );
});

test('happy path writes the analysis with the deterministic owner', async () => {
  const store = memoryStore();
  const res = await handleTriageRequest(
    request({ message: 'I cannot upload my W-2.', source: 'chatbot', email: 'Jane@Example.com' }),
    { env: env(), fetchImpl: model(SUPPORT), openStore: () => store, now: () => NOW },
  );

  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.ok, true);
  assert.equal(body.persisted, true);
  assert.equal(body.duplicate, false);
  assert.equal(body.triage.owner, 'cco');
  assert.equal(body.triage.category, 'support');
  assert.equal(body.triage.source, 'chatbot');
  assert.equal(body.triage.model, 'gpt-4o-mini');

  const record = store.peek(body.customer_id);
  assert.equal(record.email, 'jane@example.com');
  assert.equal(record.messages.length, 1);
  assert.equal(record.messages[0].triage.owner, 'cco');
  assert.equal(record.messages[0].text, 'I cannot upload my W-2.');
});

test('redacted identifiers are what reaches the record', async () => {
  const store = memoryStore();
  const res = await handleTriageRequest(
    request({
      message: 'Call me at 305-555-1212 or jane@example.com. SSN 123-45-6789.',
      source: 'contact_form',
      email: 'jane@example.com',
    }),
    { env: env(), fetchImpl: model(SUPPORT), openStore: () => store, now: () => NOW },
  );

  const body = await res.json();
  const record = store.peek(body.customer_id);
  const stored = record.messages[0].text;
  assert.match(stored, /\[redacted phone\]/);
  assert.match(stored, /\[redacted email\]/);
  assert.match(stored, /\[redacted SSN\]/);
  assert.doesNotMatch(stored, /305-555-1212/);
});

test('an invalid model result returns 502 and writes nothing', async () => {
  const store = memoryStore();
  const res = await handleTriageRequest(
    request({ message: 'Help.', email: 'jane@example.com' }),
    {
      env: env(),
      fetchImpl: model({ ...SUPPORT, category: 'sales' }),
      openStore: () => store,
      now: () => NOW,
    },
  );

  assert.equal(res.status, 502);
  const body = await res.json();
  assert.equal(body.error, 'invalid_model_output');
  assert.equal(body.persisted, false);
  assert.equal(store.size(), 0);
});

test('a missing key returns 503 and writes nothing', async () => {
  const store = memoryStore();
  let called = 0;
  const res = await handleTriageRequest(
    request({ message: 'Help.', email: 'jane@example.com' }),
    {
      env: env({ OPENAI_API_KEY: '' }),
      fetchImpl: async () => {
        called += 1;
        return model(SUPPORT)();
      },
      openStore: () => store,
      now: () => NOW,
    },
  );

  assert.equal(res.status, 503);
  assert.equal((await res.json()).error, 'no_key');
  assert.equal(called, 0);
  assert.equal(store.size(), 0);
});

test('a provider error returns 502 and writes nothing', async () => {
  const store = memoryStore();
  const res = await handleTriageRequest(
    request({ message: 'Help.', email: 'jane@example.com' }),
    { env: env(), fetchImpl: failingModel(), openStore: () => store, now: () => NOW },
  );

  assert.equal(res.status, 502);
  assert.equal((await res.json()).error, 'provider_error');
  assert.equal(store.size(), 0);
});

function rejectingModel(status) {
  return async () => ({ ok: false, status });
}

test('a rejected key is reported as provider_auth, not a generic error', async () => {
  const store = memoryStore();
  const res = await handleTriageRequest(
    request({ message: 'Help.', email: 'jane@example.com' }),
    { env: env(), fetchImpl: rejectingModel(401), openStore: () => store, now: () => NOW },
  );

  assert.equal(res.status, 503);
  assert.equal((await res.json()).error, 'provider_auth');
  assert.equal(store.size(), 0);
});

test('a rate-limited provider is reported separately and writes nothing', async () => {
  const store = memoryStore();
  const res = await handleTriageRequest(
    request({ message: 'Help.', email: 'jane@example.com' }),
    { env: env(), fetchImpl: rejectingModel(429), openStore: () => store, now: () => NOW },
  );

  assert.equal(res.status, 503);
  assert.equal((await res.json()).error, 'provider_rate_limited');
  assert.equal(store.size(), 0);
});

test('the provider status is logged but never returned to the caller', async () => {
  const store = memoryStore();
  const seen = [];
  const original = console.log;
  console.log = (line) => seen.push(line);
  let res;
  try {
    res = await handleTriageRequest(
      request({ message: 'Help.', email: 'jane@example.com' }),
      { env: env(), fetchImpl: rejectingModel(500), openStore: () => store, now: () => NOW },
    );
  } finally {
    console.log = original;
  }

  const text = await res.text();
  assert.equal(res.status, 502);
  assert.ok(!text.includes('500'), 'the response must not leak the provider status');

  // Netlify needs a plain line; a JSON object logs as an empty row.
  const line = seen.at(-1);
  assert.match(line, /^cco\.triage /);
  assert.match(line, /"provider_status":500/);
});

test('a disallowed origin is refused', async () => {
  const store = memoryStore();
  const res = await handleTriageRequest(
    request({ message: 'Help.', email: 'jane@example.com' }, { origin: 'https://evil.example' }),
    { env: env(), fetchImpl: model(SUPPORT), openStore: () => store, now: () => NOW },
  );

  assert.equal(res.status, 403);
  assert.equal((await res.json()).error, 'forbidden_origin');
  assert.equal(store.size(), 0);
});

test('an origin-less call needs the token', async () => {
  const store = memoryStore();
  const res = await handleTriageRequest(
    request({ message: 'Help.', email: 'jane@example.com' }, { origin: '' }),
    { env: env(), fetchImpl: model(SUPPORT), openStore: () => store, now: () => NOW },
  );

  assert.equal(res.status, 401);
  assert.equal((await res.json()).error, 'unauthorized');
});

test('an origin-less call with the token is accepted', async () => {
  const store = memoryStore();
  const res = await handleTriageRequest(
    request(
      { message: 'Help.', email: 'jane@example.com' },
      { origin: '', authorization: 'Bearer secret-token' },
    ),
    {
      env: env({ CCO_TRIAGE_TOKEN: 'secret-token' }),
      fetchImpl: model(SUPPORT),
      openStore: () => store,
      now: () => NOW,
    },
  );

  assert.equal(res.status, 200);
  assert.equal(store.size(), 1);
});

test('a duplicate channel_ref does not call the model again', async () => {
  const id = deriveCustomerId('jane@example.com');
  const previousTriage = { ...SUPPORT, owner: 'cco', source: 'inbox', triaged_at: new Date(NOW).toISOString() };
  const store = memoryStore({
    [id]: {
      customer_id: id,
      messages: [{ channel_ref: 'msg_1', triage: previousTriage }],
      triage: previousTriage,
    },
  });

  let called = 0;
  const res = await handleTriageRequest(
    request({ message: 'Again.', email: 'jane@example.com', channel_ref: 'msg_1' }),
    {
      env: env(),
      fetchImpl: async () => {
        called += 1;
        return model(SUPPORT)();
      },
      openStore: () => store,
      now: () => NOW,
    },
  );

  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.duplicate, true);
  assert.equal(body.triage.owner, 'cco');
  assert.equal(called, 0);
});

test('an oversized body is refused', async () => {
  const store = memoryStore();
  const res = await handleTriageRequest(
    request({ message: 'a'.repeat(17000), email: 'jane@example.com' }),
    { env: env(), fetchImpl: model(SUPPORT), openStore: () => store, now: () => NOW },
  );

  assert.equal(res.status, 413);
  assert.equal((await res.json()).error, 'payload_too_large');
  assert.equal(store.size(), 0);
});

test('a malformed body is refused', async () => {
  const store = memoryStore();
  const req = new Request(`${SITE}/api/cco/triage`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: SITE },
    body: '{not json',
  });
  const res = await handleTriageRequest(req, {
    env: env(),
    fetchImpl: model(SUPPORT),
    openStore: () => store,
    now: () => NOW,
  });

  assert.equal(res.status, 400);
  assert.equal((await res.json()).error, 'bad_request');
});

test('a missing customer identity is refused', async () => {
  const store = memoryStore();
  const res = await handleTriageRequest(
    request({ message: 'Help.' }),
    { env: env(), fetchImpl: model(SUPPORT), openStore: () => store, now: () => NOW },
  );

  assert.equal(res.status, 400);
  assert.match((await res.json()).message, /customer_id or email/);
});

test('OPTIONS preflight returns 204 with no wildcard CORS', async () => {
  const req = new Request(`${SITE}/api/cco/triage`, {
    method: 'OPTIONS',
    headers: { origin: SITE },
  });
  const res = await handleTriageRequest(req, {
    env: env(),
    fetchImpl: failingModel(),
    openStore: () => memoryStore(),
    now: () => NOW,
  });

  assert.equal(res.status, 204);
  assert.equal(res.headers.get('access-control-allow-origin'), SITE);
  assert.notEqual(res.headers.get('access-control-allow-origin'), '*');
});
