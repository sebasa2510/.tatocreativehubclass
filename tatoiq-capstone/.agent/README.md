# .agent — the AI OS contract

This folder is the app's connection to the AI OS. Skills are plain Markdown, so
they are reviewable in a diff and usable by both the coding agent and the running
service.

```
.agent/
├── README.md
└── skills/
    ├── contact-triage.md   ← loaded at runtime by backend/triage.py
    ├── security-review.md  ← read by the coding agent before a release
    └── deploy-check.md     ← read by the coding agent before `firebase deploy`
```

## Format

Every skill starts with frontmatter and then the instruction body:

```markdown
---
name: skill-name
description: One line, shown by GET /api/skills.
---
Instructions the agent follows.
```

## How the app calls a skill

`backend/triage.py` calls `load_skill("contact-triage")` and sends that body as
the system prompt for every classification. There is exactly one copy of the
triage instructions. Editing the skill changes the agent's behaviour; editing
`triage.py` does not duplicate the prompt.

`GET /api/skills` lists what the service can see, so you can confirm the AI OS
folder is wired up before a demo.

## How the coding agent calls a skill

- Before changing the contact pipeline, read `skills/contact-triage.md`.
- Before a deploy, read `skills/security-review.md` and `skills/deploy-check.md`
  and tick `SECURITY.md`.
- If your AI OS uses a different root, point it at this folder; do not copy the
  skills elsewhere, or the runtime and the agent will drift.
