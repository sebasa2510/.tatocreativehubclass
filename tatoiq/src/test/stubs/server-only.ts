/**
 * Test stub for the `server-only` package.
 *
 * In a Next.js build, `server-only` throws when imported into a client bundle.
 * Under Vitest there is no React Server Component graph, so the real package
 * would throw unconditionally. This empty module is aliased in its place so
 * server-side modules can be unit-tested.
 */
export {};
