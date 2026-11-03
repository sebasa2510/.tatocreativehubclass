"""Pure-function tests. No network, no key, no Firestore."""

import re
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import triage  # noqa: E402


def triage_result(category, **overrides):
    value = {
        "intent_one_line": "Wants bookkeeping help before the quarter closes.",
        "category": category,
        "urgency": "medium",
        "urgency_why": "A real request that can wait a business day.",
        "human_required_before_reply": False,
        "human_required_why": "A routine acknowledgement is safe.",
    }
    value.update(overrides)
    return value


def test_redacts_identifiers():
    text = "SSN 123-45-6789, EIN 12-3456789, email ana@example.com, phone 305-555-1212."
    cleaned = triage.redact(text)
    assert "123-45-6789" not in cleaned
    assert "12-3456789" not in cleaned
    assert "ana@example.com" not in cleaned
    assert "305-555-1212" not in cleaned
    assert cleaned.count("[redacted-") >= 4


def test_message_carries_request_and_context():
    message = triage.build_message(
        {
            "message": "My books are three months behind.",
            "businessName": "Ruiz Studio",
            "budget": "$5k-$10k",
        }
    )
    assert "three months behind" in message
    assert "Business: Ruiz Studio" in message
    assert "Budget: $5k-$10k" in message


def test_every_category_has_a_fixed_owner():
    for category in triage.CATEGORIES:
        decision = triage.decide(triage_result(category))
        assert decision["owner"] == triage.CATEGORY_OWNER[category]


def test_new_business_uses_cso_reply():
    decision = triage.decide(triage_result("new_business"))
    assert decision["reply_kind"] == "cso_new_business"
    assert decision["needs_review"] is False


def test_billing_gets_one_line_and_a_review():
    decision = triage.decide(triage_result("billing_or_money"))
    assert decision["reply_kind"] == "billing_hold"
    assert decision["needs_review"] is True
    assert decision["review_reason"] == "money_owner"

    body = triage.reply_body("billing_hold", {"name": "Ana Ruiz"})
    assert "I will come back to you on it myself." in body
    assert not re.search(r"team|next step|scope|call|upload", body, re.IGNORECASE)


def test_spam_gets_no_reply():
    decision = triage.decide(triage_result("spam"))
    assert decision["reply_kind"] == "none"
    assert triage.render_reply("none", {}) is None


def test_support_from_unknown_sender_is_flagged():
    decision = triage.decide(triage_result("support"), existing_client=False)
    assert decision["reply_kind"] == "cco_support"
    assert decision["needs_review"] is True
    assert decision["review_reason"] == "support_from_unknown_sender"


def test_failed_lookup_is_not_treated_as_not_a_client():
    decision = triage.decide(triage_result("support"), existing_client=None)
    assert decision["needs_review"] is False


def test_unavailable_triage_falls_back_to_thank_you():
    decision = triage.decide(None, "unavailable")
    assert decision["category"] == "unclear"
    assert decision["owner"] == "owner"
    assert decision["reply_kind"] == "thank_you"
    assert decision["needs_review"] is True
    assert decision["review_reason"] == "triage_unavailable"


def test_parse_rejects_unknown_category():
    with pytest.raises(triage.TriageUnavailable):
        triage.parse_model_output(
            '{"intent_one_line":"x","category":"sales","urgency":"low",'
            '"urgency_why":"y","human_required_before_reply":false,"human_required_why":""}'
        )


def test_parse_rejects_missing_reason():
    with pytest.raises(triage.TriageUnavailable):
        triage.parse_model_output(
            '{"intent_one_line":"x","category":"spam","urgency":"low",'
            '"urgency_why":"","human_required_before_reply":false,"human_required_why":""}'
        )


def test_money_is_always_human_even_if_the_model_says_otherwise():
    enforced = triage.enforce_rules(
        triage_result("billing_or_money", human_required_before_reply=False)
    )
    assert enforced["human_required_before_reply"] is True


def test_no_reply_promises_money_or_a_deadline():
    forbidden = (
        r"\bguarantee(d|s)?\b",
        r"\$\s?\d",
        r"\b\d+\s?(business\s?)?(days?|hours?)\b",
        r"\bwe will (have|finish|file|complete)\b",
    )
    for kind in ("cso_new_business", "cco_support", "billing_hold", "thank_you"):
        body = triage.reply_body(kind, {"name": "Ana Ruiz", "businessName": "Ruiz Studio"})
        for pattern in forbidden:
            assert not re.search(pattern, body, re.IGNORECASE), (kind, pattern)


def test_review_page_escapes_html():
    html_body = triage.render_reply("thank_you", {"name": "<script>alert(1)</script>"})
    assert "<script>" not in html_body["html"]
    assert "&lt;script&gt;" in html_body["html"]
