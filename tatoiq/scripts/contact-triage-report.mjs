/**
 * contact-triage-report.mjs - read the triage decision for each contact
 * submission from the terminal, without deploying anything.
 *
 * Usage:
 *   node scripts/contact-triage-report.mjs
 *   node scripts/contact-triage-report.mjs --needs
 *   node scripts/contact-triage-report.mjs --limit 50 --json
 *
 * Credentials: FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_ACCESS_TOKEN, or a
 * Firebase CLI login on this machine (the same one `firebase deploy` uses).
 * Read-only: this script never writes to Firestore.
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { firestoreConfigured, listDocuments } from '../netlify/functions/_lib/firestore-rest.mjs';

const PROJECT_ID = 'web-app---tato';
const CLIENT_ID = '563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com';
const CLIENT_SECRET = 'j9iVZfS8kkCEFUPaAeJV0sAi';

const args = process.argv.slice(2);
const needsOnly = args.includes('--needs');
const asJson = args.includes('--json');
const limitIndex = args.indexOf('--limit');
const limit = limitIndex >= 0 ? Number.parseInt(args[limitIndex + 1] || '25', 10) : 25;

function firebaseCliToken() {
  const candidates = [
    path.join(os.homedir(), '.config', 'configstore', 'firebase-tools.json'),
    path.join(process.env.APPDATA || '', 'configstore', 'firebase-tools.json'),
  ];
  for (const file of candidates) {
    if (!fs.existsSync(file)) continue;
    const cfg = JSON.parse(fs.readFileSync(file, 'utf8'));
    const tokens = cfg.tokens || {};
    if (tokens.access_token && tokens.expires_at && tokens.expires_at > Date.now() + 60_000) {
      return { accessToken: tokens.access_token };
    }
    if (tokens.refresh_token) return { refreshToken: tokens.refresh_token };
  }
  return null;
}

async function withCliCredentials() {
  if (firestoreConfigured(process.env)) return process.env;

  const found = firebaseCliToken();
  if (!found) {
    throw new Error(
      'No Firestore credentials. Set FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_ACCESS_TOKEN, or run `firebase login`.',
    );
  }
  if (found.accessToken) {
    return { ...process.env, FIREBASE_ACCESS_TOKEN: found.accessToken, FIREBASE_PROJECT_ID: PROJECT_ID };
  }

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      refresh_token: found.refreshToken,
      grant_type: 'refresh_token',
    }),
  });
  const data = await response.json();
  if (!response.ok || !data.access_token) throw new Error(`Token refresh failed (${response.status}).`);
  return { ...process.env, FIREBASE_ACCESS_TOKEN: data.access_token, FIREBASE_PROJECT_ID: PROJECT_ID };
}

function formatWhen(value) {
  const parsed = Date.parse(String(value || ''));
  if (!Number.isFinite(parsed)) return String(value || '');
  return new Date(parsed).toISOString().replace('T', ' ').slice(0, 16) + 'Z';
}

const env = await withCliCredentials();
const docs = await listDocuments({ env, collection: 'contacts', limit });
const rows = needsOnly ? docs.filter((doc) => doc.data?.needsReview) : docs;

if (asJson) {
  console.log(
    JSON.stringify(
      rows.map((doc) => ({
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
      null,
      2,
    ),
  );
  process.exit(0);
}

if (rows.length === 0) {
  console.log(needsOnly ? 'Nothing needs a review.' : 'No contact submissions found.');
  process.exit(0);
}

console.log(`Contact triage decisions - ${rows.length} record(s)\n`);
for (const doc of rows) {
  const data = doc.data || {};
  const triage = data.triage || {};
  const reply = data.reply || {};
  const flag = data.needsReview ? '  <-- READ THIS' : '';

  console.log(`${formatWhen(data.createdAt)}  ${data.name || 'Unknown'} <${data.email || 'no email'}>${flag}`);
  console.log(`  id        ${doc.id}`);
  console.log(`  intent    ${triage.intent || data.reviewReason || 'no decision recorded'}`);
  console.log(
    `  category  ${triage.category || data.triageStatus || '-'}    urgency ${triage.urgency || '-'}    owner ${triage.owner || '-'}`,
  );
  console.log(
    `  reply     ${reply.kind || '-'} / ${reply.status || '-'}${reply.error ? ` (${reply.error})` : ''}`,
  );
  if (data.existingClient === true) console.log('  client    existing customer record found');
  if (data.existingClient === false) console.log('  client    no customer record matched this email');
  if (data.needsReview) console.log(`  review    ${data.reviewReason || 'flagged'}`);
  console.log('');
}
