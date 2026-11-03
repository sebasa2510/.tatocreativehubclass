import 'server-only';

import { getDb } from '@/lib/db/prisma';
import type { LeadStage } from '@/lib/leads/pipeline';

/**
 * audit.ts — append-only audit for lead stage transitions + reassignments.
 *
 * The repo already has an append-only AuditLog model designed for exactly this
 * (actor, action, entity, entityId, metadata JSON). We reuse it instead of
 * duplicating a second audit table (spec: never duplicate systems). Stage and
 * reassignment events store old/new values + a description in metadata.
 */

export interface LeadAuditEvent {
  leadId: string;
  actorId?: string | null;
  action: string;
  oldValue?: string | null;
  newValue?: string | null;
  description?: string;
}

export async function recordLeadEvent(event: LeadAuditEvent): Promise<void> {
  const db = await getDb();
  const payload = {
    oldValue: event.oldValue ?? null,
    newValue: event.newValue ?? null,
    description: event.description ?? null,
  };
  if (!db) {
    // No DB in this environment: emit a structured log instead of failing.
    console.info('[lead-audit]', event.action, event.leadId, JSON.stringify(payload));
    return;
  }
  await db.auditLog.create({
    data: {
      actorId: event.actorId ?? null,
      action: event.action,
      entity: 'Lead',
      entityId: event.leadId,
      metadata: payload,
    },
  });
}

export function recordStageTransition(
  leadId: string,
  from: LeadStage,
  to: LeadStage,
  actorId?: string | null,
  description?: string,
): Promise<void> {
  return recordLeadEvent({
    leadId,
    actorId,
    action: 'LEAD_STAGE_TRANSITION',
    oldValue: from,
    newValue: to,
    description: description ?? `Stage moved from ${from} to ${to}.`,
  });
}

export function recordReassignment(
  leadId: string,
  fromAssignee: string | null,
  toAssignee: string,
  actorId?: string | null,
  description?: string,
): Promise<void> {
  return recordLeadEvent({
    leadId,
    actorId,
    action: 'LEAD_REASSIGNMENT',
    oldValue: fromAssignee,
    newValue: toAssignee,
    description: description ?? 'Lead reassigned.',
  });
}
