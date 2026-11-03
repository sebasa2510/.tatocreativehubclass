import { CATEGORY_OWNER, MAX_MESSAGE_CHARS, redact } from './cco-triage-core.mjs';
import { REPLY_KINDS, bodyFor, escapeHtml, htmlFor, subjectFor } from './contact-replies.mjs';

/**
 * contact-triage-core.mjs - pure logic for turning one contact-form submission
 * into a recorded decision and exactly one reply.
 *
 * Kept free of network access so every rule can be tested directly:
 *   - which reply goes out (or none)
 *   - what goes on the record
 *   - what lands on the owner's reading list
 */

/** A contact older than this is not triaged: the form path is short-lived. */
export const MAX_CONTACT_AGE_MS = 15 * 60 * 1000;
/** Firestore auto-IDs are 20 alphanumeric characters; allow a little slack. */
export const CONTACT_ID_RE = /^[A-Za-z0-9]{10,40}$/;

export const TRIAGE_STATUS = Object.freeze({
  OK: 'ok',
  UNAVAILABLE: 'unavailable',
});

export const REVIEW_REASON = Object.freeze({
  TRIAGE_UNAVAILABLE: 'triage_unavailable',
  TRIAGE_UNCLEAR: 'triage_unclear',
  MONEY_OWNER: 'money_owner',
  PARTNERSHIP: 'no_reply_policy_partnership',
  SUPPORT_UNKNOWN_SENDER: 'support_from_unknown_sender',
  REPLY_FAILED: 'reply_failed',
  EMAIL_NOT_CONFIGURED: 'email_not_configured',
});

/** Contact fields that describe the request, in the order a reader wants them. */
const CONTEXT_FIELDS = [
  ['Business', 'businessName'],
  ['Industry', 'industry'],
  ['Interested in', 'service'],
  ['Budget', 'budget'],
  ['Timeline', 'timeline'],
];

export function buildContactMessage(contact = {}) {
  const lines = [String(contact.bottleneck || '').trim()];

  const context = CONTEXT_FIELDS.map(([label, key]) => {
    const value = String(contact[key] || '').trim();
    return value ? `${label}: ${value}` : '';
  }).filter(Boolean);

  if (context.length > 0) lines.push(context.join('\n'));

  return redact(lines.filter(Boolean).join('\n\n')).slice(0, MAX_MESSAGE_CHARS);
}

/**
 * Refuse to process anything that is not a fresh, un-triaged contact-form
 * record. This is what makes a replayed request harmless.
 */
export function guardContact(contact, nowMs = Date.now()) {
  if (!contact || !contact.data) return { ok: false, reason: 'not_found' };

  const data = contact.data;
  if (data.source !== 'website-contact') {
    return { ok: false, reason: 'not_a_contact_form_submission' };
  }
  if (data.triage && typeof data.triage === 'object') {
    return { ok: false, reason: 'already_triaged' };
  }

  const createdAt = Date.parse(String(data.createdAt || ''));
  if (!Number.isFinite(createdAt)) return { ok: false, reason: 'bad_timestamp' };
  if (createdAt > nowMs + 5 * 60 * 1000) return { ok: false, reason: 'bad_timestamp' };
  if (nowMs - createdAt > MAX_CONTACT_AGE_MS) return { ok: false, reason: 'too_old' };

  return { ok: true };
}

/**
 * The decision table. Category comes from triage; the owner and the reply never
 * do. `existingClient` is true, false, or null when the lookup was unavailable.
 */
