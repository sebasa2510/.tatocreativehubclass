"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { answer as localAnswer, type SaggioAnswer } from "@/lib/saggio/core";
import { extractEmail, isValidEmail } from "@/lib/saggio/client-records";
import { IconSparkle } from "@/components/icons";

interface ChatTurn {
  role: "user" | "saggio";
  text: string;
  citations?: Array<{ source: string; section: string }>;
  kind?: SaggioAnswer["kind"];
  suggestions?: string[];
  links?: Array<{ label: string; href: string }>;
  notice?: string;
}

/** Extra fields the server adds to a Saggio answer. */
interface AssistantResponse extends SaggioAnswer {
  mode?: "client" | "public";
  lookup?: "found" | "not_found" | "not_client" | "unconfigured" | "error" | "not_checked" | "invalid_email";
}

const SUGGESTIONS = [
  "What is the standard deduction for 2025?",
  "How is self-employment tax calculated?",
  "Can I deduct a home office?",
];

const CLIENT_SUGGESTIONS = [
  "What is my project status?",
  "What is still outstanding?",
  "Where do I upload documents?",
];

const KIND_LABEL: Partial<Record<SaggioAnswer["kind"], string>> = {
  general: "General information · not IRS-sourced",
  escalation: "Human review required",
  no_source: "No source found",
  client: "From your client record",
  guide: "Portal guide",
  routing: "Routed to a person",
  handoff: "A person will follow up",
  identify: "Email needed",
};

/** How many previous user turns Saggio may use to resolve a short follow-up. */
const HISTORY_TURNS = 4;

/**
 * The static Firebase Hosting build has no `/api/assistant`. Cache that fact
 * after the first failure so every later question does not wait on a 404.
 */
