import { createSign } from 'node:crypto';
import { readFileSync } from 'node:fs';

/**
 * firestore-rest.mjs - SERVER-ONLY Firestore access for Netlify Functions.
 *
 * The contact form writes with the browser SDK, but the follow-up work
 * (triage, reply state, review list) must not be writable from a page, and the
 * service account never ships to the client. This module talks to the Firestore
 * REST API directly so it adds no package and stays on the free tier: no Cloud
 * Functions, no Blaze plan.
 *
 * Credentials, in order of precedence:
 *   - FIREBASE_ACCESS_TOKEN          short-lived token (local checks / CI)
 *   - FIREBASE_SERVICE_ACCOUNT_JSON  the JSON itself (single line, preferred)
 *   - GOOGLE_APPLICATION_CREDENTIALS path to the JSON file
 */

const SCOPE = 'https://www.googleapis.com/auth/datastore';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const DEFAULT_PROJECT = 'web-app---tato';

/** Tokens are per service account and last about an hour. */
const tokenCache = new Map();

export class FirestoreError extends Error {
  constructor(code, message, detail) {
    super(message);
    this.name = 'FirestoreError';
    this.code = code;
    this.detail = detail;
  }
}

function parseServiceAccount(raw) {
  if (!raw || typeof raw !== 'string') return null;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed?.client_email || !parsed?.private_key) return null;
    return {
      client_email: parsed.client_email,
      private_key: String(parsed.private_key).replace(/\\n/g, '\n'),
      project_id: parsed.project_id,
    };
  } catch {
    return null;
  }
}

function loadConfig(env) {
  const projectId = (env.FIREBASE_PROJECT_ID || '').trim() || DEFAULT_PROJECT;
  const direct = (env.FIREBASE_ACCESS_TOKEN || '').trim();

  let account = parseServiceAccount(env.FIREBASE_SERVICE_ACCOUNT_JSON);
  if (!account) {
    const path = (env.GOOGLE_APPLICATION_CREDENTIALS || '').trim();
    if (path) {
      try {
        account = parseServiceAccount(readFileSync(path, 'utf8'));
      } catch {
        account = null;
      }
    }
  }

  if (direct) return { projectId, account };
  if (!account) return null;
  return { projectId: (env.FIREBASE_PROJECT_ID || '').trim() || account.project_id || DEFAULT_PROJECT, account };
}

export function firestoreConfigured(env = {}) {
  return Boolean(loadConfig(env));
}

function base64Url(value) {
  return Buffer.from(value)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

async function accessToken(config, env, fetchImpl) {
  const direct = (env.FIREBASE_ACCESS_TOKEN || '').trim();
  if (direct) return direct;

  const account = config.account;
  if (!account) {
    throw new FirestoreError('not_configured', 'Firestore credentials are not configured.');
  }

  const cacheKey = account.client_email;
  const cached = tokenCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now() + 60_000) return cached.value;

  const issuedAt = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claims = base64Url(
    JSON.stringify({
      iss: account.client_email,
      scope: SCOPE,
      aud: TOKEN_URL,
      iat: issuedAt,
      exp: issuedAt + 3600,
    }),
  );
  const signature = createSign('RSA-SHA256').update(`${header}.${claims}`).sign(account.private_key);
  const assertion = `${header}.${claims}.${base64Url(signature)}`;

  const response = await fetchImpl(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  });

  if (!response.ok) {
    throw new FirestoreError(
      'auth_failed',
      'Firestore rejected the service account. Check the credentials.',
      { status: response.status },
    );
  }

  const data = await response.json();
  if (!data?.access_token) {
    throw new FirestoreError('auth_failed', 'Firestore did not return an access token.');
  }

  tokenCache.set(cacheKey, {
    value: data.access_token,
    expiresAt: Date.now() + Math.max(60, Number(data.expires_in) || 3600) * 1000,
  });
  return data.access_token;
}

export function encodeValue(value) {
  if (value === null || value === undefined) return { nullValue: null };
  if (typeof value === 'string') return { stringValue: value };
  if (typeof value === 'boolean') return { booleanValue: value };
  if (typeof value === 'number') {
    return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  }
  if (Array.isArray(value)) return { arrayValue: { values: value.map(encodeValue) } };
  return { mapValue: { fields: encodeFields(value) } };
}

export function encodeFields(object = {}) {
  const fields = {};
  for (const [key, value] of Object.entries(object)) {
    if (value === undefined) continue;
    fields[key] = encodeValue(value);
  }
  return fields;
}

export function decodeValue(value) {
  if (!value || typeof value !== 'object') return null;
  if ('nullValue' in value) return null;
  if ('stringValue' in value) return value.stringValue;
  if ('booleanValue' in value) return value.booleanValue;
  if ('integerValue' in value) return Number(value.integerValue);
  if ('doubleValue' in value) return value.doubleValue;
  if ('timestampValue' in value) return value.timestampValue;
  if ('arrayValue' in value) return (value.arrayValue?.values || []).map(decodeValue);
  if ('mapValue' in value) return decodeFields(value.mapValue?.fields || {});
  return null;
}

