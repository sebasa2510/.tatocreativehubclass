"""TatoIQ triage pipeline (server side).

The browser saves the contact submission to Firestore. This module reads that
record, redacts identifiers, asks the model to classify it, applies a fixed
decision table, writes the decision back, and sends one fixed reply.

The model never writes reply text and never chooses the owner. If the model is
unavailable, the record still gets a plain thank-you and a review flag; a
failure never turns into a guess.
"""

from __future__ import annotations

import html
import json
import logging
import os
import re
from datetime import datetime, timedelta, timezone
from typing import Any

import firebase_admin
import httpx
from firebase_admin import credentials, firestore

from skills import load_skill

log = logging.getLogger("tatoiq.triage")

MAX_AGE = timedelta(minutes=15)
MAX_MESSAGE_CHARS = 4000
DEFAULT_MODEL = "gpt-4o-mini"

CATEGORIES = (
    "new_business",
    "support",
    "billing_or_money",
    "partnership_or_press",
    "spam",
    "unclear",
)
URGENCIES = ("high", "medium", "low")

CATEGORY_OWNER = {
    "new_business": "cso",
    "support": "cco",
    "billing_or_money": "owner",
    "partnership_or_press": "cmo",
    "spam": "cco",
    "unclear": "owner",
}

REVIEW_REASON = {
    "triage_unavailable": "triage_unavailable",
    "triage_unclear": "triage_unclear",
    "money_owner": "money_owner",
    "partnership": "no_reply_policy_partnership",
    "support_unknown": "support_from_unknown_sender",
    "reply_failed": "reply_failed",
    "email_not_configured": "email_not_configured",
}

CONTACT_ID_RE = re.compile(r"^[A-Za-z0-9]{10,40}$")

