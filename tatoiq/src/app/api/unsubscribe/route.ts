import { NextResponse, type NextRequest } from 'next/server';

import { getLeadContactById, suppressContact } from '@/lib/leads/repository';
import { verifyUnsubscribeToken } from '@/lib/outreach/unsubscribe';

/**
 * GET/POST /api/unsubscribe — signed one-click unsubscribe.
 *
 * Verifying the signed token prevents arbitrary suppression. On success the
 * contact is added to the suppression list and any pending drafts are halted.
 */

function page(title: string, message: string, status: number) {
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><title>${title}</title></head><body style="font-family: system-ui, sans-serif; max-width: 40rem; margin: 4rem auto; padding: 0 1rem; color: #0f172a;"><h1 style="font-size: 1.25rem;">${title}</h1><p style="line-height: 1.6;">${message}</p></body></html>`;
  return new NextResponse(html, { status, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}

async function handle(token: string | null) {
  if (!token) return page('Invalid link', 'This unsubscribe link is missing its token.', 400);
  const leadId = verifyUnsubscribeToken(token);
  if (!leadId) return page('Invalid link', 'This unsubscribe link is invalid or has expired.', 400);

  const contact = await getLeadContactById(leadId);
  if (!contact) return page('Already removed', 'We could not find this contact; you will not be contacted again.', 200);

  await suppressContact({
    email: contact.email,
    phone: contact.phone,
    reason: 'Unsubscribed via one-click link.',
    source: 'email-unsubscribe',
    leadId: contact.id,
  });

  return page('You have been unsubscribed', 'You will not receive further outreach from TatoIQ.', 200);
}

export async function GET(request: NextRequest) {
  return handle(request.nextUrl.searchParams.get('token'));
}

export async function POST(request: NextRequest) {
  const fromQuery = request.nextUrl.searchParams.get('token');
  if (fromQuery) return handle(fromQuery);
  try {
    const form = await request.formData();
    return handle(String(form.get('token') ?? '') || null);
  } catch {
    return handle(null);
  }
}
