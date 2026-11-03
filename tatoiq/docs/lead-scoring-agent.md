# TatoIQ Lead Scoring Agent — Agent Specification

> Generated with Prompt Anything (temperature intent **0.2** for deterministic
> scoring work), then reconciled against the code that actually ships.
> This document is the written spec for the lead-scoring agent and records
> **why** each weight is what it is. The code is the source of truth; if this
> file and the code disagree, the code wins and this file is the bug.

## 1. Purpose

Score an inbound or imported lead 0–100, assign a **U.S. letter grade**
(A–F), tag a confidence level, and propose a pipeline stage — while never
contacting anyone who has not consented.

Two properties are non-negotiable:

1. **Determinism.** The same input always produces the same score. No
   randomness, no clock-dependent scoring beyond an explicit `taxDeadlineNear`
   flag supplied by the caller.
2. **No fabricated grades.** A lead with no verified contact channel receives
   `grade: null`, not a low grade. Absence of evidence is not evidence of
   poor quality.

## 2. Scoring rubric

Weights sum to exactly **100**. `assertWeightsSum()` throws otherwise.

| Criterion | Weight | Why this weight |
|---|---|---|
| **Service fit** | **30** | A tax practice earns on return complexity. A Schedule C filer or an S-corp is worth several times a single-W-2 client and typically retains for years. Complexity is the largest revenue signal available at intake. |
| **Buying intent** | **28** | The strongest *behavioural* signal, and — unlike timing — it is a choice the lead actually made. Someone who booked a consultation or asked for pricing is far down the funnel. |
| **Market fit** | **18** | A licensed practice can only serve where it is licensed. An out-of-area lead is not lower quality; it is simply unserviceable, which is a hard cost. |
| **Timing** | **12** | Deliberately modest. Seasonality is real but it is noise the lead cannot control. A strong lead in July is still a strong lead. |
| **Engagement** | **12** | Email opens and link clicks are weak, cheap signals. They break ties; they must never drive a grade alone. |

### Why not overweight timing?

The instinct is to make deadline proximity dominant — a common lead-gen design
puts it at 30–35%. For a tax practice that is wrong: it turns the score into a
calendar rather than a judge of the lead, and it floods the top of the funnel
every March with unqualified leads. Timing is capped at 12% so it can separate
two otherwise-equal leads but cannot lift a weak one.

## 3. Sub-signals

### Service fit — 30 points (fixed 70/30 split)

| Sub-signal | Points | Notes |
|---|---|---|
| Entity type in served set | 21 | `Math.round(30 * 0.7)` |
| Industry in served set | 9 | `Math.round(30 * 0.3)` |

The split is **fixed**, not "entity takes its share and industry gets the
remainder." Awarding the remainder would silently hand a full-marks service fit
to a lead whose entity did not match at all. Entity outweighs industry because a
pass-through entity almost always means a 1040 *plus* a business schedule.

Requires `verification.business`; otherwise 0 points and a `Business identity
not verified` missing-info entry.

### Buying intent — 28 points

| Sub-signal | Points | Notes |
|---|---|---|
| Requested a consultation | 15 | Strongest action a lead can take. |
| Asked about pricing | 7 | Real commercial interest. |
| Replied to prior outreach | 6 | Re-engagement. |

A consultation alone (15) outranks pricing + reply together (13). Requires a
verified contact channel.

### Market fit — 18 points

- Location not trusted → 0 points, `Location not verified`.
- No stated state restriction → **full marks** (nationwide coverage).
- State in `serviceStates` → full marks with evidence.
- State outside coverage → 0 points, `State outside service area`.

### Timing — 12 points

| Sub-signal | Points |
|---|---|
| Business formed recently | 6 |
| `taxDeadlineNear` flag set by caller | 6 |

Requires `verification.business`.

### Engagement — 12 points

| Sub-signal | Points |
|---|---|
| Opened a prior outreach email | 6 |
| Clicked a link in outreach | 4 |
| Visited the TatoIQ site | 2 |

Requires a verified contact channel.

## 4. Grades

| Grade | Score band |
|---|---|
| A | 90–100 |
| B | 80–89 |
| C | 70–79 |
| D | 60–69 |
| F | 0–59 |

Bands are inclusive and clamped to 0–100.

## 5. Confidence

| Tag | Condition |
|---|---|
| `HIGH` | Business verified **and** a verified contact channel **and** address verified |
| `MEDIUM` | Business verified **and** a verified contact channel |
| `LOW` | Anything else |

## 6. Precedence — compliance always wins

Evaluated in order. The first match decides the stage; the numeric grade is
never allowed to override a compliance state.

1. Do-not-contact or suppressed → `DO_NOT_CONTACT`
2. Legal restriction → `DO_NOT_CONTACT`
3. Consent withdrawn → `NO_CONSENT`
4. Mentions an active IRS notice or audit → `SPECIALIST_REVIEW` (no automated outreach)
5. Outreach required but consent `UNKNOWN` → `NO_CONSENT`
6. No verified contact channel → `INSUFFICIENT_INFORMATION`, `grade: null`
7. Otherwise the score-derived stage

Score-derived stage: `>= 70` → `QUALIFIED`, `>= 60` → `RESEARCHING`, else
`POOR_FIT`.

## 7. Decision sequence

```
1. Consent / suppression / legal gates        (src/lib/leads/consent.ts)
2. IRS notice / audit trigger scan            (stage → SPECIALIST_REVIEW)
3. Verified-contact check                     (else INSUFFICIENT_INFORMATION)
4. Weighted sub-signal points                 (src/lib/scoring/evaluator.ts)
5. Confidence tag
6. Grade + proposed pipeline stage            (src/lib/leads/pipeline.ts)
```

## 8. Test coverage required

The suite must prove, at minimum:

- Grade boundaries: 59→F, 60→D, 69→D, 70→C, 79→C, 80→B, 89→B, 90→A.
- Out-of-range scores clamp.
- A fully verified, high-intent lead scores 100 / grade A / confidence HIGH.
- Weights sum to 100, and `assertWeightsSum` rejects anything else.
- Entity type outranks industry inside service fit (21 vs 9).
- A consultation request outranks pricing + reply combined.
- Full timing + full market fit cannot reach a B without service fit.
- No verified contact field → `grade: null`, score 0, `INSUFFICIENT_INFORMATION`.
- Unverified business → 0 service-fit points.
- Every awarded criterion carries evidence with a non-empty source.
- Consent/legal overrides force the blocked stage even for an A lead.
- An IRS notice/audit mention routes to `SPECIALIST_REVIEW`.

## 9. Guardrails

- Never fabricate statistics, tax-code citations, or regulatory references.
- Never promise a tax outcome or a turnaround time.
- Never treat an unverified field as factual — unverified fields award zero.
- Sample fixtures may be displayed but are never contacted.
- If the input schema is ambiguous, ask one focused question rather than
  guessing.

## 10. Reference implementation

- `src/lib/scoring/evaluator.ts` — rubric, grades, confidence, overrides
- `src/lib/leads/pipeline.ts` — 14 stages and legal transitions
- `src/lib/leads/consent.ts` — the single contact gate
- `src/lib/leads/normalize.ts` — canonical email/E.164 phone
- `src/lib/leads/dedup.ts` — duplicates flagged, never overwritten
- `src/app/api/leads` — ingest and management endpoints
