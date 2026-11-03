import { NextResponse } from 'next/server';

import { redactText } from '@/lib/redact';
import { answer, retrieve, SAGGIO_SCOPE_NOTE, type SaggioAnswer } from '@/lib/saggio/core';
import {
  buildClientReply,
  buildHandoffReply,
  summarizeClientInteraction,
} from '@/lib/saggio/client-agent';
import {
  extractEmail,
  isClientRecord,
  isValidEmail,
  normalizeEmail,
  type CustomerHandoff,
  type CustomerRouting,
} from '@/lib/saggio/client-records';
import {
  findCustomerByEmail,
  isCustomerStoreConfigured,
  persistConversation,
} from '@/lib/saggio/firestore-store';
import { composeGroundedAnswer, hasLlmProvider } from '@/lib/saggio/provider';
import { routingSentence, triageClientMessage, type TriageResult } from '@/lib/saggio/triage';

/**
 * POST /api/assistant — Saggio's server endpoint.
 *
 * TWO MODES, ONE ROUTE:
 *   1. Public/education mode: the original grounded tax core, optionally
 *      composed by the model from retrieved IRS chunks.
 *   2. Client mode: if the supplied email belongs to an `onboarding` or
 *      `active` customer, Saggio answers ONLY from that customer record. It can
 *      quote the record, guide the client to a real page, route a question
 *      through Triage, or hand off to a person. It never invents project status
 *      and never pitches.
 *
 * PRIVACY (spec: "send zero unmasked PII to the LLM provider"):
 *   1. The incoming question is REDACTED before anything else touches it.
 *   2. Client records are read and written only on the server.
 *   3. Client answers are deterministic — no customer record is sent to the
 *      model provider.
 *   4. We never log the raw question or the email.
 */