REDACTIONS = (
    (re.compile(r"\b\d{3}-\d{2}-\d{4}\b"), "[redacted-ssn]"),
    (re.compile(r"\b\d{2}-\d{7}\b"), "[redacted-ein]"),
    (re.compile(r"\b(?:\d[ -]*?){13,19}\b"), "[redacted-card]"),
    (re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b"), "[redacted-email]"),
    (re.compile(r"\b(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b"), "[redacted-phone]"),
)

FALLBACK_SYSTEM = """You are the Triage Agent for TatoIQ, a Miami tax preparation company.
Read one inbound contact-form message and record what it means. Never reply to
the customer, never send anything, and never decide pricing, refunds, or account
access. Answer with JSON only:
{"intent_one_line": "...", "category": "new_business|support|billing_or_money|partnership_or_press|spam|unclear",
 "urgency": "high|medium|low", "urgency_why": "...",
 "human_required_before_reply": true|false, "human_required_why": "..."}
Anything about money must set human_required_before_reply to true."""


class PipelineError(Exception):
    def __init__(self, status: int, code: str, message: str):
        super().__init__(message)
        self.status = status
        self.code = code
        self.message = message


class TriageUnavailable(Exception):
    def __init__(self, code: str):
        super().__init__(code)
        self.code = code


# ── Firestore ────────────────────────────────────────────────────────────────

_db = None


def get_db():
    """Lazy Firestore client. Credentials never leave the server process."""
    global _db
    if _db is not None:
        return _db

    try:
        raw = os.environ.get("FIREBASE_SERVICE_ACCOUNT_JSON", "").strip()
        path = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS", "").strip()

        if raw:
            credential = credentials.Certificate(json.loads(raw))
        elif path:
            credential = credentials.Certificate(path)
        else:
            credential = credentials.ApplicationDefault()

        try:
            firebase_admin.initialize_app(credential)
        except ValueError:
            # Already initialized by a reload; reuse it.
            pass
        _db = firestore.client()
    except Exception as exc:  # noqa: BLE001 - any credential failure is the same to the caller
        raise PipelineError(
            503,
            "storage_unavailable",
            "Firestore credentials are not configured on this service.",
        ) from exc

    return _db


def _as_datetime(value: Any) -> datetime | None:
    if isinstance(value, datetime):
        return value if value.tzinfo else value.replace(tzinfo=timezone.utc)
    if isinstance(value, str):
        try:
            return datetime.fromisoformat(value.replace("Z", "+00:00"))
        except ValueError:
            return None
    return None


def find_customer(db, email: str) -> tuple[bool | None, str | None]:
    """Return (matched, id). `None` means the lookup could not run."""
    if not email:
        return False, None

    normalized = email.strip().lower()
    try:
        queries = (
            ("normalizedEmail", normalized),
            ("email", email.strip()),
        )
        for field, value in queries:
            for doc in db.collection("customers").where(field, "==", value).limit(1).stream():
                return True, doc.id
        return False, None
    except Exception:  # noqa: BLE001 - a failed lookup must not read as "not a client"
        log.warning("customer lookup failed")
        return None, None


# ── Text handling ────────────────────────────────────────────────────────────


def redact(text: str) -> str:
    value = text
    for pattern, replacement in REDACTIONS:
        value = pattern.sub(replacement, value)
    return value


def build_message(contact: dict[str, Any]) -> str:
    parts = [str(contact.get("message") or "").strip()]

    context = []
    for label, key in (
        ("Business", "businessName"),
        ("Industry", "industry"),
        ("Interested in", "service"),
        ("Budget", "budget"),
        ("Timeline", "timeline"),
    ):
        value = str(contact.get(key) or "").strip()
        if value:
            context.append(f"{label}: {value}")

    if context:
        parts.append("\n".join(context))

    joined = "\n\n".join(part for part in parts if part)
    return redact(joined)[:MAX_MESSAGE_CHARS]


def _strip_fences(raw: str) -> str:
    text = str(raw).strip()
    match = re.match(r"^```(?:json)?\s*([\s\S]*?)\s*```$", text, re.IGNORECASE)
    return match.group(1).strip() if match else text


def parse_model_output(raw: str) -> dict[str, Any]:
    try:
        value = json.loads(_strip_fences(raw))
    except json.JSONDecodeError as exc:
        raise TriageUnavailable("invalid_model_output") from exc

    if not isinstance(value, dict):
        raise TriageUnavailable("invalid_model_output")

    intent = str(value.get("intent_one_line") or "").strip()[:200]
    urgency_why = str(value.get("urgency_why") or "").strip()[:300]
    human_why = str(value.get("human_required_why") or "").strip()[:300]

    if not intent or not urgency_why:
        raise TriageUnavailable("invalid_model_output")
    if value.get("category") not in CATEGORIES:
        raise TriageUnavailable("invalid_model_output")
    if value.get("urgency") not in URGENCIES:
        raise TriageUnavailable("invalid_model_output")
    if not isinstance(value.get("human_required_before_reply"), bool):
        raise TriageUnavailable("invalid_model_output")
    if value["human_required_before_reply"] and not human_why:
        raise TriageUnavailable("invalid_model_output")

    return {
        "intent_one_line": intent,
        "category": value["category"],
        "urgency": value["urgency"],
        "urgency_why": urgency_why,
        "human_required_before_reply": value["human_required_before_reply"],
        "human_required_why": human_why,
    }


def enforce_rules(triage: dict[str, Any]) -> dict[str, Any]:
    value = dict(triage)
    # Money is never automated, whatever the model said.
    if value["category"] == "billing_or_money":
        value["human_required_before_reply"] = True
    value["owner"] = CATEGORY_OWNER[value["category"]]
    return value


def classify(message: str, business: str) -> tuple[dict[str, Any], str]:
    system = load_skill("contact-triage") or FALLBACK_SYSTEM
    user = f"Business name: {business or 'unknown'}\n\nMessage:\n{message}"
    provider = os.environ.get("AI_PROVIDER", "").strip().lower()

    if not provider:
        if os.environ.get("GEMINI_API_KEY", "").strip():
            provider = "gemini"
        elif os.environ.get("OPENAI_API_KEY", "").strip():
            provider = "openai"
        else:
            # Free-tier default: the service reports gemini and fails closed.
            provider = "gemini"

    if provider == "gemini":
        raw, model = _call_gemini(system, user)
    elif provider == "openai":
        raw, model = _call_openai(system, user)
    else:
        raise TriageUnavailable("unknown_provider")

    return enforce_rules(parse_model_output(raw)), model


def _call_gemini(system: str, user: str) -> tuple[str, str]:
    """Free-tier default: Google AI Studio key, no billing account required."""
    key = os.environ.get("GEMINI_API_KEY", "").strip()
    if not key:
        raise TriageUnavailable("model_not_configured")

    model = os.environ.get("GEMINI_MODEL", "").strip() or "gemini-2.0-flash"
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"

    try:
        with httpx.Client(timeout=30) as client:
            response = client.post(
                url,
                # Header, not a query string: the key stays out of URLs and logs.
                headers={"x-goog-api-key": key, "Content-Type": "application/json"},
                json={
                    "systemInstruction": {"parts": [{"text": system}]},
                    "contents": [{"role": "user", "parts": [{"text": user}]}],
                    "generationConfig": {
                        "temperature": 0,
                        "responseMimeType": "application/json",
                    },
                },
            )
    except httpx.HTTPError as exc:
        log.warning("model transport error")
        raise TriageUnavailable("provider_error") from exc

    if response.status_code == 429:
        raise TriageUnavailable("provider_rate_limited")
    if not response.is_success:
        raise TriageUnavailable(f"provider_{response.status_code}")

    body = response.json()
    candidates = body.get("candidates") or []
    parts = candidates[0].get("content", {}).get("parts", []) if candidates else []
    raw = "".join(part.get("text", "") for part in parts).strip()
    if not raw:
        raise TriageUnavailable("invalid_model_output")

    return raw, model


def _call_openai(system: str, user: str) -> tuple[str, str]:
    """Optional provider. Requires credits, so it is not the free-tier default."""
    key = os.environ.get("OPENAI_API_KEY", "").strip()
    if not key:
        raise TriageUnavailable("model_not_configured")

    model = os.environ.get("OPENAI_MODEL", "").strip() or DEFAULT_MODEL

    try:
        with httpx.Client(timeout=30) as client:
            response = client.post(
                "https://api.openai.com/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": model,
                    "temperature": 0,
                    "response_format": {"type": "json_object"},
                    "messages": [
                        {"role": "system", "content": system},
                        {"role": "user", "content": user},
                    ],
                },
            )
    except httpx.HTTPError as exc:
        log.warning("model transport error")
        raise TriageUnavailable("provider_error") from exc

    if response.status_code == 429:
        raise TriageUnavailable("provider_rate_limited")
    if not response.is_success:
        raise TriageUnavailable(f"provider_{response.status_code}")

    body = response.json()
    content = body.get("choices", [{}])[0].get("message", {}).get("content")
    if not isinstance(content, str) or not content.strip():
        raise TriageUnavailable("invalid_model_output")

    return content, model


