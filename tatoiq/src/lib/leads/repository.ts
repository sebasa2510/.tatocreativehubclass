import 'server-only';

import type { Prisma } from '@/generated/prisma/client';
import { getDb } from '@/lib/db/prisma';
import { evaluateLead, type ConsentStatusValue } from '@/lib/scoring/evaluator';
import type { DedupRecord } from './dedup';
import { normalizeContact } from './normalize';
import { canTransition, type LeadStage } from './pipeline';
import {
  SAMPLE_LEADS,
  buildSyntheticProfile,
  computeMetrics,
  profileToListItem,
  type SyntheticProfile,
} from './sample-data';
import type { LeadDetail, LeadListItem, LeadListFilters, LeadMetrics } from './types';

/**
 * repository.ts — the single data-access layer for leads.
 *
 * When a live database is reachable, everything goes through Prisma. Otherwise
 * the module serves a deterministic in-memory store seeded from synthetic
 * fixtures, so the feature runs and demos with zero infrastructure. Callers see
 * the same shapes either way; results carry `mode` so the UI can show a badge.
 */

export interface LeadInput {
  businessName?: string;
  contactName?: string;
  email?: string;
  phone?: string;
  website?: string;
  addressLine1?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  industry?: string;
  entityType?: string;
  employeeCount?: number;
  annualRevenue?: number;
  sourceTag?: string;
  sourceUrl?: string;
  verifiedEmail?: boolean;
  verifiedPhone?: boolean;
  verifiedBusiness?: boolean;
  verifiedAddress?: boolean;
  consentStatus?: ConsentStatusValue;
  doNotContact?: boolean;
}

type Mode = 'db' | 'mock';

interface GlobalLeadStore {
  __tatoiqLeadStore?: { profiles: Map<string, SyntheticProfile>; list: LeadListItem[] };
}
const globalStore = globalThis as typeof globalThis & GlobalLeadStore;

function mockStore() {
  if (!globalStore.__tatoiqLeadStore) {
    const profiles = new Map<string, SyntheticProfile>();
    const list: LeadListItem[] = [];
    SAMPLE_LEADS.forEach((item, i) => {
      const profile = buildSyntheticProfile(i);
      profiles.set(item.id, profile);
      list.push(item);
    });
    globalStore.__tatoiqLeadStore = { profiles, list };
  }
  return globalStore.__tatoiqLeadStore;
}

function computeScoreFor(input: {
  email?: string | null;
  phone?: string | null;
  industry?: string | null;
  entityType?: string | null;
  state?: string | null;
  verifiedEmail?: boolean;
  verifiedPhone?: boolean;
  verifiedBusiness?: boolean;
  verifiedAddress?: boolean;
}) {
  return evaluateLead({
    verification: {
      email: Boolean(input.verifiedEmail),
      phone: Boolean(input.verifiedPhone),
      business: Boolean(input.verifiedBusiness),
      address: Boolean(input.verifiedAddress),
    },
    business: { entityType: input.entityType ?? null, industry: input.industry ?? null, state: input.state ?? null, source: 'lead record' },
    intent: {},
    timing: {},
    engagement: {},
  });
}