export async function POST(request: Request) {
  let raw = '';
  let history: string[] = [];
  let suppliedEmail = '';
  try {
    const body = (await request.json()) as {
      question?: unknown;
      history?: unknown;
      email?: unknown;
    };
    raw = typeof body.question === 'string' ? body.question : '';
    suppliedEmail = typeof body.email === 'string' ? body.email.trim() : '';
    // Conversation context is optional and bounded: at most four short previous
    // user turns, redacted exactly like the current question.
    if (Array.isArray(body.history)) {
      history = body.history
        .filter((h): h is string => typeof h === 'string' && h.trim().length > 0)
        .slice(-4)
        .map((h) => redactText(h.slice(0, 500)).text);
    }
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  if (!raw.trim()) {
    return NextResponse.json({ error: 'A question is required.' }, { status: 400 });
  }
  if (raw.length > 2000) {
    return NextResponse.json({ error: 'Question is too long.' }, { status: 413 });
  }

  // An email can arrive in the dedicated field or inside the chat turn. If the
  // whole turn is just the email, treat it as the introduction it is. When the
  // email is wrapped in a greeting ("hi, I'm name@business.com"), drop the
  // address before intent classification so a client still gets a greeting.
  const emailFromText = extractEmail(raw);
  const email = normalizeEmail(suppliedEmail || emailFromText || '');
  let question = raw.trim();
  if (emailFromText) {
    const stripped = raw
      .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    const greetingOnly =
      /^(hi|hello|hey|good (morning|afternoon|evening))?[\s,!.?]*(i'?m|my email is|email is|it'?s)?[\s,!.?]*$/i.test(
        stripped,
      );
    question = !stripped || greetingOnly ? 'Hello' : stripped;
  }
  if (question.length > 2000) {
    return NextResponse.json({ error: 'Question is too long.' }, { status: 413 });
  }

  if (email && !isValidEmail(email)) {
    return NextResponse.json(
      {
        kind: 'identify',
        text: 'That does not look like a complete email address. Please send the email on your TatoIQ account, for example name@business.com.',
        citations: [],
        mode: 'public',
        lookup: 'invalid_email',
      } satisfies SaggioAnswer & Record<string, unknown>,
    );
  }

  // Redact before any provider call. Client-mode answers do not use this text
  // for model composition, but the same boundary is kept for consistency.
  const { text: redacted, counts } = redactText(question);

  const storeConfigured = isCustomerStoreConfigured();
  let lookup: 'found' | 'not_found' | 'not_client' | 'unconfigured' | 'error' | 'not_checked' =
    email ? 'not_found' : 'not_checked';

  if (email && storeConfigured) {
    try {
      const record = await findCustomerByEmail(email);
      if (record && isClientRecord(record)) {
        // Client text is redacted before it can reach Triage or the record. The
        // deterministic intent rules do not need the raw identifiers.
        const clientText = redacted.trim() || question;
        const reply = buildClientReply(record, clientText, history);
        let final: SaggioAnswer = reply.answer;
        let routing: CustomerRouting | undefined;
        let handoff: CustomerHandoff | undefined;
        let triageResult: TriageResult | undefined;
        const at = new Date().toISOString();

        if (reply.needsTriage) {
          const triage = await triageClientMessage({
            message: clientText,
            intent: reply.intent,
            record,
          });
          triageResult = triage;

          if (triage.handoff) {
            const personReply = buildHandoffReply(
              record,
              triage.reason ?? 'Triage asked for a human',
              clientText,
              reply.intent,
            );
            final = personReply.answer;
            if (personReply.handoff) {
              handoff = {
                reason: personReply.handoff.reason,
                message: personReply.handoff.message,
                at,
                status: 'open',
              };
            }
          } else {
            routing = {
              team: triage.team,
              owner: triage.owner,
              responseWindow: triage.responseWindow,
              reason: triage.reason,
              message: clientText.slice(0, 500),
              at,
              mode: triage.mode,
            };
            final = {
              kind: 'routing',
              text: `${routingSentence(triage)} I've written the routing onto your record so it is not lost in the chat.`,
              citations: [],
            };
          }
        } else if (reply.handoff) {
          handoff = {
            reason: reply.handoff.reason,
            message: reply.handoff.message,
            at,
            status: 'open',
          };
        }

        const summary = summarizeClientInteraction(reply.intent, clientText, {
          handoff: Boolean(handoff),
          handoffReason: handoff?.reason,
          routedTo: routing ? routing.owner || routing.team : undefined,
          openQuestion: Boolean(reply.openQuestion),
        });

        const persisted = await persistConversation(record, {
          summary,
          at,
          intent: reply.intent,
          openQuestion: reply.openQuestion,
          routing,
          handoff,
        });

        // Never claim something was written when the write failed. The answer
        // still stands; only the bookkeeping sentence changes.
        if (!persisted) {
          if (routing && triageResult) {
            final = {
              ...final,
              text: `${routingSentence(triageResult)} I couldn't save the routing to your record automatically, so please also send it through Messages.`,
              links: [{ label: 'Messages', href: '/messages' }],
            };
          } else if (handoff) {
            final = buildHandoffReply(record, handoff.reason, clientText, reply.intent, false).answer;
          } else if (reply.openQuestion) {
            final = buildClientReply(record, clientText, history, false).answer;
          }
        }

        return NextResponse.json({
          ...final,
          mode: 'client',
          lookup: 'found',
          persisted,
          triage: routing?.mode ?? (handoff ? 'handoff' : undefined),
          redaction: counts,
          provider: 'client-record',
        });
      }

      lookup = record ? 'not_client' : 'not_found';
    } catch {
      // Never turn a record outage into an invented customer or a fake answer
      // from a record. Fall through to the public/education mode with a notice.
      lookup = 'error';
    }
  } else if (email && !storeConfigured) {
    lookup = 'unconfigured';
  }

  // Public/education mode. The deterministic core decides the tier first; a
  // model may only rewrite an already-grounded answer.
  const result = answer(question, false, history);

  if (result.kind === 'answer' && hasLlmProvider()) {
    const chunks = retrieve(redacted);
    const narrative = chunks.length > 0 ? await composeGroundedAnswer(redacted, chunks) : null;
    if (narrative) {
      result.text = `${narrative}\n\nSources:\n• ${result.citations
        .map((c) => `${c.source} — ${c.section}`)
        .join('\n• ')}\n\n${SAGGIO_SCOPE_NOTE}`;
    }
  }

  if (!email) {
    result.notice =
      "If you're a TatoIQ client, send the email on your account and I'll answer from your project record.";
  } else if (lookup === 'unconfigured') {
    result.notice =
      "I can't reach client records on this deployment right now, so I can't check your account. I can still help with general tax questions.";
  } else if (lookup === 'error') {
    result.notice =
      "I couldn't check client records just now. I can still help with general tax questions, and the team can pick up your account question.";
  } else if (lookup === 'not_found') {
    result.notice = `I don't see a client record for ${email}. I can still answer general tax questions.`;
  } else if (lookup === 'not_client') {
    result.notice = `I don't see an active client record for ${email}. I can still answer general tax questions.`;
  }

  // Log category counts only — never the raw question or the email.
  return NextResponse.json({
    ...result,
    mode: 'public',
    lookup,
    redaction: counts,
    provider: hasLlmProvider() ? 'openai' : 'offline',
  });
}
