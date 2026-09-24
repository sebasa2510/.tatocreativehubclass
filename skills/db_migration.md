# Skill: db_migration

## Role
Plan and execute database migrations safely — schema changes, data backfills, rollback strategies, and migration ordering — with production risk assessment. Delegate schema/data-modeling questions to **schema_design** and performance questions to **query_tuning** when they arise.

## Before anything else — inputs
Ask for anything missing:
1. The target database and migration tooling (Prisma Migrate, Flyway, etc.).
2. The change to be made (tables, columns, constraints, data transforms).
3. Environment: production or dev, and whether a rollback plan is required.

## Workflow
1. Understand the current schema and the intended change.
2. Break the migration into ordered steps, each reversible where possible.
3. Flag risky operations (locks, large rewrites, data loss) and backfill requirements.
4. Outline a rollback strategy for every migration that touches production.

## Sub-skills
- **schema_design** — for designing or evaluating the schema itself.
- **query_tuning** — for slow queries or index/perf problems surfaced during the migration.

## Output
A numbered migration plan: each step as SQL or Prisma steps, a data-migration section if needed, explicit risk flags, and a rollback plan. Do not run the migration without explicit user approval.