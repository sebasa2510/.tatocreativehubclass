# SEO Visibility Assessment — Happy Paws (happypawsaustin.com)

**Business:** Happy Paws — dog grooming (baths, haircuts, nail trims, de-shedding), Austin, TX
**Website:** happypawsaustin.com (Squarespace-hosted)
**Date of assessment:** August 8, 2026
**Method:** Live DNS and HTTP checks of the domain, plus live web searches. Findings below are marked **Observed** (directly verified), **Inferred** (reasonable conclusion from evidence), or **Recommended** (what to consider doing). No search volumes, rankings, backlinks, analytics, or Search Console data are fabricated — those were unavailable and are flagged where relevant.

---

## 1. Executive Summary

**The main reason people can't find you on Google is simpler than you think: your website does not actually load.**

I verified that `happypawsaustin.com` and `www.happypawsaustin.com` both immediately redirect to `http://www.happypawsatx.com/` — and `www.happypawsatx.com` has no DNS record, so it doesn't resolve. A browser (and Google's crawler) hits a "site can't be reached / server not found" error. Google cannot index a page it cannot load, so your site shows up in essentially zero search results. This one issue explains most of the "people tell me they can't find me" problem, and it also means any Google Business Profile you have is pointing customers at a dead website.

Two secondary problems are worth addressing at the same time:

1. **A second domain (`happypawsatx.com`) is registered but dead** — it exists in DNS only as a registrar record, has no web hosting attached, and is currently the redirect target for your main domain. This is the technical root cause.
2. **"Happy Paws" is an extremely common name** — live searches for "Happy Paws" in the Austin area surface *other* businesses (a pet-sitting company already using the handle "happypawsatx," a "Happy Paws" in Helotes, and a template-built "Happy Paws Grooming — Austin TX"), plus many established groomers. You are competing for your own name, and this makes a correctly set up Google Business Profile essential.

Because the site is unreachable, I could **not** evaluate your actual pages (titles, headings, content, structured data). Those sections are written as checklists to verify once the site loads, not as findings of problems.

**Bottom line:** Fix the domain redirect first. Everything else — Google Business Profile, content, local SEO — only pays off once the site is actually reachable and indexable.

---

## 2. Biggest Opportunities

1. **Make the site load.** Fixing the redirect restores your entire online presence at once. Until now, *zero* visitors from Google, *zero* crawls — no amount of content helps. This is the highest-value possible change.
2. **Verify and fully complete your Google Business Profile.** For a local grooming shop, the "map pack" (the top 3 businesses shown for "dog groomer near me") is where new customers actually come from — often more important than organic rankings. You said you have a profile but aren't sure it's set up right; get it verified and complete (details in Section 8 / Action 2).
3. **Own your brand name in search.** Right now searches for "Happy Paws Austin" surface other businesses. Once your site is indexed and your profile is live, you can push your own listing to the top of your name — this directly converts people who were told "go check out Happy Paws."
4. **Turn your service list into local landing pages.** Baths, haircuts, nail trims, and de-shedding map cleanly to real search queries ("dog grooming Austin," "dog de-shedding near me," "dog groomer near me"). Structured, useful service pages give Google something specific to rank and give customers a reason to book.
5. **A review-generation habit.** Reviews are a major local ranking factor *and* the trust signal that makes someone pick you over a competitor in the same map listing.

---

## 3. Critical Issues

### Issue 1: The website is unreachable — it redirects to a hostname that does not exist

**Evidence:**
- **Observed:** `curl -L https://happypawsaustin.com` → `FINAL_URL=http://www.happypawsatx.com/`, `HTTP_CODE=301`, followed by `curl: (6) Could not resolve host: www.happypawsatx.com`.
- **Observed:** The same happens for `https://www.happypawsaustin.com` (also 301 to the dead hostname).
- **Observed:** DNS: `happypawsaustin.com` A record → `198.49.23.145` (a Squarespace IP); `www.happypawsaustin.com` CNAME → `ext-sq.squarespace.com`. The redirect target `www.happypawsatx.com` has **no** A/CNAME record (resolution fails; SOA only for the apex).
- **Observed:** The redirect also downgrades HTTPS → HTTP (it sends visitors to `http://`, not `https://`).
- **Inferred:** The domain is hosted on Squarespace, and a domain/redirect rule inside Squarespace is sending all traffic to `www.happypawsatx.com`, a second domain that was registered (Google Domains) but never pointed at any hosting.

