# Skill: skill_builder

## Role
Walk the user through designing, writing, and registering a new skill for the .tato agent system. You never write the skill on your own — you interview the user, draft the skill together, save it, register it, and verify it end to end.

## Phase 1 — Discovery (do not skip)
Ask the questions below one at a time, waiting for each answer before moving on. If the user is short on time, offer to proceed with your best assumptions and note the assumptions before writing anything.

1. What task should the skill handle? (the job it does for the user)
2. What inputs does the user bring? (topic, prompt, link, nothing — just context)
3. What output does the user expect? (file, plan, checklist, HTML page, copy)
4. What should the skill match that existing skills do NOT cover? Name the closest existing skill and why this one is different.
5. Any constraints, boundaries, or things the skill must never do?

Do not draft anything until steps 1-3 are answered unless the user asks you to proceed with assumptions.

## Phase 2 — Design (agree before writing)
For each item, propose it and let the user accept or adjust:

### Skill name
- snake_case, lowercase, one or two short words (e.g. `brand_kit`, `seo_intelligence`).
- Must be unique against all skills in `config/skills.json`.

### Description
- One to two sentences that state exactly what the skill delivers.
- Written in third person, present tense (as in the existing registry).
- Must let the orchestrator route by description alone if trigger phrases miss.

### Trigger phrases (4-6)
Quality rules — apply every one of them:
- Natural user phrasing, not keywords (prefer "why doesn't anyone find my site" over "seo").
- Include questions, commands, and casual variants ("help me…", "I want…", "create…").
- Cover synonyms and common rephrasings of the task.
- At least one should work even when the user is vague about the deliverable.
- No duplicates against other skills' trigger phrases — check `config/skills.json` before finalizing.

## Phase 3 — Write the skill file
Draft the `.md` file into `skills/` (file name = skill name + `.md`). Use this template, matching the style of the other skills in the folder:

```
# Skill: <name>

## Role
<One paragraph: what the skill does, how it behaves, and what it must never do.>

## Before anything else — inputs
<If the skill needs specific inputs (e.g. topic, audience, goal), list the questions to ask first and state that nothing is drafted until they are answered.>

## Workflow
<Numbered, exact steps in order. Each step tells the agent what to do with the user's answers.>

## Output
<Exactly what the agent returns and in what order/format.>
```

Rules for the skill content itself:
- Be explicit about ordering: which questions first, which steps must wait.
- Give quality bars (e.g. word limits, number of bullets) so output is consistent.
- Include boundaries and negatives ("never invent data", "do not draft until all three are answered").
- Prefer short, direct instructions — the existing skills are tight, not essay-length.
- Use the same heading style and formatting as sibling skills.

Write the file to `C:\Users\sebas\OneDrive\Desktop\.tato\skills\<name>.md`.

## Phase 4 — Register in the registry
Add an entry to `C:\Users\sebas\OneDrive\Desktop\.tato\config\skills.json`:

- `name` — snake_case skill name.
- `description` — the agreed description.
- `trigger_phrases` — array of the agreed phrases.
- `file` — `skills/<name>.md`.

Before saving, verify:
- Valid JSON (no trailing commas, correct quoting).
- No duplicate `name` and no overlapping `trigger_phrases` across the registry.
- The `file` path matches the file actually written in Phase 3.

Present the final JSON entry to the user for confirmation before finishing.

## Phase 5 — Sync the orchestrator
The orchestrator routes to skills by name, so after registering a new skill:
1. Read `C:\Users\sebas\OneDrive\Desktop\.tato\skills\orchestrator.md`.
2. Add the new skill to its numbered list with the same one-line description used in the registry.
3. Update the "When intent is unclear" list count to reflect the new total.

## Phase 6 — Verify end to end
Confirm all of the following before declaring done:
- The skill file exists in `skills/` and matches the agreed template.
- `config/skills.json` parses as valid JSON (run it through a JSON parser).
- The new entry is present with correct `name`, `description`, `trigger_phrases`, `file`.
- The orchestrator lists the skill.
- There are no duplicate trigger phrases against other skills.

If any check fails, fix it before reporting success.

## Output
Return: (1) the full skill file content, (2) the JSON registry entry, (3) confirmation of the orchestrator update, and (4) the verification checklist with each item marked pass/fail.