# ── Decision table and fixed replies ─────────────────────────────────────────


def decide(triage: dict[str, Any] | None, status: str = "ok", existing_client: bool | None = None) -> dict[str, Any]:
    if status != "ok" or not triage:
        return {
            "category": "unclear",
            "intent": "Triage was unavailable. Read the original message.",
            "urgency": "medium",
            "owner": "owner",
            "human_required": True,
            "needs_review": True,
            "review_reason": REVIEW_REASON["triage_unavailable"],
            "reply_kind": "thank_you",
        }

    category = triage["category"]
    base = {
        "category": category,
        "intent": triage["intent_one_line"],
        "urgency": triage["urgency"],
        "owner": CATEGORY_OWNER[category],
        "human_required": triage["human_required_before_reply"],
        "needs_review": False,
        "review_reason": None,
        "reply_kind": "thank_you",
    }

    if category == "spam":
        return {**base, "reply_kind": "none"}
    if category == "billing_or_money":
        return {
            **base,
            "reply_kind": "billing_hold",
            "needs_review": True,
            "review_reason": REVIEW_REASON["money_owner"],
        }
    if category == "new_business":
        return {**base, "reply_kind": "cso_new_business"}
    if category == "support":
        if existing_client is False:
            return {
                **base,
                "reply_kind": "cco_support",
                "needs_review": True,
                "review_reason": REVIEW_REASON["support_unknown"],
            }
        return {**base, "reply_kind": "cco_support"}
    if category == "partnership_or_press":
        return {
            **base,
            "reply_kind": "thank_you",
            "needs_review": True,
            "review_reason": REVIEW_REASON["partnership"],
        }
    return {
        **base,
        "reply_kind": "thank_you",
        "needs_review": True,
        "review_reason": REVIEW_REASON["triage_unclear"],
    }


SUBJECTS = {
    "cso_new_business": "Thanks for reaching out to TatoIQ",
    "cco_support": "We've got your message",
    "billing_hold": "I'll come back to you",
    "thank_you": "Thanks for your message",
}


def _first_name(name: str) -> str:
    first = str(name or "").strip().split(" ")[0]
    return first or "there"