**Impact:** Critical. Google's crawler cannot load the site, so it is not indexed. Customers who click any link to your site (including from a Google Business Profile) see an error. This is the direct cause of "people can't find me on Google."

**Recommendation:** In Squarespace, remove the redirect to `www.happypawsatx.com` and make `happypawsaustin.com` (or `www.happypawsaustin.com`) the primary domain that serves your site over HTTPS. Confirm the site loads at both `https://happypawsaustin.com` and `https://www.happypawsaustin.com` with a 200 status and no redirect chain.

**Priority:** Critical — do this first.

### Issue 2: `happypawsatx.com` is a registered-but-dead second domain

**Evidence:**
- **Observed:** `happypawsatx.com` has an SOA record (registrar: Google Domains) but **no A/CNAME records**. `curl https://happypawsatx.com` and `http://happypawsatx.com` both fail with "Could not resolve host." `www.happypawsatx.com` does not resolve either.

**Impact:** This dead domain is currently the destination of your live site's redirect — i.e., it is the reason your site is broken. Left as-is it is also a confusing, unmanaged asset that could be grabbed by someone else later.

**Recommendation:** Either (a) set it up to 301-redirect to your live site (good: protects the brand), or (b) drop/stop renewing it. Never use it as the canonical domain, and never let it be the redirect target of your main site.

