/**
 * assignment.ts — assigning A-grade leads to the tax team.
 *
 * Rules (spec):
 *  - A-grade leads are assigned round-robin across ACTIVE team members.
 *  - Only members licensed for the lead's state are eligible (a `null`/empty
 *    `states` list means licensed nationwide).
 *  - A lead untouched beyond `thresholdHours` is reassigned to the primary team
 *    manager so it cannot silently rot in a queue.
 *
 * Pure and deterministic so it is unit-testable and safe to reuse in the API,
 * a cron/worker, or the UI.
 */

export interface TeamMember {
  id: string;
  name: string;
  /** null/empty => licensed nationwide; otherwise the states they cover. */
  states: string[] | null;
  active: boolean;
}

export interface AssignableLead {
  id: string;
  state: string | null;
  assignedToId: string | null;
  /** Epoch ms of the last human touch; null/undefined when never touched. */
  lastActivityAt?: number | null;
}

export interface Assignment {
  assigneeId: string | null;
  assigneeName: string | null;
  reason: string;
}

function isNationwide(member: TeamMember): boolean {
  return !member.states || member.states.length === 0;
}

/** Active members licensed for this lead's state (or nationwide). */
export function eligibleMembers(members: TeamMember[], lead: AssignableLead): TeamMember[] {
  const active = members.filter((m) => m.active);
  const state = lead.state;
  if (!state) return active.filter(isNationwide);
  return active.filter((m) => isNationwide(m) || (m.states?.includes(state) ?? false));
}

/** True when the lead has been untouched longer than the SLA threshold. */
export function isStale(lead: AssignableLead, thresholdHours: number, now: number = Date.now()): boolean {
  if (!lead.lastActivityAt) return true;
  return now - lead.lastActivityAt >= thresholdHours * 3_600_000;
}

/**
 * Round-robin assignment. `cursor` is a persisted per-organization index so the
 * next A-grade lead goes to the next specialist in the rotation.
 */
export function roundRobinAssignee(
  members: TeamMember[],
  lead: AssignableLead,
  cursor: number,
): { member: TeamMember | null; nextCursor: number } {
  const eligible = eligibleMembers(members, lead);
  if (eligible.length === 0) return { member: null, nextCursor: cursor };
  const index = ((cursor % eligible.length) + eligible.length) % eligible.length;
  return { member: eligible[index], nextCursor: cursor + 1 };
}

export interface AssignOptions {
  cursor: number;
  /** Untouched beyond this many hours => reassign to the manager. */
  thresholdHours: number;
  /** Id of the primary team manager / fallback owner. */
  managerId?: string | null;
  now?: number;
}

/** Decide who should own this lead right now. */
export function assignLead(
  members: TeamMember[],
  lead: AssignableLead,
  { cursor, thresholdHours, managerId, now = Date.now() }: AssignOptions,
): Assignment {
  const eligible = eligibleMembers(members, lead);
  if (eligible.length === 0) {
    return { assigneeId: null, assigneeName: null, reason: 'No active team member is licensed for this state.' };
  }

  // Only escalate leads that already have an owner who went quiet. A brand-new
  // (never-assigned) lead simply enters the round-robin.
  if (lead.assignedToId) {
    if (!isStale(lead, thresholdHours, now)) {
      return { assigneeId: lead.assignedToId, assigneeName: null, reason: 'Already assigned and within SLA.' };
    }
    if (managerId) {
      const manager = members.find((m) => m.id === managerId && m.active);
      if (manager) {
        return { assigneeId: manager.id, assigneeName: manager.name, reason: 'Untouched past SLA — escalated to the team manager.' };
      }
    }
  }

  const { member } = roundRobinAssignee(members, lead, cursor);
  if (!member) return { assigneeId: null, assigneeName: null, reason: 'No eligible assignee.' };
  return { assigneeId: member.id, assigneeName: member.name, reason: 'Round-robin assignment.' };
}