def reply_body(kind: str, contact: dict[str, Any]) -> str:
    first = _first_name(str(contact.get("name") or ""))
    business = str(contact.get("businessName") or "").strip()
    about = f" about {business}" if business else ""

    if kind == "cso_new_business":
        return (
            f"Hi {first},\n\n"
            f"Thanks for reaching out{about}. I read what you sent.\n\n"
            "I look after new engagements at TatoIQ. If there is a fit, I will come back "
            "to you with a clear scope and next steps. I will not quote anything before I "
            "understand the work.\n\n"
            "If it is easier to talk it through, reply with two or three times that suit "
            "you and I will set up a call.\n\n"
            "- The TatoIQ team"
        )
    if kind == "cco_support":
        return (
            f"Hi {first},\n\n"
            "Thanks for the note. I have logged it for our client care team, and they "
            "will pick it up from here.\n\n"
            "If this is about a return, a document, or access to your file, please do not "
            "send identifying details by email. We will point you to the secure upload "
            "instead.\n\n"
            "- TatoIQ Client Care"
        )
    if kind == "billing_hold":
        return (
            f"Hi {first},\n\n"
            "Thanks for your message about this. I will come back to you on it myself.\n\n"
            "- TatoIQ"
        )
    return (
        f"Hi {first},\n\n"
        "Thanks for your message. We have received it and someone will read it and get "
        "back to you.\n\n"
        "- The TatoIQ team"
    )


def render_reply(kind: str, contact: dict[str, Any]) -> dict[str, str] | None:
    if kind == "none":
        return None
    text = reply_body(kind, contact)
    paragraphs = [
        f"<p>{html.escape(block).replace(chr(10), '<br />')}</p>"
        for block in re.split(r"\n{2,}", text)
    ]
    return {
        "subject": SUBJECTS.get(kind, SUBJECTS["thank_you"]),
        "text": text,
        "html": "\n".join(paragraphs),
    }


def email_configured() -> bool:
    return bool(
        os.environ.get("RESEND_API_KEY", "").strip()
        and (
            os.environ.get("OUTBOUND_EMAIL_DOMAIN", "").strip()
            or os.environ.get("CONTACT_REPLY_FROM", "").strip()
        )
    )


def send_reply(contact_id: str, to: str, subject: str, text: str, html_body: str) -> str:
    if not email_configured():
        return "skipped"

    key = os.environ["RESEND_API_KEY"].strip()
    from_addr = os.environ.get("CONTACT_REPLY_FROM", "").strip()
    if not from_addr:
        from_addr = f"TatoIQ <hello@{os.environ['OUTBOUND_EMAIL_DOMAIN'].strip()}>"

    payload = {
        "from": from_addr,
        "to": [to],
        "subject": subject,
        "text": text,
        "html": html_body,
    }
    reply_to = os.environ.get("CONTACT_REPLY_TO", "").strip()
    if reply_to:
        payload["reply_to"] = reply_to

    try:
        with httpx.Client(timeout=20) as client:
            response = client.post(
                "https://api.resend.com/emails",
                headers={
                    "Authorization": f"Bearer {key}",
                    "Content-Type": "application/json",
                    # One key per contact: a retry cannot double-send.
                    "Idempotency-Key": f"contact-triage-{contact_id}",
                },
                json=payload,
            )
    except httpx.HTTPError:
        log.warning("reply transport error")
        return "failed"

    if not response.is_success:
        log.warning("reply provider error")
        return "failed"
    return "sent"


# ── Pipeline ─────────────────────────────────────────────────────────────────


