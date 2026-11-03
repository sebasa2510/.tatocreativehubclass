import 'server-only';

import { createSign } from 'node:crypto';
import { readFileSync } from 'node:fs';

import {
  normalizeEmail,
  type CustomerHandoff,
  type CustomerRecord,
  type CustomerRouting,
  type KickoffItem,
} from './client-records';

/**
 * firestore-store.ts — SERVER-ONLY Firestore access for the `customers`
 * collection.
 *
 * Why not the browser SDK? Because a customer record is not public page data.
 * The API route looks it up with a service account and returns only Saggio's
 * answer. No service-account key, access token, or record is ever shipped to the
 * browser.
 *
 * The adapter uses Firestore's REST API directly, so it needs no extra package.
 * It supports:
 *   - FIREBASE_SERVICE_ACCOUNT_JSON  (the JSON itself; preferred on Netlify)
 *   - GOOGLE_APPLICATION_CREDENTIALS (a path to the JSON file)
 *   - FIREBASE_ACCESS_TOKEN          (short-lived token, useful locally)
 *
 * If none is present, the route reports that records are unavailable rather
 * than inventing a customer or silently treating everyone as a stranger.
 */

const FIRESTORE_SCOPE = 'https://www.googleapis.com/auth/datastore';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';

interface ServiceAccount {
  client_email: string;
  private_key: string;
  project_id?: string;
}

interface StoreConfig {
  projectId: string;
  account?: ServiceAccount;
}

interface FsValue {
  nullValue?: null;
  stringValue?: string;
  booleanValue?: boolean;
  integerValue?: string;
  doubleValue?: number;
  timestampValue?: string;
  arrayValue?: { values?: FsValue[] };
  mapValue?: { fields?: Record<string, FsValue> };
}

interface FsDocument {
  name?: string;
  fields?: Record<string, FsValue>;
}

interface QueryResponseRow {
  document?: FsDocument;
}

let cachedToken: { value: string; expiresAt: number } | null = null;

function serviceAccountFromJson(raw: string): ServiceAccount | null {
  try {
    const parsed = JSON.parse(raw) as Partial<ServiceAccount>;
    if (!parsed.client_email || !parsed.private_key) return null;
    return {
      client_email: parsed.client_email,
      private_key: parsed.private_key.replace(/\\n/g, '\n'),
      project_id: parsed.project_id,
    };
  } catch {
    return null;
  }
}

function loadConfig(): StoreConfig | null {
  const projectFromEnv = process.env.FIREBASE_PROJECT_ID?.trim();

  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
  let account: ServiceAccount | null = raw ? serviceAccountFromJson(raw) : null;

  if (!account) {
    const path = process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim();
    if (path) {
      try {
        account = serviceAccountFromJson(readFileSync(path, 'utf8'));
      } catch {
        account = null;
      }
    }
  }

  if (process.env.FIREBASE_ACCESS_TOKEN?.trim()) {
    return { projectId: projectFromEnv || account?.project_id || 'web-app---tato' };
  }
  if (!account) return null;

  return {
    projectId: projectFromEnv || account.project_id || 'web-app---tato',
    account,
  };
}

function base64Url(value: string | Buffer): string {
  return Buffer.from(value)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

async function accessToken(config: StoreConfig): Promise<string | null> {
  const direct = process.env.FIREBASE_ACCESS_TOKEN?.trim();
  if (direct) return direct;
  if (!config.account) return null;

  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.value;

  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const payload = base64Url(
    JSON.stringify({
      iss: config.account.client_email,
      scope: FIRESTORE_SCOPE,
      aud: TOKEN_URL,
      iat: now,
      exp: now + 3600,
    }),
  );
  const unsigned = `${header}.${payload}`;
  const signer = createSign('RSA-SHA256');
  signer.update(unsigned);
  signer.end();
  const signature = base64Url(signer.sign(config.account.private_key));
  const assertion = `${unsigned}.${signature}`;

  try {
    const res = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion,
      }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { access_token?: string; expires_in?: number };
    if (!data.access_token) return null;
    cachedToken = {
      value: data.access_token,
      expiresAt: Date.now() + Math.max(60, data.expires_in ?? 3600) * 1000,
    };
    return data.access_token;
  } catch {
    return null;
  }
}

