# CCO Triage Agent (Netlify Function)

The customer side of the AI OS starts here. One endpoint reads an inbound message, classifies it, assigns the owner from a fixed table, and writes the analysis onto the customer record. It never answers anyone and never sends anything.

| | |
|---|---|
| Endpoint | `POST /api/cco/triage` |
| Function file | `netlify/functions/cco-triage.mjs` |
| Core logic | `netlify/functions/_lib/cco-triage-core.mjs` |
| Records | Netlify Blobs, store `cco-customers` |
| Model | OpenAI, server-side only |
| Send path | None. No Gmail, email, SMS, or chat transport is imported. |
| Firebase | Not used. No billing-dependent Firebase resource is created. |

---

## 1. What it does

1. Reads one message from a chatbot, contact form, or inbox.
2. Redacts obvious identifiers (SSN, EIN, card/account numbers, email, phone).
3. Asks the model for the intent, category, urgency, and human gate.
4. Validates the result. An unusable result is a failure, not a default.
5. Assigns the owner from the deterministic table below.
6. Writes the analysis onto the customer record in Netlify Blobs.
7. Returns the analysis. It does not reply to the customer.

The CCO reads the result and reports it to the user. If a reply is needed, it goes through the CMO and `email_writer`, after the user confirms.

### Category → owner

| Category | Owner | Meaning |
|---|---|---|
| `new_business` | `cso` | A new prospect asking about services, pricing, or onboarding. |
| `support` | `cco` | An existing customer asking for help with the product, return, documents, or access. |
| `billing_or_money` | `owner` (the user) | Invoices, payments, refunds, charges, balances, anything about money. |
| `partnership_or_press` | `cmo` | A partner, vendor, journalist, or creator reaching out. |
| `spam` | `cco` | Bulk solicitations, phishing, irrelevant automated messages. No reply. |
| `unclear` | `owner` (the user) | The message does not say what the person wants. Human required. |

The model classifies; the code assigns the owner. A model-supplied owner is ignored.

---

## 2. Request

`POST /api/cco/triage` with `Content-Type: application/json`.

| Field | Required | Notes |
|---|---|---|
| `message` | yes | The person's message, verbatim. Max 4,000 characters. |
| `source` | yes | `chatbot`, `contact_form`, or `inbox`. |
| `customer_id` | one of these | Stable record key. Letters, digits, `.`, `_`, `:`, `-`; max 128. |
| `email` | one of these | Used to derive a stable `customer_id` when no id is supplied. |
| `name` | no | The person's name. Max 120 characters. |
| `channel_ref` | no | Original message id. A repeat with the same value returns the previous analysis without a second model call. |

At least one of `customer_id` or `email` is required. The body is capped at 16 KB.

### Browser call (contact form or chatbot)

Same-origin, so no token is needed. Never put `OPENAI_API_KEY` or `CCO_TRIAGE_TOKEN` in the browser.

```js
const res = await fetch('/api/cco/triage', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({
    message,
    source: 'contact_form',
    email,
    name,
    channel_ref: formId,
  }),
});

const result = await res.json();
if (!result.ok) {
  // Show a neutral message. Do not invent a triage result.
  console.error('Triage failed:', result.error);
}
```

### Server call (inbox webhook)

An origin-less call needs `CCO_TRIAGE_TOKEN`. Set it in the server environment, never in the page.

```js
await fetch('https://tatoiq.netlify.app/api/cco/triage', {
  method: 'POST',
  headers: {
    'content-type': 'application/json',
    authorization: `Bearer ${process.env.CCO_TRIAGE_TOKEN}`,
  },
  body: JSON.stringify({
    message,
    source: 'inbox',
    customer_id,
    channel_ref: messageId,
  }),
});
```

---

## 3. Response

### 200 — triaged and persisted

```json
{
  "ok": true,
  "persisted": true,
  "duplicate": false,
  "customer_id": "email_4f2c9d1a7b3e5f6081a2c3d4",
  "triage": {
    "intent_one_line": "Wants to know why the $300 payment was charged twice.",
    "category": "billing_or_money",
    "urgency": "high",
    "urgency_why": "A duplicate charge is money at risk.",
    "owner": "owner",
    "human_required_before_reply": true,
    "human_required_why": "Anything about money requires the owner.",
    "source": "inbox",
    "triaged_at": "2026-10-29T12:00:00.000Z",
    "model": "gpt-4o-mini"
  }
}
```

A repeated `channel_ref` returns the same shape with `"duplicate": true` and the previous analysis. It does not call the model a second time.

### Failure

```json
{
  "ok": false,
  "persisted": false,
  "error": "no_key",
  "message": "Triage is not configured: OPENAI_API_KEY is missing. Nothing was saved."
}
```

