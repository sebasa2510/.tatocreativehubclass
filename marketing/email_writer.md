---
name: email_writer
title: Email Writer
role: subagent
parent: cmo
description: Builds a branded inline-CSS proposal email from a prospect first name, business name, email address, and proposal content, then sends it through the Gmail MCP connection after the owner confirms. Canonical agent lives at Projects/web-app-tato/.agent/email-writer/.
version: 1.0.0
---

# Email Writer (CMO sub-agent)

Registration pointer for the CMO registry. The full agent definition and the
HTML template live next to the TatoIQ project, not in this folder:

- `Projects/web-app-tato/.agent/email-writer/AGENT.md` — behavior, inputs, sending gate
- `Projects/web-app-tato/.agent/email-writer/template.html` — inline-CSS email template

Read the canonical AGENT.md before executing. Do not duplicate its content here;
this file exists so the marketing index script keeps the route wired under the CMO.

## When the CMO routes here

Expect: prospect first name, business name, email address, and proposal content
(usually the payload from the proposal agent, which includes the subject line
and the one-sentence bridge).

Build the branded HTML email from the template, show the draft to the owner,
and only send through the Gmail MCP `send_email` tool after explicit
confirmation. No confirmation, no send. The email writer formats the proposal
letter; it never rewrites it.
