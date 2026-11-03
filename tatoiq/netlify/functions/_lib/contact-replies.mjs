/**
 * contact-replies.mjs - the fixed reply copy used by contact-form triage.
 *
 * Triage chooses WHICH reply goes out. It never writes the words, so a bad
 * classification cannot invent a price, a deadline, or a tax position.
 *
 * The new-business copy below is the CSO's note. It is the only place that copy
 * lives: edit it here and every new-business reply uses the new wording.
 */

export const REPLY_KINDS = Object.freeze({
  NONE: 'none',
  CSO_NEW_BUSINESS: 'cso_new_business',
  CCO_SUPPORT: 'cco_support',
  BILLING_HOLD: 'billing_hold',
  THANK_YOU: 'thank_you',
});

const SUBJECTS = Object.freeze({
  [REPLY_KINDS.CSO_NEW_BUSINESS]: 'Thanks for reaching out to TatoIQ',
  [REPLY_KINDS.CCO_SUPPORT]: "We've got your message",
  [REPLY_KINDS.BILLING_HOLD]: "I'll come back to you",
  [REPLY_KINDS.THANK_YOU]: 'Thanks for your message',
});

function firstName(name) {
  const first = String(name || '').trim().split(/\s+/)[0];
  return first || 'there';
}

function businessClause(businessName) {
  const business = String(businessName || '').trim();
  return business ? ` about ${business}` : '';
}

const BODIES = Object.freeze({
  [REPLY_KINDS.CSO_NEW_BUSINESS]: ({ name, businessName }) =>
    `Hi ${firstName(name)},

Thanks for reaching out${businessClause(businessName)}. I read what you sent.

I look after new engagements at TatoIQ. If there is a fit, I will come back to you with a clear scope and next steps. I will not quote anything before I understand the work.

If it is easier to talk it through, reply with two or three times that suit you and I will set up a call.

- The TatoIQ team`,

  [REPLY_KINDS.CCO_SUPPORT]: ({ name }) =>
    `Hi ${firstName(name)},

Thanks for the note. I have logged it for our client care team, and they will pick it up from here.

If this is about a return, a document, or access to your file, please do not send identifying details by email. We will point you to the secure upload instead.

- TatoIQ Client Care`,

  // Deliberately one sentence. Money questions are the owner's to answer, and
  // this note must not add scope, timing, or an opinion.
  [REPLY_KINDS.BILLING_HOLD]: ({ name }) =>
    `Hi ${firstName(name)},

Thanks for your message about this. I will come back to you on it myself.

- TatoIQ`,

  [REPLY_KINDS.THANK_YOU]: ({ name }) =>
    `Hi ${firstName(name)},

Thanks for your message. We have received it and someone will read it and get back to you.

- The TatoIQ team`,
});

export function subjectFor(kind) {
  return SUBJECTS[kind] || SUBJECTS[REPLY_KINDS.THANK_YOU];
}

export function bodyFor(kind, contact = {}) {
  const build = BODIES[kind];
  return build ? build(contact) : BODIES[REPLY_KINDS.THANK_YOU](contact);
}

export function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function htmlFor(text) {
  return String(text)
    .split(/\n{2,}/)
    .map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, '<br />')}</p>`)
    .join('\n');
}

/**
 * Phrases a fixed reply must never contain. This is a test-time tripwire, not a
 * runtime filter: if someone edits the copy into a promise, the test fails.
 */
export const FORBIDDEN_REPLY_PATTERNS = [
  /\bguarantee(d|s)?\b/i,
  /\b(refund|save|saving|savings)\b.{0,20}\b(guarantee|promise|assure)\b/i,
  /\$\s?\d/,
  /\b\d+\s?(business\s?)?(days?|hours?)\b/i,
  /\bwe will (have|finish|file|complete)\b/i,
  /\bno (risk|audit|penalt)/i,
];

export function findForbiddenPhrase(text) {
  for (const pattern of FORBIDDEN_REPLY_PATTERNS) {
    const match = String(text).match(pattern);
    if (match) return match[0];
  }
  return null;
}
