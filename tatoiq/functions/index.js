/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * functions/index.js — optional Saggio serverless endpoint.
 *
 * STATUS: this endpoint is NOT wired into Hosting today. The live site uses the
 * browser core. If it is ever deployed, it must not pretend to be grounded:
 * it has no retrieved IRS chunks, so it returns a clearly labelled general
 * answer and may never claim an IRS citation.
 *
 * SAFETY POSTURE (must not be weakened):
 *   1. The key lives only in this server environment. It is never shipped to
 *      the browser.
 *   2. The question is redacted and truncated before any provider call.
 *   3. With no retrieved chunks, the model is told to give a general answer and
 *      not to invent or cite IRS publications, forms, thresholds, or deadlines.
 *   4. Sensitive topics (audit, IRS notice, collections, fraud, foreign) are
 *      escalated to a human preparer and never get AI calculation advice.
 *
 * DEPLOY
 *   firebase functions:secrets:set OPENAI_API_KEY
 *   firebase deploy --only functions
 * then add a Hosting rewrite. Do not label the output as IRS-sourced.
 */

const { onRequest } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');

const OPENAI_API_KEY = defineSecret('OPENAI_API_KEY');

const MODEL = process.env.SAGGIO_MODEL || 'gpt-4o-mini';

// ── Escalation: mirrors src/lib/saggio/core.ts. Keep the two in sync. ──
const ESCALATION = [
  [/\b(foreign|fbar|fatca|expat|overseas|form 2555|form 1116|8938)\b/i, 'Foreign earned income / international reporting'],
  [/\b(irs notice|cp\d{2,3}|letter from (the )?irs|notice cp)\b/i, 'IRS notice or letter response'],
  [/\b(audit\w*|examination|exam notice)\b/i, 'Audit or examination'],
  [/\b(back taxes|past[- ]due|penalt(y|ies)|owe the irs)\b/i, 'Past-due penalties or back taxes'],
  [/\b(dispute|appeal|deficiency|tax court)\b/i, 'Tax dispute'],
  [/\b(offer in compromise|installment agreement|garnish|levy|collection)\b/i, 'Collections / negotiation'],
  [/\b(fraud|identity theft|stolen (ein|ssn|identity)|fake (receipt|document))\b/i, 'Suspected fraud or identity theft'],
];

function detectEscalation(text) {
  for (const [re, reason] of ESCALATION) if (re.test(text)) return reason;
  return null;
}

/** Strip obvious identifiers before anything leaves our infrastructure. */
function redact(text) {
  return text
    .replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[redacted SSN]')
    .replace(/\b\d{2}-\d{7}\b/g, '[redacted EIN]')
    .replace(/\b(?:\d[ -]?){13,19}\b/g, '[redacted account]')
    .replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, '[redacted email]')
    .replace(/\b(?:\+?1[ -]?)?\(?\d{3}\)?[ -]?\d{3}[ -]?\d{4}\b/g, '[redacted phone]');
}

const SYSTEM_PROMPT = `You are Saggio, the tax-education assistant inside the TatoIQ client portal.

RULES YOU MUST FOLLOW:
1. You have NO retrieved IRS source excerpts in this request. Give a genuinely useful general answer, but state clearly that it is general information and not a sourced IRS citation.
2. Never invent or cite an IRS publication number, form number, dollar threshold, or deadline. Never imply IRS backing you do not have.
3. Never give individualized advice about a specific person's return. Explain the general rule and recommend the client confirm specifics with their preparer.
4. Keep it plain-language and concrete. Short paragraphs or bullets. No filler.
5. If the question is not about taxes, accounting, or how to use TatoIQ, say so briefly and redirect.
6. Never state or imply that a return has been filed, accepted, or refunded unless told so explicitly.
7. This is federal tax education for tax year 2025; state and local rules may differ.`;

exports.saggio = onRequest(
  { secrets: [OPENAI_API_KEY], cors: true, region: 'us-central1', invoker: 'public' },
  async (req, res) => {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Use POST.' });
      return;
    }

    const question = typeof req.body?.question === 'string' ? req.body.question : '';
    if (!question.trim()) {
      res.status(400).json({ error: 'A question is required.' });
      return;
    }
    if (question.length > 2000) {
      res.status(413).json({ error: 'Question is too long.' });
      return;
    }

    const escalation = detectEscalation(question);
    if (escalation) {
      res.json({
        kind: 'escalation',
        text: `This looks like something a licensed preparer should handle directly (${escalation}). I've paused any further calculation advice. Please use the TatoIQ contact page so a human can review the facts with you.`,
        citations: [],
        escalationReason: escalation,
        provider: 'rule-engine',
      });
      return;
    }

    const redacted = redact(question);
    const providerConfigured = Boolean(OPENAI_API_KEY.value());

    if (!providerConfigured) {
      // No key: behave exactly like the offline build so the client's own
      // fallback stays authoritative. Never claim a model answered.
      res.status(503).json({ error: 'No provider configured.', fallback: 'offline' });
      return;
    }

    try {
      const upstream = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${OPENAI_API_KEY.value()}`,
        },
        body: JSON.stringify({
          model: MODEL,
          temperature: 0.2,
          max_tokens: 700,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: redacted },
          ],
        }),
      });

      if (!upstream.ok) {
        res.status(502).json({ error: 'Upstream provider error.', fallback: 'offline' });
        return;
      }

      const data = await upstream.json();
      const text = data?.choices?.[0]?.message?.content?.trim();
      if (!text) {
        res.status(502).json({ error: 'Empty provider response.', fallback: 'offline' });
        return;
      }

      res.json({
        kind: 'general',
        text: `General information, not a sourced IRS citation:\n\n${text}`,
        citations: [],
        provider: 'openai-general',
        model: MODEL,
      });
    } catch {
      res.status(502).json({ error: 'Provider request failed.', fallback: 'offline' });
    }
  },
);
