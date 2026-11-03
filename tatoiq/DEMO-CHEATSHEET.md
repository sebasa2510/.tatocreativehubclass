# TatoIQ — Presentation Cheat Sheet

Everything on this page is read directly from the deployed code (branch `master`, Netlify production).

---

## 1. Portal login

| What | Value |
| --- | --- |
| URL | https://tatoiq.netlify.app/login |
| Admin (full access, including leads) | **`admin`** / **`tatoiq-demo`** |
| Support (portal only, no leads) | **`viewer`** / **`tatoiq-demo`** |

The demo accounts are printed on the login page itself, so nothing is hidden during the demo.
`/leads` redirects an anonymous visitor to `/login` **by design** — sign in as `admin` first.

### Demo route map

| Page | Link |
| --- | --- |
| Marketing site | https://tatoiq.netlify.app/ |
| Login | https://tatoiq.netlify.app/login |
| Dashboard | https://tatoiq.netlify.app/dashboard |
| **Lead agent workspace** | **https://tatoiq.netlify.app/leads** |
| Lead import | https://tatoiq.netlify.app/leads/import |
| New lead | https://tatoiq.netlify.app/leads/new |
| Documents | https://tatoiq.netlify.app/documents |
| Tasks | https://tatoiq.netlify.app/tasks |
| Messages | https://tatoiq.netlify.app/messages |
| Return status | https://tatoiq.netlify.app/return |
| Settings | https://tatoiq.netlify.app/settings |

---

## 2. What you can ask Saggio

Saggio answers in five honest tiers. Escalation is checked **first**, every time.

### Tier 1 — Conversation / product help (no citations)

| Ask about | Example question |
| --- | --- |
| Greeting | "hi" / "good morning" |
| Thanks | "thanks" / "got it" |
| Goodbye | "bye" / "that's all" |
| Who it is | "who are you?" / "are you a CPA?" / "are you human?" |
| Capabilities | "what can you do?" / "what can I ask?" |
| Documents | "where do I upload documents?" / "where do I add receipts?" |
| Tasks | "where are my tasks?" / "how do I see outstanding items?" |
| Messages | "how do I message my preparer?" / "how do I talk to a human?" |
| Return status | "how do I check my return status?" / "has my return been filed?" |
| Booking | "how do I book a consultation?" |
| Pricing | "how much do you charge?" / "what are your fees?" |
| Privacy | "is my data secure?" / "do you store my information?" |
| Lead scoring | "how are leads scored?" / "what makes a lead grade A?" |
| Human review | "why did you escalate my question?" |
| Tax year | "what tax year do you cover?" |

### Tier 2 — Cited IRS answers (111 topics, always with a source)

**Individuals & filing**
Standard deduction 2025 · Filing status · Form 1040 overview · Who must file · Extensions · Free File · Amending a return · Recordkeeping · Penalties and interest · Withholding and the W-4 · Tax brackets 2025 · Dependents · Head of household · Choosing standard vs itemized · SALT cap · Student loan interest · Other adjustments · Estimated payments · Estimated payment schedule · Estimated tax safe harbor · Underpayment penalty (Form 2210) · Statute of limitations · E-signing · Refund status · Refund timing · Paying the IRS · Identity Protection PIN · Understanding an IRS notice · State returns

**Income**
Form W-2 · 1099-NEC · 1099-K · 1099-MISC · 1099-B · 1099-DA · 1099-C · 1099-S · Schedule K-1 · Interest and dividends · Capital gains and losses · Retirement distributions · Unemployment compensation · Social Security taxation · Gambling and hobby income · Tip income · Digital assets and crypto · Equity compensation (RSUs/options) · Cancellation of debt · Muni bond interest · Savings bonds for education · Alimony and child support · Clergy income · Farm income · Business sale

**Deductions & credits**
Mortgage interest · Charitable contributions · Medical expenses · IRA and HSA contributions · Educator and other adjustments · Child Tax Credit · Earned Income Tax Credit · Education credits · Child and dependent care credit · Saver's Credit · Residential clean energy credit · Premium Tax Credit · Adoption credit · Clean vehicle credit · State and local sales tax deduction · QBI deduction · Self-employed health insurance · Nondeductible personal expenses · 529 and ABLE plans · Gifts and inheritances · Moving expenses · Selling a home · Disaster losses

**Business & self-employment**
Schedule C · Self-employment tax · Home office · Standard mileage · Business meals and travel · Business structure / entity type · Start-up costs · Depreciation and Section 179 · Section 179 expensing · Rental income · Rental depreciation · Passive activity losses · Net operating losses · LLC vs S-corp · S-corp reasonable compensation · Payroll taxes · Employee vs contractor · Hobby vs business · Household employees · Fringe benefits · Accountable plans · EIN · SEP/SIMPLE/solo 401(k) · Roth conversions · RMDs · Inherited IRAs · 1031 exchanges · Installment sales · Estimated tax · Marriage, divorce, separation · New child or dependent · Students and dependents · Military taxpayers · ITIN · Who may prepare returns · Choosing a tax professional

### Tier 3 — General guidance (labelled, zero citations)

