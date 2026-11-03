# TatoIQ — contact triage

A vanilla JavaScript contact form on Firebase Hosting, a Python service that
classifies each message with a free-tier model, and a fixed reply per category.
No framework, no build step, no paid services.

Every message is saved first, read second, and answered third. The model chooses
a category; it never writes the reply and never decides money.

## What is in the box

```
tatoiq-capstone/
├── .agent/
│   ├── README.md                     how the AI OS skills are wired
│   └── skills/
│       ├── contact-triage.md         the prompt loaded at runtime
│       ├── deploy-check.md           pre-deploy steps for the coding agent
│       └── security-review.md        review questions for the coding agent
├── .env.example                      variable names only, no values
├── .firebaserc.example               copy to .firebaserc, then set your project id
├── .gitignore                        secrets, service accounts, cookie exports
├── firebase.json                     Hosting (not App Hosting) + Firestore rules
├── firestore.indexes.json            empty index file, ready to grow
├── firestore.rules                   deny by default, public form, own data
├── SECURITY.md                       the ten Ship Checklist items
├── README.md
├── public/
│   ├── index.html                    the page (styled)
│   ├── app.js                        save → triage → render
│   ├── style.css                     layout, no external fonts
│   ├── config.js                     public config only (no secrets)
│   └── favicon.svg
└── backend/
    ├── main.py                       FastAPI app, CORS, review page
    ├── triage.py                     redact → classify → decide → reply
    ├── skills.py                     reads .agent/skills/*.md
    ├── requirements.txt
    ├── requirements-dev.txt
    ├── tests/test_triage.py          14 pure-function tests
    └── README.md
```

## Free tiers used

| Service | Plan | Limit that matters here |
|---|---|---|
| Firebase Hosting | Spark | 10 GB stored, 360 MB/day transfer |
| Cloud Firestore | Spark | 1 GiB stored, 50k reads/day, 20k writes/day |
| Render | Free web service | Sleeps after 15 min idle; ~50 s cold start |
| Google AI Studio (Gemini) | Free tier | Rate-limited, no card required |
| Resend | Free | 100 emails/day, 3,000/month |
| GitHub | Free | — |

`OPENAI_API_KEY` is supported but **OpenAI is not free** beyond trial credit.
The default provider is Gemini precisely so the capstone stays on free tiers.

## Setup

### 1. Firebase project

```bash
firebase login
firebase projects:create tatoiq-capstone   # or create it in the console
cp .firebaserc.example .firebaserc
# edit .firebaserc and replace the project id
```

Enable **Firestore** in the console, in Native mode, on the Spark plan. In
Project settings → Your apps, add a **Web app**: Hosting serves the public
Firebase config to the page from `/__/firebase/init.json`, and that endpoint
needs a web app to exist.

### 2. Deploy the rules first

```bash
firebase deploy --only firestore:rules
```

Do this before the site exists. The rules deny everything by default; the only
opening is `create` on `contacts`, with a shape check.

### 3. Python service

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate          # macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt

cd ..
cp .env.example .env
```

Fill in `.env` (never commit it):

| Variable | Needed for | Where to get it |
|---|---|---|
| `GEMINI_API_KEY` | classification | aistudio.google.com → Get API key |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | server-side Firestore | see below |
| `TRIAGE_REVIEW_TOKEN` | the review page | `python -c "import secrets; print(secrets.token_hex(32))"` |
| `RESEND_API_KEY` | sending replies | resend.com, free tier |
| `OUTBOUND_EMAIL_DOMAIN` | the From address | a domain verified in Resend |

**Service account:** Google Cloud console → IAM & Admin → Service Accounts →
create one with the *Cloud Datastore User* role → Keys → add key → JSON.
Download it, keep it outside this repo, and put its path in
`GOOGLE_APPLICATION_CREDENTIALS`. On a host, paste the JSON into
`FIREBASE_SERVICE_ACCOUNT_JSON` instead. The file is gitignored by name and by
pattern; that is a backstop, not a reason to keep it in the folder.

Start it:

```bash
cd backend
uvicorn main:app --reload --port 8000
```

`GET http://localhost:8000/health` should report `modelConfigured: true`.

