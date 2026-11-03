/**
 * export-site.mjs — build the static site for Firebase Hosting.
 *
 * WHY THIS EXISTS
 * The lead-generation feature owns API routes that need a Node runtime
 * (/api/leads/*, /api/outreach/*, /api/webhooks/*, /api/unsubscribe). Next.js
 * cannot produce an `output: export` bundle while those routes exist, so a
 * plain `NEXT_OUTPUT=export next build` fails.
 *
 * WHAT IT DOES
 * It temporarily moves those route groups out of `src/app/api` into
 * `.export-park/`, runs the export build, then moves them straight back.
 * The files are never deleted and never modified. A `finally` block plus
 * process signal handlers guarantee the restore even if the build crashes.
 *
 * `/api/assistant` is deliberately left in place: it builds harmlessly as a
 * route that the static host will not serve, and the client falls back to the
 * offline Saggio core (or to the optional Firebase function).
 *
 * USAGE
 *   node scripts/export-site.mjs        # build only
 *   node scripts/export-site.mjs --deploy   # build then deploy to Firebase
 */

import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, renameSync, rmSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const apiDir = path.join(root, 'src', 'app', 'api');
const parkDir = path.join(root, '.export-park');

/** Route groups under src/app/api that cannot exist in a static export. */
const SERVER_ONLY_API = ['leads', 'outreach', 'webhooks', 'unsubscribe'];

/**
 * Page routes that are server-only (dynamic params + Prisma). Same treatment:
 * parked for the export build, restored afterwards.
 *
 * The whole `(app)` group is parked below, so the dynamic `/leads` page is
 * covered by that move. Keeping an entry here would try to restore it into a
 * directory that no longer exists.
 */
const SERVER_ONLY_PAGES = [];

/**
 * Route groups that use features a static export does not support.
 *
 * `(auth)` holds /login, which reads `cookies()` and submits a Server Action.
 * `(app)` is the authenticated portal: its layout calls `getSession()`, marks
 * itself `force-dynamic`, and AppShell imports the `signOut` Server Action.
 * Static export supports none of those, so both groups are parked for the
 * Firebase marketing mirror and restored immediately after the build.
 */
const SERVER_ONLY_GROUPS = ['(auth)', '(app)'];

/**
 * Tests that import the parked routes. They test server-only behaviour and
 * cannot typecheck while those routes are away, so they are parked too.
 */
const SERVER_ONLY_TESTS = ['outreach-dispatch.test.ts'];

/**
 * The static mirror has no API routes, so the contact form cannot triage on its
 * own origin. It posts to the Netlify function instead. Callers can override
 * this with NEXT_PUBLIC_CONTACT_TRIAGE_URL, but the default keeps
 * `npm run build:site` correct without extra setup.
 */
const DEFAULT_CONTACT_TRIAGE_URL = 'https://tatoiq.netlify.app/api/contacts/triage';

const shouldDeploy = process.argv.includes('--deploy');
const moved = [];
const movedPages = [];
const movedTests = [];
const movedGroups = [];

function park() {
  if (existsSync(apiDir)) {
    mkdirSync(parkDir, { recursive: true });
    for (const name of SERVER_ONLY_API) {
      const from = path.join(apiDir, name);
      if (!existsSync(from)) continue;
      const to = path.join(parkDir, 'api', name);
      if (existsSync(to)) {
        throw new Error(`Refusing to overwrite an existing parked route: ${to}`);
      }
      mkdirSync(path.dirname(to), { recursive: true });
      renameSync(from, to);
      moved.push(name);
    }
  }

  const appGroup = path.join(root, 'src', 'app', '(app)');
  for (const name of SERVER_ONLY_PAGES) {
    const from = path.join(appGroup, name);
    if (!existsSync(from)) continue;
    const to = path.join(parkDir, 'pages', name);
    if (existsSync(to)) {
      throw new Error(`Refusing to overwrite an existing parked page: ${to}`);
    }
    mkdirSync(path.dirname(to), { recursive: true });
    renameSync(from, to);
    movedPages.push(name);
  }

  for (const name of SERVER_ONLY_GROUPS) {
    const from = path.join(root, 'src', 'app', name);
    if (!existsSync(from)) continue;
    const to = path.join(parkDir, 'groups', name);
    if (existsSync(to)) {
      throw new Error(`Refusing to overwrite an existing parked group: ${to}`);
    }
    mkdirSync(path.dirname(to), { recursive: true });
    renameSync(from, to);
    movedGroups.push(name);
  }

  const testDir = path.join(root, 'src', 'test');
  if (existsSync(testDir)) {
    for (const name of SERVER_ONLY_TESTS) {
      const from = path.join(testDir, name);
      if (!existsSync(from)) continue;
      const to = path.join(parkDir, 'test', name);
      if (existsSync(to)) {
        throw new Error(`Refusing to overwrite an existing parked test: ${to}`);
      }
      mkdirSync(path.dirname(to), { recursive: true });
      renameSync(from, to);
      movedTests.push(name);
    }
  }

  const all = [...moved, ...movedPages, ...movedGroups, ...movedTests];
  if (all.length) {
    console.log(`[export-site] parked server-only files: ${all.join(', ')}`);
  } else {
    console.log('[export-site] no server-only files to park.');
  }
}

