import Link from "next/link";
import SaggioPreview from "@/components/site/saggio-preview";
import Faq from "@/components/site/faq";
import { DEMO_RETURN, documentStats } from "@/lib/demo/data";
import { portalRouteAvailable } from "@/lib/flags.client";
import { PREPARATION_STATUSES, preparationProgress } from "@/lib/status";
import {
  IconArrowRight,
  IconBuilding,
  IconCalculator,
  IconCalendar,
  IconCheck,
  IconChat,
  IconClock,
  IconFile,
  IconLock,
  IconQuote,
  IconReceipt,
  IconShield,
  IconSparkle,
  IconTrendUp,
  IconUsers,
} from "@/components/icons";

const TRUST = [
  { icon: IconShield, label: "PTIN-verified preparers", detail: "Every return is reviewed by a credentialed preparer." },
  { icon: IconLock, label: "Encrypted identifiers", detail: "Sensitive data is encrypted and access is role-limited." },
  { icon: IconSparkle, label: "Answers with citations", detail: "Saggio shows an IRS source when it has one; otherwise it labels general guidance." },
  { icon: IconClock, label: "Live status tracking", detail: "A timestamped history for every stage of your return." },
];

const STEPS = [
  {
    icon: IconChat,
    title: "Guided intake",
    body: "A plain-language questionnaire collects only what is needed and explains why each item is asked.",
  },
  {
    icon: IconReceipt,
    title: "Upload & confirm",
    body: "Documents are scanned, then every extracted value is shown to you for acceptance before it is used.",
  },
  {
    icon: IconUsers,
    title: "Preparer review",
    body: "A credentialed preparer reviews the draft, resolves open questions, and records each change.",
  },
  {
    icon: IconFile,
    title: "Authorize & file",
    body: "You authorize a filing-ready draft. Nothing is submitted until you sign off on the numbers.",
  },
];

const SERVICES = [
  {
    icon: IconCalculator,
    title: "Individuals & families",
    body: "Form 1040 returns with the credits and deductions you qualify for, prepared and reviewed end-to-end.",
    points: ["W-2 & 1099 income", "Standard or itemized", "Child & education credits"],
  },
  {
    icon: IconTrendUp,
    title: "Self-employed & 1099",
    body: "Built for freelancers and independent contractors who need Schedule C and Schedule SE done right.",
    points: ["Schedule C & SE", "Mileage & home office", "Quarterly estimates"],
  },
  {
    icon: IconBuilding,
    title: "Small business",
    body: "Keep the books clean and the filings coordinated across your entity and your personal return.",
    points: ["Bookkeeping", "Payroll coordination", "Entity returns"],
  },
  {
    icon: IconShield,
    title: "IRS notice support",
    body: "Get a letter explained in plain language and a clear path to respond — with a preparer alongside.",
    points: ["Notice explained", "Response drafted", "Escalation to a human"],
  },
];

const PLANS = [
  {
    name: "Assisted",
    price: "$89",
    unit: "federal return",
    blurb: "For straightforward returns that still deserve a human review.",
    features: ["Guided intake & document review", "Saggio tax-education assistant", "Preparer review of the draft", "Email & portal support"],
    cta: "Start your return",
    featured: false,
  },
  {
    name: "Self-employed",
    price: "$229",
    unit: "federal return",
    blurb: "For freelancers and contractors with a business schedule.",
    features: ["Everything in Assisted", "Schedule C & Schedule SE", "Mileage, home office & expense review", "Quarterly estimate reminders", "Priority preparer messaging"],
    cta: "Start your return",
    featured: true,
  },
  {
    name: "Business",
    price: "Custom",
    unit: "quoted",
    blurb: "For small businesses that need ongoing books and filings.",
    features: ["Everything in Self-employed", "Bookkeeping & reconciliation", "Payroll coordination", "Dedicated preparer", "Year-round planning"],
    cta: "Talk to a preparer",
    featured: false,
  },
];

const STATS = [
  { value: String(PREPARATION_STATUSES.length), label: "Tracked preparation stages" },
  { value: "100%", label: "Of sourced AI answers cite a citation" },
  { value: "3", label: "Status tracks: prep, filing, refund" },
  { value: "0", label: "Fields used before you confirm them" },
];

const RESOURCES = [
  { icon: IconFile, title: "Tax guides", body: "Plain-language explainers on deductions, credits, and deadlines — each citing an IRS source.", href: "#resources", soon: "Coming soon" },
  { icon: IconCalendar, title: "Deadline calendar", body: "Federal filing and quarterly estimated-payment dates for tax year 2025.", href: "#resources", soon: "Coming soon" },
  { icon: IconReceipt, title: "Where's My Refund?", body: "Check federal refund status on the official IRS tool — TatoIQ never stores your query data.", href: "https://www.irs.gov/wheres-my-refund", external: true },
  { icon: IconShield, title: "Tax disclosures", body: "What TatoIQ does, what it does not do, and how the assistant is constrained.", href: "/disclosures" },
];

