/**
 * client-agent.ts — Saggio's client mode. PURE: no network, no record writes.
 *
 * The rule is simple: once an `onboarding` or `active` customer is identified,
 * Saggio answers from that record only. It may quote what is there, say plainly
 * what is missing, guide the client to a real page, or send the question to a
 * person. It may not infer project status, quote a price, or pitch an upgrade.
 *
 * Billing, cancellation, and unhappiness are handoffs, not puzzles. The caller
 * persists the handoff; this module only decides and words it.
 */

import type { SaggioAnswer } from './core';
import {
  checklistFor,
  customerFirstName,
  isClientRecord,
  openChecklistItems,
  servicesFor,
  type CustomerRecord,
} from './client-records';
import { findGuideEntry, guideLink } from './site-guide';

export type ClientIntent =
  | 'greeting'
  | 'thanks'
  | 'goodbye'
  | 'project_status'
  | 'scope'
  | 'checklist'
  | 'next_step'
  | 'owner'
  | 'capabilities'
  | 'navigation'
  | 'tax_question'
  | 'problem'
  | 'billing'
  | 'unhappy'
  | 'leaving'
  | 'unrecorded';

export interface ClientReply {
  answer: SaggioAnswer;
  intent: ClientIntent;
  /** True when the caller should run the message through Triage. */
  needsTriage: boolean;
  /** A sensible fallback team if Triage is not configured or fails. */
  triageTeamHint?: string;
  handoff?: { reason: string; message: string };
  /** A question the record could not answer, to be written onto the record. */
  openQuestion?: string;
}

const BILLING =
  /\b(bill|billing|invoice|invoiced|charged|charge|payment|paid|credit card|receipt|balance due|amount due|pricing|price|fee|fees|cost|quote|quotation|overcharg\w*)\b/i;

const UNHAPPY =
  /\b(unhappy|not happy|frustrat\w*|disappoint\w*|angry|upset|complain\w*|terrible|awful|poor service|bad service|sick of|fed up|had enough)\b/i;

const LEAVING =
  /\b(cancel|terminate|end|stop)\b.{0,40}\b(engagement|service|services|contract|account|working with|our work|everything)\b|\b(i (want|would like|need) to (cancel|leave|switch|stop working with))\b|\b(taking|take) my business\b|\b(leaving|switch(ing)? (to|away)|go(ing)? elsewhere|find another (preparer|accountant|firm))\b/i;

const GREETING =
  /^\s*(hi|hii+|hello|hey+|yo|sup|howdy|good (morning|afternoon|evening))\b[\s,!.?]*$/i;

const THANKS =
  /^\s*(thanks|thank you|thx|ty|appreciate (it|that)|got it|cool|ok(ay)?|perfect|great)[\s,!.?]*$/i;

