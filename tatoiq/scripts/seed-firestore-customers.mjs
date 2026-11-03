/**
 * seed-firestore-customers.mjs — writes synthetic TatoIQ CLIENT records into the
 * Firestore `customers` collection, which is the collection Saggio reads in
 * client mode.
 *
 * The records are DEMO DATA (example.com emails, invented projects) and are
 * tagged `isSample: true`. Two are `active`, two are `onboarding`, one is a
 * `lead`, and one is a `former` client — the last two exist so Saggio's
 * "this is not an active client" path can be exercised honestly.
 *
 * USAGE
 *   node scripts/seed-firestore-customers.mjs            # write
 *   node scripts/seed-firestore-customers.mjs --dry-run  # print only
 *
 * AUTH
 *   Uses the Firebase CLI login already on this machine (firebase login) to get
 *   an OAuth access token. Override with GOOGLE_OAUTH_ACCESS_TOKEN if needed.
 *   Writes are idempotent: document IDs are fixed, so re-running updates the
 *   same documents instead of duplicating them.
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const PROJECT_ID = 'web-app---tato';
const COLLECTION = 'customers';
const DRY_RUN = process.argv.includes('--dry-run');

const CLIENT_ID = '563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com';
const CLIENT_SECRET = 'j9iVZfS8kkCEFUPaAeJV0sAi';

/**
 * Deliberately varied so every Saggio client path has a real record behind it:
 * a full record, a sparse record, an onboarding record, a non-client lead, and a
 * former client. The sparse record is the important one — Saggio must say "not
 * in the record" rather than invent a status.
 */
const CUSTOMERS = [
  {
    id: 'customer_sample_001',
    email: 'maria@brickellbuilders.example.com',
    name: 'Maria Alvarez',
    businessName: 'Brickell Builders LLC',
    status: 'active',
    services: ['Business tax return', 'Monthly bookkeeping'],
    engagementSummary:
      '2025 S-corp return and monthly bookkeeping for a construction company with two owners.',
    projectStatus: 'Bookkeeping is current through September. The 2025 return is in preparer review.',
    projectStage: 'preparer_review',
    nextMilestone: 'Preparer review call',
    nextMilestoneDate: 'the week of November 9, 2026',
    owner: 'A. Chen, EA',
    team: 'Business tax',
    responseWindow: 'within two business days',
    kickoffChecklist: [
      { id: 'bank-access', label: 'Connect the business bank and card accounts', done: true },
      { id: 'payroll-report', label: 'Send the Q3 payroll report', done: false, note: 'Needed before the return can be finalized.' },
      { id: 'owner-info', label: 'Confirm both owners’ 2025 wages', done: false },
    ],
  },
  {
    id: 'customer_sample_002',
    email: 'devon@coconutgrovebooks.example.com',
    name: 'Devon Reed',
    businessName: 'Coconut Grove Books',
    status: 'onboarding',
    services: ['Bookkeeping', 'Quarterly estimated payments'],
    engagementSummary: 'New bookkeeping engagement for an independent bookstore; kickoff is in progress.',
    projectStatus: 'Kickoff is in progress. No work has been filed yet.',
    projectStage: 'kickoff',
    owner: 'R. Patel, EA',
    team: 'Client success',
    kickoffChecklist: [
      { id: 'engagement-letter', label: 'Sign the engagement letter', done: false },
      { id: 'prior-return', label: 'Upload the prior-year business return', done: false },
      { id: 'access', label: 'Accept the accounting-software invitation', done: true },
    ],
  },
  {
    id: 'customer_sample_003',
    email: 'jordan@wynwooddesign.example.com',
    name: 'Jordan Lee',
    businessName: 'Wynwood Design Studio',
    status: 'active',
    services: ['Annual tax return'],
    engagementSummary: 'Individual and single-member LLC return.',
    // Sparse on purpose: no projectStatus, no milestone. Saggio may quote the
    // scope but must not guess where the return stands.
    projectStage: 'document_gathering',
    owner: 'M. Alvarez, CPA',
    team: 'Individual tax',
  },
  {
    id: 'customer_sample_004',
    email: 'sam@littlehavanacafe.example.com',
    name: 'Sam Ortega',
    businessName: 'Little Havana Cafés',
    status: 'onboarding',
    services: ['Bookkeeping clean-up', 'Payroll setup'],
    projectStatus: 'Clean-up has not started; the first payroll run is waiting on account access.',
    projectStage: 'kickoff',
    nextMilestone: 'Payroll setup call',
    owner: 'A. Chen, EA',
    team: 'Client success',
    kickoffChecklist: [
      { id: 'payroll-access', label: 'Add TatoIQ as a payroll administrator', done: false },
      { id: 'missing-months', label: 'Send bank statements for the three missing months', done: false },
    ],
  },
  {
    id: 'customer_sample_005',
    email: 'owner@doral-logistics.example.com',
    name: 'Alexis Morgan',
    businessName: 'Doral Logistics Co.',
    status: 'lead',
    services: ['Business tax return'],
    engagementSummary: 'Inbound lead; no engagement signed.',
  },
  {
    id: 'customer_sample_006',
    email: 'former@keybiscayne-realty.example.com',
    name: 'Chris Bennett',
    businessName: 'Key Biscayne Realty',
    status: 'former',
    services: ['Annual tax return'],
    engagementSummary: 'Engagement closed after the 2024 return.',
  },
];