### 4. Run the site locally

```bash
firebase emulators:start --only hosting
```

Open `http://localhost:5000`. Do **not** open `public/index.html` directly: the
Firebase config is served by Hosting at `/__/firebase/init.json`, and `file://`
has no such URL.

`public/config.js` already points at `http://localhost:8000`.

### 5. Deploy the backend to Render (free)

1. Push this repo to GitHub.
2. Render → New → Web Service → connect the repo.
3. Root directory: `backend`.
4. Build: `pip install -r requirements.txt`.
5. Start: `uvicorn main:app --host 0.0.0.0 --port $PORT`.
6. Add every variable from `.env` in the Render dashboard, plus
   `ALLOWED_ORIGINS=https://YOUR-PROJECT.web.app`.
7. Set the Python version to 3.12.

Free services sleep. The form still saves while the service is asleep; the
visitor sees "saved, a person will read it before replying", and no message is
lost. That is the intended failure mode.

### 6. Point the site at the backend and deploy

Edit `public/config.js`:

```js
apiBase: 'https://your-service.onrender.com',
```

Edit the CSP in `firebase.json` if your backend is not on `*.onrender.com`.

```bash
firebase deploy --only hosting
```

The site is now at `https://YOUR-PROJECT.web.app`.

## API

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/health` | Provider and configuration booleans, no secrets |
| `GET` | `/api/skills` | What the service can load from `.agent/skills` |
| `POST` | `/api/triage` | `{ "contact_id": "..." }` → decision and reply status |
| `GET` | `/api/review?token=…` | Token-gated page of decisions |
| `GET` | `/api/review?token=…&format=json` | Same data as JSON |

## Tests

```bash
cd backend
pip install -r requirements-dev.txt
pytest -q
```

14 checks: redaction, message building, every category's fixed owner, the money
and spam rules, the unknown-sender rule, the unavailable fallback, output
validation, and the forbidden-phrase check on every reply template.

## How a submission flows

1. `public/app.js` writes the record to `contacts` with the browser SDK.
   The rules allow that create and deny every read.
2. It posts the new document id to the Python service.
3. The service checks the record is a fresh `website-contact` submission that
   has not been triaged, redacts identifiers, and loads
   `.agent/skills/contact-triage.md` as the system prompt.
4. The category is validated against an allowlist, the owner comes from
   `CATEGORY_OWNER`, and the decision is written onto the record **before** any
   email is sent.
5. One fixed reply is sent, or none for spam.
6. A failure at any step leaves the saved record intact and flags it for the
   owner instead of guessing.

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| "Firebase config is unavailable" | Opened `index.html` directly | Run `firebase emulators:start --only hosting` |
| `503 storage_unavailable` | Service account missing or wrong | Check `FIREBASE_SERVICE_ACCOUNT_JSON` / `GOOGLE_APPLICATION_CREDENTIALS` |
| `503 model_not_configured` in logs, thank-you still sent | No model key | Add `GEMINI_API_KEY`; the fallback is deliberate |
| Reply status `skipped` | Resend not configured | Add `RESEND_API_KEY` and a From domain |
| Browser blocks the API call | CSP missing the backend origin | Add it to `connect-src` in `firebase.json`, redeploy |
| CORS error | Origin not allowed | Add it to `ALLOWED_ORIGINS` on the backend |
| Cold start on the first submission | Render free tier | Expected; the message is saved and retried by a person |

## Not included on purpose

- No Cloud Functions and no Firebase billing. Firebase cannot run Python, so the
  agent call lives on Render.
- No framework and no bundler. `public/` is the deployable site.
- No model-written copy. Triage selects a template; it never authors one.