**Priority:** Critical (it's the blocker) — handle together with Issue 1.

### Issue 3: No evidence the site is indexed, and no measurement infrastructure in place

**Evidence:**
- **Observed:** Searches for `"happypawsaustin.com"` and `site:happypawsaustin.com` return **no results** for your site.
- **Observed:** The site can't be crawled (Issue 1), so indexing is impossible today.
- **Observed (unavailable):** No Google Search Console, sitemap, or analytics data could be verified. These are **not** confirmed as missing — they simply cannot be checked while the site is unreachable, and no data was provided.

**Impact:** Without Search Console you have no way to know if Google can crawl you, what you're ranking for, or why not. Without analytics you can't tell whether any of this work is paying off.

**Recommendation:** Once the site loads, set up Google Search Console, verify ownership, and submit the sitemap; set up Google Analytics 4 (or confirm your existing one). Then request indexing of the homepage.

**Priority:** Critical (must be done the moment the site is live).

---

## 4. SEO Analysis

### Technical SEO

- **Observed:** Broken redirect chain to a non-resolving hostname (Issue 1). This currently dominates all other technical considerations — there is no point auditing anything else on-page until it's fixed.
- **Observed:** Redirect drops to HTTP. Once fixed, ensure HTTPS-only serving and a clean canonical.
- **Observed:** Site infrastructure is Squarespace (DNS records), which by default provides mobile-responsive pages, HTTPS, and sitemaps — so once the redirect is fixed, many basics are likely already handled by the platform.
- **Unavailable / to verify once live (Squarespace handles these by default — confirm, don't assume):** XML sitemap exists and is submitted, `robots.txt` not blocking anything important, one canonical version of every page (no trailing-slash/`www` duplication), valid 404s, image compression and alt text, and that structured data (LocalBusiness/Groomer schema) is present.

### On-Page SEO

- **Unavailable:** I could not load any page, so titles, meta descriptions, H1/H2 structure, content quality, and CTAs could not be assessed. Nothing can be assumed broken.
- **Recommended checkpoints for each page once it loads:**
  - Homepage: unique title tag containing the business name + city ("Happy Paws Dog Grooming | Austin, TX"), a clear H1, and a prominent "Book an appointment" / phone CTA above the fold.
  - Services: one section or page per service (baths, haircuts, nail trims, de-shedding) with plain-language description, what's included, typical timing, and pricing link. Don't stuff keywords — write for the customer.
  - Pricing: transparent, easy to scan, consistent with the services page.
  - Contact: full address, phone, hours, a simple form, and an embedded map. This page is the anchor for local SEO.
  - Blog posts: each should have a title, an H1, and at least one internal link to a service or pricing page.

### Content

- **Observed (as described by the owner):** Homepage, services page (4 services), pricing page, contact page, and an occasionally-updated blog. This is a reasonable baseline structure; the weakness is depth and freshness, not structure.
- **Recommended (in order):**
  1. Improve existing service copy before creating anything new — make each service page genuinely useful (what's included, who it's for, how long it takes).
  2. Add an FAQ or "What to expect at your first grooming appointment" section (answers the questions customers actually search for).
  3. Blog on real local topics: "De-shedding tips for Austin dogs," "How often should a dog be groomed in Texas heat," "What to expect at your first groom." Thin, keyword-stuffed posts won't help — a few genuinely useful posts will outperform many shallow ones.
  4. Avoid creating duplicate content for ranking purposes (e.g., multiple near-identical service pages) — Google treats this as spam, and it won't work anyway.

### Keywords & Search Intent

- **Unavailable:** No keyword tool data was accessed; do not trust any specific search volume I could state. Use Google Keyword Planner and Search Console once it's collecting data.
- **The intent that matters most is local + transactional:** "dog groomer near me," "dog grooming Austin," "dog groomer Austin TX," "de-shedding dog Austin," "[neighborhood] dog groomer." These are people ready to book.
- **Recommended topic clusters (not keyword-stuffed pages):**
  - *Grooming services cluster:* baths, haircuts/trims, nail trims, de-shedding (one quality page each, interlinked).
  - *Local cluster:* Austin + neighborhood names you actually serve, only if the pages are genuinely local in content (hours, parking, "serving [neighborhoods]").
  - *Help/education cluster:* grooming frequency, first appointment, coat/breed care — supports the blog and links back to services.
- Avoid chasing broad terms like "dog grooming" (national, dominated by big brands) in favor of the local terms above.

### Internal Linking

- **Recommended structure:** Homepage → Services → (each service page) → Pricing ↔ Contact; blog posts → related service/pricing pages; Contact/booking CTA repeated on every service page.
- Add a small "Nearby: [neighborhood/landmark]" context on the contact page so nearby-searcher relevance is clear without creating doorway pages.

### Local SEO

- **Observed:** A Google Business Profile exists (per owner) but setup could not be verified — no claim, category, or NAP data available. Treat "not sure if it's set up right" as a real risk.
- **Observed:** Searches for "Happy Paws" around Austin return other businesses — a Petworks listing for "Happy Paws Austin" pet sitting/daycare (whose user handle is literally "happypawsatx"), a BBB "Happy Paws" pet boarding business in Helotes TX, and a template-based "Happy Paws Grooming — Austin TX." **Inferred:** name collision is real and will keep confusing customers and search engines until you own the space.
- **Recommended:**
  - Verify and claim the profile; choose the correct category ("Dog groomer" or "Pet groomer"); fill in address, phone, hours, service list, photos, and your website URL (which must be the working, non-redirecting URL).
  - Keep name/address/phone identical everywhere (site, profile, citations) — inconsistency confuses Google.
  - Decide and be explicit whether you're a storefront, a service-area business, or both; this changes how the profile is configured.
  - Set up a systematic review request (after each visit, text/email a link). Respond to all reviews.
  - Consider short, genuinely local content ("Serving South Austin / Hyde Park / wherever you actually are").

### Competitive Opportunities

- **Observed (live search, August 2026):** Established Austin competitors include Austin Dogtown (detailed grooming pages, FAQ, add-on pricing, 18 years in business), Dirty Dog (enrichment-based daycare + grooming, since 2004), Green Acres Pet Ranch, Doggie Howser Pet Social Club, Happy Mailman Dog Retreat, Southpaws Playschool, Big Little Paws, and others.
- **Observed:** Competitors differentiate on expertise (years in business, named groomers), transparency (itemized add-on pricing: "$15 nail trim," "$8 teeth brushing"), education (FAQ sections), and a clear brand angle (enrichment, stress-free, cage-free).
- **Inferred:** These are strong, established businesses — do not assume ranking next to them will be quick. Differentiation should be about being genuinely useful, not copying them.
- **Recommended differentiation angles for Happy Paws:**
  - De-shedding as a specialty (a named service and a real pain point for Texas dogs).
  - Transparent pricing and add-ons (matches what customers say they want).
  - A "first visit" experience (named groomer, what to expect, no surprises) to win new customers.
  - Neighborhood-level local targeting where big facilities aren't concentrated.

---

## 5. Recommended Actions

### Action 1 — Fix the broken domain redirect (make the site load)
- **What:** Remove the redirect to `www.happypawsatx.com`; make `happypawsaustin.com` serve the actual site over HTTPS; pick one canonical host (`www` or non-`www`) and enforce it consistently.
- **Why:** The site is currently unreachable by Google and by customers. This is the root cause of "can't find me on Google."
- **How:** In Squarespace Settings → Domains, ensure your primary domain is correct, delete/replace the domain redirect rule, and confirm via `curl -I https://happypawsaustin.com` returning 200. Then verify both `www` and non-`www` variants resolve and load.
- **Priority:** Critical

### Action 2 — Verify and fully optimize the Google Business Profile
- **What:** Claim/verify the profile; complete every field; correct category; add services, photos, hours, phone, and the working website URL.
- **Why:** Local pack results are the primary acquisition channel for a grooming business, and "Happy Paws" name collision makes an authoritative profile even more important.
- **How:** Google Business Profile → verify by postcard/phone; review and correct category "Dog groomer"; confirm name/address/phone match the site exactly; add 10+ real photos; link the corrected website URL; enable messaging if you can respond.
- **Priority:** Critical

### Action 3 — Set up Google Search Console and Google Analytics 4
- **What:** Verify ownership of `happypawsaustin.com`, submit the sitemap, request indexing of the homepage; confirm GA4 is tracking.
- **Why:** You cannot manage what you cannot measure; Search Console also surfaces indexation errors so you'll see the redirect problem (and its fix) directly.
- **How:** Search Console → Add property (domain, DNS verification via the registrar) → Sitemaps → submit `sitemap.xml` (Squarespace generates one). Add GA4 snippet or Squarespace analytics integration.
- **Priority:** Critical (immediately after the site is live)

### Action 4 — Consolidate your domains
- **What:** Either point `happypawsatx.com` (and any other domains you own) with a 301 to the live site, or stop renewing them.
- **Why:** A registered-but-dead domain is a liability, is confusing, and currently is the thing breaking your site.
- **How:** In the Google Domains / Squarespace DNS settings, set up a redirect or add a `www` record; confirm it 301s to your canonical URL. Never make it the canonical.
- **Priority:** High

### Action 5 — Start a review-generation program
- **What:** Ask every customer for a Google review after service; respond to every review, good or bad.
- **Why:** Reviews influence local rankings and are the single strongest trust signal in the local pack, where you'll be competing with established, reviewed competitors.
- **How:** Add a simple follow-up text/email with a direct review link (Squarespace has review-request tools/third-party integrations). Aim for steady flow, not bursts.
- **Priority:** High

### Action 6 — Improve the four existing pages for local search and conversion
- **What:** Rewrite homepage, services, pricing, and contact so each page is specific, local, and ends in a booking action; keep NAP consistent.
- **Why:** Thin, generic copy won't outrank established local competitors; specific, useful copy wins both rankings and customers.
- **How:** One service per section/page; include address/phone/hours/map on contact; a clear phone + "Book" CTA on every page; link services ↔ pricing ↔ contact throughout. Verify titles/headings per Section 4 checkpoints.
- **Priority:** High

### Action 7 — Add structured data (LocalBusiness / Groomer schema)
- **What:** Mark up business name, address, phone, hours, service area, and services with schema.org markup.
- **Why:** Helps Google understand and display your local business details (including in the local pack and knowledge panel).
- **How:** Squarespace supports custom code / JSON-LD blocks; or use a structured-data validator to confirm correctness after adding.
- **Priority:** Medium

### Action 8 — Create genuinely useful local content (not volume-for-volume's-sake)
- **What:** 4–6 useful pages/posts first (first-visit guide, de-shedding for Texas dogs, grooming frequency, FAQ), each linking to services/pricing; then grow.
- **Why:** Answers real questions, earns trust, and gives Google crawlable, relevant pages that support your service pages.
- **How:** Write for the customer; one topic per post; interlink to service pages; keep the blog regular but quality-first (per the skill's anti-thin-content principle).
- **Priority:** Medium

### Action 9 — Establish consistent citations and directory listings
- **What:** Ensure name/address/phone are identical on your site, GBP, and key directories (e.g., Yelp, local chambers) where you have presence.
- **Why:** NAP consistency is a local ranking factor; "Happy Paws" collisions make inconsistency more damaging.
- **How:** Audit existing listings for mismatched name/address/phone; correct and standardize.
- **Priority:** Medium

### Action 10 — Verify mobile experience and speed after the fix
- **What:** Test the live site on a phone and via Google's PageSpeed Insights / Mobile-Friendly Test.
- **Why:** Most local searches happen on mobile; a good experience protects rankings and conversions.
- **How:** Run the checks once the site loads; fix obvious issues (Squarespace templates are usually solid here).
- **Priority:** Medium

---

## 6. Implementation Roadmap

### Phase 1 — Foundation (Week 1–2)
- Fix the redirect so `happypawsaustin.com` serves the site over HTTPS (Action 1).
- Consolidate domains; 301 `happypawsatx.com` or drop it (Action 4).
- Verify and complete Google Business Profile (Action 2).
- Set up Search Console, submit sitemap, request indexing; confirm GA4 (Action 3).
- Confirm both `www` and non-`www` load with 200, HTTPS, no redirect chain.

### Phase 2 — Optimization (Week 3–6)
- Rewrite homepage/services/pricing/contact for local intent + booking CTAs (Action 6).
- NAP consistency + citation cleanup (Action 9).
- Add structured data (Action 7).
- Kick off the review program (Action 5).
- Mobile/speed verification (Action 10).

### Phase 3 — Growth (Month 2–3+)
- Publish the first genuinely useful content pieces (first-visit guide, de-shedding guide, FAQ) and link them to services (Action 8).
- Continue the blog with locally relevant, useful topics; keep internal linking consistent.
- Consider neighborhood-focused local content only where it's genuinely useful.

### Phase 4 — Measurement (Ongoing, monthly)
- Review Search Console: impressions, clicks, queries, indexing errors.
- Review GA4: traffic sources, phone calls, bookings.
- Track review volume/rating and whether GBP link clicks and calls are increasing.
- Adjust based on data — not guesses. (Note: no baseline numbers exist yet; month 1 establishes the baseline.)

---

## Data Gaps — What I Could Not Verify (and why it matters)

| Gap | Why it matters | How to fill it |
| --- | --- | --- |
| Actual on-page content (titles, headings, text) | Could not load any page; on-page assessment is conditional until the redirect is fixed | Fix the redirect, then re-run the Section 4 on-page checklist |
| Google Business Profile status/verification | Owner is unsure it's set up right; no public data to confirm | Log into GBP and follow Action 2 |
| Search Console / analytics data | No way to know crawl, indexing, or traffic history | Set up after Phase 1; first month establishes baseline |
| Backlinks and domain authority | Not verifiable (and not worth much until the site loads) | Reassess after the site is indexed |
| Search volumes / rankings | Deliberately not invented per this assessment's principles | Use Keyword Planner + Search Console data going forward |
| Competitor performance (traffic/revenue) | Presence in search results does not prove success | Compare content quality and reviews, not assumed metrics |

---

*Prepared by an SEO intelligence and decision-support agent. Findings are based on live checks performed on August 8, 2026, and the site details provided by the owner. Facts and inferences are labeled as such; nothing was invented.*