export function decide({ triage, existingClient = null, triageStatus = TRIAGE_STATUS.OK }) {
  if (triageStatus === TRIAGE_STATUS.UNAVAILABLE || !triage) {
    return {
      category: 'unclear',
      intent: 'Triage was unavailable. Read the original message.',
      urgency: 'medium',
      owner: 'owner',
      humanRequired: true,
      needsReview: true,
      reviewReason: REVIEW_REASON.TRIAGE_UNAVAILABLE,
      replyKind: REPLY_KINDS.THANK_YOU,
    };
  }

  const category = triage.category;
  const base = {
    category,
    intent: triage.intent_one_line,
    urgency: triage.urgency,
    owner: CATEGORY_OWNER[category] || 'owner',
    humanRequired: Boolean(triage.human_required_before_reply),
    needsReview: false,
    reviewReason: null,
    replyKind: REPLY_KINDS.THANK_YOU,
  };

  switch (category) {
    case 'spam':
      return { ...base, replyKind: REPLY_KINDS.NONE };

    case 'billing_or_money':
      return {
        ...base,
        replyKind: REPLY_KINDS.BILLING_HOLD,
        needsReview: true,
        reviewReason: REVIEW_REASON.MONEY_OWNER,
      };

    case 'new_business':
      return { ...base, replyKind: REPLY_KINDS.CSO_NEW_BUSINESS };

    case 'support':
      return existingClient === false
        ? {
            ...base,
            replyKind: REPLY_KINDS.CCO_SUPPORT,
            needsReview: true,
            reviewReason: REVIEW_REASON.SUPPORT_UNKNOWN_SENDER,
          }
        : { ...base, replyKind: REPLY_KINDS.CCO_SUPPORT };

    case 'partnership_or_press':
      return {
        ...base,
        replyKind: REPLY_KINDS.THANK_YOU,
        needsReview: true,
        reviewReason: REVIEW_REASON.PARTNERSHIP,
      };

    case 'unclear':
    default:
      return {
        ...base,
        replyKind: REPLY_KINDS.THANK_YOU,
        needsReview: true,
        reviewReason: REVIEW_REASON.TRIAGE_UNCLEAR,
      };
  }
}

/** What gets written to the contact document and shown on the review page. */
export function buildTriageBlock({ triage, decision, status, model, error, now = new Date() }) {
  return {
    status,
    intent: decision.intent,
    category: decision.category,
    urgency: decision.urgency,
    owner: decision.owner,
    urgency_why: triage?.urgency_why || null,
    human_required_before_reply: decision.humanRequired,
    needs_review: decision.needsReview,
    review_reason: decision.reviewReason,
    model: model || null,
    error: error || null,
    at: now.toISOString(),
  };
}

export function renderReply(decision, contact = {}) {
  if (!decision || decision.replyKind === REPLY_KINDS.NONE) return null;
  const text = bodyFor(decision.replyKind, contact);
  return {
    kind: decision.replyKind,
    subject: subjectFor(decision.replyKind),
    text,
    html: htmlFor(text),
  };
}

export function buildReplyBlock({ decision, to, status, error, now = new Date() }) {
  return {
    kind: decision.replyKind,
    status,
    to: to || null,
    subject: decision.replyKind === REPLY_KINDS.NONE ? null : subjectFor(decision.replyKind),
    error: error || null,
    at: now.toISOString(),
  };
}

function shortDate(value) {
  const parsed = Date.parse(String(value || ''));
  if (!Number.isFinite(parsed)) return String(value || '');
  return new Date(parsed).toISOString().replace('T', ' ').slice(0, 16) + 'Z';
}

function badge(text, tone) {
  return `<span class="badge ${tone}">${escapeHtml(text)}</span>`;
}

function row(doc) {
  const data = doc.data || {};
  const triage = data.triage && typeof data.triage === 'object' ? data.triage : null;
  const reply = data.reply && typeof data.reply === 'object' ? data.reply : null;
  const needsReview = Boolean(data.needsReview);

  const owner = triage?.owner || '-';
  const category = triage?.category || (data.triageStatus === 'unavailable' ? 'triage unavailable' : '-');
  const urgency = triage?.urgency || '-';
  const intent = triage?.intent || data.reviewReason || 'No decision recorded';

  const replyLabel = reply
    ? `${reply.kind || '-'} / ${reply.status || '-'}`
    : data.needsReview
      ? 'none recorded'
      : '-';

  const message = escapeHtml(String(data.bottleneck || '')).replace(/\n/g, '<br />');

  return `<tr class="${needsReview ? 'needs' : ''}">
  <td class="when">${escapeHtml(shortDate(data.createdAt))}</td>
  <td>
    <strong>${escapeHtml(String(data.name || 'Unknown'))}</strong><br />
    <a href="mailto:${escapeHtml(String(data.email || ''))}">${escapeHtml(String(data.email || ''))}</a><br />
    <span class="muted">${escapeHtml(String(data.businessName || ''))}</span>
  </td>
  <td>${escapeHtml(String(intent))}
    ${data.existingClient === true ? badge('existing client', 'grey') : ''}
    ${data.existingClient === false ? badge('not in clients', 'grey') : ''}
  </td>
  <td>${badge(category, category === 'unclear' ? 'warn' : 'grey')}<br />
    ${badge(`urgency: ${urgency}`, urgency === 'high' ? 'warn' : 'grey')}<br />
    ${badge(`owner: ${owner}`, 'dark')}
  </td>
  <td>${escapeHtml(replyLabel)}${reply?.error ? `<br /><span class="muted">${escapeHtml(reply.error)}</span>` : ''}</td>
  <td>${needsReview ? badge(data.reviewReason || 'read this', 'warn') : badge('auto', 'ok')}</td>
</tr>
<tr class="${needsReview ? 'needs' : ''}"><td colspan="6" class="message"><details><summary>Message</summary>${message || '<em>empty</em>'}</details></td></tr>`;
}

