# Saggio: what "answer any tax question" actually means

Saggio ships in three layers. Which one answers depends on what is deployed —
never on wishful thinking. The UI labels each layer honestly.

| Layer | Where it runs | Coverage | Needs a key? |
| --- | --- | --- | --- |
| 1. Grounded + cited | Browser (static) or API route | 111 curated IRS topics | No |
| 2. General, clearly labelled | Browser (static) or API route | Anything tax-shaped | No |
| 3. Model-backed general | Firebase Function (optional, not wired) | Broader, never cited | Yes |

Alongside the tax tiers there is a small **conversation** layer for greetings,
"what can you do", document upload, return status, pricing, privacy, and lead
grading questions. Those are product help, not tax authority: they carry no
citations and are labelled as Saggio itself.

Escalation runs first in every layer: audits, IRS notices, collections, fraud,
foreign income, and disputes always route to a human preparer and lock AI
calculation advice.

## The honest limit

No assistant can guarantee a correct answer to every tax question. The answer
depends on the year, jurisdiction, entity, facts, and documents, and a wrong
number can cost real money. Saggio therefore guarantees a **response tier**, not
omniscience:

1. a cited answer when a curated IRS source supports it;
2. a clearly labelled general answer when it does not;
3. a human escalation for sensitive or high-stakes questions;
4. a conversation answer for greetings, product help, and navigation;
5. a plain refusal for off-topic questions.

Every tax question gets one of those four outcomes. That is the bar this product
can defend. "It will always be right" is not a bar any tax assistant can defend.

## What changed and why

The live site is a **static export**. A static host has no `/api/assistant`, so
the browser was running only the offline core — and that core held 10 chunks.
Anything outside those 10 topics produced "I don't have an IRS source…", which
is what you were hitting.

What changed:

1. **The knowledge base grew from 10 to 111 topics** (`src/lib/saggio/knowledge-base.ts`),
   covering withholding, estimated-payment penalties, household employees, fringe
   benefits, accountable plans, EINs, digital assets, Roth conversions, RMDs,
   inherited IRAs, 1031 exchanges, installment sales, §179, rental depreciation,
   casualty losses, passive activity, NOLs, muni bonds, savings bonds, alimony,
   clergy, farm income, business sales, and nondeductible personal expenses.
2. **Retrieval was hardened.** Synonym mapping ("write off" → deduction), simple
   plurals ("RSUs" → RSU), typo tolerance ("deducton" → deduction), exact
   short-form phrases ("W-2", "K-1"), whole-token matching so "work" no longer
   matches "worker", and category-word demotion so "can I deduct my dog?" resolves
   to the nondeductible-personal-expense chunk instead of the standard deduction.
   A relative-score floor stops a cited answer padding itself with an unrelated
   form just to reach three citations.
3. **A new `general` tier with much broader topic routing** (about 50 topics).
   When nothing is grounded, Saggio still answers, but the answer is explicitly
   labelled *"General information · not IRS-sourced"* and carries **zero**
   citations. It never invents a publication number to look authoritative.
4. **A new `conversation` tier.** Greetings, "what can you do", document upload,
   return status, pricing, privacy, and lead-grading questions get a direct answer
   instead of a canned tax paragraph. It carries no citations by design.
5. **Follow-up context.** The chat sends the last four user turns so "what about
   married filing jointly?" resolves against the previous question. Context can
   never change the tier, the year guard, or escalation.
6. **A real free-text preview and honest labels.** The marketing Saggio card now
   accepts any federal tax question, shows whether the answer is IRS-sourced,
   general, escalated, or unsupported, and links sensitive or unsourced questions
   to `/contact` instead of pretending a message was opened.

The cited and escalation behaviours are unchanged, and the tests assert that a
cited answer always has a citation and a general answer never does. A separate
test refuses to apply 2025 dollar figures to a question about another year.

## Client mode: answering from the customer record

The same `/api/assistant` route also serves signed-in clients. The portal passes
the session email into Saggio, the chat sends it with every turn, and the server
looks it up in Firestore. The browser never receives a customer record.

A record counts as a client only when its `status` is `onboarding` or `active`.
For those records Saggio:

1. greets the person by name, stops pitching, and answers **only** from the
   record — the engagement scope, the recorded project status/stage, the next
   recorded milestone, the owner, and the open kickoff items;
2. never invents a status. If the record is silent, Saggio says so and appends
   the question to `openQuestions` on the record;
3. guides the person to a verified in-app page (`src/lib/saggio/site-guide.ts`)
   when they ask where something lives. A test checks that every link points at
   a real `page.tsx` in this repo;
4. routes questions it should not answer through the Triage Agent, names the
   person or team in one sentence, and writes the routing onto the record. It
   promises only a response window already on the record or returned by Triage;
5. hands off instead of solving when Triage says billing, or when the person
   sounds unhappy or mentions leaving/cancelling. The record is flagged with
   what they said and `needsAttention: true`.

Every conversation writes a one-line `conversationSummary`, updates
`lastTalkedAt`, and increments `conversationCount`. A `lead`, `paused`, or
`former` record is never greeted as a client; the chat says it cannot see an
active record and falls back to general tax education.

Client answers are deterministic. No customer record is ever sent to the model
provider. The only outbound record slice is the small, non-sensitive payload
sent to the Triage Agent when one is configured.

### Record shape and demo data