export default function SaggioChat({ clientEmail = "" }: { clientEmail?: string }) {
  const signedInEmail = clientEmail.trim();
  const serverUnavailable = useRef(false);
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState(signedInEmail);
  const [emailDraft, setEmailDraft] = useState(signedInEmail);
  const [emailOpen, setEmailOpen] = useState(!signedInEmail);
  const [emailError, setEmailError] = useState("");
  const [clientMode, setClientMode] = useState(false);
  const [turns, setTurns] = useState<ChatTurn[]>([
    {
      role: "saggio",
      text: signedInEmail
        ? `Hi! I'm Saggio. You're signed in as ${signedInEmail}. If that's the email on your TatoIQ account, ask me anything and I'll answer from your client record where I can. If it isn't, use Change email below.`
        : "Hi! I'm Saggio. I can explain federal tax topics, help you find your way around TatoIQ, or — if you're a TatoIQ client — answer from your project record. Which email is on your TatoIQ account?",
    },
  ]);

  function applyEmail(value: string) {
    const next = value.trim();
    if (!isValidEmail(next)) {
      setEmailError("That doesn't look like a complete email address.");
      return false;
    }
    setEmail(next);
    setEmailDraft(next);
    setEmailError("");
    setEmailOpen(false);
    return true;
  }

  async function send(question: string) {
    const q = question.trim();
    if (!q || busy) return;

    // An email typed into the chat is an introduction, not a tax question.
    const mentioned = extractEmail(q);
    let activeEmail = email;
    if (mentioned) {
      activeEmail = mentioned;
      setEmail(mentioned);
      setEmailDraft(mentioned);
      setEmailOpen(false);
      setEmailError("");
    }

    // Only earlier user turns — never the question being asked right now.
    const history = turns
      .filter((t) => t.role === "user")
      .map((t) => t.text)
      .slice(-HISTORY_TURNS);

    const shown = mentioned && q.toLowerCase() === mentioned ? "Hello" : q;
    setInput("");
    setTurns((t) => [...t, { role: "user", text: shown }]);
    setBusy(true);

    function push(data: SaggioAnswer) {
      setTurns((t) => [
        ...t,
        {
          role: "saggio",
          text: data.text,
          citations: data.citations,
          kind: data.kind,
          suggestions: data.suggestions,
          links: data.links,
          notice: data.notice,
        },
      ]);
    }

    if (serverUnavailable.current) {
      const fallback = localAnswer(shown, false, history);
      if (activeEmail) {
        fallback.notice =
          "I can't reach client records from this build, so this answer is general tax information rather than your project record.";
      }
      push(fallback);
      setBusy(false);
      return;
    }

    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ question: shown, history, ...(activeEmail ? { email: activeEmail } : {}) }),
      });

      // A static host has no API route: it answers with HTML, or 404/405. Any
      // of those means "no server", so fall through to the local core.
      const contentType = res.headers.get("content-type") ?? "";
      if (!res.ok || !contentType.includes("application/json")) {
        throw new Error("no-server");
      }

      const data = (await res.json()) as AssistantResponse;
      if (!data?.text) throw new Error("bad-payload");

      if (data.lookup === "invalid_email") {
        setEmailError(data.text);
        setEmailOpen(true);
      }
      const isClient = data.mode === "client";
      setClientMode(isClient);
      push(data);
    } catch {
      // Offline/static fallback: the same grounded core runs in the browser.
      serverUnavailable.current = true;
      const fallback = localAnswer(shown, false, history);
      if (activeEmail) {
        fallback.notice =
          "I can't reach client records from this build, so this answer is general tax information rather than your project record.";
      }
      push(fallback);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-full bg-navy-900 px-5 py-3 font-medium text-white shadow-lg transition hover:bg-navy-800"
          aria-label="Open Saggio assistant"
        >
          <IconSparkle className="h-4 w-4 text-gold-300" /> Ask Saggio
        </button>
      )}

      {open && (
        <section
          className="fixed bottom-5 right-5 z-40 flex h-[34rem] w-[min(92vw,25rem)] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
          aria-label="Saggio assistant"
        >
          <header className="flex items-center justify-between border-b border-slate-200 bg-navy-950 px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="grid h-7 w-7 place-items-center rounded-full bg-gold-400/15 text-xs font-bold text-gold-300 ring-1 ring-inset ring-gold-400/30">
                <IconSparkle className="h-3.5 w-3.5" />
              </span>
              <div>
                <p className="text-sm font-semibold text-white">Saggio</p>
                <p className="text-[11px] text-navy-300">
                  {clientMode ? "Client record · answers from your file" : "Tax education · sources when available"}
                </p>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="rounded-md px-2 py-1 text-navy-300 transition hover:bg-navy-900 hover:text-white"
              aria-label="Close Saggio"
            >
              ✕
            </button>
          </header>

          <div className="border-b border-slate-200 bg-slate-50 px-4 py-2">
            {emailOpen ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  applyEmail(emailDraft);
                }}
                className="space-y-1.5"
              >
                <label htmlFor="saggio-email" className="block text-[11px] font-medium text-navy-600">
                  Email on your TatoIQ account
                </label>
                <div className="flex gap-1.5">
                  <input
                    id="saggio-email"
                    type="email"
                    value={emailDraft}
                    onChange={(e) => setEmailDraft(e.target.value)}
                    placeholder="name@business.com"
                    autoComplete="email"
                    className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs text-navy-800 placeholder:text-navy-400 focus:border-teal-500 focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="rounded-lg bg-navy-900 px-2.5 py-1.5 text-xs font-medium text-white transition hover:bg-navy-800"
                  >
                    Use
                  </button>
                  {email && (
                    <button
                      type="button"
                      onClick={() => {
                        setEmailDraft(email);
                        setEmailError("");
                        setEmailOpen(false);
                      }}
                      className="rounded-lg px-2 py-1.5 text-xs text-navy-500 transition hover:bg-slate-200"
                    >
                      Cancel
                    </button>
                  )}
                </div>
                {emailError ? (
                  <p className="text-[11px] text-red-600">{emailError}</p>
                ) : (
                  <p className="text-[11px] text-navy-400">
                    Used only to look up your client record. Please don&apos;t send an SSN or EIN.
                  </p>
                )}
              </form>
            ) : (
              <div className="flex items-center justify-between gap-2 text-[11px]">
                <p className="truncate text-navy-600">
                  <span className="font-medium text-navy-800">{email}</span>
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setEmailDraft(email);
                    setEmailOpen(true);
                  }}
                  className="shrink-0 rounded-md px-1.5 py-0.5 font-medium text-teal-700 transition hover:bg-white"
                >
                  Change email
                </button>
              </div>
            )}
          </div>

          <div
            className="flex-1 space-y-3 overflow-y-auto p-4"
            aria-live="polite"
            aria-relevant="additions"
          >
            {turns.map((turn, i) => (
              <div key={i} className={turn.role === "user" ? "flex justify-end" : ""}>
                <div
                  className={
                    turn.role === "user"
                      ? "max-w-[85%] rounded-2xl rounded-br-sm bg-navy-900 px-3 py-2 text-sm text-white"
                      : turn.kind === "handoff"
                        ? "max-w-[90%] rounded-2xl rounded-bl-sm border border-gold-200 bg-gold-50 px-3 py-2 text-sm text-gold-900"
                        : turn.kind === "escalation"
                          ? "max-w-[90%] rounded-2xl rounded-bl-sm border border-gold-200 bg-gold-50 px-3 py-2 text-sm text-gold-900"
                          : turn.kind === "client" || turn.kind === "routing" || turn.kind === "guide"
                            ? "max-w-[90%] rounded-2xl rounded-bl-sm border border-teal-100 bg-teal-50/60 px-3 py-2 text-sm text-navy-800"
                            : turn.kind === "general" || turn.kind === "identify"
                              ? "max-w-[90%] rounded-2xl rounded-bl-sm border border-slate-200 bg-white px-3 py-2 text-sm text-navy-800"
                              : "max-w-[90%] rounded-2xl rounded-bl-sm bg-slate-100 px-3 py-2 text-sm text-navy-800"
                  }
                >
                  {turn.role === "saggio" && turn.kind && KIND_LABEL[turn.kind] && (
                    <p className="mb-1.5 inline-flex items-center gap-1.5 rounded-full bg-white/70 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-navy-500 ring-1 ring-inset ring-black/5">
                      {KIND_LABEL[turn.kind]}
                    </p>
                  )}
                  <p className="whitespace-pre-wrap">{turn.text}</p>
                  {turn.links && turn.links.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5 border-t border-black/5 pt-2">
                      {turn.links.map((link) => (
                        <Link
                          key={link.href}
                          href={link.href}
                          className="inline-flex items-center gap-1 rounded-lg bg-white px-2 py-1 text-[11px] font-semibold text-teal-700 ring-1 ring-inset ring-teal-200 transition hover:text-teal-900 hover:ring-teal-300"
                        >
                          Open {link.label}
                          <span aria-hidden="true">→</span>
                        </Link>
                      ))}
                    </div>
                  )}
                  {turn.citations && turn.citations.length > 0 && (
                    <ul className="mt-2 space-y-0.5 border-t border-black/5 pt-2 text-[11px] opacity-80">
                      {turn.citations.map((c, j) => (
                        <li key={j}>
                          Source: {c.source} — {c.section}
                        </li>
                      ))}
                    </ul>
                  )}
                  {turn.notice && (
                    <p className="mt-2 border-t border-black/5 pt-2 text-[11px] leading-snug text-navy-500">
                      {turn.notice}
                    </p>
                  )}
                  {(turn.kind === "escalation" || turn.kind === "no_source") && (
                    <Link
                      href="/contact"
                      className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-teal-700 underline decoration-teal-300 underline-offset-2 hover:text-teal-900"
                    >
                      Talk to a preparer
                      <span aria-hidden="true">→</span>
                    </Link>
                  )}
                  {turn.suggestions && turn.suggestions.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5 border-t border-black/5 pt-2">
                      {turn.suggestions.map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => send(s)}
                          className="rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-[11px] text-navy-600 transition hover:bg-slate-50"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {busy && <p className="text-xs text-navy-400">Saggio is thinking…</p>}
          </div>

          {turns.length <= 1 && (
            <div className="flex flex-wrap gap-2 px-4 pb-2">
              {(clientMode ? CLIENT_SUGGESTIONS : SUGGESTIONS).map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="rounded-full border border-slate-200 px-3 py-1 text-xs text-navy-600 transition hover:bg-slate-50"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="flex gap-2 border-t border-slate-200 p-3"
          >
            <label htmlFor="saggio-input" className="sr-only">
              Ask Saggio a question
            </label>
            <input
              id="saggio-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              maxLength={1000}
              placeholder={email ? "Ask about your project or a tax question…" : "Ask a question or share your email…"}
              className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm text-navy-800 placeholder:text-navy-400 focus:border-teal-500 focus:outline-none"
            />
            <button
              type="submit"
              disabled={busy}
              className="rounded-lg bg-navy-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-navy-800 disabled:opacity-50"
            >
              Send
            </button>
          </form>
        </section>
      )}
    </>
  );
}
