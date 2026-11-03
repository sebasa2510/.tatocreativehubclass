import { triageMessage } from './cco-triage-core.mjs';
import {
  TRIAGE_STATUS,
  buildContactMessage,
  buildReplyBlock,
  buildTriageBlock,
  decide,
  guardContact,
  renderReply,
} from './contact-triage-core.mjs';
import {
  getDocument,
  lookupCustomerByEmail,
  patchDocument,
} from './firestore-rest.mjs';

/**
 * contact-triage-run.mjs - the contact-form triage pipeline, with every
 * dependency injectable so the whole flow can be tested without a network.
 */

export function emailConfigured(env = {}) {
  return Boolean(env.RESEND_API_KEY && (env.OUTBOUND_EMAIL_DOMAIN || env.CONTACT_REPLY_FROM));
}

export async function sendReply({ env, contactId, to, subject, text, html, fetchImpl = fetch }) {
  const from = env.CONTACT_REPLY_FROM || `TatoIQ <hello@${env.OUTBOUND_EMAIL_DOMAIN}>`;
  const response = await fetchImpl('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      // Same key for every attempt of one contact, so a retry cannot double-send.
      'Idempotency-Key': `contact-triage-${contactId}`,
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject,
      text,
      html,
      reply_to: env.CONTACT_REPLY_TO || undefined,
    }),
  });

  if (!response.ok) throw new Error(`resend_${response.status}`);
  return response.json().catch(() => ({}));
}

function logEvent(event) {
  // Operational fields only: never the message body or the email address.
  console.log(JSON.stringify({ event: 'contact_triage', ...event }));
}

/**
 * Process one saved contact-form submission.
 *
 * Order matters: the decision and a `queued` reply are written BEFORE the email
 * is sent. If the send fails, the record still says what triage decided and the
 * owner sees the failure; if the function retries, the stored triage makes the
 * run a no-op instead of a second classification or a second email.
 */
export async function runContactTriage({ contactId, env = {}, now = Date.now(), deps = {} }) {
  const store = {
    getDocument,
    patchDocument,
    lookupCustomerByEmail,
    ...(deps.store || {}),
  };
  const triageFn = deps.triage || triageMessage;
  const mailer = deps.sendReply || sendReply;
  const fetchImpl = deps.fetchImpl || fetch;
  const startedAt = now;

  let contact;
  try {
    contact = await store.getDocument({ env, collection: 'contacts', id: contactId });
  } catch (error) {
    logEvent({ step: 'read', code: error?.code || 'unknown' });
    return { status: 503, body: { ok: false, error: 'storage_unavailable' } };
  }

  if (!contact) return { status: 404, body: { ok: false, error: 'not_found' } };

  const guard = guardContact(contact, startedAt);
  if (!guard.ok) {
    if (guard.reason === 'already_triaged') {
      return {
        status: 200,
        body: {
          ok: true,
          duplicate: true,
          contact_id: contactId,
          triage: contact.data.triage,
          needsReview: Boolean(contact.data.needsReview),
        },
      };
    }
    return { status: 409, body: { ok: false, error: guard.reason } };
  }

  // Is the sender already a client? `null` means the lookup could not run, and
  // is never treated as "not a client".
  let lookup = { matched: null, customerId: null };
  try {
    lookup = await store.lookupCustomerByEmail({ env, email: contact.data.email, fetchImpl });
  } catch {
    lookup = { matched: null, customerId: null };
  }

  let triage = null;
  let triageStatus = TRIAGE_STATUS.OK;
  let triageError = null;
  let model = null;

  try {
    const result = await triageFn({
      message: buildContactMessage(contact.data),
      name: contact.data.businessName || contact.data.name,
      source: 'contact_form',
      recentIntents: [],
      env,
      fetchImpl,
    });
    triage = result.triage;
    model = result.model;
  } catch (error) {
    // "Triage cannot tell" includes a provider outage: plain thank-you, and a
    // line on the owner's reading list.
    triageStatus = TRIAGE_STATUS.UNAVAILABLE;
    triageError = error?.code || 'unknown';
    logEvent({ step: 'triage', code: triageError });
  }

  const decision = decide({ triage, triageStatus, existingClient: lookup.matched });
  const at = new Date(startedAt);

  const triageBlock = buildTriageBlock({
    triage,
    decision,
    status: triageStatus,
    model,
    error: triageError,
    now: at,
  });

  const reply = renderReply(decision, contact.data);
  const canEmail = emailConfigured(env);
  let replyStatus = !reply ? 'none' : canEmail ? 'queued' : 'skipped';

  try {
    await store.patchDocument({
      env,
      collection: 'contacts',
      id: contactId,
      data: {
        triage: triageBlock,
        triageStatus,
        category: decision.category,
        urgency: decision.urgency,
        owner: decision.owner,
        needsReview: decision.needsReview,
        reviewReason: decision.reviewReason,
        existingClient: lookup.matched,
        customerId: lookup.customerId || null,
        reply: buildReplyBlock({
          decision,
          to: contact.data.email,
          status: replyStatus,
          error: replyStatus === 'skipped' ? 'email_not_configured' : null,
          now: at,
        }),
        triagedAt: triageBlock.at,
      },
    });
  } catch (error) {
    logEvent({ step: 'write', code: error?.code || 'unknown' });
    return { status: 503, body: { ok: false, error: 'storage_unavailable' } };
  }

  if (reply && canEmail) {
    try {
      await mailer({
        env,
        contactId,
        to: contact.data.email,
        subject: reply.subject,
        text: reply.text,
        html: reply.html,
        fetchImpl,
      });
      replyStatus = 'sent';
    } catch (error) {
      replyStatus = 'failed';
      logEvent({ step: 'send', code: String(error?.message || 'unknown').slice(0, 80) });
    }

    try {
      await store.patchDocument({
        env,
        collection: 'contacts',
        id: contactId,
        data: {
          reply: buildReplyBlock({
            decision,
            to: contact.data.email,
            status: replyStatus,
            error: replyStatus === 'failed' ? 'resend_failed' : null,
            now: new Date(),
          }),
          ...(replyStatus === 'failed' ? { needsReview: true, reviewReason: 'reply_failed' } : {}),
        },
      });
    } catch {
      // The decision is already stored; a stale reply badge is survivable.
    }
  }

  const needsReview = replyStatus === 'failed' ? true : decision.needsReview;

  logEvent({
    step: 'done',
    category: decision.category,
    owner: decision.owner,
    urgency: decision.urgency,
    reply: replyStatus,
    review: needsReview,
    ms: Date.now() - startedAt,
  });

  return {
    status: 200,
    body: {
      ok: true,
      duplicate: false,
      contact_id: contactId,
      triage: {
        status: triageStatus,
        intent: decision.intent,
        category: decision.category,
        urgency: decision.urgency,
        owner: decision.owner,
      },
      reply: { kind: decision.replyKind, status: replyStatus },
      needsReview,
    },
  };
}
