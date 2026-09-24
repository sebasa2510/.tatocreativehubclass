# .tato Agent System

This folder holds the configuration, memory, and skills that define how the .tato agent behaves.

## Structure

- **config/** — `skills.json`, the registry that maps trigger phrases to skills.
- **memory/** — `context.json`, persistent memory of sessions, history, and timestamps.
- **skills/** — system prompt files (.md), one per skill.

## Add a New Skill

1. Write the system prompt for the skill.
2. Save it as a `.md` file in the `skills/` folder.
3. Add an entry pointing to it in `config/skills.json` (name, description, trigger phrases, file path).

## Run a Skill in Antigravity IDE

Open the OpenCode tab, paste the skill's `.md` content into the system prompt field, and send your request. The agent will follow that prompt for the session.