| Status | `error` | Cause |
|---|---|---|
| 400 | `bad_request` | Missing message, missing identity, malformed JSON, invalid email. |
| 401 | `unauthorized` | Origin-less call without a valid `CCO_TRIAGE_TOKEN`. |
| 403 | `forbidden_origin` | Browser origin not in the allowed set. |
| 405 | `method_not_allowed` | Not `POST` or `OPTIONS`. |
| 413 | `payload_too_large` | Body over 16 KB. |
| 415 | `unsupported_media_type` | Not `application/json`. |
| 429 | `rate_limited` | Best-effort per-instance limit hit. |
| 502 | `provider_error` | OpenAI unreachable or non-2xx. Nothing written. |
| 502 | `invalid_model_output` | Empty, malformed, or unusable model JSON. Nothing written. |
| 503 | `no_key` | `OPENAI_API_KEY` is missing. |
| 503 | `provider_auth` | OpenAI rejected the key (401/403). The key exists but is wrong, revoked, or has no access. Nothing written. |
| 503 | `provider_rate_limited` | OpenAI returned 429: quota exhausted or rate limited. Nothing written. |
| 503 | `storage_unavailable` | Blobs read or write failed. Nothing written. |

A failure never returns a guessed category. `unclear` is a model answer, not an error; a malformed answer is an error.

---

## 4. Customer record

Store: `cco-customers` (override with `CCO_BLOBS_STORE`). Key: `customer_id`.

```json
{
  "customer_id": "email_4f2c9d1a7b3e5f6081a2c3d4",
  "email": "jane@example.com",
  "name": "Jane",
  "first_seen": "2026-10-29T12:00:00.000Z",
  "last_seen": "2026-10-29T12:00:00.000Z",
  "triage": { "...": "the latest analysis" },
  "messages": [
    {
      "received_at": "2026-10-29T12:00:00.000Z",
      "source": "inbox",
      "channel_ref": "msg_123",
      "text": "[redacted email] charged me twice...",
      "triage": { "...": "the analysis for this message" }
    }
  ]
}
```

`messages` keeps the last 20 entries. `text` is the redacted message; the original stays in the source system. The record is capped and does not grow without bound.

When only `email` is supplied, the key is derived as `email_` plus the first 24 hex characters of a SHA-256 hash of the lowercased address. The raw email is not the key.

---

## 5. Environment

All values are server-side. Never prefix any of these with `NEXT_PUBLIC_`.

| Variable | Required | Default | Purpose |
|---|---|---|---|
| `OPENAI_API_KEY` | yes for live triage | — | Model key. The function returns 503 without it. |
| `CCO_TRIAGE_MODEL` | no | `gpt-4o-mini` | OpenAI model. |
| `CCO_ALLOWED_ORIGINS` | no | — | Comma-separated extra browser origins. The site's `URL` and `DEPLOY_PRIME_URL` are allowed automatically. Never use `*`. |
| `CCO_TRIAGE_TOKEN` | for origin-less calls | — | Bearer token for inbox webhooks. Timing-safe comparison. |
| `CCO_REQUIRE_TOKEN` | no | `false` | `true` requires the token on every call, including browser calls. Use for a server-side-only deployment. |
| `CCO_RATE_LIMIT_PER_10MIN` | no | `60` | Best-effort per-IP limit. `0` disables. Not a durable quota. |
| `CCO_TRIAGE_TIMEOUT_MS` | no | `20000` | Model timeout, clamped to 5–30 seconds. |
| `CCO_BLOBS_STORE` | no | `cco-customers` | Blobs store name. Do not change after records exist. |
| `CCO_BLOBS_SITE_ID` | local only | — | Netlify Blobs site id for runs outside `netlify dev`. |
| `CCO_BLOBS_TOKEN` | local only | — | Netlify Blobs token for runs outside `netlify dev`. |

`OPENAI_API_KEY` is the same key the Saggio drafting adapter uses. If you want triage to use a separate key, add `CCO_OPENAI_API_KEY` and read it in `cco-triage-core.mjs`; the current code intentionally uses one key.

---

## 6. Security posture

- **The key is server-side.** The browser only calls the function. The function calls OpenAI. No key is ever returned, logged, or bundled.
- **No send path.** The function imports no mail library and has no Gmail call. It cannot send even if a request asks it to.
- **No wildcard CORS.** A browser origin is echoed back only when it is in the allowed set. `*` is never used.
- **Origin is not authentication.** It stops casual cross-site calls, not a determined caller with a forged header. For a locked-down deployment, set `CCO_REQUIRE_TOKEN=true` and call the function only from a server-side proxy.
- **Token comparison is timing-safe.** The token gates origin-less calls; it is not shipped to the page.
- **Input is bounded.** 16 KB body, 4,000 character message, 120 character name.
- **Identifiers are redacted before the model call.** SSN, EIN, card/account numbers, email, and phone. The record stores the redacted text.
- **Logs contain no message content.** Only `status`, `error`, `category`, `owner`, `duplicate`, and `ms`.
- **Fail closed.** No key, provider error, invalid output, or storage error means no write. The endpoint never returns a fabricated triage result.
- **Prompt injection is data.** The system prompt tells the model to treat the message as data. The function never acts on instructions inside a message.

