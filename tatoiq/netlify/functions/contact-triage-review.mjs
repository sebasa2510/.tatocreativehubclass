import { timingSafeEqual } from 'node:crypto';
import { renderReviewPage } from './_lib/contact-triage-core.mjs';
import { firestoreConfigured, listDocuments } from './_lib/firestore-rest.mjs';

/**
 * GET /api/contacts/review
 *
 * The owner's window into what triage decided for every contact submission.
 * Newest 100 records, with the ones that need a human read called out.
 *
 * This page shows real messages, so it is gated by TRIAGE_REVIEW_TOKEN and is
 * never linked from the public site. Set the token in Netlify's environment.
 */

const MAX_ROWS = 100;

function page(body, status, headers = {}) {
  return new Response(body, {
    status,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Robots-Tag': 'noindex, nofollow',
      'Referrer-Policy': 'no-referrer',
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'",
      ...headers,
    },
  });
}

function json(body, status) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Robots-Tag': 'noindex, nofollow',
    },
  });
}

function safeEqual(a, b) {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

function providedToken(request) {
  const url = new URL(request.url);
  const header = request.headers.get('authorization') || '';
  if (header.toLowerCase().startsWith('bearer ')) return header.slice(7).trim();
  return url.searchParams.get('token') || '';
}

export default async function handler(request, context) {
  const env = context?.env || process.env;

  if (request.method !== 'GET') {
    return page('Use GET.', 405, { Allow: 'GET' });
  }

  const expected = (env.TRIAGE_REVIEW_TOKEN || '').trim();
  if (!expected) {
    return page(
      `<h1>TRIAGE_REVIEW_TOKEN is not set</h1>
       <p>Set <code>TRIAGE_REVIEW_TOKEN</code> in the Netlify environment, then reload this page with <code>?token=…</code>.</p>`,
      503,
    );
  }

  if (!safeEqual(providedToken(request), expected)) {
    return page('<h1>Not found</h1>', 404);
  }

  if (!firestoreConfigured(env)) {
    return page(
      '<h1>Firebase credentials are missing</h1><p>Set <code>FIREBASE_SERVICE_ACCOUNT_JSON</code> in the Netlify environment.</p>',
      503,
    );
  }

  const url = new URL(request.url);
  const needsOnly = url.searchParams.get('needs') === '1';

  let docs;
  try {
    docs = await listDocuments({ env, collection: 'contacts', limit: MAX_ROWS });
  } catch (error) {
    console.error(
      JSON.stringify({ event: 'contact_review', step: 'read', code: error?.code || 'unknown' }),
    );
    return page('<h1>Could not read contacts</h1>', 503);
  }

  if (url.searchParams.get('format') === 'json') {
    return json(
      {
        generatedAt: new Date().toISOString(),
        count: docs.length,
        needsReview: docs.filter((doc) => doc.data?.needsReview).length,
        contacts: docs.map((doc) => ({
          id: doc.id,
          createdAt: doc.data?.createdAt || null,
          name: doc.data?.name || null,
          email: doc.data?.email || null,
          businessName: doc.data?.businessName || null,
          triage: doc.data?.triage || null,
          existingClient: doc.data?.existingClient ?? null,
          needsReview: Boolean(doc.data?.needsReview),
          reviewReason: doc.data?.reviewReason || null,
          reply: doc.data?.reply || null,
        })),
      },
      200,
    );
  }

  return page(renderReviewPage({ docs, needsOnly }));
}

export const config = { path: '/api/contacts/review' };
