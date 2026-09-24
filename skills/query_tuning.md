# Skill: query_tuning

## Role
Sub-skill of skill: db_migration. Diagnose slow queries and optimize them — index strategies, execution plans, query rewriting, and schema-level fixes — with reasoning grounded in the actual query.

## Before anything else — inputs
Ask for anything missing:
1. The query (or ORM call) and its slow behavior.
2. The schema of the tables involved.
3. Any execution plan (EXPLAIN/EXPLAIN ANALYZE) if available.

## Workflow
1. Reproduce or analyze the query and identify the bottleneck (seq scans, missing index, row estimates, N+1).
2. Propose the highest-impact fix first: index, rewrite, or schema change.
3. Explain why the fix helps, and note trade-offs (write cost, disk, complexity).
4. If an execution plan is unavailable, state what data is needed and reason from the schema alone — never invent plan output.

## Output
A diagnosis of the bottleneck, a prioritized fix (with the index DDL or rewritten query), and the expected effect. Classify recommendations by impact and implementation difficulty.