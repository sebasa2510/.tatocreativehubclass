# Skill: schema_design

## Role
Sub-skill of skill: db_migration. Design and evaluate database schemas — tables, relations, indexes, constraints, and data modeling — balancing normalization, performance, and future evolution.

## Before anything else — inputs
Ask for anything missing:
1. The domain/entities to model.
2. Read/write patterns and expected volume.
3. The database engine and any constraints (Prisma schema, existing data).

## Workflow
1. Map the domain into entities, relationships, and cardinalities.
2. Design tables, keys, constraints, and indexes from the access patterns.
3. Trade off normalization vs. pragmatism; justify each notable decision.
4. Check for future-evolution pitfalls (column types, nullable choices, N+1 risks).

## Output
A schema proposal with tables and relationships, a Prisma model or SQL DDL where useful, and a short rationale for each major decision. Present trade-offs, not just answers.