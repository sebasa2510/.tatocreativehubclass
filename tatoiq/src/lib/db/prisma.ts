import 'server-only';

import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@/generated/prisma/client';

/**
 * prisma.ts — the ONE Prisma client for the app.
 *
 * Prisma 7 requires a driver adapter (no bundled query engine). The client is
 * lazy: if DATABASE_URL is missing, or the database is unreachable, callers get
 * `null` and fall back to mock data rather than crashing (spec: safe interface +
 * mock mode, never simulate success).
 *
 * Soft delete: a client extension appends `deletedAt: null` to every Lead read,
 * so soft-deleted leads are invisible unless explicitly requested.
 */

type GlobalWithPrisma = typeof globalThis & {
  __tatoiqPrismaBase?: PrismaClient;
  __tatoiqPrismaExtended?: PrismaClient;
  __tatoiqPrismaProbe?: Promise<boolean>;
};

const globalForPrisma = globalThis as GlobalWithPrisma;

export function isDatabaseConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

function buildExtendedClient(): PrismaClient | null {
  if (!isDatabaseConfigured()) return null;
  if (globalForPrisma.__tatoiqPrismaExtended) return globalForPrisma.__tatoiqPrismaExtended;

  const connectionString = process.env.DATABASE_URL as string;
  const adapter = new PrismaPg({ connectionString });
  const base = new PrismaClient({ adapter });
  globalForPrisma.__tatoiqPrismaBase = base;

  const extended = base.$extends({
    name: 'soft-delete-lead',
    query: {
      lead: {
        async findMany({ args, query }) {
          args.where = { deletedAt: null, ...args.where };
          return query(args);
        },
        async findFirst({ args, query }) {
          args.where = { deletedAt: null, ...args.where };
          return query(args);
        },
        async count({ args, query }) {
          args.where = { deletedAt: null, ...args.where };
          return query(args);
        },
      },
    },
  });

  globalForPrisma.__tatoiqPrismaExtended = extended as unknown as PrismaClient;
  return globalForPrisma.__tatoiqPrismaExtended;
}

async function probe(): Promise<boolean> {
  if (!globalForPrisma.__tatoiqPrismaProbe) {
    globalForPrisma.__tatoiqPrismaProbe = (async () => {
      const client = buildExtendedClient();
      if (!client) return false;
      try {
        await Promise.race([
          client.$queryRaw`SELECT 1`,
          new Promise((_, reject) => setTimeout(() => reject(new Error('db probe timeout')), 2500)),
        ]);
        return true;
      } catch {
        return false;
      }
    })();
  }
  return globalForPrisma.__tatoiqPrismaProbe;
}

/**
 * Return a live Prisma client, or null when the DB is not configured/reachable.
 * Callers must handle null with a mock/fallback path.
 */
export async function getDb(): Promise<PrismaClient | null> {
  const client = buildExtendedClient();
  if (!client) return null;
  return (await probe()) ? client : null;
}

/** Whether a live DB is currently usable (cached probe). */
export async function isDatabaseReachable(): Promise<boolean> {
  return probe();
}
