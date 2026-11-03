"""Read skills from the .agent/ folder (the AI OS contract).

A skill is a Markdown file with a small frontmatter block:

    ---
    name: contact-triage
    description: One line shown in the skills list.
    ---
    ...instructions...

The body is what the triage service sends to the model. Keeping the prompt in
.agent/ means the same text is reviewable by the coding agent and by a person,
and there is exactly one copy of it.
"""

from __future__ import annotations

from pathlib import Path

SKILLS_DIR = Path(__file__).resolve().parent.parent / ".agent" / "skills"


def _split_frontmatter(text: str) -> tuple[dict[str, str], str]:
    if not text.startswith("---"):
        return {}, text.strip()

    parts = text.split("---", 2)
    if len(parts) < 3:
        return {}, text.strip()

    meta: dict[str, str] = {}
    for line in parts[1].strip().splitlines():
        if ":" not in line:
            continue
        key, value = line.split(":", 1)
        meta[key.strip().lower()] = value.strip()
    return meta, parts[2].strip()


def list_skills() -> list[dict[str, str]]:
    if not SKILLS_DIR.is_dir():
        return []

    found = []
    for path in sorted(SKILLS_DIR.glob("*.md")):
        meta, _ = _split_frontmatter(path.read_text(encoding="utf-8"))
        found.append(
            {
                "name": meta.get("name", path.stem),
                "description": meta.get("description", ""),
                "file": f".agent/skills/{path.name}",
            }
        )
    return found


def load_skill(name: str) -> str | None:
    """Return the instruction body for a skill, or None when it is absent."""
    if not name or "/" in name or "\\" in name or ".." in name:
        return None

    path = SKILLS_DIR / f"{name}.md"
    if not path.is_file():
        return None

    _, body = _split_frontmatter(path.read_text(encoding="utf-8"))
    return body or None
