import { CONTACT_ID_RE } from './_lib/contact-triage-core.mjs';
import { runContactTriage } from './_lib/contact-triage-run.mjs';
import { firestoreConfigured } from './_lib/firestore-rest.mjs';

/**
 * POST /api/contacts/triage
 *
 * The contact form saves the submission with the browser SDK first, then calls
 * this function with the new document id. The function reads the record, sends
 * the message through the Triage Agent, writes the decision back onto the
 * record, and sends exactly one reply based on that decision.
 *
 * No Cloud Functions and no Blaze plan: Firestore is reached over its REST API
 * and the work runs on the Netlify free tier.
 */

const FIXED_ORIGINS = [
  'https://web-app---tato.web.app',
  'http://localhost:3000',
  'http://localhost:8888',
];

const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const rateState = new Map();

function allowedOrigins(env) {
  const set = new Set(FIXED_ORIGINS);
  const candidates = [env.URL, env.DEPLOY_PRIME_URL, env.CONTACT_TRIAGE_ALLOWED_ORIGINS];
  for (const raw of candidates) {
    if (!raw) continue;
    for (const part of String(raw).split(',')) {
      const trimmed = part.trim();
      if (!trimmed) continue;
      try {
        const url = new URL(trimmed.includes('://') ? trimmed : `https://${trimmed}`);
        if (url.origin && url.origin !== 'null') set.add(url.origin);
      } catch {
        // Ignore a malformed entry rather than opening the function to anything.
      }
    }
  }
  return set;
}

function corsHeaders(request, allowed) {
  const origin = request.headers.get('origin');
  if (origin && allowed.has(origin)) {
    return {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'content-type',
      'Access-Control-Max-Age': '600',
      Vary: 'Origin',
    };
  }
  return { Vary: 'Origin' };
}

function json(body, status, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      ...headers,
    },
  });
}

function rateLimited(request, env, nowMs) {
  const limit = Number.parseInt(env.CONTACT_TRIAGE_RATE_LIMIT_PER_10MIN || '30', 10);
  if (!Number.isFinite(limit) || limit <= 0) return false;

  const ip =
    request.headers.get('x-nf-client-connection-ip') ||
    (request.headers.get('x-forwarded-for') || '').split(',')[0].trim() ||
    'unknown';

  const recent = (rateState.get(ip) || []).filter((at) => nowMs - at < RATE_LIMIT_WINDOW_MS);
  if (recent.length >= limit) {
    rateState.set(ip, recent);
    return true;
  }
  recent.push(nowMs);
  rateState.set(ip, recent);

  // Keep the per-instance map from growing without bound.
  if (rateState.size > 500) {
    for (const [key, hits] of rateState) {
      if (hits.every((at) => nowMs - at >= RATE_LIMIT_WINDOW_MS)) rateState.delete(key);
    }
  }
  return false;
}

export default async function handler(request, context) {
  const env = context?.env || process.env;
  const allowed = allowedOrigins(env);
  const cors = corsHeaders(request, allowed);

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: cors });
  }
  if (request.method !== 'POST') {
    return json({ ok: false, error: 'method_not_allowed', message: 'Use POST.' }, 405, {
      ...cors,
      Allow: 'POST, OPTIONS',
    });
  }

  const origin = request.headers.get('origin');
  if (origin && !allowed.has(origin)) {
    return json({ ok: false, error: 'forbidden_origin' }, 403, cors);
  }

  if (rateLimited(request, env, Date.now())) {
    return json({ ok: false, error: 'rate_limited' }, 429, cors);
  }

  if (!firestoreConfigured(env)) {
    return json(
      {
        ok: false,
        error: 'not_configured',
        message:
          'Firebase credentials are missing on Netlify. The message is saved; triage needs FIREBASE_SERVICE_ACCOUNT_JSON.',
      },
      503,
      cors,
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: 'bad_request', message: 'Send JSON.' }, 400, cors);
  }

  const contactId = typeof body?.contact_id === 'string' ? body.contact_id.trim() : '';
  if (!CONTACT_ID_RE.test(contactId)) {
    return json({ ok: false, error: 'bad_request', message: 'contact_id is invalid.' }, 400, cors);
  }

  const result = await runContactTriage({ contactId, env });
  return json(result.body, result.status, cors);
}

export const config = { path: '/api/contacts/triage' };
