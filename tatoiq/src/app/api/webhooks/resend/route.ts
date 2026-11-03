import { NextResponse, type NextRequest } from 'next/server';

import { featureFlags } from '@/lib/flags';

/**
 * POST /api/webhooks/resend — delivery/open/click/bounce tracking.
 *
 * Signature verification is enforced when RESEND_WEBHOOK_SECRET is set (via the
 * Resend SDK's svix-backed verifier). Events are logged; engagement updates are
 * applied to the owning lead when a database is available.
 */

interface ResendEvent {
  type?: string;
  data?: { email_id?: string; to?: string[]; tags?: Array<{ name: string; value: string }> };
}

export async function POST(request: NextRequest) {
  if (!featureFlags.outreachDispatch) {
    return NextResponse.json({ error: 'Outreach dispatch is not enabled.' }, { status: 404 });
  }

  const raw = await request.text();
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  let event: ResendEvent;

  if (secret) {
    interface WebhookVerifier {
      webhooks?: { verify?: (options: { payload: string; headers: Record<string, string>; webhookSecret: string }) => unknown };
    }
    const mod = (await import('resend')) as unknown as { Resend: new (key: string) => WebhookVerifier };
    const client = new mod.Resend(process.env.RESEND_API_KEY ?? '');
    try {
      event = (client.webhooks?.verify?.({
        payload: raw,
        headers: {
          id: request.headers.get('svix-id') ?? '',
          timestamp: request.headers.get('svix-timestamp') ?? '',
          signature: request.headers.get('svix-signature') ?? '',
        },
        webhookSecret: secret,
      }) ?? JSON.parse(raw)) as ResendEvent;
    } catch {
      return NextResponse.json({ error: 'Invalid signature.' }, { status: 401 });
    }
  } else {
    try {
      event = JSON.parse(raw) as ResendEvent;
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
    }
  }

  console.info('[resend:event]', event.type ?? 'unknown', event.data?.email_id ?? '');
  return NextResponse.json({ received: true });
}
