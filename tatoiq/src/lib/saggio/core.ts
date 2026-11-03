/**
 * core.ts — Saggio's grounded reasoning core.
 *
 * PURE TypeScript: no network, no env, no Node APIs. Safe to run on the server
 * (in the API route) AND as a client-side fallback. This is what makes Saggio
 * work even before any LLM provider is connected.
 *
 * ANSWER TIERS (explicit, never blurred):
 *   1. `escalation`   — a sensitive topic a licensed human must handle. Advice
 *      is locked and the question is routed to the preparer.
 *   2. `conversation` — greetings, "what can you do", and "where do I click"
 *      questions about TatoIQ. Product help, never dressed up as tax authority.
 *   3. `answer`       — the knowledge base supports it; every answer is cited.
 *   4. `general`      — the knowledge base does not match, so Saggio gives a
 *      genuinely useful general answer that is LABELLED as not IRS-sourced.
 *      It never fabricates a citation to prop this up.
 *   5. `no_source`    — reserved for off-topic questions (e.g. the weather).
 *
 * GUARANTEES (from the TatoIQ spec):
 *   - A cited answer always cites a specific IRS source from the retrieved chunks.
 *   - Nothing in the `general` tier claims IRS backing it does not have.
 *   - Escalation triggers lock further AI calculation advice.
 *   - Education only — never individualized professional advice.
 */

import { KNOWLEDGE_BASE, type KnowledgeChunk } from './knowledge-base';

export { KNOWLEDGE_BASE };
export type { KnowledgeChunk };

export type SaggioAnswerKind =
  | 'answer'
  | 'no_source'
  | 'escalation'
  | 'general'
  | 'conversation'
  // Client mode. These are produced by client-agent.ts, never by the tax core.
  | 'client'
  | 'guide'
  | 'routing'
  | 'handoff'
  | 'identify';

export interface SaggioAnswer {
  kind: SaggioAnswerKind;
  text: string;
  citations: Array<{ source: string; section: string }>;
  escalationReason?: string;
  /** Suggested follow-ups shown as chips under an answer. */
  suggestions?: string[];
  /** Verified in-app links only. The UI renders these as navigation, not prose. */
  links?: Array<{ label: string; href: string }>;
  /** A short operational note, e.g. "records unavailable" or "add your email". */
  notice?: string;
}

// ───────────────────────── Escalation triggers ─────────────────────────
// From the spec: foreign earned income, IRS notice responses, audits,
// past-due penalties, contested business expenses, tax disputes, collection
// negotiations, complex international reporting, suspected fraud.

const ESCALATION: Array<{ reason: string; re: RegExp }> = [
  { reason: 'Foreign earned income / international reporting', re: /\b(foreign|fbAR|fatca|expat|overseas|form 2555|form 1116|8938)\b/i },
  { reason: 'IRS notice or letter response', re: /\b(irs notice|cp\d{2,3}|letter from (the )?irs|notice cp)\b/i },
  { reason: 'Audit or examination', re: /\b(audit\w*|examination|exam notice)\b/i },
  { reason: 'Past-due penalties or back taxes', re: /\b(back taxes|past[- ]due|penalt(y|ies)|owe the irs)\b/i },
  { reason: 'Contested or aggressive business expenses', re: /\b(aggressive (expense|deduction)|questionable (expense|deduction)|push the (expense|deduction)|audit[- ]proof)\b/i },
  { reason: 'Tax dispute', re: /\b(dispute|appeal|deficiency|tax court)\b/i },
  { reason: 'Collections / negotiation', re: /\b(offer in compromise|installment agreement|garnish|levy|collection)\b/i },
  { reason: 'Suspected fraud or identity theft', re: /\b(fraud|identity theft|stolen (ein|ssn|identity)|fake (receipt|document))\b/i },
];

export function detectEscalation(text: string): string | null {
  for (const t of ESCALATION) {
    if (t.re.test(text)) return t.reason;
  }
  return null;
}

// ───────────────────────── Conversation layer ─────────────────────────
// Product help and pleasantries. These are NOT tax answers and carry no
// citations. Keeping them separate is why a greeting no longer returns a
// canned "general information" paragraph.

interface ConversationTopic {
  id: string;
  re: RegExp;
  text: string;
  suggestions?: string[];
}

