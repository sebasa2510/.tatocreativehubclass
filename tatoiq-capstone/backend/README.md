# Backend — TatoIQ triage service

FastAPI on Python 3.12. It is the only component that holds the model key and the
Firebase service account.

## Run

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

`.env` lives in the project root (`../.env`), not here, so there is one copy.

## Endpoints

- `GET /health` → provider, `modelConfigured`, `emailConfigured`, `reviewConfigured`
- `GET /api/skills` → skills found under `.agent/skills`
- `POST /api/triage` → `{"contact_id": "..."}`
- `GET /api/review?token=...` → HTML; add `&format=json` for data

## What it refuses to do

- It will not triage a record whose `source` is not `website-contact`.
- It will not triage a record older than 15 minutes, or one that already has a
  `triage` block. A retry returns the stored decision.
- It will not send a model-written reply. `reply_body()` is the only source of
  email text.
- It will not treat a failed `customers` lookup as "not a client". Unknown stays
  `None`.
- It will not fail a submission because the model is down. It records
  `triageStatus: "unavailable"`, sends the plain thank-you, and flags the row.

## Files

| File | Role |
|---|---|
| `main.py` | HTTP layer, CORS, review page |
| `triage.py` | Firestore, redaction, model call, decision table, replies |
| `skills.py` | Frontmatter parser for `.agent/skills/*.md` |
| `tests/test_triage.py` | Pure functions, no network |

## Deploy (Render free)

- Root directory: `backend`
- Build: `pip install -r requirements.txt`
- Start: `uvicorn main:app --host 0.0.0.0 --port $PORT`
- Env: everything in `../.env.example`, plus
  `ALLOWED_ORIGINS=https://YOUR-PROJECT.web.app`

The free instance sleeps when idle. A cold start only delays triage; the contact
record is already saved by the browser.

## Security notes

- The service account can read every `contacts` document. It must never be
  shipped to the browser, and the JSON file must stay outside the repo.
- `/api/review` is disabled until `TRIAGE_REVIEW_TOKEN` is set, and returns 404
  for a wrong token. Treat the URL like a password.
- Error messages never include the key, the message body, or a provider payload.