export function decodeFields(fields = {}) {
  const out = {};
  for (const [key, value] of Object.entries(fields)) out[key] = decodeValue(value);
  return out;
}

function documentPath(config, collection, id) {
  return `projects/${config.projectId}/databases/(default)/documents/${collection}/${encodeURIComponent(id)}`;
}

async function authorizedFetch(config, env, fetchImpl, url, init = {}) {
  const token = await accessToken(config, env, fetchImpl);
  return fetchImpl(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init.headers || {}),
      Authorization: `Bearer ${token}`,
    },
  });
}

/** Read one document. Returns null when it does not exist. */
export async function getDocument({ env = {}, collection, id, fetchImpl = fetch }) {
  const config = loadConfig(env);
  if (!config) throw new FirestoreError('not_configured', 'Firestore credentials are not configured.');

  const response = await authorizedFetch(
    config,
    env,
    fetchImpl,
    `https://firestore.googleapis.com/v1/${documentPath(config, collection, id)}`,
  );

  if (response.status === 404) return null;
  if (!response.ok) {
    throw new FirestoreError('read_failed', 'Could not read the Firestore record.', {
      status: response.status,
    });
  }

  const doc = await response.json();
  return { id, data: decodeFields(doc.fields || {}) };
}

/** Merge the given fields into one document. Unlisted fields are untouched. */
export async function patchDocument({ env = {}, collection, id, data, fetchImpl = fetch }) {
  const config = loadConfig(env);
  if (!config) throw new FirestoreError('not_configured', 'Firestore credentials are not configured.');

  const fieldPaths = Object.keys(data).filter((key) => data[key] !== undefined);
  if (fieldPaths.length === 0) return true;

  const params = new URLSearchParams();
  for (const path of fieldPaths) params.append('updateMask.fieldPaths', path);

  const response = await authorizedFetch(
    config,
    env,
    fetchImpl,
    `https://firestore.googleapis.com/v1/${documentPath(config, collection, id)}?${params.toString()}`,
    { method: 'PATCH', body: JSON.stringify({ fields: encodeFields(data) }) },
  );

  if (!response.ok) {
    throw new FirestoreError('write_failed', 'Could not update the Firestore record.', {
      status: response.status,
    });
  }
  return true;
}

/** Newest-first list of documents in a collection. */
export async function listDocuments({
  env = {},
  collection,
  limit = 50,
  orderBy = 'createdAt',
  fetchImpl = fetch,
}) {
  const config = loadConfig(env);
  if (!config) throw new FirestoreError('not_configured', 'Firestore credentials are not configured.');

  const response = await authorizedFetch(
    config,
    env,
    fetchImpl,
    `https://firestore.googleapis.com/v1/projects/${config.projectId}/databases/(default)/documents:runQuery`,
    {
      method: 'POST',
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: collection }],
          orderBy: [{ field: { fieldPath: orderBy }, direction: 'DESCENDING' }],
          limit: Math.min(Math.max(Number(limit) || 50, 1), 200),
        },
      }),
    },
  );

  if (!response.ok) {
    throw new FirestoreError('query_failed', 'Could not list Firestore records.', {
      status: response.status,
    });
  }

  const rows = await response.json();
  return (Array.isArray(rows) ? rows : [])
    .filter((row) => row?.document?.name)
    .map((row) => ({
      id: String(row.document.name).split('/').pop(),
      data: decodeFields(row.document.fields || {}),
    }));
}

/**
 * Best-effort lookup of a customer record by email. Used only to mark whether a
 * contact-form sender is already a client.
 *
 * Returns `{ matched: true, customerId }`, `{ matched: false, customerId: null }`
 * for a definitive miss, or `{ matched: null }` when the lookup could not run.
 * The three states matter: a failed lookup must not read as "not a client".
 */
export async function lookupCustomerByEmail({ env = {}, email, fetchImpl = fetch }) {
  if (!email) return { matched: false, customerId: null };
  const config = loadConfig(env);
  if (!config) return { matched: null, customerId: null };

  const normalized = String(email).trim().toLowerCase();
  const url = `https://firestore.googleapis.com/v1/projects/${config.projectId}/databases/(default)/documents:runQuery`;

  for (const fieldPath of ['normalizedEmail', 'email']) {
    let response;
    try {
      response = await authorizedFetch(config, env, fetchImpl, url, {
        method: 'POST',
        body: JSON.stringify({
          structuredQuery: {
            from: [{ collectionId: 'customers' }],
            where: {
              fieldFilter: {
                field: { fieldPath },
                op: 'EQUAL',
                value: { stringValue: fieldPath === 'email' ? String(email).trim() : normalized },
              },
            },
            limit: 1,
          },
        }),
      });
    } catch {
      return { matched: null, customerId: null };
    }
    if (!response.ok) return { matched: null, customerId: null };
    const rows = await response.json().catch(() => null);
    if (!Array.isArray(rows)) return { matched: null, customerId: null };
    const found = rows.find((row) => row?.document?.name);
    if (found) return { matched: true, customerId: String(found.document.name).split('/').pop() };
  }
  return { matched: false, customerId: null };
}
