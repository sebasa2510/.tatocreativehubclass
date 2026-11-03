/**
 * cco-triage.mjs — CCO Triage Agent, Netlify Function.
 *
 * Endpoint: POST /api/cco/triage
 *
 * What it does: reads one inbound customer message, asks the model to classify
 * it, assigns the owner from a fixed table, and writes the analysis onto the
 * customer record in Netlify Blobs. It has no reply path and no send path.
 *
 * What it never does: answer a customer, send anything, touch Gmail, decide
 * money, or write a triage result it could not persist.
 *
 * Environment (server-side only; never expose to the browser):
 *   OPENAI_API_KEY            required for live triage
 *   CCO_TRIAGE_MODEL          optional, default gpt-4o-mini
 *   CCO_ALLOWED_ORIGINS       optional comma-separated extra browser origins
 *   CCO_TRIAGE_TOKEN          optional, required for origin-less server calls
 *   CCO_REQUIRE_TOKEN         optional "true" to require the token everywhere
 *   CCO_RATE_LIMIT_PER_10MIN  optional, default 60; 0 disables
 *   CCO_TRIAGE_TIMEOUT_MS     optional, default 20000
 *   CCO_BLOBS_STORE           optional, default cco-customers
 *   CCO_BLOBS_SITE_ID         optional, local runs only
 *   CCO_BLOBS_TOKEN           optional, local runs only
 *
 * See docs/CCO-TRIAGE.md for the request and response shapes.
 */

import { getStore } from '@netlify/blobs';
import { DEFAULT_STORE, handleTriageRequest } from './_lib/cco-triage-core.mjs';

function openStore(env) {
  const options = {
    name: env.CCO_BLOBS_STORE || DEFAULT_STORE,
    consistency: 'strong',
  };

  // On Netlify these are injected automatically. They are only needed when the
  // function runs outside a Netlify context (for example, a local harness).
  if (env.CCO_BLOBS_SITE_ID && env.CCO_BLOBS_TOKEN) {
    options.siteID = env.CCO_BLOBS_SITE_ID;
    options.token = env.CCO_BLOBS_TOKEN;
  }

  return getStore(options);
}

export default async function handler(request) {
  return handleTriageRequest(request, {
    env: process.env,
    fetchImpl: fetch,
    openStore,
  });
}

// A custom path replaces the default /.netlify/functions/cco-triage route.
// This is the one URL the site calls.
export const config = {
  path: '/api/cco/triage',
};
