"""TatoIQ Python service: triage, replies, skills, and the owner review page.

Run locally:
    cd backend
    python -m venv .venv && .venv\\Scripts\\activate
    pip install -r requirements.txt
    uvicorn main:app --reload --port 8000

This service is the only place that reads OPENAI_API_KEY and the Firebase
service account. The browser never sees either.
"""

from __future__ import annotations

import html
import os
import secrets
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, JSONResponse
from pydantic import BaseModel

ROOT = Path(__file__).resolve().parent.parent
load_dotenv(ROOT / ".env")

from skills import list_skills  # noqa: E402 - after .env is loaded
from triage import PipelineError, list_contacts, process  # noqa: E402

DEFAULT_ORIGINS = [
    "http://localhost:5000",
    "http://localhost:8000",
    "https://web-app---tato.web.app",
]


def allowed_origins() -> list[str]:
    extra = os.environ.get("ALLOWED_ORIGINS", "")
    values = [*DEFAULT_ORIGINS, *extra.split(",")]
    return sorted({value.strip().rstrip("/") for value in values if value.strip()})


app = FastAPI(title="TatoIQ triage", version="1.0.0", docs_url=None, redoc_url=None)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins(),
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type"],
    max_age=600,
)


class TriageRequest(BaseModel):
    contact_id: str


@app.exception_handler(PipelineError)
async def pipeline_error_handler(_request: Request, exc: PipelineError) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status,
        content={"ok": False, "error": exc.code, "message": exc.message},
    )


@app.get("/health")
def health() -> dict:
    provider = os.environ.get("AI_PROVIDER", "").strip().lower()
    if not provider:
        if os.environ.get("GEMINI_API_KEY", "").strip():
            provider = "gemini"
        elif os.environ.get("OPENAI_API_KEY", "").strip():
            provider = "openai"
        else:
            provider = "gemini"
    key_name = "GEMINI_API_KEY" if provider == "gemini" else "OPENAI_API_KEY"

    return {
        "ok": True,
        "service": "tatoiq-triage",
        "provider": provider,
        "modelConfigured": bool(os.environ.get(key_name, "").strip()),
        "emailConfigured": bool(os.environ.get("RESEND_API_KEY", "").strip()),
        "reviewConfigured": bool(os.environ.get("TRIAGE_REVIEW_TOKEN", "").strip()),
    }


@app.get("/api/skills")
def skills() -> dict:
    """List the skills this service can load from .agent/skills."""
    return {"skills": list_skills()}


@app.post("/api/triage")
def triage(request: TriageRequest) -> dict:
    return process(request.contact_id.strip())


@app.get("/api/review")
def review(request: Request, token: str = "", format: str = "html"):
    expected = os.environ.get("TRIAGE_REVIEW_TOKEN", "").strip()
    if not expected:
        raise PipelineError(
            503,
            "review_not_configured",
            "Set TRIAGE_REVIEW_TOKEN on this service to enable the review page.",
        )
    if not token or not secrets.compare_digest(token, expected):
        raise PipelineError(404, "not_found", "Not found.")

    rows = list_contacts(100)

    if format == "json":
        return {
            "count": len(rows),
            "needsReview": sum(1 for row in rows if row["data"].get("needsReview")),
            "contacts": [
                {
                    "id": row["id"],
                    "createdAt": row["data"].get("createdAt"),
                    "name": row["data"].get("name"),
                    "email": row["data"].get("email"),
                    "triage": row["data"].get("triage"),
                    "needsReview": bool(row["data"].get("needsReview")),
                    "reviewReason": row["data"].get("reviewReason"),
                    "reply": row["data"].get("reply"),
                }
                for row in rows
            ],
        }

    return HTMLResponse(_review_html(rows))


def _review_html(rows: list[dict]) -> str:
    def esc(value) -> str:
        return html.escape(str(value if value is not None else ""))

    body_rows = []
    for row in rows:
        data = row["data"]
        triage = data.get("triage") or {}
        reply = data.get("reply") or {}
        needs = bool(data.get("needsReview"))
        body_rows.append(
            f"""
      <tr class="{'needs' if needs else ''}">
        <td>{esc(data.get('createdAt'))}</td>
        <td><strong>{esc(data.get('name'))}</strong><br /><span class="muted">{esc(data.get('email'))}</span></td>
        <td>{esc(triage.get('intent') or data.get('reviewReason') or 'No decision recorded')}</td>
        <td>{esc(triage.get('category'))} / urgency {esc(triage.get('urgency'))} / owner {esc(triage.get('owner'))}</td>
        <td>{esc(reply.get('kind') or '-')} / {esc(reply.get('status') or '-')}</td>
        <td>{esc(data.get('reviewReason') if needs else 'auto')}</td>
      </tr>"""
        )

    content = (
        "\n".join(body_rows)
        if body_rows
        else '<tr><td colspan="6" class="muted">No contact submissions yet.</td></tr>'
    )
    needs_count = sum(1 for row in rows if row["data"].get("needsReview"))

    return f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex, nofollow" />
<title>TatoIQ contact decisions</title>
<style>
  body {{ font: 14px/1.45 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 0; background: #f6f7f9; color: #14181f; }}
  header {{ background: #0f2740; color: #fff; padding: 20px 24px; }}
  header h1 {{ margin: 0 0 4px; font-size: 18px; }}
  header p {{ margin: 0; color: #b9c0cc; font-size: 13px; }}
  main {{ padding: 20px 24px 48px; overflow-x: auto; }}
  table {{ width: 100%; border-collapse: collapse; background: #fff; min-width: 900px; }}
  th, td {{ text-align: left; vertical-align: top; padding: 10px 12px; border-bottom: 1px solid #e6e9ee; }}
  th {{ font-size: 11px; text-transform: uppercase; letter-spacing: .04em; color: #6b7381; background: #fafbfc; }}
  tr.needs td {{ background: #fff8ec; }}
  .muted {{ color: #6b7381; font-size: 12px; }}
</style>
</head>
<body>
<header>
  <h1>TatoIQ contact decisions</h1>
  <p>{len(rows)} shown · {needs_count} need a human read</p>
</header>
<main>
<table>
  <thead><tr><th>When</th><th>Who</th><th>What they want</th><th>Decision</th><th>Reply</th><th>Review</th></tr></thead>
  <tbody>{content}</tbody>
</table>
</main>
</body>
</html>"""


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="127.0.0.1", port=int(os.environ.get("PORT", "8000")), reload=True)
