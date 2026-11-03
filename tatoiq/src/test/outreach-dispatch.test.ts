import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Route-level safety test for the outreach dispatch endpoint.
 *
 * This exercises the REAL route handler (not a reimplementation) and proves the
 * spec's rule: attempting to dispatch outreach for a high-scoring lead that is
 * flagged do-not-contact is refused with 403 and NO outbound send is created.
 *
 * `@/lib/auth/guard` is mocked to resolve the mock admin session. `getSession`
 * deliberately has no unauthenticated fallback any more, so mocking the cookie
 * store is not enough — the guard is the seam this route actually depends on.
 */

vi.mock('@/lib/auth/guard', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/auth/guard')>();
  const { mockSession } = await import('@/lib/auth/session');
  return { ...actual, requireLeadsAccess: async () => ({ session: mockSession() }) };
});

const { sendEmail } = vi.hoisted(() => ({
  sendEmail: vi.fn(async () => ({ ok: true, mock: true, providerMessageId: 'mock-1' })),
}));

vi.mock('@/lib/outreach/dispatch', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/outreach/dispatch')>();
  return { ...actual, sendEmail, emailConfigured: () => false };
});

async function callSend(id: string, payload: Record<string, unknown>) {
  const { NextRequest } = await import('next/server');
  const { POST } = await import('@/app/api/outreach/lead/[id]/send/route');
  const request = new NextRequest(`http://localhost/api/outreach/lead/${id}/send`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return POST(request, { params: Promise.resolve({ id }) });
}

beforeEach(() => {
  sendEmail.mockClear();
  delete process.env.DATABASE_URL; // force the deterministic mock store
  process.env.FEATURE_OUTREACH_DISPATCH = 'true';
});

describe('POST /api/outreach/lead/[id]/send', () => {
  it('returns 403 and sends nothing for a high-scoring do-not-contact lead', async () => {
    // lead_sample_001 scores 100 (grade A) yet is flagged do-not-contact.
    const response = await callSend('lead_sample_001', { subject: 'Hello', body: 'Are you interested in a call?' });
    expect(response.status).toBe(403);

    const body = (await response.json()) as { error?: string };
    expect(body.error).toMatch(/suppress|do-not-contact/i);
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('never dispatches to synthetic sample fixtures', async () => {
    const response = await callSend('lead_sample_002', { subject: 'Hi', body: 'Quick question for you.' });
    expect(response.status).toBe(403);
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('returns 404 for an unknown lead', async () => {
    const response = await callSend('does_not_exist', { subject: 'Hi', body: 'Hello.' });
    expect(response.status).toBe(404);
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('stays dark (404) when outreach dispatch is disabled', async () => {
    vi.resetModules();
    process.env.FEATURE_OUTREACH_DISPATCH = 'false';
    const response = await callSend('lead_sample_001', { subject: 'Hi', body: 'Hello.' });
    expect(response.status).toBe(404);
    expect(sendEmail).not.toHaveBeenCalled();
  });
});