function restoreOne(from, to) {
  if (!existsSync(from)) return;
  if (existsSync(to)) {
    console.error(`[export-site] WARNING: ${to} already exists; leaving the copy in .export-park`);
    return;
  }
  mkdirSync(path.dirname(to), { recursive: true });
  renameSync(from, to);
}

function restore() {
  for (const name of moved) {
    restoreOne(path.join(parkDir, 'api', name), path.join(apiDir, name));
  }
  for (const name of movedPages) {
    restoreOne(
      path.join(parkDir, 'pages', name),
      path.join(root, 'src', 'app', '(app)', name),
    );
  }
  for (const name of movedGroups) {
    restoreOne(
      path.join(parkDir, 'groups', name),
      path.join(root, 'src', 'app', name),
    );
  }
  for (const name of movedTests) {
    restoreOne(path.join(parkDir, 'test', name), path.join(root, 'src', 'test', name));
  }
  // Remove the park directory once everything is back (it may contain empty
  // directories even when every file has been restored).
  try {
    if (existsSync(parkDir)) {
      const leftovers = readdirSync(parkDir, { recursive: true });
      if (leftovers.length === 0) rmSync(parkDir, { recursive: true, force: true });
    }
  } catch {
    /* best effort */
  }
  if (moved.length || movedPages.length || movedGroups.length || movedTests.length) {
    console.log('[export-site] restored server-only files.');
  }
}

let restored = false;
function safeRestore() {
  if (restored) return;
  restored = true;
  restore();
}

process.on('SIGINT', () => {
  safeRestore();
  process.exit(130);
});
process.on('SIGTERM', () => {
  safeRestore();
  process.exit(143);
});

function run(command, args, env) {
  return spawnSync(command, args, {
    cwd: root,
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: env ? { ...process.env, ...env } : process.env,
  });
}

let exitCode = 1;
try {
  park();

  // NEXT_OUTPUT=export is what turns on `output: 'export'` in next.config.ts.
  // Without it this script produced a normal server build and left a stale
  // ./out from an earlier manual export — the site looked deployed but the
  // bundle did not match the source.
  //
  // NEXT_PUBLIC_LEADS_ROUTE_AVAILABLE=false tells the app shell that /leads and
  // its API do NOT exist in this bundle (they are parked below), so it omits
  // the nav entry instead of linking to a 404. A server build leaves it unset
  // and therefore true.
  const build = run('npx', ['next', 'build'], {
    NEXT_OUTPUT: 'export',
    NEXT_PUBLIC_LEADS_ROUTE_AVAILABLE: 'false',
    NEXT_PUBLIC_CONTACT_TRIAGE_URL:
      process.env.NEXT_PUBLIC_CONTACT_TRIAGE_URL || DEFAULT_CONTACT_TRIAGE_URL,
  });
  if (build.status !== 0) {
    console.error('[export-site] build failed.');
    exitCode = build.status ?? 1;
  } else if (shouldDeploy) {
    const deploy = run('firebase', ['deploy', '--only', 'hosting']);
    exitCode = deploy.status ?? 1;
  } else {
    console.log('[export-site] build complete. Output is in ./out');
    exitCode = 0;
  }
} finally {
  safeRestore();
}

process.exit(exitCode);