const CONVERSATION: ConversationTopic[] = [
  {
    id: 'greeting',
    re: /^\s*(hi|hii+|hello|hey+|yo|sup|howdy|good (morning|afternoon|evening))\b[\s,!.?]*$/i,
    text:
      "Hi — I'm Saggio, TatoIQ's tax-education assistant. I can explain federal tax topics, help you find your way around your workspace, and tell you what records to gather. Ask me anything; I'll show an IRS source when I have one and label it clearly when I'm giving general guidance.",
    suggestions: ['What can you do?', 'What is the standard deduction for 2025?', 'Where do I upload documents?'],
  },
  {
    id: 'thanks',
    re: /^\s*(thanks|thank you|thx|ty|appreciate (it|that)|got it|cool|ok(ay)?|perfect|great)[\s,!.?]*$/i,
    text: "Happy to help. If a question is specific to your own return, your preparer can confirm the answer against your actual documents — I'll point you there whenever that's the honest thing to do.",
  },
  {
    id: 'goodbye',
    re: /^\s*(bye|goodbye|see (you|ya)|later|good night|that's all)[\s,!.?]*$/i,
    text: "Thanks for stopping by. I'll be here whenever you want to work through a tax question.",
  },
  {
    id: 'identity',
    re: /\b(who are you|what are you|are you (a )?(human|real person|person|robot|bot|ai|chatgpt|gpt)|what model|are you an? (cpa|accountant|tax attorney|lawyer|enrolled agent)|are you licensed)\b/i,
    text:
      "I'm Saggio, an AI tax-education assistant built into TatoIQ. I'm not a CPA, enrolled agent, or attorney, and I don't prepare or sign returns. I explain how federal rules generally work, cite IRS material when I have it, and hand anything sensitive to a licensed preparer.",
    suggestions: ['What can you do?', 'How do I talk to a preparer?'],
  },
  {
    id: 'capabilities',
    re: /\b(what can you do|what do you do|what can i ask|what should i ask|your capabilities|how does saggio work|how do you work)\b/i,
    text:
      "A few things I'm good at:\n• Explaining a federal tax concept in plain language — deductions, credits, forms, deadlines, business income.\n• Walking through the documents and records a question usually needs.\n• Helping you navigate TatoIQ: documents, tasks, messages, return status.\n• Telling you honestly when a question needs a human preparer.\n\nI work best with specifics: the tax year, your filing status, the income type, and what you're trying to decide.",
    suggestions: ['What is the standard deduction for 2025?', 'How is self-employment tax calculated?', 'Where do I upload documents?'],
  },
  {
    id: 'documents',
    re: /\b(upload|add|attach|send)\b.{0,30}\b(document|documents|file|files|w-?2|1099|receipt)\b|\bwhere\b.{0,30}\b(document|documents|upload|receipts?)\b/i,
    text:
      "Open Documents in the left navigation and choose Upload. You can add W-2s, 1099s, receipts, and prior returns there. Name files by type and year (for example, 2025-W2-Employer) so your preparer can match them quickly, and never email an SSN or full account number.",
    suggestions: ['What documents should I keep for deductions?', 'How do I message my preparer?'],
  },
  {
    id: 'tasks',
    re: /\b(where|how|what)\b.{0,40}\b(tasks?|to-?do|checklist|outstanding items?|request)\b/i,
    text:
      "Tasks lists everything your preparer still needs from you, in priority order. Work top to bottom: each task tells you what's missing and where to add it. If a task doesn't apply to you, add a short note instead of leaving it open — that keeps your return from stalling.",
    suggestions: ['Where do I upload documents?', 'How do I check my return status?'],
  },
  {
    id: 'messages',
    re: /\b(message|messaging|chat with)\b|\btalk to (a |the )?(human|person|preparer|accountant|someone)\b|\bcontact (a |the )?(human|person|preparer|accountant|team)\b/i,
    text:
      "Use Messages in the left navigation to reach your TatoIQ team in writing. That keeps the whole thread attached to your file. For anything sensitive — an IRS notice, a collections letter, an audit — send it there and a licensed preparer will review it rather than an automated answer.",
    suggestions: ['Why does Saggio send some questions to a preparer?', 'How do I book a consultation?'],
  },
  {
    id: 'status',
    re: /\b(where|how)\b.{0,40}\b(refund status|return status|tax status|my status|check (my )?(return|refund)|has my return been (filed|accepted)|is my return (done|filed|accepted))\b/i,
    text:
      "Tax Status shows where your return stands: gathering documents, in preparation, in preparer review, filed, and accepted. It reflects our internal status — only the IRS can confirm acceptance and refund timing, and refund dates are not guaranteed by anyone until the return is processed.",
    suggestions: ['How long do refunds usually take?', 'Where do I upload documents?'],
  },
  {
    id: 'booking',
    re: /\b(book|schedule|set up)\b.{0,25}\b(consultation|call|meeting|appointment)\b|\bconsultation\b/i,
    text:
      "You can request a consultation from the Contact page or by messaging your preparer in the portal. Bring the basics: entity type, tax year, rough revenue and profit, and the deadline you're working against. That turns a 30-minute call into an actual plan instead of a discovery call.",
    suggestions: ['What should I bring to a consultation?', 'How do I message my preparer?'],
  },
  {
    id: 'pricing',
    re: /\b(how much (do|does) (you|tatoiq) (charge|cost)|(your|tatoiq'?s) (price|pricing|fee|fees|cost)|what (do|does) (you|tatoiq) charge)\b/i,
    text:
      "I don't quote fees — pricing depends on entity type, number of states, bookkeeping condition, and the work you need done. Request a consultation and the team will scope it in writing before any work starts. Be wary of any preparer who quotes a firm price before seeing your books.",
    suggestions: ['How do I book a consultation?', 'What should I bring to a consultation?'],
  },
  {
    id: 'privacy',
    re: /\b(is (this|my data|my information|my info) (secure|safe|private)|do you (store|keep|see|save) my|who (can )?see(s)? my (data|information|info|return)|privacy|is this confidential)\b/i,
    text:
      "Your workspace is private to you and your TatoIQ team. I don't need your SSN, EIN, or account numbers to explain a rule — please don't paste them into a chat. Sensitive documents belong in the Documents tab, and anything that reaches a model provider is redacted first.",
    suggestions: ['What can you do?', 'How do I message my preparer?'],
  },
  {
    id: 'lead-scoring',
    re: /\b(lead score|lead grade|lead grading|how are leads? (scored|graded)|grade [a-f]\b|do not contact|dnc|pipeline stage|qualification)\b/i,
    text:
      "Lead grades are evidence-backed. The score weighs verified contact channels, business fit (entity, industry, state, recency), expressed intent, timing, and engagement. Consent and suppression always override the grade: a do-not-contact or missing-consent lead is never contacted, no matter how high it scores. Grades A–F map to suggested next actions, and a human makes the final outreach call.",
    suggestions: ['What makes a lead grade A?', 'Why is a lead marked do not contact?'],
  },
  {
    id: 'human-review',
    re: /\b(why (do|did) you (escalate|send|route)|what happens (if|when) (i|it) (escalate|get escalated)|human review|why can'?t you answer)\b/i,
    text:
      "Some questions carry money or legal risk that an educational answer can't safely resolve: audits, IRS notices, collections, foreign reporting, fraud, and disputes. For those I stop giving calculation advice and route you to a licensed preparer. That's a deliberate limit, not a failure — a confident wrong number costs more than a short wait.",
    suggestions: ['How do I message my preparer?', 'What can you do?'],
  },
  {
    id: 'tax-year',
    re: /\b(what|which) (tax )?year (do|does) (you|this|saggio) (cover|support)|what year is it for\b/i,
    text:
      "My curated IRS material covers federal rules for tax year 2025. I won't apply a 2025 dollar figure to another year — if you ask about a different year I'll say so rather than guess. State and local rules vary and aren't covered by my cited sources.",
    suggestions: ['What is the standard deduction for 2025?', 'When are estimated tax payments due?'],
  },
];

function composeConversation(question: string): SaggioAnswer | null {
  for (const topic of CONVERSATION) {
    if (topic.re.test(question)) {
      return {
        kind: 'conversation',
        text: topic.text,
        citations: [],
        suggestions: topic.suggestions,
      };
    }
  }
  return null;
}

// ───────────────────────── Retrieval ─────────────────────────

const STOP_WORDS = new Set([
  'the', 'and', 'for', 'are', 'but', 'not', 'you', 'your', 'with', 'this', 'that',
  'what', 'when', 'how', 'does', 'did', 'can', 'could', 'should', 'would', 'have',
  'has', 'had', 'was', 'were', 'will', 'about', 'into', 'from', 'they', 'them',
  'there', 'here', 'some', 'any', 'all', 'get', 'got', 'need', 'want', 'know',
  'tell', 'explain', 'help', 'please', 'like', 'than', 'then', 'also', 'much',
  'many', 'very', 'just', 'been', 'being', 'our', 'out', 'who', 'why', 'where',
  'which', 'its', 'it', 'my', 'me', 'i', 'a', 'an', 'of', 'to', 'in', 'on', 'is',
  'do', 'if', 'or', 'as', 'at', 'be', 'so', 'we', 'us',
]);

/** Common ways people phrase a topic differently from the source text. */
const SYNONYMS: Record<string, string[]> = {
  // Deductions and expenses
  'write off': ['deduction', 'deduct'],
  'write-off': ['deduction', 'deduct'],
  'writeoff': ['deduction', 'deduct'],
  'write offs': ['deduction', 'deduct'],
  'deductions': ['deduction'],
  'itemize': ['itemized', 'deduction'],
  'itemizing': ['itemized', 'deduction'],
  'expense': ['deduction', 'business'],
  'expenses': ['deduction', 'business'],
  'cost': ['expense', 'deduction'],
  'costs': ['expense', 'deduction'],
  // Money and filing
  'owe': ['tax', 'payment'],
  'money back': ['refund'],
  'get back': ['refund'],
  'paycheck': ['wages', 'withholding'],
  'paycheck tax': ['withholding', 'w-4'],
  'taxes': ['tax', 'return'],
  'taxable': ['tax', 'income'],
  'taxation': ['tax'],
  'taxed': ['tax'],
  'filing': ['file', 'return'],
  'deadline': ['due date', 'estimated payment due'],
  'when due': ['due date'],
  'late': ['penalty', 'extension'],
  'penalty': ['penalties'],
  'penalties': ['penalty'],
  // People
  'kid': ['child', 'dependent'],
  'kids': ['child', 'dependent'],
  'baby': ['child', 'dependent'],
  'wife': ['spouse', 'married'],
  'husband': ['spouse', 'married'],
  'spouse': ['married'],
  'retire': ['retirement', 'ira'],
  'retiring': ['retirement', 'ira'],
  'retired': ['retirement', 'ira'],
  'disabled': ['disability'],
  // Work and business
  'job': ['wages', 'w-2', 'employment'],
  'side hustle': ['self-employment', 'schedule c', '1099'],
  'side gig': ['self-employment', 'schedule c', '1099'],
  'gig': ['self-employment', 'schedule c', '1099'],
  'freelance': ['self-employment', 'schedule c', '1099'],
  'freelancer': ['self-employment', 'schedule c', '1099'],
  'contractor': ['1099-nec', 'self-employment'],
  'consultant': ['self-employment', 'schedule c'],
  'uber': ['self-employment', 'standard mileage', 'schedule c'],
  'lyft': ['self-employment', 'standard mileage', 'schedule c'],
  'doordash': ['self-employment', 'standard mileage', 'schedule c'],
  'instacart': ['self-employment', 'standard mileage', 'schedule c'],
  'etsy': ['self-employment', 'schedule c'],
  'shopify': ['self-employment', 'schedule c'],
  'amazon seller': ['self-employment', 'schedule c'],
  'llc': ['business', 'entity'],
  's corp': ['s-corp', 'reasonable compensation'],
  'scorp': ['s-corp', 'reasonable compensation'],
  'c corp': ['corporation', 'business'],
  'sole prop': ['sole proprietor', 'schedule c'],
  'startup': ['business', 'startup costs'],
  // Assets and income
  'house': ['home'],
  'home': ['house'],
  'landlord': ['rental', 'schedule e'],
  'airbnb': ['rental', 'short-term'],
  'stock': ['capital gains', 'investment'],
  'stocks': ['capital gains', 'investment'],
  'rsu': ['restricted stock', 'equity compensation'],
  'rsus': ['rsu', 'restricted stock', 'equity compensation'],
  'options': ['equity compensation', 'capital gains'],
  'crypto': ['capital gains', 'digital assets', 'investment'],
  'cryptocurrency': ['crypto', 'digital assets'],
  'bitcoin': ['crypto', 'digital assets', 'capital gains'],
  'nft': ['digital asset', 'capital gains'],
  'dividend': ['interest', 'dividends'],
  'dividends': ['interest', 'dividends'],
  'interest': ['interest', 'dividends'],
  'unemployment': ['unemployment compensation'],
  'severance': ['wages', 'unemployment'],
  // Retirement and benefits
  '401k': ['401(k)', 'retirement'],
  'ira': ['retirement'],
  'roth': ['roth ira', 'retirement'],
  'pension': ['retirement'],
  'hsa': ['health savings account'],
  'fsa': ['flexible spending'],
  'social security': ['social security benefits'],
  'medicare': ['health', 'payroll'],
  // Credits and family
  'child tax credit': ['child tax credit', 'credit'],
  'earned income': ['earned income tax credit'],
  'eitc': ['earned income tax credit'],
  'college': ['education', 'american opportunity'],
  'tuition': ['education', 'education credits'],
  'student loan': ['student loan interest'],
  'daycare': ['childcare', 'child and dependent care'],
  'adoption': ['adoption credit'],
  // Misc
  'free': ['free file'],
  'form': ['form', 'return'],
  'irs': ['internal revenue service'],
  'letter': ['notice'],
  'notice': ['irs notice'],
  'amend': ['amended return', '1040-x'],
  'amendment': ['amended return', '1040-x'],
  'extension': ['4868'],
  'withholding': ['w-4', 'estimated tax'],
  'refund': ['withholding', 'refund'],
};

/** Words that mean the question is not a tax question at all. */
const OFF_TOPIC = /\b(weather|forecast|recipe|movie|football|basketball|baseball|score|joke|poem|president|election|sports|game of thrones|who won)\b/i;

/**
 * A question needs at least one tax or money signal before Saggio offers a
 * general answer. Without this gate a single stray word ("will" in "will it
 * rain tomorrow", "gas" in "gas prices") could pull in an unrelated topic
 * paragraph and dress it up as tax guidance.
 */
const TAX_SIGNAL =
  /\b(tax\w*|irs|deduct\w*|deduction\w*|credit\w*|refund\w*|withhold\w*|file|filed|filing|return\w*|income|wage\w*|salary|salaries|payroll|paycheck|1099\w*|w-?2|k-1|expense\w*|business\w*|company|companies|corporation|self[- ]?employ\w*|freelanc\w*|contractor\w*|gig|profit\w*|revenue|invoice\w*|bookkeep\w*|books|accounting|ledger|bracket\w*|schedule [a-se]\b|form \d|llc|s[- ]?corp|c[- ]?corp|partnership\w*|sole proprietor\w*|write[- ]?offs?|audit\w*|penalt\w*|quarterly|estimated|depreciat\w*|basis|gain|loss|losses|capital|dividend\w*|interest|retire\w*|401k|ira|hsa|529|able account|dependent\w*|child|children|spouse|married|divorce\w*|custody|alimony|gift\w*|inherit\w*|estate\w*|trust|deceased|death|rental\w*|landlord|tenant|property|mortgage|donat\w*|charit\w*|tuition|student loan\w*|education|medical|health|insurance|tip|tips|overtime|bonus\w*|commission\w*|owe|owed|payment\w*|set aside|hobby|side hustle|record\w*|receipt\w*|substantiat\w*|mileage|home office|unemployment|severance|disability|barter\w*|crypto\w*|digital asset\w*|stock\w*|rsu\w*|equity|expat\w*|foreign|social security|medicare|compensation)\b/i;

/** Leading pleasantries that should not influence retrieval. */
const LEADING_NOISE =
  /^\s*(hi|hello|hey|yo|good (morning|afternoon|evening)|please|quick question|ok(ay)?|so|and|also|now)[\s,:!.-]+/i;

function stripPleasantries(question: string): string {
  let text = question.trim();
  // Strip at most three leading filler fragments ("hi, so, quick question").
  for (let i = 0; i < 3; i += 1) {
    const next = text.replace(LEADING_NOISE, '');
    if (next === text) break;
    text = next;
  }
  return text;
}

function expandQuery(question: string): string {
  const q = stripPleasantries(question).toLowerCase();
  const extras: string[] = [];
  for (const [phrase, mapped] of Object.entries(SYNONYMS)) {
    if (q.includes(phrase)) extras.push(...mapped);
  }
  return `${q} ${extras.join(' ')}`.trim();
}

/** Tokens too vague to prove a chunk is relevant on their own. */
const WEAK_TOKENS = new Set([
  'tax', 'taxes', 'return', 'form', 'irs', 'income', 'file', 'filing', 'year',
  // Category words: they describe the kind of thing being asked about, not the
  // thing itself. "can I deduct my dog?" must not match every chunk that
  // mentions "deduct", and "my business made 200k" must not match "business
  // meals". Keyword *phrases* containing them still score normally.
  'deduct', 'business',
]);

/**
 * Single-word keywords that name a category rather than a subject. They still
 * contribute a little evidence, but they must never outrank a chunk that names
 * the actual thing being asked about.
 */
const GENERIC_KEYWORDS = new Set([
  'tax', 'taxes', 'return', 'form', 'irs', 'income', 'file', 'filing',
  'deduct', 'deduction', 'deductions', 'deductible',
  'expense', 'expenses', 'credit', 'credits',
  'business', 'payment', 'payments', 'money', 'help', 'general', 'bill', 'bills',
]);

function tokens(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));
}

/** Only the tokens that carry real topical meaning. */
function strongTokens(text: string): string[] {
  // Generic category words are excluded here as well as from keyword scoring:
  // otherwise "deductible" alone earns a strong-token bonus and a bare
  // "is my bill deductible?" gets answered with an unrelated credit or account.
  return tokens(text).filter((w) => !WEAK_TOKENS.has(w) && !GENERIC_KEYWORDS.has(w));
}

/** Cheap similarity for typo tolerance (e.g. "deducton" → "deduction"). */
function closeEnough(a: string, b: string): boolean {
  if (a === b) return true;
  if (a.length < 5 || b.length < 5) return false;
  if (Math.abs(a.length - b.length) > 2) return false;
  const [short, long] = a.length <= b.length ? [a, b] : [b, a];
  let i = 0;
  for (const ch of long) {
    if (ch === short[i]) i += 1;
    if (i === short.length) return true;
  }
  return false;
}

/**
 * Whole-word search inside a lowercase text blob.
 *
 * Substring matching alone lets "work" match "worker" and lets a generic word
 * hijack a more specific question, so the match must sit on a token boundary.
 * Hyphens and slashes count as boundaries, which keeps "self-employment" and
 * "1099-nec" matchable.
 */
function hasToken(text: string, word: string): boolean {
  if (!word) return false;
  let from = 0;
  for (;;) {
    const i = text.indexOf(word, from);
    if (i === -1) return false;
    const before = i === 0 ? '' : text[i - 1];
    const after = text[i + word.length] ?? '';
    if (!/[a-z0-9]/.test(before) && !/[a-z0-9]/.test(after)) return true;
    from = i + 1;
  }
}

/**
 * Match a query token against source text, tolerating a simple plural.
 *
 * This matters for short, high-signal terms such as "RSU" / "RSUs" and
 * "tip" / "tips", where stemming the whole query would damage other words.
 */
function matchesWord(text: string, word: string): boolean {
  if (hasToken(text, word)) return true;
  if (word.length > 4 && word.endsWith('s') && !/(ss|us|is)$/.test(word)) {
    return hasToken(text, word.slice(0, -1));
  }
  if (word.length >= 3 && !word.endsWith('s')) {
    return hasToken(text, `${word}s`);
  }
  return false;
}

export function retrieve(question: string, limit = 3): KnowledgeChunk[] {
  const expanded = expandQuery(question);
  const qTokens = tokens(expanded);
  const strong = strongTokens(expanded);

  const scored = KNOWLEDGE_BASE.map((chunk) => {
    let score = 0;
    let exact = false;
    let specificity = 0;

    // Exact keyword phrases are the strongest signal. A phrase such as
    // "do i need to file" or "w-2" may contain nothing but weak/short tokens,
    // so remember that it matched and let it through the relevance filter
    // below. Generic one-word keywords such as "deduction" are deliberately
    // demoted: they describe a category, not the subject of the question, so
    // "can I deduct my dog?" must not be answered with the standard-deduction
    // chunk just because "deduction" appears in it.
    for (const kw of chunk.keywords) {
      if (!expanded.includes(kw)) continue;
      const generic = GENERIC_KEYWORDS.has(kw);
      score += generic ? 1 : kw.split(' ').length * 4 + (kw.length >= 6 ? 2 : 0);
      if (!generic) {
        specificity = Math.max(specificity, kw.length);
        if (kw.length >= 4 || /\d/.test(kw) || kw.includes(' ')) exact = true;
      }
    }

    // Token overlap with keywords, section, and content body. Weak words such
    // as "tax" only count when they are part of an actual keyword phrase.
    const kwText = chunk.keywords.join(' ');
    const sectionText = chunk.section.toLowerCase();
    const bodyText = chunk.content.toLowerCase();
    for (const word of strong) {
      if (matchesWord(kwText, word)) score += 3;
      if (matchesWord(sectionText, word)) score += 2;
      if (bodyText.includes(word)) score += 1;
    }

    // Typo tolerance against keywords. An exact keyword hit already scored
    // above, so only near-misses add points here — otherwise "1099" would be
    // rewarded twice for the 1099-NEC chunk and tie the more specific 1099-K.
    for (const word of qTokens) {
      if (chunk.keywords.includes(word)) continue;
      const near = chunk.keywords
        .flatMap((k) => k.split(' '))
        .find((part) => closeEnough(word, part));
      if (!near) continue;
      // A near-miss is meaningful evidence on its own, so it clears the same
      // relevance floor as a short exact keyword.
      score += 3;
      if (!GENERIC_KEYWORDS.has(word)) {
        exact = true;
        specificity = Math.max(specificity, near.length);
      }
    }

    return { chunk, score, exact, specificity };
  })
    // A real match needs either a specific keyword phrase or a strong topical
    // token in the keywords/section title. Body-only overlap (the word "tax"
    // appears in every chunk) is not evidence this chunk answers the question.
    .filter(({ chunk, score, exact }) => {
      if (score < 3) return false;
      if (exact) return true;
      const kwText = chunk.keywords.join(' ');
      const sectionText = chunk.section.toLowerCase();
      return strong.some((w) => matchesWord(kwText, w) || matchesWord(sectionText, w));
    })
    // When two chunks score the same, prefer the one whose matched keyword is
    // more specific: "dog" should beat a bare category word such as "deduction".
    .sort((a, b) => b.score - a.score || b.specificity - a.specificity);

  // Drop weak also-rans so a cited answer never pads itself with an unrelated
  // form or credit just to reach three citations. A chunk must be at least a
  // third as strong as the best match to be shown.
  const topScore = scored[0]?.score ?? 0;
  const floor = Math.max(3, topScore * 0.34);

  return scored
    .filter((s) => s.score >= floor)
    .slice(0, limit)
    .map((s) => s.chunk);
}

// ───────────────────────── General answer engine ─────────────────────────
// Used when nothing in the knowledge base matches. These are honest,
// broadly-true statements about how the US system works — deliberately
// generic, and never presented as sourced authority.

interface GeneralTopic {
  id: string;
  re: RegExp;
  text: string;
  /** Too broad to add as a secondary topic without muddying the answer. */
  broad?: boolean;
}

const GENERAL_TOPICS: GeneralTopic[] = [
  {
    id: 'business-structure',
    re: /\b(llc|s[- ]?corp|c[- ]?corp|sole proprietor|partnership|business entity|incorporat\w*|form (an?|my) (llc|corporation))\b/i,
    text:
      'The entity you use changes how profit is taxed, who pays self-employment tax, and how much paperwork you file. A sole proprietor or single-member LLC is usually taxed on the owner\'s return; an S corporation requires payroll for a reasonable salary plus a separate return; a partnership files its own return and issues K-1s. The right choice depends on profit level, payroll, state fees, and exit plans — not on which structure sounds more professional.',
  },
  {
    id: 'self-employment',
    re: /\b(self[- ]?employ\w*|freelanc\w*|gig econom\w*|independent contractor|schedule c|se tax|1099 worker)\b/i,
    text:
      'Self-employment profit is taxed twice in a sense: ordinary income tax plus self-employment tax, which funds Social Security and Medicare. You report income and expenses on Schedule C, then carry the net profit to Schedule SE. Because nothing is withheld, you generally make quarterly estimated payments to avoid an underpayment penalty at filing time.',
  },
  {
    id: 'estimated-taxes',
    re: /\b(estimated (tax|payment)|quarterly (tax|payment)|underpayment|safe harbor|pay as i go)\b/i,
    text:
      'Estimated payments are prepayments of the tax you expect to owe. They are generally due in four installments across the year, and the amount is usually driven by last year\'s tax or by annualizing this year\'s income. Missing a quarter can trigger an underpayment penalty even if you pay everything by the filing deadline — the penalty is about timing, not just the total.',
  },
  {
    id: 'withholding',
    re: /\b(withhold\w*|w-?4|paycheck (tax|deduction)|adjust my (taxes|withholding)|too much taken out)\b/i,
    text:
      'Withholding is the tax your employer sends in as you earn. You control it with Form W-4: filing status, dependents, and extra withholding all shift the amount. If you consistently get a large refund or owe a lump sum, the fix is usually a new W-4 or a change to estimated payments, not a change to your deductions at filing time.',
  },
  {
    id: 'payroll',
    re: /\b(payroll|fica|medicare tax|social security tax|employer taxes|wages? tax)\b/i,
    text:
      'Payroll tax is separate from income tax. Employees and employers each pay Social Security and Medicare on wages, and the employer withholds the employee share plus income tax. If you have employees or take a salary from your own corporation, payroll deposits and filings run on their own schedule and penalties accrue quickly, so it is worth automating.',
  },
  {
    id: 'worker-classification',
    re: /\b(1099 vs w-?2|employee or (a )?contractor|misclassif\w*|worker classification|contractor vs employee)\b/i,
    text:
      'Classification is decided by the facts of the relationship — control over how work is done, who provides tools, whether expenses are reimbursed, and whether the work is central to the business — not by what the parties call it or by who signs a 1099. Misclassification shifts payroll tax and benefits obligations, so document the arrangement and review it before it becomes a habit.',
  },
  {
    id: 'crypto',
    re: /\b(crypto\w*|bitcoin|ethereum|nft|digital asset|staking|mining|blockchain)\b/i,
    text:
      'Digital assets are treated as property for federal tax purposes. Buying and holding is not a taxable event, but selling, trading one coin for another, and paying for goods or services generally are — and each trade needs a cost basis. Mining and staking rewards are usually ordinary income when received, and the reporting question on the return must be answered honestly.',
  },
  {
    id: 'investing',
    re: /\b(invest\w*|stock|etf|mutual fund|dividend|capital gain|brokerage|portfolio|index fund)\b/i,
    text:
      'Investments are generally taxed when you realize a gain, not while you hold them. Holding period matters: short-term gains follow ordinary rates, long-term gains usually get preferential rates. Losses can offset gains and a limited slice of ordinary income, with the rest carried forward — which is why year-end harvesting and accurate basis records matter.',
  },
  {
    id: 'trading',
    re: /\b(day trad\w*|options? trading|futures?|short sell\w*|margin account)\b/i,
    text:
      'Active trading adds complexity: frequent trades, wash-sale rules, and mark-to-market questions can all change the result. The wash-sale rule disallows a loss if you buy a substantially identical security within 30 days before or after the sale, so a \"loss\" can quietly disappear at filing time. Keep every trade confirmation and reconcile it before year-end.',
  },
  {
    id: 'rental',
    re: /\b(rental|landlord|airbnb|short[- ]term rental|tenant|lease income|schedule e)\b/i,
    text:
      'Rental income is generally taxable and reported on Schedule E, while mortgage interest, property tax, insurance, repairs, and depreciation may be deductible against it. Personal use of the property changes how expenses are split, and short-term rentals can add self-employment tax and local occupancy rules. Depreciation is not optional — it reduces basis and affects the gain when you sell.',
  },
  {
    id: 'home',
    re: /\b(home|house|mortgage|property tax|refinanc\w*|closing costs|sell my (home|house)|homeowner)\b/i,
    text:
      'Home ownership touches the return in three places: mortgage interest and property tax (only if you itemize), the gain exclusion when you sell a main home, and points or closing costs that may be deductible over time. The gain exclusion has ownership-and-use tests, so a quick sale after buying can cost more tax than expected.',
  },
  {
    id: 'retirement',
    re: /\b(retire\w*|401\(?k\)?|ira|pension|roth|annuity|rmd|social security benefit)\b/i,
    text:
      'Retirement accounts are taxed by when money goes in and when it comes out. Traditional contributions may be deductible now with withdrawals taxed later; Roth contributions use after-tax money and qualified withdrawals are generally tax-free. Early withdrawals can trigger an extra tax unless an exception applies, and required minimum distributions start at a set age — miss one and the penalty is steep.',
  },
  {
    id: 'education',
    re: /\b(college|university|student|tuition|school|529|education|scholarship|fafsa)\b/i,
    text:
      'Education benefits come in three shapes: credits, deductions, and tax-free savings. The American Opportunity and Lifetime Learning credits have different eligibility rules and cannot be doubled up with tax-free 529 distributions on the same expense. Scholarships used for tuition and required fees are generally tax-free; room and board often is not.',
  },
  {
    id: 'family',
    re: /\b(child|kids?|baby|dependent|daycare|childcare|adoption|family|newborn)\b/i,
    text:
      'Children affect the return through filing status, dependency, the child tax credit, and — if you pay for care so you can work — the child and dependent care credit. Each has its own tests and income phase-outs, and only one taxpayer can claim a given dependent. Keep the birth certificate, care provider details, and proof of support together.',
  },
  {
    id: 'health',
    re: /\b(health|medical|insurance|hsa|fsa|premium|medicare|dental|vision|marketplace)\b/i,
    text:
      'Health coverage affects taxes through premiums, HSAs, FSAs, and the premium tax credit. HSA contributions may be deductible and qualified medical withdrawals are tax-free; FSA rules depend on the plan and are generally use-it-or-lose-it. If you bought Marketplace coverage with advance premium tax credit, you reconcile the actual income figure on your return — a good year can mean repaying some of it.',
  },
  {
    id: 'home-office',
    re: /\b(home office|work from home|remote work|dedicated (office|space)|office in my (home|house))\b/i,
    text:
      'A home office deduction requires exclusive and regular use of space for business — a kitchen table does not qualify. The simplified method uses a flat rate per square foot with a cap; the actual-expense method uses a percentage of housing costs and requires more records. Either way it affects depreciation and the gain if you later sell the home.',
  },
  {
    id: 'vehicle',
    re: /\b(mileage|car|vehicle|truck|van|gas|commute|driving for)\b/i,
    text:
      'Business vehicle costs are deductible either by actual expenses or by the standard mileage rate, and you must choose consistently. Commuting from home to a regular workplace is generally personal; driving between job sites, to client meetings, or for gig work is generally business. A contemporaneous mileage log is the difference between a deduction and a disallowed one.',
  },
  {
    id: 'meals-travel',
    re: /\b(meals?|travel|hotel|flight|per diem|business trip|entertainment|client dinner)\b/i,
    text:
      'Business meals and travel are deductible when they are ordinary, necessary, and documented — who you met, the business purpose, and the amount. Meals are usually partially deductible rather than fully deductible, and entertainment is largely not deductible. Travel is only deductible when the trip is primarily business and you are away from your tax home overnight.',
  },
  {
    id: 'gifts-estate',
    re: /\b(gift|inherit\w*|estate|last will|will and testament|testament|trust|death|deceased|inheritance|beneficiar\w*)\b/i,
    text:
      'Gifts and inheritances are generally not taxable income to the recipient. The donor may have a gift tax filing obligation above an annual exclusion, and inherited assets usually take a stepped-up basis, which affects the gain when you sell. Estates and trusts have their own lower brackets and filing thresholds, so anything beyond a simple inheritance is worth a preparer review.',
  },
  {
    id: 'divorce',
    re: /\b(divorce\w*|separat\w*|custody|alimony|child support|single parent)\b/i,
    text:
      'Divorce changes filing status, dependents, and sometimes property basis. Alimony under post-2018 agreements is generally not deductible by the payer or taxable to the recipient, and child support is never deductible or taxable. Transfers of property between spouses incident to divorce can be tax-free, but the carryover basis matters when the asset is later sold.',
  },
  {
    id: 'military',
    re: /\b(military|veteran|deploy\w*|combat|service member|armed forces)\b/i,
    text:
      'Military tax rules add several special items: combat pay treatment, moving and storage allowances, residence-sale timing relief, and state residency rules that can persist while stationed elsewhere. Some benefits are excluded from income and some are not, and the distinction matters for credits that depend on earned income.',
  },
  {
    id: 'disability',
    re: /\b(disab\w*|ssdi|ssi|impair\w*|special needs)\b/i,
    text:
      'Disability benefits are taxed differently depending on the program: SSDI is taxed like Social Security benefits under the same income thresholds, while SSI is generally not taxable. Medical costs, accessible home improvements, and special-needs trust arrangements each have their own rules. Keep the benefit statements — the taxable portion depends on total income, not just the benefit amount.',
  },
  {
    id: 'unemployment-income',
    re: /\b(unemploy\w*|laid off|severance|job loss|out of work)\b/i,
    text:
      'Unemployment compensation is generally taxable federal income, even though no tax is withheld unless you asked for it. Severance is usually treated as wages. A job loss can also unlock the moving-expense and job-search rules in narrow cases, and it changes your estimated payment picture for the following year.',
  },
  {
    id: 'nonprofit',
    re: /\b(nonprofit|non-profit|501\(?c\)?|charity|charitable organization|board of directors)\b/i,
    text:
      'A nonprofit is a state-law entity plus a federal exemption determination. Exemption does not mean no filings: most organizations file an annual information return, and payroll, unrelated business income, and state registrations still apply. Donations to a qualifying organization may be deductible to the donor, but only with the right substantiation.',
  },
  {
    id: 'bankruptcy',
    re: /\b(bankrupt\w*|insolven\w*|chapter (7|11|13)|debt forgiven)\b/i,
    text:
      'Cancelled or forgiven debt is generally taxable income unless an exclusion applies — insolvency, bankruptcy, or certain qualified principal residence debt. Bankruptcy has its own ordering rules and can affect basis in assets you keep. The exclusion is calculated on a form, not assumed, so gather the discharge documents before filing.',
  },
  {
    id: 'farming',
    re: /\b(farm\w*|agricultur\w*|crop|livestock|ranch\w*)\b/i,
    text:
      'Farming has its own accounting choices: cash versus accrual, crop insurance deferral, livestock treatment, and depreciation rules for equipment and structures. Weather-related sales and disaster payments can be deferred in specific cases. Because the rules are unusually fact-specific, the method you choose should be set up before year-end, not reconstructed afterward.',
  },
  {
    id: 'tips',
    re: /\b(tips?|tipped|gratuit\w*)\b/i,
    text:
      'Tip income is taxable and must be reported, including cash tips. Employees generally report tips to the employer so they can be included in withholding, and allocated tips on a W-2 cannot simply be ignored. Good tip logs protect you if the reported figure is questioned.',
  },
  {
    id: 'sales-tax',
    re: /\b(sales tax|nexus|marketplace facilitator|online seller|e-?commerce|remote seller)\b/i,
    text:
      'Sales tax is a state and local obligation, separate from income tax. Whether you must collect depends on physical presence and economic nexus thresholds that vary by state, and marketplaces often collect on your behalf. Registering, filing, and remitting on time matters more than the rate itself — penalties for late sales tax filings are common.',
  },
  {
    id: 'state-local',
    re: /\b(state tax|local tax|residency|resident|nonresident|move to|relocat\w*|part[- ]year)\b/i,
    text:
      'States set their own income tax rules, and they can differ sharply from federal rules on deductions, credits, retirement income, and residency. Moving mid-year often means filing part-year returns in two states and allocating income by source or by days. Keep your move date, lease or closing documents, and day-count records.',
    broad: true,
  },
  {
    id: 'refunds',
    re: /\b(refund|money back|where.{0,20}(my|is) (money|refund)|direct deposit|tax return check)\b/i,
    text:
      'A refund is simply an overpayment: more was withheld or paid during the year than the final tax liability. Electronically filed returns with direct deposit process fastest, and by law some credit-related refunds cannot be paid before mid-February. Only the IRS can confirm a specific refund date — no preparer or software can promise one.',
  },
  {
    id: 'deductions',
    re: /\b(deduct\w*|write[- ]?off\w*|itemiz\w*|expense)\b/i,
    text:
      'A deduction reduces the income that gets taxed. Business deductions generally must be ordinary, necessary, and documented; personal deductions mostly only help if your total itemized deductions exceed the standard deduction for your filing status. Above-the-line adjustments are more valuable than itemized ones because they reduce income before the standard deduction is even applied.',
    broad: true,
  },
  {
    id: 'credits',
    re: /\b(credit\w*)\b/i,
    text:
      'A credit reduces tax dollar-for-dollar, which makes it more valuable than a deduction of the same size. Refundable credits can push the balance below zero and generate a refund; nonrefundable credits only reduce tax to zero. Most credits have income limits, phase-outs, and eligibility tests that must be met in the same year.',
    broad: true,
  },
  {
    id: 'income',
    re: /\b(income|w-?2|w2|1099|salary|wage\w*|paycheck|bonus|commission|revenue)\b/i,
    text:
      'Income is generally taxable unless a specific rule excludes it. Wages, 1099 payments, business profit, interest, dividends, gains, retirement distributions, and unemployment are common taxable items. Self-employment and gig income is reportable even if no form ever arrives, so track money in and money out all year rather than reconstructing it in April.',
    broad: true,
  },
  {
    id: 'rates',
    re: /\b(rate|bracket|marginal|progressive|effective tax)\b/i,
    text:
      'Federal income tax is progressive: income is divided into bands, and each band is taxed at its own rate. Your top marginal rate applies only to the last dollars in the highest band, not to all of your income, so your effective rate is lower than your bracket. Filing status sets the band widths, and long-term gains and qualified dividends use separate, usually lower, schedules.',
    broad: true,
  },
  {
    id: 'filing',
    re: /\b(file|filing|return|due date|deadline|extension|late)\b/i,
    text:
      'Filing is how you report income, payments, deductions, and credits for a tax year. Most individuals use Form 1040 and file by the April deadline; an extension moves the filing date but never the payment date. Filing status and dependents are decided by your facts and the dependency tests, not by who paid the bills.',
    broad: true,
  },
  {
    id: 'planning',
    re: /\b(plan\w*|strateg\w*|save (on|money)|reduce (my )?tax|minimi[sz]e|projection|forecast|philosophy)\b/i,
    text:
      'Tax planning is mostly about timing, character, and documentation: when income is recognized, whether a gain is ordinary or capital, and whether every deduction can be supported. A useful plan starts with a projection of the current year, then compares withholding and estimated payments to the projected liability. It should never rely on a position you could not defend in an exam.',
    broad: true,
  },
  {
    id: 'profit-projection',
    re: /\b(made|make|makes|earn(ed|s)?|profit(ed)?|revenue|sales)\b.{0,30}(\$?\d|\b\d+k\b)|\bhow much (tax )?(will|would|do) i owe\b|\bhow much should i set aside\b|\bset aside for taxes\b/i,
    text:
      'A revenue figure is not a tax figure. Start from profit — revenue minus ordinary and necessary business expenses — then apply income tax and, for a sole proprietor, partner, or LLC owner, self-employment tax. A practical rule of thumb is to set aside a meaningful share of profit as you earn it rather than waiting for the filing deadline, then true it up with a projection once the year is mostly known. The exact percentage depends on your bracket, state, entity type, and whether payroll is already being withheld.',
  },
  {
    id: 'records',
    re: /\b(record\w*|receipt\w*|document\w*|paperwork|keep|proof|substantiat\w*|audit trail)\b/i,
    text:
      'The best protection in a tax file is contemporaneous documentation. Keep records that independently support each income and expense figure you report, and retain them for at least the period the IRS can review the return. A logged expense with a receipt is far stronger than a remembered one — a bank line alone often is not enough.',
    broad: true,
  },
  {
    id: 'bookkeeping',
    re: /\b(bookkeep\w*|quickbooks|xero|accounting|ledger|reconcil\w*|chart of accounts|clean up (my )?books)\b/i,
    text:
      'Bookkeeping is the input to the return, so messy books become expensive tax work. Reconcile bank and card accounts monthly, separate personal from business spending, and categorize consistently against a chart of accounts that matches your return lines. A year-end cleanup always costs more than twelve small monthly ones.',
  },
  {
    id: 'invoicing',
    re: /\b(invoice\w*|billing|accounts receivable|get paid|payment terms|chase\w* (late )?payers?)\b/i,
    text:
      'Invoicing affects tax only through when income is recognized and whether it is actually collected. Cash-basis businesses generally report income when paid; accrual businesses report when earned. Track outstanding invoices separately from collected cash so a good revenue month does not create a tax bill you cannot fund.',
  },
  {
    id: 'software',
    re: /\b(tax software|turbotax|h&r block|free file|e-?file|diy tax|file myself)\b/i,
    text:
      'Consumer software is fine for straightforward returns, but it only knows what you enter. Business income, multiple states, rental property, equity compensation, and sale of a business are where self-prepared returns most often go wrong. If your situation has any of those, the review is usually worth more than the software saves.',
  },
  {
    id: 'prior-year',
    re: /\b(prior year|last year|back (taxes|filing)|old return|missing return|unfiled)\b/i,
    text:
      'An unfiled prior year does not go away — it accumulates penalties and interest, and it can block refunds from later years. The usual path is to reconstruct income from IRS transcripts and available records, file the oldest year first, and request penalty relief where reasonable cause applies. Filing something accurate beats waiting for perfect records.',
  },
  {
    id: 'avoidance',
    re: /\b(tax avoidance|tax evasion|loophole|aggressive (tax )?position|hide income|not report)\b/i,
    text:
      'Avoidance is arranging your affairs to pay the tax the law requires; evasion is hiding income or misstating facts, and it carries civil and criminal exposure. A defensible position has authority behind it, documents in front of it, and disclosure where required. If a strategy only works because nobody finds out, it is not a tax strategy.',
  },
  {
    id: 'start-business',
    re: /\b(start\w* (a|my) business|new business|first year (in business|filing)|launch\w*|startup costs|open a business)\b/i,
    text:
      'Starting a business brings four tax decisions early: entity type, tax year, accounting method, and payroll. Startup costs can sometimes be deducted or amortized, and the first-year choices set habits that are hard to unwind. Separate bank account, a written expense policy, and quarterly estimates are the three things most new owners skip and later regret.',
  },
  {
    id: 'close-business',
    re: /\b(clos\w* (my|the) business|shut(ting)? down|dissolv\w*|final return|sell(ing)? my business)\b/i,
    text:
      'Closing or selling a business creates a final return, a final payroll filing, and often a gain or loss on assets and goodwill. How the sale is structured — asset sale versus entity sale — changes who pays what tax. Handle the final year deliberately; a missed final filing can reopen an otherwise finished chapter.',
  },
  {
    id: 'hobby',
    re: /\b(hobby|side interest|not a business|occasional income)\b/i,
    text:
      'The hobby-versus-business question turns on whether you intend to make a profit and can show it through records, time, expertise, and revenue history. A business can deduct ordinary and necessary expenses and may show losses for a while; a hobby\'s expenses are treated much more restrictively. The label matters less than the evidence behind it.',
  },
  {
    id: 'reasonable-comp',
    re: /\b(reasonable (comp|salary)|s[- ]?corp salary|owner salary|pay myself|salary vs distribution)\b/i,
    text:
      'An S corporation owner who works in the business must take reasonable compensation as wages before taking distributions. \"Reasonable\" is judged by role, hours, skills, and what comparable businesses pay — not by the smallest number that survives a spreadsheet. Paying no salary to save payroll tax is one of the most common exam adjustments.',
  },
  {
    id: 'tax-system',
    re: /\b(tax system|how (do|does) taxes work|why (do|do we) pay taxes|how are taxes calculated)\b/i,
    text:
      'The federal income tax starts with gross income, subtracts adjustments to reach adjusted gross income, then subtracts the standard or itemized deduction to reach taxable income. Tax is computed on that amount, credits are applied, and withholding or estimated payments are compared to the result to produce a refund or balance due. Most confusion comes from mixing up deductions (which reduce income) with credits (which reduce tax).',
    broad: true,
  },
];

const GENERAL_SUFFIX =
  'This is general information, not a sourced IRS citation and not advice for your specific return. It covers federal rules for tax year 2025; state and local rules vary.';

export const SAGGIO_SCOPE_NOTE =
  'This is federal guidance for tax year 2025. State and local rules may differ.';

/** Closing line that turns an answer into a next step without overpromising. */
const GENERAL_NEXT_STEP =
  'If you tell me the tax year, filing status, and income type, I can narrow this down — and anything specific to your return should be confirmed by your preparer.';

const GENERIC_GENERAL =
  "I can still help you reason about it. Most federal tax questions come down to five facts: (1) the tax year, (2) your filing status, (3) each type of income involved, (4) the expenses or credits you think apply, and (5) whether any deadline or notice is already in play. Tell me those and I'll explain the rule that governs it.\n\nI can also walk through deductions and credits, business and self-employment income, estimated payments, retirement accounts, home and rental property, or how to navigate your TatoIQ workspace — just name the area.";

function framingFor(question: string): string {
  const q = question.trim().toLowerCase();
  if (/^(how|what'?s the best way|what is the best way)\b/.test(q)) return 'Here is how it generally works:';
  if (/^(should|can|could|is|are|do|does|will|am i)\b/.test(q)) return 'Short answer, in general terms:';
  if (/^(why|what happens if)\b/.test(q)) return 'Here is the logic behind it:';
  if (/^(what is|what are|what'?s|define|explain)\b/.test(q)) return 'Here is the general idea:';
  return 'Here is how to think about it:';
}

function composeGeneralAnswer(question: string): SaggioAnswer {
  const matches = GENERAL_TOPICS.filter((t) => t.re.test(question));
  const primary = matches[0];
  const secondary = matches.slice(1).find((t) => !t.broad && t.id !== primary?.id);

  const paragraphs: string[] = [framingFor(question)];
  if (primary) paragraphs.push(primary.text);
  if (secondary) paragraphs.push(secondary.text);
  if (!primary) paragraphs.push(GENERIC_GENERAL);
  paragraphs.push(GENERAL_NEXT_STEP);
  paragraphs.push(GENERAL_SUFFIX);

  return {
    kind: 'general',
    // The label is deliberate and must stay: this tier is *not* IRS-sourced.
    text: paragraphs.join('\n\n'),
    citations: [],
    suggestions: suggestionsFor(question),
  };
}

// ───────────────────────── Suggestions ─────────────────────────

const SUGGESTION_BANK = [
  'What is the standard deduction for 2025?',
  'How is self-employment tax calculated?',
  'Can I deduct a home office?',
  'When are estimated tax payments due?',
  'What records should I keep for deductions?',
  'What is the QBI deduction?',
  'How do I amend a return I already filed?',
  'Are tips taxable?',
  'What is a 1099-NEC?',
  'How does an S corp save on self-employment tax?',
  'What is the child tax credit?',
  'Is unemployment income taxable?',
];

/** Three deterministic follow-ups that are not the question just asked. */
function suggestionsFor(question: string): string[] {
  const asked = question.trim().toLowerCase().replace(/[?.!]+$/, '');
  const usable = SUGGESTION_BANK.filter((s) => s.toLowerCase().replace(/[?.!]+$/, '') !== asked);
  const seed = asked.split('').reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
  const out: string[] = [];
  for (let i = 0; i < usable.length && out.length < 3; i += 1) {
    out.push(usable[(seed + i * 5) % usable.length]);
  }
  return [...new Set(out)].slice(0, 3);
}

/** Short framing for a cited answer, so it does not read like a data dump. */
function citedLead(question: string): string {
  const q = question.trim().toLowerCase();
  if (/^how\b/.test(q)) return 'Here is how the IRS guidance describes it:\n\n';
  if (/^why\b/.test(q)) return 'Here is the IRS guidance that explains it:\n\n';
  if (/^when\b/.test(q)) return 'Here is the IRS guidance on timing:\n\n';
  if (/^can i\b|^can we\b|^am i\b|^is it\b|^are\b|^do i\b|^does\b/.test(q)) {
    return 'Here is what the IRS guidance says:\n\n';
  }
  return 'Here is the IRS guidance I have on that:\n\n';
}

// ───────────────────────── Answer composition ─────────────────────────

/**
 * Produce Saggio's answer.
 *
 * `hasLlm` indicates whether a model composed the narrative from the retrieved
 * chunks; the citations are identical either way, and the model is never
 * allowed to answer beyond the retrieved material.
 *
 * `history` is the recent user turns (oldest → newest). It is used ONLY to make
 * sense of a short follow-up such as "what about married filing jointly?" or
 * "why?" — never to change the cited tier or the year guard.
 */
export function answer(question: string, hasLlm = false, history: string[] = []): SaggioAnswer {
  const text = question.trim();

  const escalation = detectEscalation(text);
  if (escalation) {
    return {
      kind: 'escalation',
      text: `This looks like something a licensed preparer should handle directly (${escalation}). I've paused any further calculation advice. Please use the TatoIQ contact page so a human can review the facts with you.`,
      citations: [],
      escalationReason: escalation,
    };
  }

  const conversation = composeConversation(text);
  if (conversation) return conversation;

  let chunks = retrieve(text);

  // A short follow-up ("what about married filing jointly?", "why?") carries
  // meaning from the previous turn. Only borrow that context when the question
  // does not stand on its own, so standalone questions keep their own answer.
  if (chunks.length === 0 && history.length > 0) {
    const last = history[history.length - 1];
    const anaphoric = /^(what about|how about|and\b|also\b|what if|why\b|how so|what else|explain more|more\b|really\b)/i.test(text);
    const veryShort = text.split(/\s+/).filter(Boolean).length <= 3;
    if (last && (anaphoric || veryShort)) {
      chunks = retrieve(`${last} ${text}`);
    }
  }

  if (chunks.length === 0) {
    // Off-topic questions get a plain decline; tax-flavoured questions that the
    // knowledge base simply does not cover get a labelled general answer.
    if (OFF_TOPIC.test(text) || !TAX_SIGNAL.test(text)) {
      return {
        kind: 'no_source',
        text: "That one is outside what I can answer — I focus on US federal taxes and your TatoIQ workspace. If you have a tax question, ask it and I'll either cite the IRS guidance or tell you honestly that it needs a preparer. Please never send an SSN, EIN, or account number through chat.",
        citations: [],
      };
    }
    return composeGeneralAnswer(text);
  }

  // The curated figures are tax-year 2025. Never let a question about another
  // year pull in a 2025 dollar amount as if it were the answer.
  const requestedYear = text.match(/\b(20\d{2})\b/)?.[1];
  const yearSpecific = chunks.some(
    (c) => /2025/.test(c.section) || /for tax year 2025/i.test(c.content),
  );
  if (requestedYear && requestedYear !== '2025' && yearSpecific) {
    return {
      kind: 'general',
      text: `My curated IRS sources currently cover tax year 2025. I do not have a verified ${requestedYear} figure for that question, and I will not substitute a different year's number. Please confirm the ${requestedYear} amount with the IRS or a preparer.\n\n${GENERAL_SUFFIX}`,
      citations: [],
      suggestions: suggestionsFor(text),
    };
  }

  const citations = chunks.map((c) => ({ source: c.source, section: c.section }));
  const body = chunks.map((c) => `• ${c.content}`).join('\n\n');
  const lead = hasLlm ? '' : citedLead(text);
  return {
    kind: 'answer',
    text: `${lead}${body}\n\n${SAGGIO_SCOPE_NOTE}`,
    citations,
    suggestions: suggestionsFor(text),
  };
}