/**
 * Server-rendered review page. No external assets and no client JavaScript, so
 * it works as a plain Netlify function response. Every value is escaped.
 */
export function renderReviewPage({ docs = [], now = new Date(), needsOnly = false }) {
  const rows = needsOnly ? docs.filter((doc) => doc.data?.needsReview) : docs;
  const needs = docs.filter((doc) => doc.data?.needsReview).length;
  const sent = docs.filter((doc) => doc.data?.reply?.status === 'sent').length;
  const failed = docs.filter((doc) => doc.data?.reply?.status === 'failed').length;

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex, nofollow" />
<title>Contact triage decisions</title>
<style>
  :root { color-scheme: light; }
  body { font: 14px/1.45 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 0; background: #f6f7f9; color: #14181f; }
  header { background: #14181f; color: #fff; padding: 20px 24px; }
  header h1 { margin: 0 0 6px; font-size: 18px; }
  header p { margin: 0; color: #b9c0cc; font-size: 13px; }
  main { padding: 20px 24px 48px; }
  .stats { display: flex; gap: 18px; flex-wrap: wrap; margin-bottom: 16px; font-size: 13px; color: #4a5361; }
  .stats strong { color: #14181f; }
  table { width: 100%; border-collapse: collapse; background: #fff; box-shadow: 0 1px 2px rgba(0,0,0,.06); }
  th, td { text-align: left; vertical-align: top; padding: 10px 12px; border-bottom: 1px solid #e6e9ee; }
  th { font-size: 11px; text-transform: uppercase; letter-spacing: .04em; color: #6b7381; background: #fafbfc; }
  tr.needs td { background: #fff8ec; }
  td.message { padding-top: 0; }
  td.when { white-space: nowrap; color: #4a5361; font-variant-numeric: tabular-nums; }
  .muted { color: #6b7381; font-size: 12px; }
  .badge { display: inline-block; padding: 1px 7px; margin: 1px 0; border-radius: 999px; font-size: 11px; font-weight: 600; }
  .badge.ok { background: #e6f4ea; color: #1e6b3a; }
  .badge.warn { background: #fdeccb; color: #8a4b00; }
  .badge.grey { background: #eef0f3; color: #3f4753; }
  .badge.dark { background: #14181f; color: #fff; }
  details summary { cursor: pointer; color: #2b5f8a; font-size: 12px; }
  .empty { padding: 24px; background: #fff; color: #4a5361; }
  a { color: #2b5f8a; }
</style>
</head>
<body>
<header>
  <h1>Contact triage decisions</h1>
  <p>Newest ${docs.length} submissions · generated ${escapeHtml(now.toISOString())}</p>
</header>
<main>
  <div class="stats">
    <span><strong>${docs.length}</strong> shown</span>
    <span><strong>${needs}</strong> need your read</span>
    <span><strong>${sent}</strong> replies sent</span>
    <span><strong>${failed}</strong> reply failures</span>
    <span><a href="?${needsOnly ? '' : 'needs=1'}">${needsOnly ? 'Show all' : 'Show only needs-review'}</a></span>
  </div>
  ${
    rows.length === 0
      ? '<div class="empty">Nothing to show.</div>'
      : `<table>
  <thead><tr><th>When</th><th>Who</th><th>What they want</th><th>Decision</th><th>Reply</th><th>Review</th></tr></thead>
  <tbody>${rows.map(row).join('\n')}</tbody>
</table>`
  }
</main>
</body>
</html>`;
}