function toFirestoreFields(customer) {
  const now = new Date().toISOString();
  const checklist = (customer.kickoffChecklist ?? []).map((item) => ({
    mapValue: {
      fields: {
        id: { stringValue: item.id },
        label: { stringValue: item.label },
        done: { booleanValue: item.done === true },
        ...(item.note ? { note: { stringValue: item.note } } : {}),
      },
    },
  }));

  const fields = {
    email: { stringValue: customer.email },
    normalizedEmail: { stringValue: customer.email.trim().toLowerCase() },
    name: { stringValue: customer.name },
    businessName: { stringValue: customer.businessName },
    status: { stringValue: customer.status },
    services: { arrayValue: { values: customer.services.map((value) => ({ stringValue: value })) } },
    isSample: { booleanValue: true },
    createdAt: { stringValue: now },
    updatedAt: { stringValue: now },
  };

  if (customer.engagementSummary) fields.engagementSummary = { stringValue: customer.engagementSummary };
  if (customer.projectStatus) fields.projectStatus = { stringValue: customer.projectStatus };
  if (customer.projectStage) fields.projectStage = { stringValue: customer.projectStage };
  if (customer.nextMilestone) fields.nextMilestone = { stringValue: customer.nextMilestone };
  if (customer.nextMilestoneDate) fields.nextMilestoneDate = { stringValue: customer.nextMilestoneDate };
  if (customer.owner) fields.owner = { stringValue: customer.owner };
  if (customer.team) fields.team = { stringValue: customer.team };
  if (customer.responseWindow) fields.responseWindow = { stringValue: customer.responseWindow };
  if (customer.kickoffChecklist) {
    fields.kickoffChecklist = { arrayValue: { values: checklist } };
  }

  return fields;
}

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
      return tokens.access_token;
    }
    if (tokens.refresh_token) return { refreshToken: tokens.refresh_token };
  }
  return null;
}

async function accessToken() {
  if (process.env.GOOGLE_OAUTH_ACCESS_TOKEN) return process.env.GOOGLE_OAUTH_ACCESS_TOKEN;
  const found = firebaseCliToken();
  if (!found) throw new Error('No Firebase CLI login found. Run `firebase login` or set GOOGLE_OAUTH_ACCESS_TOKEN.');
  if (typeof found === 'string') return found;
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      refresh_token: found.refreshToken,
      grant_type: 'refresh_token',
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Token refresh failed (${res.status}). Run \`firebase login\` again.`);
  return data.access_token;
}

async function main() {
  if (DRY_RUN) {
    for (const customer of CUSTOMERS) {
      console.log(`${customer.id}  ${customer.status.padEnd(10)}  ${customer.businessName}  <${customer.email}>`);
    }
    console.log(`\n${CUSTOMERS.length} documents would be written to ${COLLECTION}.`);
    return;
  }

  const token = await accessToken();
  const base = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/${COLLECTION}`;

  let written = 0;
  for (const customer of CUSTOMERS) {
    const res = await fetch(`${base}/${customer.id}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields: toFirestoreFields(customer) }),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Write failed for ${customer.id}: ${res.status} ${body.slice(0, 300)}`);
    }
    written += 1;
    console.log(`✓ ${customer.id}  ${customer.businessName}`);
  }

  console.log(`\n${written} customers written to Firestore (${PROJECT_ID}/${COLLECTION}).`);
}

await main();
