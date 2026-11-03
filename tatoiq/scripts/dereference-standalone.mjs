/**
 * dereference-standalone.mjs — replace the junctions Next.js leaves in
 * `.next/standalone` with real directories, so the Netlify plugin can copy them.
 *
 * THE PROBLEM
 * `netlify deploy --build` on Windows aborts with:
 *
 *   EPERM: operation not permitted, symlink
 *     '...\.next\standalone\node_modules\@prisma\client'
 *     -> '...\___netlify-server-handler\.next\node_modules\@prisma\client-<hash>'
 *     at async copyNextServerCode (.../plugin-nextjs/dist/build/content/server.js)
 *
 * Next's output tracing stores hoisted packages in `.next/standalone` as
 * *junctions* — on this project `@prisma/client` and `pg` — pointing at their
 * real location. When `@netlify/plugin-nextjs` copies that tree into the server
 * handler, Node's `fs.cp` recreates each link by calling `symlink()`.
 *
 * Windows permits `symlink()` only to an elevated process or with Developer Mode
 * enabled, so the copy throws EPERM and the entire build fails. Crucially,
 * `verbatimSymlinks: false` does NOT avoid this: Node still calls `symlink()`
 * when the link points at a directory, which is exactly the case here. Tested
 * both values; both fail.
 *
 * Windows *junctions* do not require elevation. Since they are already present
 * in the source tree, the fix is to resolve them into ordinary directories
 * before the plugin runs. `fs.cp` then finds nothing to link and succeeds.
 *
 * This runs only on Windows, and only when the junctions are present, so it does
 * nothing on Netlify's Linux builders (which create real symlinks and permit
 * them) and nothing on a build that has no traced dependencies.
 */

import { cp, lstat, mkdir, readdir, readlink, rm, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));

/** Where Next writes the self-contained server, relative to the repo root. */
const STANDALONE = join(root, '.next', 'standalone');

/**
 * Find every junction or symlink beneath `dir`.
 *
 * Depth-first and iterative so a deep node_modules tree cannot overflow the
 * stack, and so nested links are discovered after their parents are resolved.
 */
async function findLinks(dir, found = []) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return found;
  }

  for (const entry of entries) {
    const full = join(dir, entry.name);
    let info;
    try {
      info = await lstat(full);
    } catch {
      continue;
    }

    if (info.isSymbolicLink()) {
      found.push(full);
      continue; // do not descend into a link; it is replaced wholesale
    }

    if (info.isDirectory()) await findLinks(full, found);
  }

  return found;
}

/**
 * Replace one junction with a real copy of its target.
 *
 * The link is removed only after the copy succeeds, so a failure leaves the tree
 * exactly as it was rather than half-converted.
 */
async function dereference(link) {
  const target = await readlink(link);

  // A junction stores an absolute target; a relative symlink is resolved against
  // the directory holding the link.
  const resolved = target.startsWith(root)
    ? target
    : join(dirname(link), target);

  if (!existsSync(resolved)) return false;

  const stats = await stat(resolved);
  if (!stats.isDirectory()) return false;

  const temp = `${link}.deref`;
  await rm(temp, { recursive: true, force: true });
  await cp(resolved, temp, { recursive: true, force: true });

  await rm(link, { recursive: true, force: true });
  await mkdir(dirname(link), { recursive: true });
  await cp(temp, link, { recursive: true, force: true });
  await rm(temp, { recursive: true, force: true });

  return true;
}

export async function dereferenceStandalone({ quiet = false } = {}) {
  const log = (message) => {
    if (!quiet) console.log(`[dereference-standalone] ${message}`);
  };

  // Junctions are a Windows concern; Linux builds already work and their
  // symlinks are meaningful to keep.
  if (process.platform !== 'win32') {
    log('not Windows; nothing to do');
    return 0;
  }

  if (!existsSync(STANDALONE)) {
    log('no .next/standalone; nothing to do');
    return 0;
  }

  const links = await findLinks(STANDALONE);
  if (links.length === 0) {
    log('no links found; nothing to do');
    return 0;
  }

  let resolved = 0;
  for (const link of links) {
    try {
      if (await dereference(link)) {
        resolved += 1;
        log(`resolved ${link.replace(root, '')}`);
      }
    } catch (error) {
      log(`could not resolve ${link.replace(root, '')}: ${error.message}`);
    }
  }

  log(`resolved ${resolved} of ${links.length} link(s)`);
  return resolved;
}

// Run when invoked directly; importing for a test must have no side effect.
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  await dereferenceStandalone();
}