function documentsUrl(config: StoreConfig): string {
  return `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(
    config.projectId,
  )}/databases/(default)/documents`;
}

function decodeValue(value: FsValue): unknown {
  if ('nullValue' in value) return null;
  if (typeof value.stringValue === 'string') return value.stringValue;
  if (typeof value.booleanValue === 'boolean') return value.booleanValue;
  if (typeof value.integerValue === 'string') return Number(value.integerValue);
  if (typeof value.doubleValue === 'number') return value.doubleValue;
  if (typeof value.timestampValue === 'string') return value.timestampValue;
  if (value.arrayValue) return (value.arrayValue.values ?? []).map(decodeValue);
  if (value.mapValue) return decodeFields(value.mapValue.fields ?? {});
  return null;
}

function decodeFields(fields: Record<string, FsValue>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(fields)) out[key] = decodeValue(value);
  return out;
}

function encodeValue(value: unknown): FsValue | null {
  if (value === null) return { nullValue: null };
  if (typeof value === 'string') return { stringValue: value };
  if (typeof value === 'boolean') return { booleanValue: value };
  if (typeof value === 'number') {
    return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  }
  if (Array.isArray(value)) {
    return { arrayValue: { values: value.map(encodeValue).filter((v): v is FsValue => v !== null) } };
  }
  if (value && typeof value === 'object') {
    return {
      mapValue: {
        fields: Object.fromEntries(
          Object.entries(value as Record<string, unknown>)
            .map(([key, item]) => [key, encodeValue(item)] as const)
            .filter((entry): entry is readonly [string, FsValue] => entry[1] !== null),
        ),
      },
    };
  }
  return null;
}

function stringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string').map((item) => item.trim()).filter(Boolean);
}

function checklist(value: unknown): KickoffItem[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object')
    .map((item) => ({
      id: typeof item.id === 'string' ? item.id : undefined,
      label: typeof item.label === 'string' ? item.label : '',
      done: item.done === true,
      note: typeof item.note === 'string' ? item.note : undefined,
    }))
    .filter((item) => item.label.trim().length > 0);
}

function stringValue(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function toRecord(doc: FsDocument): CustomerRecord | null {
  const id = doc.name?.split('/').pop();
  if (!id) return null;
  const fields = decodeFields(doc.fields ?? {});
  const email = stringValue(fields.email);
  if (!email) return null;

  const routing = fields.routing;
  const handoff = fields.handoff;

  return {
    id,
    email,
    normalizedEmail: stringValue(fields.normalizedEmail) ?? normalizeEmail(email),
    name: stringValue(fields.name),
    businessName: stringValue(fields.businessName),
    status: stringValue(fields.status) ?? 'lead',
    services: stringArray(fields.services),
    hiredFor: stringArray(fields.hiredFor),
    engagementSummary: stringValue(fields.engagementSummary),
    projectStatus: stringValue(fields.projectStatus),
    projectStage: stringValue(fields.projectStage),
    nextMilestone: stringValue(fields.nextMilestone),
    nextMilestoneDate: stringValue(fields.nextMilestoneDate),
    owner: stringValue(fields.owner),
    team: stringValue(fields.team),
    responseWindow: stringValue(fields.responseWindow),
    kickoffChecklist: checklist(fields.kickoffChecklist),
    checklist: checklist(fields.checklist),
    lastTalkedAt: stringValue(fields.lastTalkedAt),
    lastContactAt: stringValue(fields.lastContactAt),
    conversationSummary: stringValue(fields.conversationSummary),
    conversationCount: typeof fields.conversationCount === 'number' ? fields.conversationCount : undefined,
    openQuestions: stringArray(fields.openQuestions),
    routing:
      routing && typeof routing === 'object'
        ? (routing as CustomerRouting)
        : undefined,
    handoff:
      handoff && typeof handoff === 'object'
        ? (handoff as CustomerHandoff)
        : undefined,
    needsAttention: fields.needsAttention === true,
    updatedAt: stringValue(fields.updatedAt),
    isSample: fields.isSample === true,
  };
}

async function queryByField(
  config: StoreConfig,
  field: string,
  value: string,
  limit = 1,
): Promise<FsDocument | null> {
  const token = await accessToken(config);
  if (!token) return null;

  const res = await fetch(`${documentsUrl(config)}:runQuery`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: 'customers' }],
        where: {
          fieldFilter: {
            field: { fieldPath: field },
            op: 'EQUAL',
            value: { stringValue: value },
          },
        },
        limit,
      },
    }),
  });

  if (!res.ok) throw new Error(`Firestore query failed (${res.status})`);
  const rows = (await res.json()) as QueryResponseRow[];
  return rows.find((row) => row.document)?.document ?? null;
}

