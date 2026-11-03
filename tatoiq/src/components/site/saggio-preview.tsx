"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { answer, type SaggioAnswer } from "@/lib/saggio/core";
import { IconSparkle, IconShield } from "@/components/icons";

const SUGGESTIONS = [
  "What is the standard deduction for 2025?",
  "How is self-employment tax calculated?",
  "Can I deduct a home office?",
  "I received an IRS notice — what should I do?",
];

const GUARANTEES = [
  "Sourced answers show the IRS publication and section.",
  "When no source supports an answer, Saggio says so instead of inventing one.",
  "Sensitive topics go to a human preparer instead of guessing.",
];

const SOURCES = [
  { source: "Rev. Proc. 2024-40", section: "Standard deduction" },
  { source: "Pub. 334 · Schedule SE", section: "Self-employment tax" },
  { source: "Pub. 587", section: "Business use of your home" },
  { source: "Pub. 505", section: "Estimated tax payments" },
];

const KIND_LABEL: Record<SaggioAnswer["kind"], string> = {
  answer: "IRS-sourced",
  general: "General guidance",
  conversation: "Saggio",
  escalation: "Human review",
  no_source: "No source found",
  client: "Client record",
  guide: "Portal guide",
  routing: "Routed to a person",
  handoff: "Human follow-up",
  identify: "Email needed",
};

const KIND_BADGE: Record<SaggioAnswer["kind"], string> = {
  answer: "bg-teal-50 text-teal-800 ring-teal-200",
  general: "bg-navy-50 text-navy-700 ring-navy-200",
  conversation: "bg-slate-50 text-slate-700 ring-slate-200",
  escalation: "bg-gold-50 text-gold-800 ring-gold-300",
  no_source: "bg-slate-50 text-slate-700 ring-slate-200",
  client: "bg-teal-50 text-teal-800 ring-teal-200",
  guide: "bg-teal-50 text-teal-800 ring-teal-200",
  routing: "bg-teal-50 text-teal-800 ring-teal-200",
  handoff: "bg-gold-50 text-gold-800 ring-gold-300",
  identify: "bg-slate-50 text-slate-700 ring-slate-200",
};

export default function SaggioPreview() {
  const [active, setActive] = useState(SUGGESTIONS[0]);
  const [turn, setTurn] = useState<SaggioAnswer>(() => answer(SUGGESTIONS[0]));
  const [input, setInput] = useState("");

  function ask(question: string) {
    const q = question.trim();
    if (!q) return;
    setActive(q);
    setTurn(answer(q));
    setInput("");
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    ask(input);
  }

  const tone =
    turn.kind === "escalation"
      ? "border-gold-300 bg-gold-50 text-navy-900"
      : turn.kind === "no_source"
        ? "border-navy-200 bg-navy-50 text-navy-800"
        : "border-navy-100 bg-white text-navy-800";

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_1.05fr] lg:items-center">
      <div>
        <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-teal-700">
          <IconSparkle className="h-4 w-4" /> Saggio
        </p>
        <h2 className="mt-4 font-display text-3xl font-semibold tracking-tight text-navy-900 sm:text-4xl">
          An assistant that shows its work
        </h2>
        <p className="mt-4 text-lg leading-relaxed text-navy-600">
          Saggio cites an IRS source when it has one, labels general guidance when it does not, and
          sends sensitive questions to a human preparer instead of guessing. Try a real question
          below; this preview runs the same core the portal uses.
        </p>
        <ul className="mt-6 space-y-3">
          {GUARANTEES.map((g) => (
            <li key={g} className="flex items-start gap-3 text-sm text-navy-700">
              <IconShield className="mt-0.5 h-5 w-5 shrink-0 text-teal-600" />
              {g}
            </li>
          ))}
        </ul>

        <div className="mt-8 rounded-xl border border-navy-100 bg-navy-50/60 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-navy-500">
            Source library
          </p>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {SOURCES.map((s) => (
              <li key={s.source} className="text-xs text-navy-600">
                <span className="font-medium text-navy-800">{s.source}</span>
                <span className="block text-navy-500">{s.section}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Chat card */}
      <div className="overflow-hidden rounded-2xl border border-navy-100 bg-white shadow-xl shadow-navy-900/5">
        <div className="flex items-center justify-between border-b border-navy-100 bg-navy-950 px-5 py-3.5">
          <div className="flex items-center gap-3">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-gold-400/15 text-gold-300 ring-1 ring-inset ring-gold-400/30">
              <IconSparkle className="h-4 w-4" />
            </span>
            <div>
              <p className="text-sm font-semibold text-white">Saggio</p>
              <p className="text-[11px] text-navy-300">Tax education · sources when available</p>
            </div>
          </div>
          <span className="rounded-full bg-teal-500/15 px-2.5 py-1 text-[11px] font-medium text-teal-300">
            Grounded
          </span>
        </div>

        <div className="space-y-4 p-5">
          <div className="ml-auto max-w-[85%] rounded-2xl rounded-br-sm bg-navy-900 px-4 py-2.5 text-sm text-white">
            {active}
          </div>

          <div
            aria-live="polite"
            className={`max-w-[92%] rounded-2xl rounded-bl-sm border px-4 py-3 text-sm ${tone}`}
          >
            <div className="mb-2 flex items-center gap-2">
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1 ring-inset ${KIND_BADGE[turn.kind]}`}
              >
                {KIND_LABEL[turn.kind]}
              </span>
            </div>
            <p className="whitespace-pre-wrap leading-relaxed">{turn.text}</p>
            {turn.citations.length > 0 && (
              <ul className="mt-3 space-y-1 border-t border-black/5 pt-2.5 text-[11px] text-navy-500">
                {turn.citations.map((c) => (
                  <li key={`${c.source}-${c.section}`}>
                    <span className="font-medium text-navy-700">Source:</span> {c.source} —{" "}
                    {c.section}
                  </li>
                ))}
              </ul>
            )}
            {(turn.kind === "escalation" || turn.kind === "no_source") && (
              <Link
                href="/contact"
                className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-teal-700 underline decoration-teal-300 underline-offset-2 hover:text-teal-900"
              >
                Talk to a preparer
                <span aria-hidden="true">→</span>
              </Link>
            )}
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => ask(s)}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                  s === active
                    ? "border-teal-500 bg-teal-50 text-teal-800"
                    : "border-navy-200 text-navy-600 hover:border-navy-300 hover:bg-navy-50"
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="flex gap-2 border-t border-navy-100 pt-4">
            <label htmlFor="saggio-preview-question" className="sr-only">
              Ask Saggio a federal tax question
            </label>
            <input
              id="saggio-preview-question"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              maxLength={1000}
              placeholder="Ask any federal tax question…"
              className="min-w-0 flex-1 rounded-xl border border-navy-200 bg-white px-3 py-2 text-sm text-navy-900 placeholder:text-navy-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
            />
            <button
              type="submit"
              disabled={!input.trim()}
              className="rounded-xl bg-navy-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-navy-800 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Ask
            </button>
          </form>

          <p className="text-[11px] leading-relaxed text-navy-500">
            Federal tax education for tax year 2025. Not individualized advice. Never enter an SSN,
            EIN, or account number.
          </p>
        </div>
      </div>
    </div>
  );
}