def process(contact_id: str) -> dict[str, Any]:
    if not CONTACT_ID_RE.match(contact_id):
        raise PipelineError(400, "bad_request", "contact_id is invalid.")

    db = get_db()
    ref = db.collection("contacts").document(contact_id)

    try:
        snapshot = ref.get()
    except Exception as exc:  # noqa: BLE001
        raise PipelineError(503, "storage_unavailable", "Could not read the contact record.") from exc

    if not snapshot.exists:
        raise PipelineError(404, "not_found", "No contact with that id.")

    data = snapshot.to_dict() or {}

    if data.get("source") != "website-contact":
        raise PipelineError(409, "not_a_contact_form_submission", "Not a contact-form submission.")

    if isinstance(data.get("triage"), dict):
        return {
            "ok": True,
            "duplicate": True,
            "contact_id": contact_id,
            "triage": data["triage"],
            "needsReview": bool(data.get("needsReview")),
        }

    now = datetime.now(timezone.utc)
    created = _as_datetime(data.get("createdAt"))
    if created is None or created > now + timedelta(minutes=5):
        raise PipelineError(409, "bad_timestamp", "The record has no usable timestamp.")
    if now - created > MAX_AGE:
        raise PipelineError(409, "too_old", "This submission is too old to triage.")

    matched, customer_id = find_customer(db, str(data.get("email") or ""))
    message = build_message(data)

    triage = None
    model = None
    triage_status = "ok"
    triage_error = None

    try:
        triage, model = classify(message, str(data.get("businessName") or data.get("name") or ""))
    except Exception as exc:  # noqa: BLE001 - the fallback is the owner's rule
        triage_status = "unavailable"
        triage_error = getattr(exc, "code", "unknown")
        log.warning("triage unavailable: %s", triage_error)

    decision = decide(triage, triage_status, matched)
    contact = {"name": data.get("name"), "businessName": data.get("businessName")}
    reply = render_reply(decision["reply_kind"], contact)
    can_email = email_configured()

    if not reply:
        reply_status = "none"
    elif can_email:
        reply_status = "queued"
    else:
        reply_status = "skipped"

    triage_block = {
        "status": triage_status,
        "intent": decision["intent"],
        "category": decision["category"],
        "urgency": decision["urgency"],
        "owner": decision["owner"],
        "urgency_why": triage["urgency_why"] if triage else None,
        "human_required_before_reply": decision["human_required"],
        "needs_review": decision["needs_review"],
        "review_reason": decision["review_reason"],
        "model": model,
        "error": triage_error,
        "at": now.isoformat(),
    }

    reply_block = {
        "kind": decision["reply_kind"],
        "status": reply_status,
        "to": data.get("email"),
        "subject": None if not reply else reply["subject"],
        "error": "email_not_configured" if reply_status == "skipped" else None,
        "at": now.isoformat(),
    }

    # Write the decision BEFORE sending. A retry then sees `triage` and stops.
    try:
        ref.set(
            {
                "triage": triage_block,
                "triageStatus": triage_status,
                "category": decision["category"],
                "urgency": decision["urgency"],
                "owner": decision["owner"],
                "needsReview": decision["needs_review"],
                "reviewReason": decision["review_reason"],
                "existingClient": matched,
                "customerId": customer_id,
                "reply": reply_block,
                "triagedAt": triage_block["at"],
            },
            merge=True,
        )
    except Exception as exc:  # noqa: BLE001
        raise PipelineError(503, "storage_unavailable", "Could not update the contact record.") from exc

    if reply and can_email:
        reply_status = send_reply(
            contact_id,
            str(data.get("email") or ""),
            reply["subject"],
            reply["text"],
            reply["html"],
        )

        if reply_status == "failed":
            try:
                ref.set(
                    {
                        "reply": {**reply_block, "status": "failed", "error": "resend_failed"},
                        "needsReview": True,
                        "reviewReason": REVIEW_REASON["reply_failed"],
                    },
                    merge=True,
                )
            except Exception:  # noqa: BLE001 - the decision is already stored
                log.warning("could not record reply failure")

    needs_review = reply_status == "failed" or decision["needs_review"]

    return {
        "ok": True,
        "duplicate": False,
        "contact_id": contact_id,
        "triage": {
            "status": triage_status,
            "intent": decision["intent"],
            "category": decision["category"],
            "urgency": decision["urgency"],
            "owner": decision["owner"],
        },
        "reply": {"kind": decision["reply_kind"], "status": reply_status},
        "needsReview": needs_review,
        "reviewReason": REVIEW_REASON["reply_failed"] if reply_status == "failed" else decision["review_reason"],
    }


def list_contacts(limit: int = 100) -> list[dict[str, Any]]:
    db = get_db()
    try:
        query = (
            db.collection("contacts")
            .order_by("createdAt", direction=firestore.Query.DESCENDING)
            .limit(max(1, min(limit, 200)))
        )
        return [{"id": doc.id, "data": doc.to_dict() or {}} for doc in query.stream()]
    except Exception as exc:  # noqa: BLE001
        raise PipelineError(503, "storage_unavailable", "Could not list contact records.") from exc
