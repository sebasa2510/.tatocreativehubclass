import type { NextConfig } from "next";

const isStaticExport = process.env.NEXT_OUTPUT === "export";

/**
 * Whether the bundle being built can serve /leads and /api/leads.
 *
 * Read HERE (build time, in Node) rather than in the client, because the value
 * must be inlined into the client bundle. Reading process.env directly in a
 * client module produced a runtime lookup that resolved to undefined in the
 * browser, so the nav entry never disappeared. next.config's `env` block is
 * substituted as a literal at compile time.
 *
 * scripts/export-site.mjs sets this to "false" for the static export, where the
 * routes are parked. A server build leaves it unset, so it defaults to true.
 */
const leadsRouteAvailable =
  process.env.NEXT_PUBLIC_LEADS_ROUTE_AVAILABLE === undefined ||
  process.env.NEXT_PUBLIC_LEADS_ROUTE_AVAILABLE === ""
    ? "true"
    : process.env.NEXT_PUBLIC_LEADS_ROUTE_AVAILABLE;

/**
 * Whether this bundle includes the authenticated portal (`/dashboard`,
 * `/login`, etc.). The static export parks both route groups, so marketing
 * must not point at routes that will 404. A server build leaves this true.
 */
const portalRouteAvailable = isStaticExport ? "false" : "true";

/**
 * Whether the demo identity fallback may issue a mock session in a production
 * build (src/lib/auth/session.ts).
 *
 * Inlined at BUILD time for the same reason as the flag above, plus one more:
 * Netlify applies `[build.environment]` from netlify.toml to the BUILD, not to
 * the running serverless function. The function therefore saw the variable as
 * undefined and answered "Access denied" on every /leads request, even though
 * the build itself had it set. Baking the value in makes the deployed function
 * agree with the build that produced it.
 *
 * scripts/export-site.mjs deliberately leaves this unset for the static export,
 * where the /leads routes are parked and no session is ever resolved.
 */
const allowMockAuth =
  isStaticExport
    ? ""
    : process.env.ALLOW_MOCK_AUTH === undefined || process.env.ALLOW_MOCK_AUTH === ""
      ? ""
      : process.env.ALLOW_MOCK_AUTH;

const nextConfig: NextConfig = {
  // Static export is now OPT-IN (`NEXT_OUTPUT=export`).
  //
  // The lead-generation feature needs a server runtime: POST API routes
  // (/api/leads/*, /api/outreach/*, webhooks, /api/unsubscribe), live Prisma
  // access, and outbound dispatch. A static export cannot run any of those, so
  // the default build is a normal Next.js server build. Set NEXT_OUTPUT=export
  // if you specifically want a static-only bundle. The server-only route groups
  // are parked for the duration of that build by scripts/export-site.mjs, which
  // always restores them — they are never deleted.
  output: isStaticExport ? "export" : undefined,
  env: {
    // Substituted as a literal into the client bundle — see the note above.
    NEXT_PUBLIC_LEADS_ROUTE_AVAILABLE: leadsRouteAvailable,
    NEXT_PUBLIC_PORTAL_ROUTE_AVAILABLE: portalRouteAvailable,
    // Also substituted into the SERVER bundle, so the deployed function carries
    // the same value the build ran with. See the note above.
    ALLOW_MOCK_AUTH: allowMockAuth,
  },
  images: {
    unoptimized: true,
  },
  // `/api/assistant` is intentionally NOT parked: when a static export is
  // deployed alongside the optional Saggio function (functions/index.js), that
  // function serves the path; otherwise the browser falls back to the offline
  // knowledge base in src/lib/saggio/core.ts.
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  // Required for a real 404 page in the static export: `not-found.js` alone is
  // not emitted for unmatched URLs, `global-not-found.js` is. See
  // node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/not-found.md
  experimental: {
    globalNotFound: true,
  },
};

export default nextConfig;
