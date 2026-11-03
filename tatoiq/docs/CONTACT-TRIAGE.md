# Contact-form triage and replies

Every message from the website contact form is read before anything replies to
it. The Triage Agent decides what the message is; a fixed decision table decides
who owns it and which reply, if any, goes out.

| | |
|---|---|
| Function | `netlify/functions/contact-triage.mjs` (POST `/api/contacts/triage`) |
| Logic | `netlify/functions/_lib/contact-triage-core.mjs`, `contact-triage-run.mjs` |
| Triage model | `netlify/functions/_lib/cco-triage-core.mjs` (same agent as CCO triage) |
| Reply copy | `netlify/functions/_lib/contact-replies.mjs` |
| Records | Firestore `contacts`, the same document the form already creates |
| Review page | `netlify/functions/contact-triage-review.mjs` (GET `/api/contacts/review`) |
| Tests | `npm run test:contact-triage` (25 checks, no network) |

## Flow

1. The visitor submits the form. `contact-form.tsx` writes the record to
   Firestore `contacts` exactly as before, including `source: 'website-contact'`
   and an ISO `createdAt`.
2. After the save succeeds, the page calls `POST /api/contacts/triage` with the
   new document id. This is fire-and-forget: the visitor's success screen does
   not wait for triage, and a triage failure never loses the lead.
3. The function re-reads the record, checks it is fresh (15 minutes), is a
   contact-form submission, and has not been triaged already.
4. The message is redacted (SSN, EIN, card/account, email, phone) and sent to the
   Triage Agent with `temperature: 0` and a JSON schema.
5. The decision is written onto the record **before** the reply is sent.
6. One reply goes out through Resend, or none at all.
7. The owner sees the decision on the review page.

## Decision table

| Triage category | Owner | Reply | Owner's reading list |
|---|---|---|---|
| `new_business` | CSO | CSO new-business note | no |
| `support` (existing client) | CCO | Client-care note | no |
| `support` (email not in `customers`) | CCO | Client-care note | **yes** — may be a misread |
| `billing_or_money` | Owner | One line: "I will come back to you on it myself." Nothing else. | **yes** |
| `spam` | CCO | **none** | no |
| `unclear` | Owner | Plain thank-you | **yes** |
| `partnership_or_press` | CMO | Plain thank-you | **yes** — no auto-reply policy |
| triage unavailable | Owner | Plain thank-you | **yes** |
| reply send failed | unchanged | recorded as failed | **yes** |

The model never chooses the owner and never writes the reply. `CATEGORY_OWNER`
in `cco-triage-core.mjs` fixes the owner; `contact-replies.mjs` holds the only
wording. A wrong classification can therefore pick the wrong template, but it
cannot invent a price, a deadline, or a tax position.

The CSO's new-business copy lives in one place:
`netlify/functions/_lib/contact-replies.mjs` → `CSO_NEW_BUSINESS`. Edit it there
and every new-business reply changes. A test fails if any reply gains a price,
a guarantee, or a hard deadline.

## Where to see what it decided

Three places, all showing the same record fields.

### 1. Review page (recommended)

```
https://<your-netlify-site>/api/contacts/review?token=<TRIAGE_REVIEW_TOKEN>
```

- Newest 100 submissions, newest first.
- Rows that need a human read are highlighted; `?needs=1` shows only those.
- `&format=json` returns the same data for scripts.
- The token is required. Without `TRIAGE_REVIEW_TOKEN` set, the page refuses to
  render. It is `noindex`, `no-store`, and is never linked from the public site.
- The page shows real messages, so treat the URL like a password.

### 2. Terminal

```
npm run triage:report
npm run triage:report -- --needs
npm run triage:report -- --limit 50 --json
```

Read-only. Uses `FIREBASE_SERVICE_ACCOUNT_JSON`, `FIREBASE_ACCESS_TOKEN`, or the
Firebase CLI login already on the machine. Nothing needs to be deployed.