The `customers` collection has no existing schema in this repo, so the shape is
defined in `src/lib/saggio/client-records.ts`. The important fields are:

```text
email, normalizedEmail, name, businessName, status
services | hiredFor, engagementSummary
projectStatus, projectStage, nextMilestone, nextMilestoneDate
owner, team, responseWindow
kickoffChecklist | checklist: [{ label, done, note? }]
lastTalkedAt, conversationSummary, conversationCount, openQuestions
routing, handoff, needsAttention
```

Seed labelled demo records (two active, two onboarding, one lead, one former)
with:

```bash
node scripts/seed-firestore-customers.mjs --dry-run   # preview
node scripts/seed-firestore-customers.mjs             # write to web-app---tato
```

They use `example.com` addresses and `isSample: true`. Replace them with real
records before treating any output as live.

### Credentials and the Triage Agent

Set exactly one Firestore credential source on the server (never `NEXT_PUBLIC_`):
`FIREBASE_SERVICE_ACCOUNT_JSON`, `GOOGLE_APPLICATION_CREDENTIALS`, or a
short-lived `FIREBASE_ACCESS_TOKEN` for local checks. With none configured,
Saggio reports that client records are unavailable instead of guessing.

`TRIAGE_AGENT_URL` is optional. When set, routed messages are POSTed as:

```json
{
  "message": "client words",
  "intent": "tax_question | problem",
  "customer": {
    "id": "…", "businessName": "…", "status": "active", "services": ["…"],
    "projectStatus": "…", "owner": "…", "team": "…", "responseWindow": "…"
  }
}
```

Reply with `{ "team": "…", "owner": "…", "responseWindow": "…", "reason": "…",
"handoff": false }`, optionally wrapped in `{ "result": { … } }`. A flat response
also works. If the call fails, times out (5s), or omits `team`, the local
fallback routes by intent and records `mode: "fallback"` — the record never
claims the remote agent ran.

## Layer 3: the optional model function

The static site cannot hold a provider key — anything shipped to the browser is
public. The optional Firebase Function keeps the key server-side and reuses the
same `/api/assistant` path.

**Important:** the function does not have the curated IRS chunks, so it returns a
`general` answer with zero citations. It must never be relabelled as IRS-sourced.
It is a breadth layer, not a replacement for the grounded core. The server-side
Next.js `/api/assistant` route is the layer that can compose a model answer from
retrieved chunks, and only when the app is built with a server runtime.

### 1. Deploy the function

```bash
cd tatoiq
firebase functions:secrets:set OPENAI_API_KEY   # paste your key
cd functions && npm install && cd ..
firebase deploy --only functions --project web-app---tato
```

The deploy prints the function URL, for example:

```
https://saggio-abc123-uc.a.run.app
```

### 2. Route `/api/assistant` to it

Add this **above** the existing rules in `firebase.json` → `hosting`:

```json
"rewrites": [
  {
    "source": "/api/assistant",
    "function": "saggio"
  }
]
```

Then redeploy hosting:

```bash
npm run deploy:site
```

If you only have a Cloud Run URL, use `"run": { "serviceId": "saggio", "region": "us-central1" }`
instead of `"function"`.

### 3. Confirm

```bash
curl -s -X POST -H "Content-Type: application/json" \
  -d "{\"question\":\"what is the child tax credit\"}" \
  https://web-app---tato.web.app/api/assistant
```

You want JSON with `"provider":"openai-general"` and `"kind":"general"`. If you
get `503` with `"fallback":"offline"`, the key is not set and the browser is
handling it — which is a valid state, not a failure.

## Safety rules that must not be weakened

These are load-bearing. Please do not remove them to make an answer sound better.

1. The provider key exists only in the function environment.
2. The question is redacted (SSN, EIN, account numbers, email, phone) before it
   leaves our infrastructure, and truncated to 2000 characters.
3. The system prompt forbids inventing a form number, publication, dollar
   threshold, or deadline.
4. Escalation topics never reach the model.
5. The response is labelled `general` unless it actually carries a retrieved
   source. The optional function never does.
6. A question about a year other than 2025 never borrows a 2025 dollar figure.

## Changing the knowledge base

Edit `src/lib/saggio/knowledge-base.ts`. Every entry needs a real, checkable IRS
source — a test enforces that every chunk has a `source` and at least one
keyword, and that ids are unique. Run `npm test` after editing.

## Deploying

The presentation site is **Netlify** (`https://tatoiq.netlify.app`). It runs the
normal server build, so `/api/assistant` and `/leads` are real endpoints:

```bash
npm run deploy:netlify    # netlify deploy --build --prod
```

No `OPENAI_API_KEY` is set on that Netlify project, so Saggio serves the offline
grounded core from the browser — the same logic the tests cover. That is a valid,
fully labelled state, not a failure.

The Firebase Hosting target is the **static export**:

```bash
npm run build:site     # build ./out
npm run deploy:site    # build then deploy to Firebase Hosting
```

`scripts/export-site.mjs` parks the server-only routes and pages
(`/api/leads/*`, `/api/outreach/*`, `/api/webhooks/*`, `/api/unsubscribe`,
`/leads`, and the outreach dispatch test) for the duration of the export build
and restores them afterwards, including on failure or Ctrl-C. Nothing is
deleted. That is why `output: export` can coexist with the lead feature.
