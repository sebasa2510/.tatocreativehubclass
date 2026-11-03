/**
 * seed-firestore-contacts.mjs — writes the 18 synthetic TatoIQ demo leads into
 * the Firestore `contacts` collection.
 *
 * The records are DEMO DATA (example.com emails, 555 phone numbers) and are
 * tagged `isSample: true`. They exist so the lead/contact views have something
 * realistic to show; they are not real people.
 *
 * USAGE
 *   node scripts/seed-firestore-contacts.mjs            # write
 *   node scripts/seed-firestore-contacts.mjs --dry-run  # print only
 *
 * AUTH
 *   Uses the Firebase CLI login already on this machine (firebase login) to get
 *   an OAuth access token. Override with GOOGLE_OAUTH_ACCESS_TOKEN if needed.
 *   Writes are idempotent: document IDs are the lead IDs, so re-running updates
 *   the same 18 documents instead of duplicating them.
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const PROJECT_ID = 'web-app---tato';
const COLLECTION = 'contacts';
const DRY_RUN = process.argv.includes('--dry-run');

const CLIENT_ID = '563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com';
const CLIENT_SECRET = 'j9iVZfS8kkCEFUPaAeJV0sAi';

const LEADS = [
  { id: 'lead_sample_001', businessName: 'Brickell Builders LLC', contactName: 'Owner A. Sample', email: 'brickell.builders.llc@example.com', phone: '(305) 555-0101', state: 'FL', industry: 'construction', entityType: 'sole proprietor', grade: 'A', score: 100, stage: 'DO_NOT_CONTACT', source: 'Referral', assignedTo: 'A. Chen, EA', doNotContact: true, consentStatus: 'GRANTED', nextAction: 'Assign to a licensed specialist and approve outreach promptly.' },
  { id: 'lead_sample_002', businessName: 'Coral Gables Consulting', contactName: 'Owner B. Sample', email: 'coral.gables.consulting@example.com', phone: '(305) 555-0102', state: 'FL', industry: 'professional services', entityType: 'LLC', grade: 'F', score: 54, stage: 'POOR_FIT', source: 'Website', assignedTo: 'M. Alvarez, CPA', doNotContact: false, consentStatus: 'GRANTED', nextAction: 'Mark poor fit; do not contact.' },
  { id: 'lead_sample_003', businessName: 'Little Havana Cafés', contactName: 'Owner C. Sample', email: 'little.havana.caf.s@example.com', phone: '(305) 555-0103', state: 'FL', industry: 'food services', entityType: 'S-corp', grade: 'D', score: 60, stage: 'RESEARCHING', source: 'CSV import', assignedTo: 'R. Patel, EA', doNotContact: false, consentStatus: 'GRANTED', nextAction: 'Research further to confirm service fit and intent.' },
  { id: 'lead_sample_004', businessName: 'South Beach Fitness', contactName: 'Owner D. Sample', email: 'south.beach.fitness@example.com', phone: '(305) 555-0104', state: 'GA', industry: 'personal services', entityType: 'partnership', grade: 'D', score: 62, stage: 'RESEARCHING', source: 'Event', assignedTo: null, doNotContact: false, consentStatus: 'GRANTED', nextAction: 'Research further to confirm service fit and intent.' },
  { id: 'lead_sample_005', businessName: 'Wynwood Design Studio', contactName: 'Owner E. Sample', email: 'owner4@example.com', phone: null, state: 'TX', industry: 'creative services', entityType: 'independent contractor', grade: null, score: null, stage: 'INSUFFICIENT_INFORMATION', source: 'Discovery', assignedTo: null, doNotContact: false, consentStatus: 'GRANTED', nextAction: 'Enrich and verify a contact channel before qualifying.' },
  { id: 'lead_sample_006', businessName: 'Doral Logistics Co.', contactName: 'Owner F. Sample', email: 'doral.logistics.co.@example.com', phone: '(305) 555-0106', state: 'NY', industry: 'transportation', entityType: 'sole proprietor', grade: 'F', score: 54, stage: 'POOR_FIT', source: 'Referral', assignedTo: 'M. Alvarez, CPA', doNotContact: false, consentStatus: 'GRANTED', nextAction: 'Mark poor fit; do not contact.' },
  { id: 'lead_sample_007', businessName: 'Hialeah Auto Repair', contactName: 'Owner G. Sample', email: 'hialeah.auto.repair@example.com', phone: '(305) 555-0107', state: 'CA', industry: 'retail', entityType: 'LLC', grade: 'C', score: 75, stage: 'QUALIFIED', source: 'Website', assignedTo: 'R. Patel, EA', doNotContact: false, consentStatus: 'GRANTED', nextAction: 'Nurture with educational content before outreach.' },
  { id: 'lead_sample_008', businessName: 'Key Biscayne Realty', contactName: 'Owner H. Sample', email: 'key.biscayne.realty@example.com', phone: '(305) 555-0108', state: 'FL', industry: 'real estate', entityType: 'S-corp', grade: 'D', score: 60, stage: 'RESEARCHING', source: 'CSV import', assignedTo: null, doNotContact: false, consentStatus: 'GRANTED', nextAction: 'Research further to confirm service fit and intent.' },
  { id: 'lead_sample_009', businessName: 'Aventura Wellness', contactName: 'Owner I. Sample', email: 'aventura.wellness@example.com', phone: '(305) 555-0109', state: 'FL', industry: 'healthcare', entityType: 'partnership', grade: 'C', score: 79, stage: 'QUALIFIED', source: 'Event', assignedTo: 'A. Chen, EA', doNotContact: false, consentStatus: 'GRANTED', nextAction: 'Nurture with educational content before outreach.' },
  { id: 'lead_sample_010', businessName: 'Miami Lakes Landscaping', contactName: 'Owner J. Sample', email: 'owner9@example.com', phone: null, state: 'FL', industry: 'e-commerce', entityType: 'independent contractor', grade: null, score: null, stage: 'INSUFFICIENT_INFORMATION', source: 'Discovery', assignedTo: null, doNotContact: false, consentStatus: 'UNKNOWN', nextAction: 'Enrich and verify a contact channel before qualifying.' },
  { id: 'lead_sample_011', businessName: 'Homestead Growers', contactName: 'Owner K. Sample', email: 'homestead.growers@example.com', phone: '(305) 555-0111', state: 'FL', industry: 'construction', entityType: 'sole proprietor', grade: 'D', score: 60, stage: 'RESEARCHING', source: 'Referral', assignedTo: 'R. Patel, EA', doNotContact: false, consentStatus: 'GRANTED', nextAction: 'Research further to confirm service fit and intent.' },
  { id: 'lead_sample_012', businessName: 'Coconut Grove Bookkeeping', contactName: 'Owner L. Sample', email: 'coconut.grove.bookkeeping@example.com', phone: '(305) 555-0112', state: 'GA', industry: 'professional services', entityType: 'LLC', grade: 'F', score: 54, stage: 'POOR_FIT', source: 'Website', assignedTo: null, doNotContact: false, consentStatus: 'GRANTED', nextAction: 'Mark poor fit; do not contact.' },
  { id: 'lead_sample_013', businessName: 'Pinecrest Interiors', contactName: 'Owner M. Sample', email: 'pinecrest.interiors@example.com', phone: '(305) 555-0113', state: 'TX', industry: 'food services', entityType: 'S-corp', grade: 'A', score: 90, stage: 'QUALIFIED', source: 'CSV import', assignedTo: 'A. Chen, EA', doNotContact: false, consentStatus: 'GRANTED', nextAction: 'Assign to a licensed specialist and approve outreach promptly.' },
  { id: 'lead_sample_014', businessName: 'North Miami Print Shop', contactName: 'Owner N. Sample', email: 'owner14@example.com', phone: null, state: 'NY', industry: 'personal services', entityType: 'partnership', grade: 'F', score: 54, stage: 'POOR_FIT', source: 'Event', assignedTo: 'M. Alvarez, CPA', doNotContact: false, consentStatus: 'GRANTED', nextAction: 'Mark poor fit; do not contact.' },
  { id: 'lead_sample_015', businessName: 'Opa-locka Trucking', contactName: 'Owner O. Sample', email: 'owner14@example.com', phone: '(305) 555-0115', state: 'CA', industry: 'creative services', entityType: 'independent contractor', grade: null, score: null, stage: 'INSUFFICIENT_INFORMATION', source: 'Discovery', assignedTo: null, doNotContact: false, consentStatus: 'GRANTED', nextAction: 'Enrich and verify a contact channel before qualifying.' },
  { id: 'lead_sample_016', businessName: 'Sunny Isles Marketing', contactName: 'Owner P. Sample', email: 'sunny.isles.marketing@example.com', phone: '(305) 555-0116', state: 'FL', industry: 'transportation', entityType: 'sole proprietor', grade: 'D', score: 62, stage: 'RESEARCHING', source: 'Referral', assignedTo: null, doNotContact: false, consentStatus: 'GRANTED', nextAction: 'Research further to confirm service fit and intent.' },
  { id: 'lead_sample_017', businessName: 'Bayside Pet Care', contactName: 'Owner Q. Sample', email: 'bayside.pet.care@example.com', phone: '(305) 555-0117', state: 'FL', industry: 'retail', entityType: 'LLC', grade: 'C', score: 79, stage: 'QUALIFIED', source: 'Website', assignedTo: 'A. Chen, EA', doNotContact: false, consentStatus: 'GRANTED', nextAction: 'Nurture with educational content before outreach.' },
  { id: 'lead_sample_018', businessName: 'Edgewater Electric', contactName: 'Owner R. Sample', email: 'edgewater.electric@example.com', phone: '(305) 555-0118', state: 'FL', industry: 'real estate', entityType: 'S-corp', grade: 'F', score: 54, stage: 'DO_NOT_CONTACT', source: 'CSV import', assignedTo: 'M. Alvarez, CPA', doNotContact: true, consentStatus: 'GRANTED', nextAction: 'Mark poor fit; do not contact.' },
];

function toFirestoreFields(lead) {
  const createdAt = new Date(Date.UTC(2026, 0, 2 + Number(lead.id.slice(-3)) - 1)).toISOString();
  const fields = {
    name: { stringValue: lead.contactName },
    businessName: { stringValue: lead.businessName },
    email: lead.email ? { stringValue: lead.email } : { nullValue: null },
    phone: lead.phone ? { stringValue: lead.phone } : { nullValue: null },
    industry: { stringValue: lead.industry },
    state: { stringValue: lead.state },
    entityType: { stringValue: lead.entityType },
    // Fields the existing intake form writes, kept so one collection serves both.
    service: { stringValue: 'Tax & bookkeeping' },
    budget: { stringValue: 'Not provided' },
    timeline: { stringValue: 'Next 90 days' },
    bottleneck: { stringValue: lead.nextAction },
    // Lead pipeline fields.
    leadId: { stringValue: lead.id },
    grade: lead.grade ? { stringValue: lead.grade } : { nullValue: null },
    score: lead.score === null ? { nullValue: null } : { integerValue: String(lead.score) },
    stage: { stringValue: lead.stage },
    source: { stringValue: lead.source },
    assignedTo: lead.assignedTo ? { stringValue: lead.assignedTo } : { nullValue: null },
    consentStatus: { stringValue: lead.consentStatus },
    doNotContact: { booleanValue: lead.doNotContact },
    isSample: { booleanValue: true },
    createdAt: { timestampValue: createdAt },
    updatedAt: { timestampValue: new Date().toISOString() },
  };
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
    for (const lead of LEADS) console.log(`${lead.id}  ${lead.businessName}  <${lead.email}>  ${lead.stage}`);
    console.log(`\n${LEADS.length} documents would be written to ${COLLECTION}.`);
    return;
  }

  const token = await accessToken();
  const base = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/${COLLECTION}`;

  let written = 0;
  for (const lead of LEADS) {
    const res = await fetch(`${base}/${lead.id}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields: toFirestoreFields(lead) }),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Write failed for ${lead.id}: ${res.status} ${body.slice(0, 300)}`);
    }
    written += 1;
    console.log(`✓ ${lead.id}  ${lead.businessName}`);
  }

  console.log(`\n${written} contacts written to Firestore (${PROJECT_ID}/${COLLECTION}).`);
}

await main();
