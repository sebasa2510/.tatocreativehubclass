/**
 * client-records.ts — the shape of a TatoIQ customer record that Saggio is
 * allowed to use when someone identifies themselves as a client.
 *
 * This file is PURE (no network, no env) so both the server route and the unit
 * tests can use the same rules. The browser never receives a record: the API
 * looks it up server-side and returns only the words Saggio needs to say.
 */

export type CustomerStatus =
  | 'lead'
  | 'onboarding'
  | 'active'
  | 'paused'
  | 'former'
  | (string & {});

export interface KickoffItem {
  id?: string;
  label: string;
  done: boolean;
  note?: string;
}

export interface CustomerRouting {
  team: string;
  owner?: string;
  responseWindow?: string;
  reason?: string;
  message?: string;
  at: string;
  mode: 'agent' | 'fallback';
}

export interface CustomerHandoff {
  reason: string;
  message: string;
  at: string;
  status: 'open';
}

/**
 * A customer/engagement record.
 *
 * Field names intentionally match what a small Firestore `customers` collection
 * can hold without a migration. Optional aliases (`hiredFor`, `checklist`,
 * `lastContactAt`) are accepted so an existing export can be imported without
 * rewriting every document.
 */
export interface CustomerRecord {
  id: string;
  email: string;
  normalizedEmail?: string;
  name?: string;
  businessName?: string;
  status: CustomerStatus;

  /** What the client hired TatoIQ to do. */
  services?: string[];
  hiredFor?: string[];
  engagementSummary?: string;

  /** Current project state. Saggio may quote this; it must never infer it. */
  projectStatus?: string;
  projectStage?: string;
  nextMilestone?: string;
  nextMilestoneDate?: string;

  /** Who owns the relationship. */
  owner?: string;
  team?: string;
  responseWindow?: string;

  /** Kickoff / onboarding items that are still outstanding. */
  kickoffChecklist?: KickoffItem[];
  checklist?: KickoffItem[];

  /** Conversation bookkeeping written by the server after every talk. */
  lastTalkedAt?: string;
  lastContactAt?: string;
  conversationSummary?: string;
  conversationCount?: number;
  openQuestions?: string[];
  routing?: CustomerRouting;
  handoff?: CustomerHandoff;
  needsAttention?: boolean;

  updatedAt?: string;
  isSample?: boolean;
}

/**
 * A record is a client only in these two states, as specified. A `lead`,
 * `paused`, or `former` record must never be greeted as an active client.
 */
export function isClientRecord(record: CustomerRecord | null | undefined): boolean {
  if (!record) return false;
  const status = String(record.status ?? '').trim().toLowerCase();
  return status === 'onboarding' || status === 'active';
}

/** Lowercase + trim. This is the only matching key the API uses. */
export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

/** A deliberately conservative email test; it is not trying to be RFC-perfect. */
export function isValidEmail(value: string): boolean {
  const email = value.trim();
  return email.length >= 5 && email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/** Pull the first email address out of a free-text chat turn. */
export function extractEmail(text: string): string | null {
  const match = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  return match ? normalizeEmail(match[0]) : null;
}

/** Preferred display name, with honest fallbacks (never invent a person). */
export function customerName(record: CustomerRecord): string {
  const name = record.name?.trim();
  if (name) return name;
  const business = record.businessName?.trim();
  if (business) return business;
  return 'there';
}

/** First name only, for a warm but not over-familiar greeting. */
export function customerFirstName(record: CustomerRecord): string {
  const name = record.name?.trim();
  if (!name) return customerName(record);
  return name.split(/\s+/)[0] || name;
}

export function servicesFor(record: CustomerRecord): string[] {
  const list = record.services ?? record.hiredFor ?? [];
  return list.map((item) => item.trim()).filter(Boolean);
}

export function checklistFor(record: CustomerRecord): KickoffItem[] {
  return (record.kickoffChecklist ?? record.checklist ?? []).filter(
    (item) => item && typeof item.label === 'string' && item.label.trim().length > 0,
  );
}

export function openChecklistItems(record: CustomerRecord): KickoffItem[] {
  return checklistFor(record).filter((item) => item.done !== true);
}

export function lastTalkedAt(record: CustomerRecord): string | undefined {
  return record.lastTalkedAt ?? record.lastContactAt;
}

/** A compact, readable summary of the record for the owner, not the browser. */
export function recordFacts(record: CustomerRecord): string[] {
  const facts: string[] = [];
  const services = servicesFor(record);
  if (services.length) facts.push(`hired for: ${services.join(', ')}`);
  if (record.engagementSummary) facts.push(`engagement: ${record.engagementSummary}`);
  if (record.projectStatus) facts.push(`project status: ${record.projectStatus}`);
  if (record.projectStage) facts.push(`stage: ${record.projectStage}`);
  if (record.nextMilestone) facts.push(`next milestone: ${record.nextMilestone}`);
  if (record.owner) facts.push(`owner: ${record.owner}`);
  if (record.team) facts.push(`team: ${record.team}`);
  return facts;
}