The rate limiter is best-effort and per instance; it survives neither a cold start nor multiple instances. If the endpoint becomes a cost problem, put Netlify rate limiting or a WAF rule in front of it, or set `CCO_REQUIRE_TOKEN=true` and use a server-side proxy.

---

## 7. Local testing

The core has a dependency-free self-test. It fakes both the model and the store.

```powershell
cd C:\Users\sebas\OneDrive\Desktop\.tato\tatoiq
npm run test:cco
```

For the HTTP layer, use the Netlify CLI so Blobs and function routing are emulated:

```powershell
cd C:\Users\sebas\OneDrive\Desktop\.tato\tatoiq
netlify dev
```

Set `OPENAI_API_KEY` in `.env` (not `.env.example`) for a live local run. Without it, the function correctly returns `503 no_key`. Netlify Blobs works locally through the CLI; if you run the function outside the CLI, set `CCO_BLOBS_SITE_ID` and `CCO_BLOBS_TOKEN`.

Call it:

```powershell
$body = @{
  message = 'I paid twice this month and need the extra charge refunded.'
  source  = 'chatbot'
  email   = 'jane@example.com'
  name    = 'Jane'
} | ConvertTo-Json

Invoke-RestMethod `
  -Method Post `
  -Uri http://localhost:8888/api/cco/triage `
  -ContentType 'application/json' `
  -Headers @{ Origin = 'http://localhost:8888' } `
  -Body $body
```

---

## 8. Deploy

1. Set the server-side variables on the Netlify site. At minimum:

   ```powershell
   cd C:\Users\sebas\OneDrive\Desktop\.tato\tatoiq
   netlify env:set OPENAI_API_KEY "sk-..."
   netlify env:set CCO_TRIAGE_TOKEN "<random-32-byte-hex>"
   ```

   Generate the token with:

   ```powershell
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

   Optional: `netlify env:set CCO_ALLOWED_ORIGINS "https://your-custom-domain.com"` if the site is served from more than one origin.

2. Deploy the site. `netlify.toml` already points at `netlify/functions` and bundles with esbuild.

   ```powershell
   netlify deploy --build --prod
   ```

   This deploys the whole site, including any uncommitted work in `tatoiq`. Review `git status` first. The Windows symlink caveat in `docs/DEPLOY-NETLIFY.md` still applies to a local `--build` deploy.

   Do **not** add `--skip-functions-cache` here. It produced a deploy with no working route at all: both `/api/cco/triage` and `/.netlify/functions/cco-triage` returned 404. A plain `netlify deploy --build --prod` registers `config.path` correctly.

   `OPENAI_API_KEY` may be stored as a Netlify *secret*, which `netlify env:list` cannot show. Absence from that list does not mean the variable is missing; test the endpoint instead.

3. Verify:

   ```powershell
   $body = @{
     message = 'I cannot upload my W-2.'
     source  = 'chatbot'
     email   = 'test@example.com'
   } | ConvertTo-Json

   Invoke-RestMethod `
     -Method Post `
     -Uri https://tatoiq.netlify.app/api/cco/triage `
     -ContentType 'application/json' `
     -Headers @{ Origin = 'https://tatoiq.netlify.app' } `
     -Body $body
   ```

   - `200` with `triage.owner` means the key, the model, and Blobs are all working.
   - `503 no_key` means step 1 did not land, or the deploy did not pick up the variable.
   - `503 provider_auth` means the key is present but OpenAI rejected it. Replace it in the Netlify UI; no redeploy is needed for an environment variable change to reach the function.
   - `503 provider_rate_limited` means the OpenAI account is out of quota or throttled.
   - `503 storage_unavailable` means Blobs is not available in this context.

   Function logs currently render with an empty message on this project, even though the function writes one plain line per request. Treat the response `error` code as the authoritative signal, not the log. The line the function attempts to emit looks like:

   ```
   cco.triage provider_auth status=503 {"evt":"cco.triage","status":503,"error":"provider_auth","detail":{"provider_status":401},"ms":3}
   ```

   Read it with `netlify logs --source functions --function cco-triage --since 10m --json`. The provider status is only ever logged; it is never returned to the caller and never includes customer text.

4. Check the record in the Netlify UI under the `cco-customers` Blobs store. The key is the returned `customer_id`.

---

## 9. What this does not do

- It does not reply. There is no reply body, no draft, and no send.
- It does not route to the CSO, CCO, or CMO by itself. It records the owner; the CCO reports and routes.
- It does not create a Firebase document, enable Firebase billing, or touch any Firebase file.
- It does not classify a message it cannot read. It returns `unclear` or an error.
- It does not keep an unbounded transcript. The record keeps the last 20 redacted messages.

The next customer skill (a support responder, for example) plugs in under `customer/` and is wired with `scripts/index-customer-subagents.ps1`. Any outbound message still goes through the CMO and `email_writer`, after the user confirms.