const GOODBYE = /^\s*(bye|goodbye|see (you|ya)|later|good night|that's all)[\s,!.?]*$/i;

const NAVIGATION =
  /\b(where|how do i|how can i|show me|take me|find|open|go to|navigate|link|page|click|upload|download|view|see)\b/i;

const SCOPE =
  /\b(what did i hire|what are you doing for|what do you do for|scope|services?|engagement|hired for|working on for me|what am i paying for)\b/i;

const CHECKLIST =
  /\b(kickoff|kick-off|checklist|outstanding|still need|what do you need|what.*waiting on|open items?|to-?do|onboarding items?)\b/i;

const STATUS =
  /\b(status|where are we|how('?s| is) (it|my (return|project|work))|progress|update|project|how far along|what stage)\b/i;

const NEXT_STEP =
  /\b(next step|what happens next|timeline|when (will|do|should)|deadline|due date|milestone|ready|finish|done)\b/i;

const OWNER =
  /\b(who('?s| is) (working|assigned|handling|on)|my (preparer|account manager|bookkeeper|contact)|assigned to|point of contact)\b/i;

const CAPABILITIES =
  /\b(what can you do|what do you do|how can you help|what can i ask|your capabilities|how does this work|what are you for)\b/i;

const TAX =
  /\b(tax|irs|deduct\w*|filing|file my|return|refund|audit|notice|penalt\w*|payroll|bookkeeping|1099|w-?2|estimated payment)\b/i;

const PROBLEM =
  /\b(problem|issue|wrong|broken|not working|error|late|delay(?:ed|s)?|missing|stuck|fix|mistake|incorrect|hasn'?t|haven'?t|no one (has|responded|replied))\b/i;

function oneLine(value: string, max = 180): string {
  const clean = value.replace(/\s+/g, ' ').trim();
  return clean.length > max ? `${clean.slice(0, max - 1).trimEnd()}…` : clean;
}

function humanList(items: string[]): string {
  if (items.length === 0) return '';
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1]}`;
}

/** The person or team who owns this record, with an honest fallback. */
export function ownerFor(record: CustomerRecord): string {
  return record.owner?.trim() || record.team?.trim() || 'the TatoIQ team';
}

export function classifyClientIntent(question: string): ClientIntent {
  const text = question.trim();
  if (!text) return 'unrecorded';

  // Handoff checks run before anything else. A client saying "I want to cancel
  // because I was overcharged" must not receive a status answer first.
  if (LEAVING.test(text) || UNHAPPY.test(text)) return 'unhappy';
  if (BILLING.test(text)) return 'billing';
  if (GREETING.test(text)) return 'greeting';
  if (THANKS.test(text)) return 'thanks';
  if (GOODBYE.test(text)) return 'goodbye';
  if (OWNER.test(text)) return 'owner';
  if (CAPABILITIES.test(text)) return 'capabilities';
  if (CHECKLIST.test(text)) return 'checklist';
  if (SCOPE.test(text)) return 'scope';
  // A complaint can mention a page, a deadline, or a status. Treat it as a
  // problem first so "the upload keeps failing" is routed, not "guided".
  if (PROBLEM.test(text)) return 'problem';
  if (NEXT_STEP.test(text)) return 'next_step';
  if (STATUS.test(text)) return 'project_status';
  if (NAVIGATION.test(text)) return 'navigation';
  if (TAX.test(text)) return 'tax_question';
  return 'unrecorded';
}

function unknownReply(
  record: CustomerRecord,
  question: string,
  what: string,
  recorded = true,
): ClientReply {
  return {
    intent: 'unrecorded',
    needsTriage: false,
    openQuestion: oneLine(question, 300),
    answer: {
      kind: 'client',
      text: recorded
        ? `I don't have ${what} in your record, so I won't guess. I've added this question to your record for ${ownerFor(record)}. If you need an answer sooner, a person will pick it up from there.`
        : `I don't have ${what} in your record, so I won't guess. I couldn't save this question to your record automatically, so please send it through Messages for ${ownerFor(record)}.`,
      citations: [],
      links: recorded ? undefined : [{ label: 'Messages', href: '/messages' }],
    },
  };
}

function greetingReply(record: CustomerRecord): ClientReply {
  const first = customerFirstName(record);
  const status = record.projectStatus?.trim();
  return {
    intent: 'greeting',
    needsTriage: false,
    answer: {
      kind: 'client',
      text: status
        ? `Hi ${first} — good to see you. Your record shows: ${status}`
        : `Hi ${first} — good to see you. I can answer from your client record, help you find a page in the portal, or pass a question to ${ownerFor(record)}.`,
      citations: [],
      suggestions: ['What is my project status?', 'What is still outstanding?', 'Where do I upload documents?'],
    },
  };
}

function statusReply(record: CustomerRecord, question: string, recorded = true): ClientReply {
  const status = record.projectStatus?.trim();
  const stage = record.projectStage?.trim();
  if (!status && !stage) return unknownReply(record, question, 'a project status', recorded);

  const text = status
    ? `Your record shows: ${status}`
    : `Your record shows the stage as ${stage}. It doesn't include a client-facing status note, so I won't add one.`;
  return {
    intent: 'project_status',
    needsTriage: false,
    answer: {
      kind: 'client',
      text,
      citations: [],
      suggestions: ['What is still outstanding?', 'What happens next?', 'Who is working on it?'],
    },
  };
}

function scopeReply(record: CustomerRecord, question: string, recorded = true): ClientReply {
  const services = servicesFor(record);
  if (services.length === 0 && !record.engagementSummary?.trim()) {
    return unknownReply(record, question, 'the scope of your engagement', recorded);
  }

  const parts = [
    services.length > 0 ? `You hired TatoIQ for ${humanList(services)}.` : '',
    record.engagementSummary?.trim() ? `The engagement note says: ${record.engagementSummary.trim()}` : '',
  ].filter(Boolean);

  return {
    intent: 'scope',
    needsTriage: false,
    answer: {
      kind: 'client',
      text: parts.join('\n\n'),
      citations: [],
      suggestions: ['What is my project status?', 'What is still outstanding?'],
    },
  };
}

function checklistReply(record: CustomerRecord, question: string, recorded = true): ClientReply {
  const checklist = checklistFor(record);
  if (checklist.length === 0) {
    return unknownReply(record, question, 'a kickoff checklist', recorded);
  }

  const open = openChecklistItems(record);
  if (open.length === 0) {
    return {
      intent: 'checklist',
      needsTriage: false,
      answer: {
        kind: 'client',
        text: 'Your record shows no open kickoff items. If something has changed, tell me and I will note it for the team rather than changing the checklist myself.',
        citations: [],
        suggestions: ['What happens next?', 'Where do I upload documents?'],
      },
    };
  }

  const lines = open.map((item, i) => `${i + 1}. ${item.label}${item.note ? ` — ${item.note}` : ''}`);
  return {
    intent: 'checklist',
    needsTriage: false,
    answer: {
      kind: 'client',
      text: `Your record shows ${open.length} open kickoff ${open.length === 1 ? 'item' : 'items'}:\n${lines.join('\n')}\n\nI can tell you where those belong in the portal, but I won't mark them done on your behalf.`,
      citations: [],
      suggestions: ['Where do I upload documents?', 'What happens next?'],
    },
  };
}

function nextStepReply(record: CustomerRecord, question: string, recorded = true): ClientReply {
  if (!record.nextMilestone?.trim()) {
    return unknownReply(record, question, 'a next milestone or date', recorded);
  }

  const date = record.nextMilestoneDate?.trim();
  return {
    intent: 'next_step',
    needsTriage: false,
    answer: {
      kind: 'client',
      text: `Your record lists the next milestone as: ${record.nextMilestone.trim()}${date ? ` (${date})` : ''}. I can only repeat what the record says; I won't promise a date that has not been agreed.`,
      citations: [],
      suggestions: ['What is my project status?', 'What is still outstanding?'],
    },
  };
}

function ownerReply(record: CustomerRecord, question: string, recorded = true): ClientReply {
  if (!record.owner?.trim() && !record.team?.trim()) {
    return unknownReply(record, question, 'an assigned owner', recorded);
  }
  const owner = record.owner?.trim();
  const team = record.team?.trim();
  return {
    intent: 'owner',
    needsTriage: false,
    answer: {
      kind: 'client',
      text: owner
        ? `${owner}${team ? ` (${team})` : ''} is listed as the owner on your record.`
        : `${team} is listed as the team on your record.`,
      citations: [],
      suggestions: ['What is my project status?', 'What is still outstanding?'],
    },
  };
}

function capabilitiesReply(record: CustomerRecord): ClientReply {
  return {
    intent: 'capabilities',
    needsTriage: false,
    answer: {
      kind: 'client',
      text: `I can tell you what your record shows: what you hired TatoIQ for, the project status and stage on file, the next recorded milestone, open kickoff items, and who owns the work. I can also point you to a real page in the portal. Anything the record doesn't answer, I'll pass to ${ownerFor(record)} rather than guess.`,
      citations: [],
      suggestions: ['What is my project status?', 'What is still outstanding?', 'Who is working on it?'],
    },
  };
}

function navigationReply(record: CustomerRecord, question: string, recorded = true): ClientReply {
  const entry = findGuideEntry(question);
  if (!entry) {
    return unknownReply(record, question, 'a page that matches that request', recorded);
  }
  return {
    intent: 'navigation',
    needsTriage: false,
    answer: {
      kind: 'guide',
      text: entry.directions,
      citations: [],
      links: [guideLink(entry)],
      suggestions: ['What is still outstanding?', 'What is my project status?'],
    },
  };
}

export function buildHandoffReply(
  record: CustomerRecord,
  reason: string,
  message: string,
  intent: ClientIntent = reason === 'billing' ? 'billing' : 'unhappy',
  recorded = true,
): ClientReply {
  const owner = ownerFor(record);
  return {
    intent,
    needsTriage: false,
    handoff: { reason, message: oneLine(message, 500) },
    answer: {
      kind: 'handoff',
      text: recorded
        ? `I'm sorry — I'm not going to keep trying to solve this in chat. ${owner} will come back to you, and I've flagged your record with what you said so they have the full picture.`
        : `I'm sorry — I'm not going to keep trying to solve this in chat. ${owner} will come back to you. I couldn't save this to your record automatically, so please also send a short note through Messages so they have the details.`,
      citations: [],
      escalationReason: reason,
      links: recorded ? undefined : [{ label: 'Messages', href: '/messages' }],
    },
  };
}

function routedReply(record: CustomerRecord, question: string, intent: ClientIntent): ClientReply {
  const teamHint =
    intent === 'tax_question'
      ? record.team?.trim() || 'the tax team'
      : intent === 'problem'
        ? 'client support'
        : 'the client success team';
  return {
    intent,
    needsTriage: true,
    triageTeamHint: teamHint,
    openQuestion: oneLine(question, 300),
    answer: {
      kind: 'routing',
      text: 'One moment — I am sending this to the right person.',
      citations: [],
    },
  };
}

/**
 * Decide how Saggio should respond to an identified client.
 *
 * The caller must still run Triage for `needsTriage`, persist any handoff or
 * open question, and update the last-talked date.
 */
export function buildClientReply(
  record: CustomerRecord,
  question: string,
  history: string[] = [],
  recorded = true,
): ClientReply {
  if (!isClientRecord(record)) {
    throw new Error('buildClientReply called with a non-client record');
  }

  const text = question.trim();
  if (!text) return greetingReply(record);

  const intent = classifyClientIntent(text);

  switch (intent) {
    case 'greeting':
      return greetingReply(record);
    case 'thanks':
      return {
        intent,
        needsTriage: false,
        answer: {
          kind: 'client',
          text: `You're welcome. I'm here whenever you want to check what the record says or find your way around the portal.`,
          citations: [],
        },
      };
    case 'goodbye':
      return {
        intent,
        needsTriage: false,
        answer: {
          kind: 'client',
          text: 'Thanks for stopping by. I will leave the record as it is unless you ask me to pass something on.',
          citations: [],
        },
      };
    case 'billing':
      return buildHandoffReply(record, 'billing', text, 'billing', recorded);
    case 'unhappy':
      return buildHandoffReply(record, 'unhappy or leaving', text, 'unhappy', recorded);
    case 'leaving':
      return buildHandoffReply(record, 'unhappy or leaving', text, 'leaving', recorded);
    case 'project_status':
      return statusReply(record, text, recorded);
    case 'scope':
      return scopeReply(record, text, recorded);
    case 'checklist':
      return checklistReply(record, text, recorded);
    case 'next_step':
      return nextStepReply(record, text, recorded);
    case 'owner':
      return ownerReply(record, text, recorded);
    case 'capabilities':
      return capabilitiesReply(record);
    case 'navigation':
      return navigationReply(record, text, recorded);
    case 'tax_question':
    case 'problem':
      return routedReply(record, text, intent);
    case 'unrecorded': {
      // A short follow-up can inherit the previous topic ("what about that?").
      const last = history[history.length - 1];
      if (last && text.split(/\s+/).filter(Boolean).length <= 3) {
        const inherited = classifyClientIntent(`${last} ${text}`);
        if (inherited !== 'unrecorded' && inherited !== 'greeting' && inherited !== 'thanks' && inherited !== 'goodbye') {
          return buildClientReply(record, `${last} ${text}`, [], recorded);
        }
      }
      return unknownReply(record, text, 'an answer to that', recorded);
    }
    default:
      return unknownReply(record, text, 'an answer to that', recorded);
  }
}

/** One line for the customer record. Never includes sensitive identifiers. */
export function summarizeClientInteraction(
  intent: ClientIntent,
  question: string,
  outcome?: { handoff?: boolean; handoffReason?: string; routedTo?: string; openQuestion?: boolean },
): string {
  if (outcome?.handoff) {
    return `Client ${intent === 'billing' ? 'raised billing' : 'needed a human'}; handed off${
      outcome.handoffReason ? ` (${oneLine(outcome.handoffReason, 80)})` : ''
    } for a reply.`;
  }
  switch (intent) {
    case 'greeting':
      return 'Client checked in; greeted from their record.';
    case 'thanks':
      return 'Client thanked Saggio; no action needed.';
    case 'goodbye':
      return 'Client ended the chat; no action needed.';
    case 'project_status':
      return 'Client asked for project status; Saggio quoted the record.';
    case 'scope':
      return 'Client asked what they hired TatoIQ for; Saggio quoted the engagement scope.';
    case 'checklist':
      return 'Client asked what is outstanding; Saggio listed open kickoff items.';
    case 'next_step':
      return 'Client asked what happens next; Saggio repeated the recorded milestone.';
    case 'owner':
      return 'Client asked who owns the work; Saggio named the recorded owner.';
    case 'capabilities':
      return 'Client asked what Saggio can do; described record-grounded help only.';
    case 'navigation':
      return 'Client asked where something is; Saggio gave the verified page link.';
    case 'billing':
      return 'Client raised billing; handed off to the owner for a human reply.';
    case 'unhappy':
    case 'leaving':
      return 'Client sounded unhappy or mentioned leaving; handed off to the owner.';
    case 'tax_question':
      return outcome?.routedTo
        ? `Client asked a tax question; routed to ${outcome.routedTo}.`
        : 'Client asked a tax question; routed for a human answer.';
    case 'problem':
      return outcome?.routedTo
        ? `Client reported a problem; routed to ${outcome.routedTo}.`
        : 'Client reported a problem; routed for a human answer.';
    case 'unrecorded':
      return outcome?.openQuestion
        ? `Client asked something not in the record; added to open questions for the team. Asked: ${oneLine(question, 120)}`
        : 'Client asked a question the record did not answer; noted for the team.';
    default:
      return 'Client conversation recorded.';
  }
}
