import 'server-only';

import type { ClientIntent } from './client-agent';
import { servicesFor, type CustomerRecord } from './client-records';

/**
 * triage.ts — SERVER-ONLY bridge to the TatoIQ Triage Agent.
 *
 * The agent is optional. When TRIAGE_AGENT_URL is configured, every routed
 * client message is posted there with a small, non-sensitive slice of the
 * record. When it is not configured (or the call fails), a deterministic local
 * triage decides the team. The response always says which mode was used, so the
 * record never pretends a remote agent ran when it did not.
 *
 * No date is invented here. A response window is used only when it came from
 * the record or from the Triage Agent itself.
 */

export interface TriageResult {
  team: string;
  owner?: string;
  responseWindow?: string;
  reason?: string;
  handoff?: boolean;
  mode: 'agent' | 'fallback';
}

export interface TriageInput {
  message: string;
  intent: ClientIntent;
  record: CustomerRecord;
}

interface TriagePayload {
  team?: unknown;
  owner?: unknown;
  responseWindow?: unknown;
  reason?: unknown;
  handoff?: unknown;
  result?: unknown;
}

function asText(value: unknown, max = 200): string | undefined {
  if (typeof value !== 'string') return undefined;
  const text = value.replace(/\s+/g, ' ').trim();
  if (!text) return undefined;
  return text.slice(0, max);
}

function readPayload(payload: TriagePayload): Omit<TriageResult, 'mode'> | null {
  // Accept either a flat response or a `{ result: { ... } }` envelope.
  const raw =
    payload.result && typeof payload.result === 'object'
      ? ({ ...payload, ...(payload.result as TriagePayload) } as TriagePayload)
      : payload;
  const team = asText(raw.team);
  if (!team) return null;
  return {
    team,
    owner: asText(raw.owner),
    responseWindow: asText(raw.responseWindow),
    reason: asText(raw.reason, 500),
    handoff: raw.handoff === true,
  };
}

/**
 * The deterministic fallback. It routes by the kind of question, not by a guess
 * about the client's state, and it never supplies a response time.
 */
export function fallbackTriage(input: TriageInput): TriageResult {
  const { record, intent } = input;
  const owner = record.owner?.trim() || undefined;
  const team =
    record.team?.trim() ||
    (intent === 'tax_question' ? 'Tax team' : intent === 'problem' ? 'Client support' : 'Client success');
  return {
    team,
    owner,
    responseWindow: record.responseWindow?.trim() || undefined,
    reason:
      intent === 'tax_question'
        ? 'A tax or filing question needs a licensed preparer, not a record lookup.'
        : intent === 'problem'
          ? 'The client reported a problem that needs a human to investigate.'
          : 'The question is not answered by the stored customer record.',
    handoff: false,
    mode: 'fallback',
  };
}

export async function triageClientMessage(input: TriageInput): Promise<TriageResult> {
  const url = process.env.TRIAGE_AGENT_URL?.trim();
  if (!url) return fallbackTriage(input);

  const key = process.env.TRIAGE_AGENT_API_KEY?.trim();
  const record = input.record;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(key ? { Authorization: `Bearer ${key}` } : {}),
      },
      body: JSON.stringify({
        message: input.message,
        intent: input.intent,
        customer: {
          id: record.id,
          businessName: record.businessName,
          status: record.status,
          services: servicesFor(record),
          projectStatus: record.projectStatus,
          owner: record.owner,
          team: record.team,
          responseWindow: record.responseWindow,
        },
      }),
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) throw new Error(`Triage Agent returned ${res.status}`);
    const payload = (await res.json()) as TriagePayload;
    const parsed = readPayload(payload);
    if (!parsed) throw new Error('Triage Agent response had no team');
    return { ...parsed, mode: 'agent' };
  } catch {
    // Deliberately silent to the browser: the client should never see an
    // internal integration error, and the record is still written by the caller.
    return fallbackTriage(input);
  }
}

/** One sentence naming the person/team and only an agreed time window. */
export function routingSentence(result: TriageResult): string {
  const who = result.owner
    ? `${result.owner}${result.team && result.team !== result.owner ? ` (${result.team})` : ''}`
    : result.team;
  if (result.responseWindow) {
    return `I've routed this to ${who}, who should pick it up ${result.responseWindow}.`;
  }
  return `I've routed this to ${who}; they will confirm a time with you, and I won't promise one that hasn't been agreed.`;
}