/** Whether the server has enough configuration to look up customers. */
export function isCustomerStoreConfigured(): boolean {
  return loadConfig() !== null;
}

/**
 * Find a customer by email. The normalized field is preferred; a legacy
 * `email` field and a small fallback scan keep old records usable.
 *
 * Returns `null` for "no record" and throws for an infrastructure failure so the
 * route can distinguish the two.
 */
export async function findCustomerByEmail(email: string): Promise<CustomerRecord | null> {
  const config = loadConfig();
  if (!config) return null;

  const normalized = normalizeEmail(email);
  const byNormalized = await queryByField(config, 'normalizedEmail', normalized);
  if (byNormalized) return toRecord(byNormalized);

  const byEmail = await queryByField(config, 'email', normalized);
  if (byEmail) return toRecord(byEmail);

  // Exports often preserve the original casing. A bounded scan is acceptable
  // for a small customers collection and avoids a case-sensitive miss.
  const token = await accessToken(config);
  if (!token) return null;
  const res = await fetch(`${documentsUrl(config)}/customers?pageSize=300`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { documents?: FsDocument[] };
  for (const doc of data.documents ?? []) {
    const record = toRecord(doc);
    if (record && normalizeEmail(record.email) === normalized) return record;
  }
  return null;
}

export interface ConversationPatch {
  summary: string;
  at: string;
  intent: string;
  openQuestion?: string;
  routing?: CustomerRouting;
  handoff?: CustomerHandoff;
  needsAttention?: boolean;
}

/**
 * Write the one-line summary, last-talked date, and any routing/handoff data.
 * Returns false when the store is not configured or the write failed; callers
 * still return the answer so a record outage does not take the chat down.
 */
export async function persistConversation(
  record: CustomerRecord,
  patch: ConversationPatch,
): Promise<boolean> {
  const config = loadConfig();
  if (!config) return false;
  const token = await accessToken(config);
  if (!token) return false;

  const existingQuestions = record.openQuestions ?? [];
  const openQuestions = patch.openQuestion
    ? [...new Set([...existingQuestions, patch.openQuestion])].slice(-25)
    : existingQuestions;

  const update: Record<string, unknown> = {
    conversationSummary: patch.summary,
    lastTalkedAt: patch.at,
    lastConversationAt: patch.at,
    lastIntent: patch.intent,
    conversationCount: (record.conversationCount ?? 0) + 1,
    updatedAt: patch.at,
  };
  if (patch.openQuestion) update.openQuestions = openQuestions;
  if (patch.routing) update.routing = patch.routing;
  if (patch.handoff) {
    update.handoff = patch.handoff;
    update.needsAttention = true;
  } else if (patch.needsAttention !== undefined) {
    update.needsAttention = patch.needsAttention;
  }

  const fields = Object.fromEntries(
    Object.entries(update)
      .map(([key, value]) => [key, encodeValue(value)] as const)
      .filter((entry): entry is readonly [string, FsValue] => entry[1] !== null),
  );
  const mask = Object.keys(fields)
    .map((key) => `updateMask.fieldPaths=${encodeURIComponent(key)}`)
    .join('&');

  try {
    const res = await fetch(
      `${documentsUrl(config)}/customers/${encodeURIComponent(record.id)}?${mask}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ fields }),
      },
    );
    return res.ok;
  } catch {
    return false;
  }
}