function buildMockDetail(profile: SyntheticProfile): LeadDetail {
  const item = profileToListItem(profile);
  const score = evaluateLead({
    verification: profile.verification,
    business: { entityType: profile.entityType, industry: profile.industry, state: profile.state, formedRecently: profile.formedRecently, source: 'synthetic fixture' },
    intent: { requestedConsultation: profile.intentConsultation, requestedPricing: profile.intentPricing, repliedToOutreach: profile.replied },
    timing: { taxDeadlineNear: true },
    engagement: { emailOpened: profile.engagementOpened, linkClicked: profile.engagementClicked, websiteVisited: profile.engagementVisited },
  });

  return {
    ...item,
    website: `https://${item.businessName?.toLowerCase().replace(/[^a-z0-9]+/g, '')}.example.com`,
    addressLine1: '1 Sample Plaza',
    city: 'Miami',
    postalCode: '33131',
    sourceUrl: null,
    discoveryDate: profile.sourceTag === 'Discovery' ? item.createdAt : null,
    verified: profile.verification,
    reasons: score.reasons,
    evidence: score.evidence,
    missingInfo: score.missingInfo,
    scoreBreakdown: score.criteria,
    activities: [
      { id: `${item.id}_act1`, kind: 'SYSTEM', body: 'Lead created from ' + (profile.sourceTag ?? 'import') + '.', actor: 'system', createdAt: item.createdAt },
      { id: `${item.id}_act2`, kind: 'STAGE_CHANGE', body: `Graded ${item.grade ?? 'unscored'} and moved to ${item.stage}.`, actor: 'Lead agent', createdAt: item.createdAt },
    ],
    consultations: profile.consultations ? [{ id: `${item.id}_consult`, status: 'SCHEDULED', scheduledAt: item.createdAt, eventLink: 'https://cal.com/example/booking', specialistNotes: 'Sample consultation.' }] : [],
    drafts: [],
    conversions: profile.conversions ? [{ id: `${item.id}_conv`, kind: 'ENGAGEMENT_SIGNED', revenueCents: 240000, occurredAt: item.createdAt }] : [],
  };
}

function filterMock(store: ReturnType<typeof mockStore>, filters: LeadListFilters) {
  let items = [...store.list];
  const q = filters.q?.trim().toLowerCase();
  if (q) {
    items = items.filter((l) =>
      [l.businessName, l.contactName, l.email, l.industry].some((v) => (v ?? '').toLowerCase().includes(q)),
    );
  }
  if (filters.grade && filters.grade !== 'ALL') items = items.filter((l) => l.grade === filters.grade);
  if (filters.stage && filters.stage !== 'ALL') items = items.filter((l) => l.stage === filters.stage);
  if (filters.source && filters.source !== 'ALL') items = items.filter((l) => l.sourceTag === filters.source);
  if (filters.assigned && filters.assigned !== 'ALL') items = items.filter((l) => (l.assignedTo ?? '') === filters.assigned);

  const dir = filters.direction === 'asc' ? 1 : -1;
  const sort = filters.sort ?? 'score';
  items.sort((a, b) => {
    if (sort === 'score') return ((a.score ?? -1) - (b.score ?? -1)) * dir;
    if (sort === 'grade') return String(a.grade ?? 'Z').localeCompare(String(b.grade ?? 'Z')) * dir;
    if (sort === 'businessName') return String(a.businessName ?? '').localeCompare(String(b.businessName ?? '')) * dir;
    return String(a.createdAt).localeCompare(String(b.createdAt)) * dir;
  });

  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, filters.pageSize ?? 25));
  const total = items.length;
  return { items: items.slice((page - 1) * pageSize, page * pageSize), total, page, pageSize };
}

export interface LeadListResult {
  items: LeadListItem[];
  total: number;
  page: number;
  pageSize: number;
  mode: Mode;
}