function SectionHeading({
  eyebrow,
  title,
  body,
  align = "left",
}: {
  eyebrow: string;
  title: string;
  body?: string;
  align?: "left" | "center";
}) {
  return (
    <div className={align === "center" ? "mx-auto max-w-2xl text-center" : "max-w-2xl"}>
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-700">{eyebrow}</p>
      <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-navy-900 sm:text-4xl">
        {title}
      </h2>
      {body && <p className="mt-4 text-lg leading-relaxed text-navy-600">{body}</p>}
    </div>
  );
}

export default function HomePage() {
  // Derived from the same demo return the portal renders, so the preview can
  // never disagree with the app itself.
  const prepPct = preparationProgress(DEMO_RETURN.preparationStatus);
  const docs = documentStats();
  const openTasks = DEMO_RETURN.tasks.filter((t) => !t.completed).length;

  // The static marketing mirror has no authenticated portal. Point those CTAs
  // at the contact page instead of shipping links that 404.
  const portalHref = portalRouteAvailable ? "/dashboard" : "/contact";
  const portalCta = portalRouteAvailable ? "Open the portal" : "Talk to a preparer";

  return (
    <>
      {/* ───────────────────────────── Hero ───────────────────────────── */}
      <section className="brand-mesh relative overflow-hidden bg-navy-950">
        <div className="grid-backdrop pointer-events-none absolute inset-0" aria-hidden />
        <div className="relative mx-auto grid max-w-6xl gap-14 px-6 py-20 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:py-28">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-navy-700 bg-navy-900/60 px-3.5 py-1.5 text-xs font-medium text-navy-200">
              <span className="h-1.5 w-1.5 rounded-full bg-teal-400" />
              Tax year 2025 · Form 1040 · Schedule C · Schedule SE
            </span>
            <h1 className="mt-6 font-display text-4xl font-semibold leading-[1.05] tracking-tight text-white sm:text-5xl lg:text-[3.6rem]">
              Tax preparation, done with{" "}
              <span className="text-gradient-gold">precision and clarity</span>.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-navy-200">
              TatoIQ guides individuals, self-employed professionals, and small-business owners from
              intake to a filing-ready draft — with a deterministic engine and an assistant that
              explains every step.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link
                href={portalHref}
                className="inline-flex items-center gap-2 rounded-lg bg-gold-400 px-5 py-3 text-sm font-semibold text-navy-950 shadow-lg shadow-gold-500/20 transition hover:bg-gold-300 hover:shadow-xl hover:shadow-gold-500/25"
              >
                {portalCta} <IconArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="#how"
                className="inline-flex items-center gap-2 rounded-lg border border-navy-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-navy-900"
              >
                See how it works
              </Link>
            </div>
            <p className="mt-6 flex items-center gap-2 text-sm text-navy-300">
              <IconShield className="h-4 w-4 text-teal-400" />
              Demo build · synthetic data only · no IRS transmission
            </p>
          </div>

          {/* Return snapshot */}
          <div className="relative">
            <div className="absolute -inset-4 rounded-3xl bg-teal-500/10 blur-2xl" aria-hidden />
            <div className="relative rounded-2xl border border-navy-800 bg-navy-900/80 p-6 shadow-2xl shadow-navy-950/50 backdrop-blur">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wide text-navy-400">Your return</p>
                  <p className="mt-1 font-display text-lg font-semibold text-white">
                    Form 1040 · TY 2025
                  </p>
                </div>
                <span className="rounded-full bg-gold-400/15 px-3 py-1 text-xs font-medium text-gold-300 ring-1 ring-inset ring-gold-400/30">
                  In preparer review
                </span>
              </div>

              <div className="mt-6">
                <div className="flex items-center justify-between text-xs text-navy-300">
                  <span>Preparation progress</span>
                  <span className="font-medium text-white">{prepPct}%</span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-navy-800">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-teal-500 to-gold-400"
                    style={{ width: `${Math.max(prepPct, 4)}%` }}
                  />
                </div>
              </div>

              <dl className="mt-6 grid grid-cols-3 gap-3">
                {[
                  { k: "Documents", v: `${docs.scannedClean}/${docs.documents}`, s: "scan complete" },
                  { k: "Open tasks", v: String(openTasks), s: "due soon" },
                  { k: "Fields to confirm", v: String(docs.fieldsPending), s: "for you" },
                ].map((item) => (
                  <div key={item.k} className="rounded-xl border border-navy-800 bg-navy-950/60 p-3">
                    <dt className="text-[11px] uppercase tracking-wide text-navy-400">{item.k}</dt>
                    <dd className="mt-1 font-display text-2xl font-semibold text-white">{item.v}</dd>
                    <dd className="text-[11px] text-teal-300">{item.s}</dd>
                  </div>
                ))}
              </dl>

              <div className="mt-5 flex items-start gap-3 rounded-xl border border-navy-800 bg-navy-950/60 p-4">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gold-400/15 text-gold-300 ring-1 ring-inset ring-gold-400/30">
                  <IconSparkle className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-sm text-navy-100">
                    {docs.fieldsPending === 1
                      ? "One extraction field still needs your confirmation before it enters your return."
                      : `${docs.fieldsPending} extraction fields still need your confirmation before they enter your return.`}
                  </p>
                  <p className="mt-1 text-[11px] text-navy-400">
                    Saggio · cites Pub. 583, recordkeeping
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="brand-rule h-px" />
      </section>

      {/* ───────────────────────── Trust strip ───────────────────────── */}
      <section className="border-b border-navy-100 bg-white">
        <div className="mx-auto grid max-w-6xl gap-8 px-6 py-12 sm:grid-cols-2 lg:grid-cols-4">
          {TRUST.map((t) => (
            <div key={t.label} className="flex items-start gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-navy-50 text-navy-700">
                <t.icon className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-semibold text-navy-900">{t.label}</p>
                <p className="mt-1 text-xs leading-relaxed text-navy-500">{t.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ───────────────────────── How it works ───────────────────────── */}
      <section id="how" className="scroll-mt-24 bg-white py-20">
        <div className="mx-auto max-w-6xl px-6">
          <SectionHeading
            eyebrow="How it works"
            title="From first question to filing-ready"
            body="A structured journey with a human in the loop at the moments that matter."
          />
          <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((step, i) => (
              <div
                key={step.title}
                className="surface surface-interactive relative p-6"
              >
                <div className="flex items-center justify-between">
                  <span className="grid h-11 w-11 place-items-center rounded-xl bg-navy-900 text-gold-300">
                    <step.icon className="h-5 w-5" />
                  </span>
                  <span className="font-display text-3xl font-semibold text-navy-100">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                </div>
                <h3 className="mt-5 font-display text-lg font-semibold text-navy-900">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-navy-600">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───────────────────────── Services ───────────────────────── */}
      <section id="services" className="scroll-mt-24 border-y border-navy-100 bg-navy-50/50 py-20">
        <div className="mx-auto max-w-6xl px-6">
          <SectionHeading
            eyebrow="Services"
            title="Built around accuracy and privacy"
            body="Compliance-first tooling designed for a professional experience, whatever your situation."
          />
          <div className="mt-14 grid gap-6 md:grid-cols-2">
            {SERVICES.map((s) => (
              <div
                key={s.title}
                className="surface surface-interactive flex flex-col p-7"
              >
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-teal-50 text-teal-700">
                  <s.icon className="h-5 w-5" />
                </span>
                <h3 className="mt-5 font-display text-xl font-semibold text-navy-900">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-navy-600">{s.body}</p>
                <ul className="mt-5 space-y-2">
                  {s.points.map((p) => (
                    <li key={p} className="flex items-center gap-2 text-sm text-navy-700">
                      <IconCheck className="h-4 w-4 text-teal-600" />
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───────────────────────── Saggio ───────────────────────── */}
      <section id="saggio" className="scroll-mt-24 bg-white py-20">
        <div className="mx-auto max-w-6xl px-6">
          <SaggioPreview />
        </div>
      </section>

      {/* ───────────────────────── Portal teaser ───────────────────────── */}
      <section className="brand-mesh border-y border-navy-800 bg-navy-950 py-20">
        <div className="mx-auto grid max-w-6xl gap-14 px-6 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold-300">
              The client portal
            </p>
            <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              A portal, not a PDF in your inbox
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-navy-200">
              Follow every stage of your return, confirm extracted values, track deadlines, and
              message your preparer — all in one place, distinct from our marketing site.
            </p>
            <ul className="mt-8 grid gap-3 sm:grid-cols-2">
              {[
                "Progress and status cards",
                "Tabbed document workspace",
                "Tasks and deadline tracking",
                "Secure preparer messaging",
              ].map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm text-navy-100">
                  <IconCheck className="h-4 w-4 text-teal-400" />
                  {f}
                </li>
              ))}
            </ul>
            <Link
              href={portalHref}
              className="mt-9 inline-flex items-center gap-2 rounded-lg bg-gold-400 px-5 py-3 text-sm font-semibold text-navy-950 transition hover:bg-gold-300"
            >
              {portalRouteAvailable ? "Explore the demo portal" : "Ask about the portal"}{" "}
              <IconArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {/* Mini dashboard mock */}
          <div className="rounded-2xl border border-navy-800 bg-navy-900/70 p-4 shadow-2xl shadow-navy-950/50">
            <div className="flex gap-2 pb-3">
              <span className="h-2.5 w-2.5 rounded-full bg-navy-700" />
              <span className="h-2.5 w-2.5 rounded-full bg-navy-700" />
              <span className="h-2.5 w-2.5 rounded-full bg-navy-700" />
            </div>
            <div className="overflow-hidden rounded-xl border border-navy-800 bg-white">
              <div className="flex">
                <div className="hidden w-28 shrink-0 bg-navy-950 p-3 sm:block">
                  <div className="h-3 w-16 rounded bg-gold-400/70" />
                  <div className="mt-4 space-y-2">
                    {[0, 1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className={`h-2.5 rounded ${i === 1 ? "bg-teal-400/70" : "bg-navy-700"}`}
                      />
                    ))}
                  </div>
                </div>
                <div className="flex-1 p-4">
                  <div className="h-3 w-24 rounded bg-navy-200" />
                  <div className="mt-4 grid grid-cols-3 gap-2">
                    {[0, 1, 2].map((i) => (
                      <div key={i} className="rounded-lg border border-navy-100 p-2">
                        <div className="h-2 w-10 rounded bg-navy-100" />
                        <div className="mt-2 h-3 w-8 rounded bg-navy-800" />
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-navy-100">
                    <div className="h-full w-3/4 rounded-full bg-teal-500" />
                  </div>
                  <div className="mt-4 space-y-2">
                    {[0, 1, 2].map((i) => (
                      <div key={i} className="h-3 rounded bg-navy-50" />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ───────────────────────── Pricing ───────────────────────── */}
      <section id="pricing" className="scroll-mt-24 bg-white py-20">
        <div className="mx-auto max-w-6xl px-6">
          <SectionHeading
            align="center"
            eyebrow="Pricing"
            title="Transparent, preparer-led pricing"
            body="Illustrative demo pricing. A quote is confirmed before any work begins, and there is no charge until you approve it."
          />
          <div className="mt-14 grid gap-6 lg:grid-cols-3">
            {PLANS.map((plan) => (
              <div
                key={plan.name}
                className={`relative flex flex-col rounded-2xl border p-7 ${
                  plan.featured
                    ? "border-navy-900 bg-navy-950 text-white shadow-2xl shadow-navy-900/20 lg:-mt-4 lg:mb-4"
                    : "border-navy-100 bg-white shadow-sm"
                }`}
              >
                {plan.featured && (
                  <span className="absolute -top-3 left-7 rounded-full bg-gold-400 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-navy-950">
                    Most popular
                  </span>
                )}
                <h3 className={`font-display text-xl font-semibold ${plan.featured ? "text-white" : "text-navy-900"}`}>
                  {plan.name}
                </h3>
                <div className="mt-4 flex items-baseline gap-2">
                  <span className={`font-display text-4xl font-semibold ${plan.featured ? "text-gold-300" : "text-navy-900"}`}>
                    {plan.price}
                  </span>
                  <span className={`text-sm ${plan.featured ? "text-navy-300" : "text-navy-500"}`}>
                    / {plan.unit}
                  </span>
                </div>
                <p className={`mt-3 text-sm ${plan.featured ? "text-navy-200" : "text-navy-600"}`}>
                  {plan.blurb}
                </p>
                <ul className="mt-6 flex-1 space-y-3">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <IconCheck className={`mt-0.5 h-4 w-4 shrink-0 ${plan.featured ? "text-teal-400" : "text-teal-600"}`} />
                      <span className={plan.featured ? "text-navy-100" : "text-navy-700"}>{f}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href={portalHref}
                  className={`mt-8 inline-flex items-center justify-center rounded-lg px-4 py-3 text-sm font-semibold transition ${
                    plan.featured
                      ? "bg-gold-400 text-navy-950 hover:bg-gold-300"
                      : "bg-navy-900 text-white hover:bg-navy-800"
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
          <p className="mt-6 text-center text-xs text-navy-500">
            State returns, entity filings, and prior-year work are quoted separately.
          </p>
        </div>
      </section>

      {/* ───────────────────────── Stats + testimonial ───────────────────────── */}
      <section className="border-y border-navy-100 bg-navy-50/50 py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
            {STATS.map((s) => (
              <div key={s.label}>
                <p className="font-display text-4xl font-semibold text-navy-900">{s.value}</p>
                <p className="mt-2 text-sm text-navy-600">{s.label}</p>
              </div>
            ))}
          </div>

          <figure className="mx-auto mt-16 max-w-3xl rounded-2xl border border-navy-100 bg-white p-8 shadow-sm">
            <IconQuote className="h-8 w-8 text-gold-400" />
            <blockquote className="mt-4 font-display text-xl leading-relaxed text-navy-800">
              The status page alone changed how I feel about tax season. I always know what stage my
              return is in and what is waiting on me — no more chasing emails.
            </blockquote>
            <figcaption className="mt-5 text-sm text-navy-500">
              <span className="font-semibold text-navy-800">Jordan R.</span> · self-employed ·
              illustrative testimonial for this demo
            </figcaption>
          </figure>
        </div>
      </section>

      {/* ───────────────────────── Resources ───────────────────────── */}
      <section id="resources" className="scroll-mt-24 bg-white py-20">
        <div className="mx-auto max-w-6xl px-6">
          <SectionHeading
            eyebrow="Resources"
            title="Guidance you can point back to"
            body="Educational material and official tools — no paywall and no data collection."
          />
          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {RESOURCES.map((r) => {
              const cardClass =
                "surface surface-interactive group flex flex-col p-6";
              const inner = (
                <>
                  <span className="grid h-10 w-10 place-items-center rounded-lg bg-navy-50 text-navy-700">
                    <r.icon className="h-5 w-5" />
                  </span>
                  <h3 className="mt-4 font-semibold text-navy-900">
                    {r.title}
                    {r.external ? " ↗" : ""}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-navy-600">{r.body}</p>
                  {r.soon ? (
                    <span className="mt-4 inline-flex w-fit rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-medium text-navy-500 ring-1 ring-inset ring-slate-200">
                      {r.soon}
                    </span>
                  ) : null}
                </>
              );

              if (r.external) {
                return (
                  <a
                    key={r.title}
                    href={r.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`${cardClass} hover:border-navy-300 hover:shadow-md`}
                  >
                    {inner}
                  </a>
                );
              }
              if (r.soon) {
                // Not published yet — render as a non-interactive card rather
                // than a link that goes nowhere.
                return (
                  <div key={r.title} aria-disabled="true" className={cardClass}>
                    {inner}
                  </div>
                );
              }
              return (
                <Link
                  key={r.title}
                  href={r.href}
                  className={`${cardClass} hover:border-navy-300 hover:shadow-md`}
                >
                  {inner}
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* ───────────────────────── FAQ ───────────────────────── */}
      <section id="faq" className="scroll-mt-24 border-t border-navy-100 bg-navy-50/50 py-20">
        <div className="mx-auto grid max-w-6xl gap-12 px-6 lg:grid-cols-[0.9fr_1.1fr]">
          <SectionHeading
            eyebrow="FAQ"
            title="Questions people ask us first"
            body="If your question is about a specific situation, Saggio can point you to the relevant IRS source."
          />
          <div className="rounded-2xl border border-navy-100 bg-white px-7 py-2 shadow-sm">
            <Faq />
          </div>
        </div>
      </section>

      {/* ───────────────────────── Final CTA ───────────────────────── */}
      <section className="brand-mesh bg-navy-950 py-20">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <h2 className="font-display text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            Ready to see your return take shape?
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-navy-200">
            {portalRouteAvailable
              ? "Open the demo portal and walk through intake, documents, tasks, and status — exactly the experience your clients would have."
              : "Tell us what you are working on and we will map the next step, from intake to a filing-ready draft."}
          </p>
          <div className="mt-9 flex flex-wrap justify-center gap-3">
            <Link
              href={portalHref}
              className="inline-flex items-center gap-2 rounded-lg bg-gold-400 px-6 py-3 text-sm font-semibold text-navy-950 transition hover:bg-gold-300"
            >
              {portalCta} <IconArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="#saggio"
              className="inline-flex items-center gap-2 rounded-lg border border-navy-700 px-6 py-3 text-sm font-semibold text-white transition hover:bg-navy-900"
            >
              Ask Saggio a question
            </Link>
          </div>

          <p className="mt-10 text-sm text-navy-300">
            TatoIQ — designed &amp; built by{" "}
            <Link href="/welcome" className="font-medium text-gold-300 hover:underline">
              Sebastian Alonso
            </Link>
          </p>
        </div>
      </section>
    </>
  );
}
