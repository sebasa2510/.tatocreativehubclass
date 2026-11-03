import 'dotenv/config';

import { PrismaPg } from '@prisma/adapter-pg';

import { PrismaClient } from '../src/generated/prisma/client';
import { buildSyntheticProfile, profileToListItem } from '../src/lib/leads/sample-data';

/**
 * seed.ts — reset + reseed the lead pipeline with 50 DETERMINISTIC synthetic
 * profiles (spec: "write a command-line script to reset with edge-case records
 * for each grade"). Every row is `isSample: true` so it can never receive real
 * outreach.
 *
 * Usage: DATABASE_URL=... npm run db:seed
 * This script only touches rows it created (isSample: true) — real leads are
 * never deleted.
 */

const ORGANIZATION_ID = process.env.DEFAULT_ORGANIZATION_ID ?? 'org_demo';
const PROFILE_COUNT = Number.parseInt(process.env.SEED_LEAD_COUNT ?? '50', 10);

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error(
      'DATABASE_URL is not set. Nothing to seed — the app runs in mock mode without a database.',
    );
    process.exitCode = 1;
    return;
  }

  const adapter = new PrismaPg({ connectionString });
  const prisma = new PrismaClient({ adapter });

  try {
    await prisma.organization.upsert({
      where: { id: ORGANIZATION_ID },
      update: {},
      create: { id: ORGANIZATION_ID, name: 'TatoIQ Demo Organization' },
    });

    // Idempotent: clear ONLY previously-seeded synthetic fixtures.
    const removed = await prisma.lead.deleteMany({
      where: { organizationId: ORGANIZATION_ID, isSample: true },
    });

    let created = 0;
    for (let i = 0; i < PROFILE_COUNT; i += 1) {
      const profile = buildSyntheticProfile(i);
      const item = profileToListItem(profile);

      await prisma.lead.create({
        data: {
          id: profile.id,
          organizationId: ORGANIZATION_ID,
          sourceTag: profile.sourceTag,
          businessName: profile.businessName,
          contactName: profile.contactName,
          email: profile.email,
          phone: profile.phone,
          state: profile.state,
          industry: profile.industry,
          entityType: profile.entityType,
          verifiedEmail: profile.verification.email,
          verifiedPhone: profile.verification.phone,
          verifiedBusiness: profile.verification.business,
          verifiedAddress: profile.verification.address,
          grade: item.grade ?? undefined,
          score: item.score ?? undefined,
          confidence: item.confidence ?? undefined,
          gradedAt: item.gradedAt ? new Date(item.gradedAt) : undefined,
          stage: item.stage,
          consentStatus: profile.consentStatus,
          doNotContact: profile.doNotContact,
          isSample: true,
          createdAt: new Date(profile.createdAt),
          lastActivityAt: new Date(profile.createdAt),
        },
      });
      created += 1;
    }

    console.log(
      `Seeded ${created} synthetic sample leads (isSample: true) into ${ORGANIZATION_ID}. Removed ${removed.count} prior fixtures.`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error('Seed failed:', error);
  process.exitCode = 1;
});
