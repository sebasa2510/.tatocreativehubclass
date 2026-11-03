---
name: deploy-check
description: Run before every firebase deploy or backend redeploy.
---
Do these in order and stop at the first failure.

1. `cd backend && python -m compileall .` — no syntax errors.
2. Start the service and call `GET /health`; confirm the booleans match the
   environment you think you are in.
3. `firebase emulators:start --only hosting,firestore` and submit one test
   contact. Confirm the record is written, triaged, and visible at
   `/api/review?token=…`.
4. Confirm the anonymous browser cannot read the `contacts` collection.
5. Confirm `public/` contains no `.env`, no service-account JSON, and no key.
6. Run `git status --short` and read every untracked file name before staging.
7. Tick all ten items in `SECURITY.md`.
8. `firebase deploy --only hosting,firestore:rules`
9. After deploy, call `/health` on the production backend and submit one real
   test message. Confirm the reply lands and the review page shows it.
10. Record the previous Hosting release ID and the previous backend deploy ID
    so a rollback is one command.
