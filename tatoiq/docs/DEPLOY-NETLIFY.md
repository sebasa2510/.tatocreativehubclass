# Deploying TatoIQ to Netlify (Windows)

## Why this file exists

TatoIQ is deployed to **two hosts**, and they are not equivalent:

| Host | Build | `/leads` (the lead agent) | `/api/assistant` (Saggio) |
|---|---|---|---|
| Firebase — `web-app---tato.web.app` | static export (`out/`) | **unavailable** (parked) | unavailable |
| Netlify — `tatoiq.netlify.app` | Next server build + `@netlify/plugin-nextjs` | **available** | **available** |

Only the Netlify build can host the lead-generation agent, because it needs a
Node runtime. The static export physically cannot serve `/api/leads`.

## The Windows blocker

`netlify deploy --build --prod` fails on Windows with:

```
EPERM: operation not permitted, symlink '...\.next\standalone\node_modules\@prisma\client'
```

`@netlify/plugin-nextjs` calls `fs.symlink()` while packaging the server
handler (`dist/build/content/server.js:126`, `verbatimSymlinks: true`).
Windows refuses symlink creation unless **Developer Mode is on** or the
process is **elevated**. There is no plugin option to disable it.

This is why the Netlify deploy step fails locally while the Firebase static
deploy succeeds — Firebase never touches symlinks.

## Enable Developer Mode (one time)

**Settings → Privacy & Security → For developers → Developer Mode → On**

Then rebuild and deploy:

```powershell
cd C:\Users\sebas\Desktop\Projects\tatoiq
npx prisma generate          # only needed if src/generated/prisma is missing
npm run deploy:netlify
```

Alternatively, without changing any setting, run the same command in an
**Administrator** PowerShell window.

## Verifying the agent is actually live

After a successful deploy, all three must answer 200:

```powershell
Invoke-WebRequest https://tatoiq.netlify.app/leads      -UseBasicParsing | Select StatusCode
Invoke-WebRequest https://tatoiq.netlify.app/api/leads  -UseBasicParsing | Select StatusCode
Invoke-WebRequest https://tatoiq.netlify.app/icon       -UseBasicParsing | Select StatusCode
```

A 404 on `/leads` means the **static export** was deployed instead of the
server build — check that `netlify.toml` at the repo root is being used and
that `@netlify/plugin-nextjs` ran.

## Data mode

`ALLOW_MOCK_AUTH=true` is set in `netlify.toml` because no identity provider is
wired up yet; without it every `/leads` request returns "Access denied" in a
production build.

With **no `DATABASE_URL`**, `src/lib/leads/repository.ts` serves deterministic
synthetic fixtures and the UI shows a "running without a database" badge. The
agent is fully demonstrable, but it is **not storing real leads**. Attach a
PostgreSQL connection string to make it persistent.

## Why not build in the cloud?

Netlify's own Linux builders have no symlink restriction, so connecting a Git
remote sidesteps this entirely. That is the better long-term setup and it is now
mostly wired up:

- The repo has a remote: `https://github.com/sebasa2510/tatoiq` (**private**).
- The Netlify site is linked to it (`master`), building with `npm run build`.
- A read-only deploy key `netlify-tatoiq-build` is registered on the repo.

**One step remains, and it can only be done in Netlify's UI.** The API accepts
`repo_url` but silently rejects a deploy key (`build_settings.deploy_key_id`
stays `null`), and a cloud build then fails with:

```
Failed during stage 'preparing repo': Unable to access repository.
Host key verification failed.
```

That message is Netlify saying it has no credential for the private repo. Fix it
by authorizing the GitHub account for Netlify once:

1. Open <https://app.netlify.com/projects/tatoiq/configuration/deploys>.
2. Under **Repository**, choose **Link repository** and authorize GitHub
   (this installs the Netlify GitHub App and grants it access to `tatoiq`).
3. Select `sebasa2510/tatoiq`, branch `master`, build `npm run build`.

From then on every push to `master` deploys automatically, on Linux, with no
symlink problem and nothing to run locally.

### If you would rather not connect GitHub

Run the elevated script instead — see "Enable Developer Mode" above. Either path
produces the same result; the cloud path also gives you CI on future pushes.

## CCO Triage Agent

The customer triage endpoint (`POST /api/cco/triage`) is a standalone Netlify
Function in `netlify/functions/cco-triage.mjs`. It uses Netlify Blobs, not
Firebase, and needs a server-side `OPENAI_API_KEY`. See `docs/CCO-TRIAGE.md`
for the request/response shapes, environment variables, security posture, and
verification steps.
