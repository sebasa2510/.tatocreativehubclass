# SECURITY

Ten checks. Tick every box before each deploy. If one cannot be run, it is not
ticked — write down why instead.

## The ten Ship Checklist items

- [ ] **1. No secret in the tree or the bundle.** `git grep -nE "sk-|re_|AIza|BEGIN PRIVATE KEY|service_account"` returns only documentation. `public/` contains no key and no `.env`.
- [ ] **2. Env is local only.** `.env` exists on this machine, is ignored, and is not staged. `.env.example` contains names with empty values.
- [ ] **3. Rules are deny-by-default and were tested.** `firestore.rules` still starts with a global deny, an anonymous client can create one valid `contacts` document, and cannot read, update, or delete it. Tested in the emulator, not by reading the file.
- [ ] **4. The model key is server-side.** The browser calls `/api/triage`; it never calls the model provider. No secret is in `public/`, in `config.js`, or behind a `NEXT_PUBLIC_`-style prefix.
- [ ] **5. Untrusted text is treated as data.** The message is redacted for SSN, EIN, card, email, and phone before it leaves the server, capped at 4,000 characters, and the system prompt tells the model to ignore instructions inside it.
- [ ] **6. The model cannot write the reply.** Category and urgency are allowlisted, the owner comes from `CATEGORY_OWNER`, invalid output is a hard failure, and every email body comes from `reply_body()`.
- [ ] **7. Fixed replies only.** No template contains a price, a guarantee, or a hard deadline. `pytest` passes, including the forbidden-phrase test.
- [ ] **8. The review surface is closed.** `/api/review` returns 503 without `TRIAGE_REVIEW_TOKEN`, returns 404 for a wrong token, is `noindex`, and is not linked from the public site.
- [ ] **9. Headers and transport.** HTTPS only, HSTS, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `frame-ancestors 'none'`, a CSP that allows only the origins actually used, and no directory listing.
- [ ] **10. Rollback is recorded.** The previous Hosting release ID and the previous backend deploy ID are written down, and the Firestore rules in production match the copy in this repo.

## Run the checks

```bash
# 1 — secrets in the tree
git grep -nE "sk-|re_|AIza|BEGIN PRIVATE KEY|service_account" -- . ':!*.md' ':!.env.example'

# 3 — rules against the emulator (needs Java)
firebase emulators:start --only firestore
# then run the rules test from the Firebase console or a small script

# 7 — fixed replies and decision table
cd backend
pip install -r requirements-dev.txt
pytest -q

# 9 — headers after deploy
curl -sI https://YOUR-PROJECT.web.app | findstr /I "content-security strict-transport x-frame x-content"
```

## If a key leaks

Do these in order. Each key has a different blast radius.

1. **0–2 min, model key (`GEMINI_API_KEY` or `OPENAI_API_KEY`).** Revoke it in the provider console and create a replacement. Read usage for calls you did not make.
2. **2–4 min, Firebase service account.** Delete the key in Google Cloud IAM → Service Accounts and create a new JSON. This key can read every contact record. Check `contacts` for edits or deletions and review IAM for unknown grants.
3. **4–6 min, Resend key.** Revoke and replace it. Read the Resend sent log for mail that does not match a `reply` block in Firestore.
4. **6–8 min, `TRIAGE_REVIEW_TOKEN`.** Generate a new 32-byte value; every old review URL stops working.
5. **8–10 min, contain and verify.** Update the host's environment, redeploy, confirm `/health` reports the provider as configured, grep the repo and `public/` for the old value, and read the backend logs for calls from unknown addresses.

If the service account leaked, treat every contact record as potentially read by
a third party and say so in the incident note.

## What this app collects

Personal data about other people: name, business name, email, service interest,
industry, budget range, timeline, free-text message, the triage decision, reply
status, and whether the email matches a `customers` record. Firestore rules deny
all reads from the browser; only the service account and the token-gated review
page can read it.
