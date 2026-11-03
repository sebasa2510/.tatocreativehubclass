import type { Metadata } from "next";
import { DEMO_RETURN } from "@/lib/demo/data";
import { shortDate } from "@/lib/format";

export const metadata: Metadata = {
  title: "Messages",
  robots: { index: false, follow: false },
};

export default function MessagesPage() {
  const r = DEMO_RETURN;
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="font-display text-2xl font-semibold tracking-tight text-navy-900 sm:text-3xl">
        Messages
      </h1>
      <p className="mt-1 text-sm text-navy-500">
        Secure messages with your preparer. Portal messages are stored immutably with timestamps.
        Notification emails never contain taxpayer data — they only prompt you to log in.
      </p>

      <ul className="mt-6 space-y-4">
        {r.messages.map((m) => (
          <li key={m.id} className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-navy-900">{m.from}</p>
              <p className="text-xs text-navy-400">{shortDate(m.at)}</p>
            </div>
            <p className="mt-2 text-sm text-navy-600">{m.body}</p>
          </li>
        ))}
      </ul>

      <div className="mt-6 rounded-xl border border-gold-200 bg-gold-50 p-5">
        <p className="text-sm font-semibold text-gold-900">Escalation example</p>
        <p className="mt-1 text-sm text-gold-800">
          When Saggio detects a sensitive topic (an IRS notice, an audit, or collection), it pauses
          AI calculation advice and opens a direct message with your assigned preparer — like the
          one shown above.
        </p>
      </div>

      <div className="mt-6 rounded-xl border border-slate-200 bg-white p-5">
        <label htmlFor="msg" className="text-sm font-medium text-navy-700">
          Reply to your preparer
        </label>
        <textarea
          id="msg"
          rows={3}
          className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-navy-800 placeholder:text-navy-400"
          placeholder="Type a message… (demo — sending is disabled in this build)"
          disabled
        />
        <p className="mt-2 text-xs text-navy-400">Sending is disabled in this demo build.</p>
      </div>
    </div>
  );
}
