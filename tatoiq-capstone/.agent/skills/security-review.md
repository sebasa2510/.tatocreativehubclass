---
name: security-review
description: Read this before changing auth, rules, secrets, or the triage pipeline.
---
Review the change against these questions and report each as pass or fail. Do
not soften a fail.

1. Does any new file contain a credential? Search for `sk-`, `re_`, `AIza`,
   `BEGIN PRIVATE KEY`, `cookie`, and `service_account`.
2. Is every secret read from `os.environ` or `.env`, and is `.env` ignored?
3. Could a browser bundle ever receive `OPENAI_API_KEY`,
   `FIREBASE_SERVICE_ACCOUNT_JSON`, `RESEND_API_KEY`, or `TRIAGE_REVIEW_TOKEN`?
   If yes, fail.
4. Did `firestore.rules` get looser? Quote the before and after line.
5. Can an anonymous client read, update, or delete a `contacts` document? If
   yes, fail.
6. Can a client write `triage`, `needsReview`, `owner`, or `reply` at create
   time? If yes, fail.
7. Does any model output reach an email body, an HTML page unescaped, or a
   Firestore write without allowlist validation? If yes, fail.
8. Is the review page still token-gated, `noindex`, and unlinked from the public
   site?
9. Do the tests run without network access and without a real key?
10. Is there a rollback path for the hosting release and the backend deploy?

If a check cannot be run, say so explicitly instead of marking it pass.