export async function listLeads(organizationId: string, filters: LeadListFilters = {}): Promise<LeadListResult> {
  const db = await getDb();
  if (!db) {
    const mocked = filterMock(mockStore(), filters);
    return { ...mocked, mode: 'mock' };
  }

  const where: Record<string, unknown> = { organizationId };
  if (filters.grade && filters.grade !== 'ALL') where.grade = filters.grade;
  if (filters.stage && filters.stage !== 'ALL') where.stage = filters.stage;
  if (filters.assigned && filters.assigned !== 'ALL') where.assignedToId = filters.assigned;
  if (filters.q?.trim()) {
    where.OR = [
      { businessName: { contains: filters.q.trim(), mode: 'insensitive' } },
      { contactName: { contains: filters.q.trim(), mode: 'insensitive' } },
      { email: { contains: filters.q.trim(), mode: 'insensitive' } },
    ];
  }

  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, filters.pageSize ?? 25));
  const [rows, total] = await Promise.all([
    db.lead.findMany({
      where,
      orderBy: [{ score: filters.direction === 'asc' ? 'asc' : 'desc' }, { createdAt: 'desc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { assignedTo: { select: { name: true } } },
    }),
    db.lead.count({ where }),
  ]);

  const items: LeadListItem[] = rows.map((row) => ({
    id: row.id,
    businessName: row.businessName,
    contactName: row.contactName,
    email: row.email,
    phone: row.phone,
    state: row.state,
    industry: row.industry,
    entityType: row.entityType,
    grade: row.grade,
    score: row.score,
    confidence: row.confidence,
    stage: row.stage as LeadStage,
    sourceTag: row.sourceTag,
    assignedTo: row.assignedTo?.name ?? null,
    isSample: row.isSample,
    doNotContact: row.doNotContact,
    consentStatus: row.consentStatus,
    createdAt: row.createdAt.toISOString(),
    gradedAt: row.gradedAt?.toISOString() ?? null,
    lastActivityAt: row.lastActivityAt?.toISOString() ?? null,
    nextAction: null,
  }));

  return { items, total, page, pageSize, mode: 'db' };
}

export async function getLead(organizationId: string, id: string): Promise<LeadDetail | null> {
  const db = await getDb();
  if (!db) {
    const store = mockStore();
    const profile = store.profiles.get(id);
    if (!profile) return null;
    return buildMockDetail(profile);
  }

  const row = await db.lead.findFirst({
    where: { id, organizationId },
    include: {
      assignedTo: { select: { name: true } },
      scores: { orderBy: { evaluatedAt: 'desc' }, take: 1 },
      activities: { orderBy: { createdAt: 'desc' }, take: 25 },
      drafts: { orderBy: { createdAt: 'desc' }, take: 10 },
      consultations: { orderBy: { createdAt: 'desc' }, take: 5 },
      conversions: { orderBy: { occurredAt: 'desc' }, take: 5 },
    },
  });
  if (!row) return null;

  const latest = row.scores[0];
  return {
    id: row.id,
    businessName: row.businessName,
    contactName: row.contactName,
    email: row.email,
    phone: row.phone,
    state: row.state,
    industry: row.industry,
    entityType: row.entityType,
    grade: row.grade,
    score: row.score,
    confidence: row.confidence,
    stage: row.stage as LeadStage,
    sourceTag: row.sourceTag,
    assignedTo: row.assignedTo?.name ?? null,
    isSample: row.isSample,
    doNotContact: row.doNotContact,
    consentStatus: row.consentStatus,
    createdAt: row.createdAt.toISOString(),
    gradedAt: row.gradedAt?.toISOString() ?? null,
    lastActivityAt: row.lastActivityAt?.toISOString() ?? null,
    nextAction: null,
    website: row.website,
    addressLine1: row.addressLine1,
    city: row.city,
    postalCode: row.postalCode,
    sourceUrl: row.sourceUrl,
    discoveryDate: row.discoveryDate?.toISOString() ?? null,
    verified: {
      email: row.verifiedEmail,
      phone: row.verifiedPhone,
      business: row.verifiedBusiness,
      address: row.verifiedAddress,
    },
    reasons: (latest?.reasons as unknown as string[] | undefined) ?? [],
    evidence: (latest?.evidence as unknown as LeadDetail['evidence'] | undefined) ?? [],
    missingInfo: (latest?.missingInfo as unknown as string[] | undefined) ?? [],
    scoreBreakdown: (latest?.weightsSnapshot as unknown as LeadDetail['scoreBreakdown'] | undefined) ?? [],
    activities: row.activities.map((a) => ({ id: a.id, kind: a.kind, body: a.body, actor: null, createdAt: a.createdAt.toISOString() })),
    drafts: row.drafts.map((d) => ({ id: d.id, status: d.status, subject: d.subject, body: d.body, createdAt: d.createdAt.toISOString(), sentAt: d.sentAt?.toISOString() ?? null })),
    consultations: row.consultations.map((c) => ({ id: c.id, status: c.status, scheduledAt: c.scheduledAt?.toISOString() ?? null, eventLink: c.eventLink, specialistNotes: c.specialistNotes })),
    conversions: row.conversions.map((c) => ({ id: c.id, kind: c.kind, revenueCents: c.revenueCents, occurredAt: c.occurredAt.toISOString() })),
  };
}

export async function createLead(organizationId: string, actorId: string | null, input: LeadInput): Promise<LeadListItem> {
  const contact = normalizeContact({ email: input.email, phone: input.phone });
  const score = computeScoreFor({ ...input, email: contact.email, phone: contact.phone });
  const db = await getDb();

  if (!db) {
    const store = mockStore();
    const id = `lead_manual_${Date.now().toString(36)}`;
    const item: LeadListItem = {
      id,
      businessName: input.businessName ?? null,
      contactName: input.contactName ?? null,
      email: contact.email,
      phone: contact.phone,
      state: input.state ?? null,
      industry: input.industry ?? null,
      entityType: input.entityType ?? null,
      grade: score.grade,
      score: score.hasVerifiedContact ? score.score : null,
      confidence: score.confidence,
      stage: score.proposedStage,
      sourceTag: input.sourceTag ?? 'Manual',
      assignedTo: null,
      isSample: false,
      doNotContact: Boolean(input.doNotContact),
      consentStatus: input.consentStatus ?? 'UNKNOWN',
      createdAt: new Date().toISOString(),
      gradedAt: score.hasVerifiedContact ? new Date().toISOString() : null,
      lastActivityAt: new Date().toISOString(),
      nextAction: score.recommendedAction,
    };
    store.list.unshift(item);
    store.profiles.set(id, { ...buildSyntheticProfile(0), id, businessName: item.businessName ?? 'Manual lead', email: item.email, phone: item.phone, sourceTag: item.sourceTag ?? 'Manual', stageOverride: item.stage });
    return item;
  }

  const source = await db.leadSource.upsert({
    where: { organizationId_name: { organizationId, name: input.sourceTag ?? 'Manual' } },
    update: {},
    create: { organizationId, name: input.sourceTag ?? 'Manual', kind: 'MANUAL' },
  });

  const created = await db.lead.create({
    data: {
      organizationId,
      sourceId: source.id,
      sourceTag: input.sourceTag ?? 'Manual',
      businessName: input.businessName ?? null,
      contactName: input.contactName ?? null,
      email: contact.email,
      phone: contact.phone,
      website: input.website ?? null,
      addressLine1: input.addressLine1 ?? null,
      city: input.city ?? null,
      state: input.state ?? null,
      postalCode: input.postalCode ?? null,
      industry: input.industry ?? null,
      entityType: input.entityType ?? null,
      employeeCount: input.employeeCount ?? null,
      annualRevenue: input.annualRevenue ?? null,
      verifiedEmail: Boolean(input.verifiedEmail),
      verifiedPhone: Boolean(input.verifiedPhone),
      verifiedBusiness: Boolean(input.verifiedBusiness),
      verifiedAddress: Boolean(input.verifiedAddress),
      grade: score.grade,
      score: score.hasVerifiedContact ? score.score : null,
      confidence: score.confidence,
      gradedAt: score.hasVerifiedContact ? new Date() : null,
      stage: score.proposedStage,
      consentStatus: input.consentStatus ?? 'UNKNOWN',
      doNotContact: Boolean(input.doNotContact),
      createdById: actorId,
      lastActivityAt: new Date(),
    },
  });

  return {
    id: created.id,
    businessName: created.businessName,
    contactName: created.contactName,
    email: created.email,
    phone: created.phone,
    state: created.state,
    industry: created.industry,
    entityType: created.entityType,
    grade: created.grade,
    score: created.score,
    confidence: created.confidence,
    stage: created.stage as LeadStage,
    sourceTag: created.sourceTag,
    assignedTo: null,
    isSample: created.isSample,
    doNotContact: created.doNotContact,
    consentStatus: created.consentStatus,
    createdAt: created.createdAt.toISOString(),
    gradedAt: created.gradedAt?.toISOString() ?? null,
    lastActivityAt: created.lastActivityAt?.toISOString() ?? null,
    nextAction: score.recommendedAction,
  };
}

export async function updateLead(
  organizationId: string,
  actorId: string | null,
  id: string,
  patch: Partial<LeadInput> & { stage?: LeadStage },
): Promise<{ ok: boolean; reason?: string; item?: LeadListItem }> {
  const db = await getDb();
  if (!db) {
    const store = mockStore();
    const idx = store.list.findIndex((l) => l.id === id);
    if (idx === -1) return { ok: false, reason: 'Lead not found.' };
    const current = store.list[idx];
    if (patch.stage && !canTransition(current.stage, patch.stage)) {
      return { ok: false, reason: `Cannot move from ${current.stage} to ${patch.stage}.` };
    }
    const updated: LeadListItem = {
      ...current,
      ...('businessName' in patch ? { businessName: patch.businessName ?? null } : {}),
      ...('stage' in patch && patch.stage ? { stage: patch.stage } : {}),
      ...('doNotContact' in patch ? { doNotContact: Boolean(patch.doNotContact) } : {}),
      lastActivityAt: new Date().toISOString(),
    };
    store.list[idx] = updated;
    return { ok: true, item: updated };
  }

  const existing = await db.lead.findFirst({ where: { id, organizationId } });
  if (!existing) return { ok: false, reason: 'Lead not found.' };
  if (patch.stage && !canTransition(existing.stage as LeadStage, patch.stage)) {
    return { ok: false, reason: `Cannot move from ${existing.stage} to ${patch.stage}.` };
  }

  await db.lead.update({
    where: { id },
    data: {
      ...(patch.businessName !== undefined ? { businessName: patch.businessName } : {}),
      ...(patch.contactName !== undefined ? { contactName: patch.contactName } : {}),
      ...(patch.industry !== undefined ? { industry: patch.industry } : {}),
      ...(patch.stage ? { stage: patch.stage } : {}),
      ...(patch.doNotContact !== undefined ? { doNotContact: patch.doNotContact } : {}),
      ...(patch.consentStatus ? { consentStatus: patch.consentStatus } : {}),
      lastActivityAt: new Date(),
    },
  });

  if (patch.stage) {
    await db.leadActivity.create({ data: { leadId: id, actorId, kind: 'STAGE_CHANGE', body: `Stage moved to ${patch.stage}.` } });
  }

  const refreshed = await getLead(organizationId, id);
  return refreshed ? { ok: true, item: refreshed } : { ok: false, reason: 'Lead not found after update.' };
}

export async function softDeleteLead(organizationId: string, id: string): Promise<boolean> {
  const db = await getDb();
  if (!db) {
    const store = mockStore();
    const before = store.list.length;
    store.list = store.list.filter((l) => l.id !== id);
    return store.list.length < before;
  }
  const existing = await db.lead.findFirst({ where: { id, organizationId } });
  if (!existing) return false;
  await db.lead.update({ where: { id }, data: { deletedAt: new Date() } });
  return true;
}

export async function addActivity(
  organizationId: string,
  actorId: string | null,
  id: string,
  body: string,
  kind: 'NOTE' | 'CALL' | 'EMAIL' | 'SYSTEM' = 'NOTE',
): Promise<boolean> {
  const db = await getDb();
  if (!db) {
    const store = mockStore();
    // Nothing to persist in mock mode beyond a log line.
    return store.list.some((l) => l.id === id) && body.trim().length > 0;
  }
  const existing = await db.lead.findFirst({ where: { id, organizationId } });
  if (!existing) return false;
  await db.leadActivity.create({ data: { leadId: id, actorId, kind, body } });
  await db.lead.update({ where: { id }, data: { lastActivityAt: new Date() } });
  return true;
}

export async function scoreLead(organizationId: string, id: string): Promise<{ ok: boolean; detail?: LeadDetail }> {
  const detail = await getLead(organizationId, id);
  if (!detail) return { ok: false };

  const score = evaluateLead({
    verification: detail.verified,
    business: { entityType: detail.entityType, industry: detail.industry, state: detail.state, source: 'lead record' },
    intent: {},
    timing: {},
    engagement: {},
  });

  const db = await getDb();
  if (!db) {
    const store = mockStore();
    const idx = store.list.findIndex((l) => l.id === id);
    if (idx !== -1) {
      store.list[idx] = { ...store.list[idx], grade: score.grade, score: score.hasVerifiedContact ? score.score : null, confidence: score.confidence, stage: score.proposedStage, nextAction: score.recommendedAction, gradedAt: new Date().toISOString() };
    }
    return { ok: true };
  }

  await db.leadScore.create({
    data: {
      leadId: id,
      grade: score.grade ?? 'F',
      score: score.score,
      confidence: score.confidence,
      reasons: score.reasons,
      evidence: score.evidence as unknown as Prisma.InputJsonValue,
      missingInfo: score.missingInfo,
      recommendedAction: score.recommendedAction,
      weightsSnapshot: score.criteria as unknown as Prisma.InputJsonValue,
      evaluatedAt: new Date(),
    },
  });
  await db.lead.update({
    where: { id },
    data: { grade: score.grade, score: score.hasVerifiedContact ? score.score : null, confidence: score.confidence, stage: score.proposedStage, gradedAt: new Date() },
  });
  return { ok: true };
}

export async function getMetrics(organizationId: string): Promise<LeadMetrics> {
  const db = await getDb();
  if (!db) return computeMetrics(mockStore().list, true);
  const result = await listLeads(organizationId, { pageSize: 100 });
  return computeMetrics(result.items, false);
}

/** Contact index used for import-time deduplication. */
export async function listContactIndex(organizationId: string): Promise<DedupRecord[]> {
  const db = await getDb();
  if (!db) return mockStore().list.map((l) => ({ id: l.id, email: l.email, phone: l.phone, businessName: l.businessName }));
  const rows = await db.lead.findMany({ where: { organizationId }, select: { id: true, email: true, phone: true, businessName: true } });
  return rows;
}

export interface ImportBatchSummary {
  id: string;
  filename: string;
  rowCount: number;
  importedCount: number;
  duplicateCount: number;
  errorCount: number;
  status: 'COMPLETED' | 'PARTIAL' | 'FAILED';
}

/** Persist raw import metadata + row-level errors (JSONB). Mock mode returns a synthetic record. */
export async function recordImportBatch(
  organizationId: string,
  actorId: string | null,
  summary: ImportBatchSummary,
  metadata: Record<string, unknown>,
  parseErrors: unknown[],
): Promise<ImportBatchSummary> {
  const db = await getDb();
  if (!db) return summary;
  await db.importBatch.create({
    data: {
      id: summary.id,
      organizationId,
      filename: summary.filename,
      rowCount: summary.rowCount,
      importedCount: summary.importedCount,
      duplicateCount: summary.duplicateCount,
      errorCount: summary.errorCount,
      status: summary.status,
      metadata: metadata as unknown as Prisma.InputJsonValue,
      parseErrors: parseErrors as unknown as Prisma.InputJsonValue,
      importedById: actorId,
      completedAt: new Date(),
    },
  });
  return summary;
}

/** Create a lead from a normalized import row without re-normalizing contacts. */
export async function createLeadFromImport(organizationId: string, actorId: string | null, input: LeadInput): Promise<LeadListItem> {
  return createLead(organizationId, actorId, input);
}

/** True when a normalized email/phone is on the global suppression list. */
export async function isContactSuppressed(email: string | null | undefined, phone: string | null | undefined): Promise<boolean> {
  const contact = normalizeContact({ email, phone });
  if (!contact.email && !contact.phone) return false;
  const db = await getDb();
  if (!db) return false;
  const conditions: Array<Record<string, string>> = [];
  if (contact.email) conditions.push({ normalizedEmail: contact.email });
  if (contact.phone) conditions.push({ normalizedPhone: contact.phone });
  const hit = await db.leadConsent.findFirst({ where: { suppressed: true, OR: conditions } });
  return Boolean(hit);
}

export interface SuppressInput {
  email?: string | null;
  phone?: string | null;
  reason: string;
  source: string;
  leadId?: string;
}

/** Suppress a contact globally (unsubscribe) and halt its pending drafts. */
export async function suppressContact(input: SuppressInput): Promise<{ ok: boolean; haltedDrafts: number }> {
  const contact = normalizeContact({ email: input.email, phone: input.phone });
  const db = await getDb();
  if (!db) {
    console.info('[outreach:suppress]', JSON.stringify({ email: contact.email, phone: contact.phone, reason: input.reason }));
    return { ok: true, haltedDrafts: 0 };
  }

  const conditions: Array<Record<string, string>> = [];
  if (contact.email) conditions.push({ normalizedEmail: contact.email });
  if (contact.phone) conditions.push({ normalizedPhone: contact.phone });

  if (contact.email) {
    await db.leadConsent.upsert({
      where: { normalizedEmail: contact.email },
      update: { suppressed: true, status: 'WITHDRAWN', reason: input.reason, source: input.source },
      create: { normalizedEmail: contact.email, suppressed: true, status: 'WITHDRAWN', reason: input.reason, source: input.source },
    });
  }
  if (contact.phone) {
    await db.leadConsent.upsert({
      where: { normalizedPhone: contact.phone },
      update: { suppressed: true, status: 'WITHDRAWN', reason: input.reason, source: input.source },
      create: { normalizedPhone: contact.phone, suppressed: true, status: 'WITHDRAWN', reason: input.reason, source: input.source },
    });
  }

  if (conditions.length > 0) {
    await db.lead.updateMany({
      where: { OR: conditions },
      data: { doNotContact: true, consentStatus: 'WITHDRAWN', stage: 'DO_NOT_CONTACT' },
    });
  }

  const halted = input.leadId ? await haltPendingDrafts(input.leadId) : 0;
  return { ok: true, haltedDrafts: halted };
}

/** Cancel any not-yet-sent drafts for a lead (used on unsubscribe / do-not-contact). */
export async function haltPendingDrafts(leadId: string): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.outreachDraft.updateMany({
    where: { leadId, status: { in: ['DRAFT', 'PENDING_APPROVAL', 'APPROVED'] } },
    data: { status: 'CANCELLED' },
  });
  return result.count;
}

