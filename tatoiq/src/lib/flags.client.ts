/**
 * flags.client.ts — CLIENT-SAFE feature flags.
 *
 * `src/lib/flags.ts` imports `server-only`, so a client component cannot read
 * it (the app shell is one). This module exposes only the fact a client
 * component legitimately needs.
 *
 * IMPORTANT — do not read `process.env` here directly.
 * Reading it in a client module produces a RUNTIME lookup that resolves to
 * `undefined` in the browser bundle, which silently defeated this flag once
 * already (the Leads nav entry kept rendering on the static export). The value
 * is instead substituted as a compile-time literal by the `env` block in
 * next.config.ts, which is read in Node at build time.
 *
 * A static export and a server build ship DIFFERENT route sets: the export
 * parks /leads and /api/leads, so a nav entry pointing at them is a guaranteed
 * 404. The nav must be baked for the deployment it belongs to.
 */

/**
 * Whether the bundle this code was compiled into can serve /leads and the
 * /api/leads routes. Replaced with "true"/"false" at build time.
 */
const RAW: string = process.env.NEXT_PUBLIC_LEADS_ROUTE_AVAILABLE ?? "true";

export const leadsRouteAvailable: boolean = ["1", "true", "yes", "on"].includes(
  RAW.trim().toLowerCase(),
);

/**
 * Whether this bundle can serve the authenticated portal. The static export
 * parks `(app)` and `(auth)`, so /dashboard and /login would be 404s there.
 * Marketing should hide those links instead of shipping dead ends.
 */
const PORTAL_RAW: string = process.env.NEXT_PUBLIC_PORTAL_ROUTE_AVAILABLE ?? "true";

export const portalRouteAvailable: boolean = ["1", "true", "yes", "on"].includes(
  PORTAL_RAW.trim().toLowerCase(),
);
