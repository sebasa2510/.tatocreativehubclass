import { describe, it, expect } from 'vitest';

import { assignLead, eligibleMembers, isStale, roundRobinAssignee, type TeamMember } from './assignment';

const TEAM: TeamMember[] = [
  { id: 'u1', name: 'A. Chen, EA', states: ['FL'], active: true },
  { id: 'u2', name: 'M. Alvarez, CPA', states: ['FL', 'GA'], active: true },
  { id: 'u3', name: 'R. Patel, EA', states: null, active: true }, // nationwide
  { id: 'u4', name: 'Inactive Person', states: ['FL'], active: false },
  { id: 'manager', name: 'Team Manager', states: null, active: true },
];

function lead(overrides: Partial<{ state: string | null; assignedToId: string | null; lastActivityAt: number | null }> = {}) {
  return { id: 'lead1', state: 'FL', assignedToId: null, lastActivityAt: Date.now(), ...overrides };
}

describe('eligibleMembers — state license coverage + active only', () => {
  it('includes members licensed for the state and nationwide members', () => {
    const ids = eligibleMembers(TEAM, lead({ state: 'FL' })).map((m) => m.id);
    expect(ids).toContain('u1');
    expect(ids).toContain('u2');
    expect(ids).toContain('u3'); // nationwide
    expect(ids).toContain('manager'); // nationwide + active
    expect(ids).not.toContain('u4'); // inactive
  });

  it('excludes state-specific members for an uncovered state', () => {
    const ids = eligibleMembers(TEAM, lead({ state: 'TX' })).map((m) => m.id);
    expect(ids).toContain('u3'); // nationwide
    expect(ids).not.toContain('u1');
    expect(ids).not.toContain('u2');
  });
});

describe('roundRobinAssignee', () => {
  it('cycles through eligible members', () => {
    const fl = lead({ state: 'FL' });
    const first = roundRobinAssignee(TEAM, fl, 0);
    const second = roundRobinAssignee(TEAM, fl, first.nextCursor);
    const third = roundRobinAssignee(TEAM, fl, second.nextCursor);
    expect(first.member?.id).not.toBe(second.member?.id);
    expect([first.member?.id, second.member?.id, third.member?.id]).toEqual(['u1', 'u2', 'u3']);
  });

  it('returns null when no one is eligible', () => {
    const onlyInactive = [{ id: 'x', name: 'X', states: ['FL'], active: false } as TeamMember];
    expect(roundRobinAssignee(onlyInactive, lead(), 0).member).toBeNull();
  });
});

describe('isStale', () => {
  it('treats a never-touched lead as stale', () => {
    expect(isStale(lead({ lastActivityAt: null }), 24)).toBe(true);
  });

  it('is not stale inside the window and stale outside it', () => {
    const now = 1_000_000_000_000;
    expect(isStale(lead({ lastActivityAt: now - 1000 }), 24, now)).toBe(false);
    expect(isStale(lead({ lastActivityAt: now - 25 * 3_600_000 }), 24, now)).toBe(true);
  });
});

describe('assignLead', () => {
  it('round-robins an unassigned lead', () => {
    const result = assignLead(TEAM, lead({ lastActivityAt: null }), { cursor: 0, thresholdHours: 24, managerId: 'manager' });
    expect(result.assigneeId).toBe('u1');
    expect(result.reason).toMatch(/round-robin/i);
  });

  it('keeps the current assignee while still inside SLA', () => {
    const result = assignLead(TEAM, lead({ assignedToId: 'u2' }), { cursor: 0, thresholdHours: 24 });
    expect(result.assigneeId).toBe('u2');
    expect(result.reason).toMatch(/within SLA/i);
  });

  it('escalates to the manager when untouched past SLA', () => {
    const staleLead = lead({ assignedToId: 'u2', lastActivityAt: Date.now() - 30 * 3_600_000 });
    const result = assignLead(TEAM, staleLead, { cursor: 0, thresholdHours: 24, managerId: 'manager' });
    expect(result.assigneeId).toBe('manager');
    expect(result.reason).toMatch(/manager/i);
  });

  it('reports when nobody is licensed for the state', () => {
    const flOnly: TeamMember[] = [{ id: 'u1', name: 'A. Chen, EA', states: ['FL'], active: true }];
    const result = assignLead(flOnly, lead({ state: 'TX' }), { cursor: 0, thresholdHours: 24 });
    expect(result.assigneeId).toBeNull();
    expect(result.reason).toMatch(/licensed/i);
  });
});