export interface DraftInput {
  leadId: string;
  subject: string;
  body: string;
  guardrailFlags: unknown[];
  aiModel: string;
}

/** Persist an outreach draft pending human approval. */
export async function createDraft(organizationId: string, actorId: string | null, input: DraftInput): Promise<{ id: string; status: string }> {
  const db = await getDb();
  if (!db) return { id: `draft_${Date.now().toString(36)}`, status: 'PENDING_APPROVAL' };
  const draft = await db.outreachDraft.create({
    data: {
      leadId: input.leadId,
      subject: input.subject,
      body: input.body,
      status: 'PENDING_APPROVAL',
      guardrailFlags: input.guardrailFlags as unknown as Prisma.InputJsonValue,
      aiModel: input.aiModel,
      createdById: actorId,
    },
  });
  return { id: draft.id, status: draft.status };
}

/** Resolve a lead's contact channels without needing an organization scope (unsubscribe). */
export async function getLeadContactById(id: string): Promise<{ id: string; email: string | null; phone: string | null } | null> {
  const db = await getDb();
  if (!db) {
    const lead = mockStore().list.find((l) => l.id === id);
    return lead ? { id: lead.id, email: lead.email, phone: lead.phone } : null;
  }
  return db.lead.findUnique({ where: { id }, select: { id: true, email: true, phone: true } });
}

export interface ConsultationInput {
  leadId: string;
  externalBookingId?: string | null;
  eventLink?: string | null;
  scheduledAt?: Date | null;
  status?: 'SCHEDULED' | 'CANCELLED' | 'NO_SHOW' | 'COMPLETED';
  specialistNotes?: string | null;
}

/** Store a consultation booking (event link, schedule, specialist notes) on a lead. */
export async function recordConsultation(input: ConsultationInput): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.info('[consultation]', input.leadId, input.status ?? 'SCHEDULED');
    return;
  }
  await db.consultation.create({
    data: {
      leadId: input.leadId,
      externalBookingId: input.externalBookingId ?? null,
      eventLink: input.eventLink ?? null,
      scheduledAt: input.scheduledAt ?? null,
      status: input.status ?? 'SCHEDULED',
      specialistNotes: input.specialistNotes ?? null,
    },
  });
}