48 broader topics, each answered with an explicit *"General information · not IRS-sourced"* label:
business structure · self-employment · estimated taxes · withholding · payroll · worker classification · crypto · investing · trading · rental · home ownership · retirement · education · family · health · home office · vehicle · meals and travel · gifts and estates · divorce · military · disability · unemployment · nonprofit · bankruptcy · farming · tips · sales tax · state and local · refunds · deductions · credits · income · rates · filing · planning · profit projection ("my business made 200k") · records · bookkeeping · invoicing · software · prior year · avoidance vs evasion · starting a business · closing a business · hobby · reasonable comp · how the tax system works

### Tier 4 — Escalation to a licensed preparer (8 triggers)

Foreign income / FBAR / FATCA · IRS notice or letter (CP2000 etc.) · Audit or examination · Back taxes and penalties · Aggressive or questionable deductions · Tax dispute / Tax Court · Collections, levies, offers in compromise · Suspected fraud or identity theft

### Tier 5 — Honest refusal

Non-tax questions ("what's the weather?", "tell me a joke") get a plain `no_source` decline. Nothing is fabricated.

---

## 3. Lead generation agent — grading rubric

### Score weights (sum = 100, enforced by `assertWeightsSum`)

| Criterion | Weight | Why it carries that weight |
| --- | --- | --- |
| **Service fit** | **30** | A tax practice earns on complexity. An S-corp or Schedule C client is worth several W-2 clients and retains for years. |
| **Buying intent** | **28** | The strongest behavioural signal, and a choice the lead actually made (consultation, pricing, reply). |
| **Market fit** | **18** | A licensed practice can only serve where it is licensed — out-of-area is unserviceable, not just low quality. |
| **Timing** | **12** | Seasonality is real but outside the lead's control; a strong lead in July is still strong. |
| **Engagement** | **12** | Opens and clicks are cheap signals. They break ties, never drive a grade alone. |

### How points are earned inside each criterion

| Criterion | Max | Points breakdown |
| --- | --- | --- |
| Service fit | 30 | Entity match **70%** (21 pts) + industry match **30%** (9 pts). Requires verified business identity. |
| Buying intent | 28 | Consultation **55%** (15) · Pricing request **25%** (7) · Replied to outreach **20%** (6). Requires a verified email or phone. |
| Timing | 12 | Business recently formed **50%** (6) + tax deadline near **50%** (6). Requires verified business identity. |
| Market fit | 18 | In a served state = full 18 · no state restriction = full 18 (nationwide) · outside area = 0. Requires verified location. |
| Engagement | 12 | Email opened **50%** (6) · Link clicked **30%** (4) · Website visited **20%** (2). Requires a verified contact. |

### Grade bands

| Grade | Score | Recommended action |
| --- | --- | --- |
| **A** | 90–100 | Assign to a licensed specialist and approve outreach promptly. |
| **B** | 80–89 | Assign to the outreach queue for human-approved contact. |
| **C** | 70–79 | Nurture with educational content before outreach. |
| **D** | 60–69 | Research further to confirm service fit and intent. |
| **F** | 0–59 | Mark poor fit; do not contact. |
| **No grade** | — | No verified email/phone → `INSUFFICIENT_INFORMATION`. The agent never invents a grade. |

### Confidence

| Level | Condition |
| --- | --- |
| HIGH | Business verified + email/phone verified + address verified |
| MEDIUM | Business verified + email/phone verified |
| LOW | Anything less |

### Overrides — these always beat the grade

1. `doNotContact` or suppressed → **DO_NOT_CONTACT**
2. Legal restriction → **DO_NOT_CONTACT**
3. Consent withdrawn → **NO_CONSENT**
4. Mentions an active IRS notice/audit → **SPECIALIST_REVIEW**
5. Outreach requested with no recorded consent → **NO_CONSENT**
6. No verified contact → **INSUFFICIENT_INFORMATION**, grade `null`

Grade-derived stage: ≥70 `QUALIFIED` · 60–69 `RESEARCHING` · <60 `POOR_FIT`.

### The 18 demo leads (what the audience will see)

| Grade | Count | Examples |
| --- | --- | --- |
| A (90–100) | 2 | Brickell Builders (100, but **DO_NOT_CONTACT**), Pinecrest Interiors (90) |
| C (70–79) | 3 | Aventura Wellness (79), Bayside Pet Care (79), Hialeah Auto Repair (75) |
| D (60–69) | 5 | South Beach Fitness (62), Sunny Isles Marketing (62), Little Havana Cafés (60) |
| F (0–59) | 5 | Coral Gables Consulting (54), North Miami Print Shop (54), Edgewater Electric (54, **DO_NOT_CONTACT**) |
| No grade | 3 | Wynwood Design Studio, Miami Lakes Landscaping, Opa-locka Trucking — missing a verified contact |

There is no **B** lead in the demo set — a deliberate gap so you can explain what would move a C to a B (verified address, or a consultation request).

Two deliberate teaching cases: **Brickell Builders** scores 100 but is suppressed (compliance beats score), and **Edgewater Electric** is both poor-fit and do-not-contact.

---

## 4. Numbers to quote

- Saggio cited topics: **111**
- Saggio general topics: **48**
- Saggio conversation topics: **15**
- Escalation triggers: **8**
- Demo leads: **18** (plus 1 pre-existing contact in Firestore)
- Tests: **167 / 167 passing**