### 3. The Firestore document

Each `contacts` document now carries:

```
triage: {
  status: 'ok' | 'unavailable',
  intent, category, urgency, owner,
  urgency_why, human_required_before_reply,
  needs_review, review_reason, model, error, at
}
triageStatus, category, urgency, owner,
needsReview, reviewReason, existingClient, customerId,
triagedAt,
reply: { kind, status, to, subject, error, at }
```

`reply.status` is `none`, `queued`, `sent`, `skipped` (no email configured), or
`failed`.

## Environment

| Variable | Required | Notes |
|---|---|---|
| `OPENAI_API_KEY` | yes | Shared with Saggio and CCO triage. Missing → thank-you + review, never a made-up category. |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | yes | Firestore REST credentials. Also accepts `FIREBASE_ACCESS_TOKEN`. |
| `RESEND_API_KEY` + `OUTBOUND_EMAIL_DOMAIN` | for replies | Missing → decision still saved, reply marked `skipped`. |
| `CONTACT_REPLY_FROM` | no | Defaults to `TatoIQ <hello@OUTBOUND_EMAIL_DOMAIN>`. |
| `CONTACT_REPLY_TO` | no | Sets Reply-To only. |
| `NEXT_PUBLIC_CONTACT_TRIAGE_URL` | on the Firebase mirror | Full Netlify URL when the form is not served by Netlify. `npm run build:site` defaults it to `https://tatoiq.netlify.app/api/contacts/triage`. |
| `CONTACT_TRIAGE_ALLOWED_ORIGINS` | no | Extra browser origins. The Firebase site and localhost are allowed by default. |
| `CONTACT_TRIAGE_RATE_LIMIT_PER_10MIN` | no | Default 30, best-effort per instance. `0` disables. |
| `TRIAGE_REVIEW_TOKEN` | for the page | Random 32-byte hex. |

`NEXT_PUBLIC_*` is inlined into the page at build time; it must never hold a
secret. Everything else stays server-side on Netlify.

## Deploy

1. Set the Netlify environment variables above.
2. Deploy the functions: `npm run deploy:netlify` (Netlify runs the server build,
   so `/api/contacts/triage` and `/api/contacts/review` exist there).
3. If the form is served from Firebase Hosting, `npm run build:site` already
   bakes in `https://tatoiq.netlify.app/api/contacts/triage`. Set
   `NEXT_PUBLIC_CONTACT_TRIAGE_URL` first only if the Netlify site lives at a
   different URL, then `npm run build:site` and deploy Hosting as usual. If the
   function is unreachable, the Firebase form still saves the lead and the
   triage call is a harmless failure on that origin.
4. Submit one test message and open the review page.

## Failure behaviour

- **Firestore write fails** → 503, nothing invented; the lead is still saved
  because the form wrote it first.
- **Triage model is down / key missing** → the record is marked
  `triageStatus: 'unavailable'`, the plain thank-you is sent, and the row is
  flagged `triage_unavailable`.
- **Resend fails** → `reply.status: 'failed'`, `needsReview: true`, reason
  `reply_failed`.
- **Duplicate call** → the stored triage is returned; no second model call, no
  second email. Resend also receives one idempotency key per contact.
- **Stale or unrelated record** → refused before any model call (`too_old`,
  `not_a_contact_form_submission`).

## Cost and Firebase billing

The Triage Agent runs in the Netlify function. Firestore is used through its
REST API with a service account, which works on the free Spark plan. There is no
Cloud Function, no Hosting rewrite to a function, and nothing here requires
Firebase billing to be enabled.

## What this does not do

- It does not answer the message's tax or money question. It acknowledges and
  routes; a human replies.
- It does not promise scope, price, or timing in any reply.
- It does not decide that a sender is a real client on its own; the `customers`
  lookup is evidence, and a lookup failure is recorded as unknown.
