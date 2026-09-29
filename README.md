# .tato Agent System

This folder holds the configuration, memory, and skills that define how the .tato agent behaves.

## Structure

- **config/** — `skills.json`, the first-party registry that maps trigger phrases to skills. `repos.json`, the manifest of vendored third-party repos. `repo_skills.json`, generated index of vendored skills.
- **memory/** — `context.json`, persistent memory of sessions, history, and timestamps.
- **skills/** — system prompt files (.md), one per skill.
- **repos/** — third-party repos, tracked as git submodules pinned in `.gitmodules`. See `config/repos.json`.
- **scripts/** — maintenance scripts.

## Routing is two-tier

1. `config/skills.json` — 15 first-party skills. Always searched first.
2. `config/repo_skills.json` — 969 distinct skills from the 11 vendored repos, used when Tier 1 has no match.

`config/repo_skills.json` is generated. After adding or updating a repo, rebuild it:

```powershell
.\scripts\index-repo-skills.ps1
```

It scans `repos/` for `SKILL.md`, reads each file's frontmatter, collapses the per-agent packaging copies that vendored repos ship (one logical skill, many install paths), and skips test fixtures.

## Add a New Skill

1. Write the system prompt for the skill.
2. Save it as a `.md` file in the `skills/` folder.
3. Add an entry pointing to it in `config/skills.json` (name, description, trigger phrases, file path).

## Working with the Submodules

The 13 vendored repos under `repos/` are git submodules, pinned to exact commits. Their code is **not** copied into this repository — `.tato` stores only a commit pointer per repo, so the pushed history stays under 1 MB.

```powershell
git clone --recursive https://github.com/sebasa2510/.tatocreativehubclass.git
```

Already cloned without `--recursive`? Run `git submodule update --init --recursive`.

To move a pinned repo to a newer commit:

```powershell
git -C repos/<dir> fetch --depth 1 origin <branch>
git -C repos/<dir> checkout <sha>
.\scripts\index-repo-skills.ps1   # skill descriptions may have changed
```

## Add a Third-Party Repo

1. `git submodule add --depth 1 <url> repos/<dir>`
2. Add an entry to `config/repos.json` (dir, url, commit, description, skills found).
3. Rebuild the skill index: `.\scripts\index-repo-skills.ps1`

## Run a Skill in Antigravity IDE

Open the OpenCode tab, paste the skill's `.md` content into the system prompt field, and send your request. The agent will follow that prompt for the session.
