"use client";

import { useState } from "react";
import MaskedValue from "@/components/MaskedValue";
import { DEMO_RETURN } from "@/lib/demo/data";
import { isSensitiveFieldLabel } from "@/lib/sensitive";

const SCAN_LABELS: Record<string, string> = {
  quarantined: "Quarantined",
  scanning: "Scanning…",
  clean: "Scan clean",
  infected: "Infected — deleted",
};

const SCAN_TONE: Record<string, string> = {
  clean: "bg-teal-50 text-teal-700 ring-teal-200",
  scanning: "bg-slate-100 text-navy-600 ring-slate-200",
  quarantined: "bg-gold-50 text-gold-700 ring-gold-200",
  infected: "bg-red-50 text-red-700 ring-red-200",
};

export default function DocumentsReview() {
  const [docs, setDocs] = useState(DEMO_RETURN.documents);

  function toggleField(docId: string, label: string) {
    setDocs((prev) =>
      prev.map((d) =>
        d.id === docId
          ? {
              ...d,
              extractionFields: d.extractionFields.map((f) =>
                f.label === label ? { ...f, accepted: !f.accepted } : f,
              ),
            }
          : d,
      ),
    );
  }

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="font-display text-2xl font-semibold tracking-tight text-navy-900 sm:text-3xl">
        Documents
      </h1>
      <p className="mt-1 max-w-2xl text-sm text-navy-500">
        Uploads are scanned before use. Every extracted value must be accepted by you before it
        enters your return.
      </p>

      <div className="mt-6 space-y-5">
        {docs.map((doc) => {
          const accepted = doc.extractionFields.filter((f) => f.accepted).length;
          return (
            <section
              key={doc.id}
              className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-5 py-4">
                <div>
                  <h2 className="font-medium text-navy-900">{doc.name}</h2>
                  {doc.extractionFields.length > 0 && (
                    <p className="mt-0.5 text-xs text-navy-500">
                      {accepted} of {doc.extractionFields.length} fields confirmed
                    </p>
                  )}
                </div>
                <span
                  className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${SCAN_TONE[doc.scanStatus]}`}
                >
                  {SCAN_LABELS[doc.scanStatus]}
                </span>
              </div>

              {doc.extractionFields.length > 0 ? (
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-navy-500">
                    <tr>
                      <th scope="col" className="px-5 py-3 font-semibold">Extracted field</th>
                      <th scope="col" className="px-5 py-3 font-semibold">Value</th>
                      <th scope="col" className="px-5 py-3 font-semibold">Status</th>
                      <th scope="col" className="px-5 py-3 text-right font-semibold">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {doc.extractionFields.map((f) => (
                      <tr key={f.label} className="hover:bg-slate-50/60">
                        <td className="px-5 py-3 text-navy-700">{f.label}</td>
                        <td className="px-5 py-3 font-mono text-navy-600">
                          {isSensitiveFieldLabel(f.label) ? (
                            <MaskedValue value={f.value} label={f.label} />
                          ) : (
                            f.value
                          )}
                        </td>
                        <td className="px-5 py-3">
                          {f.accepted ? (
                            <span className="font-medium text-teal-700">Accepted</span>
                          ) : (
                            <span className="font-medium text-gold-700">
                              {f.needsConfirmation ? "Needs confirmation" : "Pending"}
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3 text-right">
                          <button
                            onClick={() => toggleField(doc.id, f.label)}
                            className={`rounded-md px-2.5 py-1 text-xs font-semibold transition ${
                              f.accepted
                                ? "border border-slate-200 text-navy-700 hover:bg-slate-50"
                                : "bg-navy-900 text-white hover:bg-navy-800"
                            }`}
                          >
                            {f.accepted ? "Withdraw" : "Accept"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="px-5 py-4 text-sm text-navy-500">
                  No extracted fields yet — this document is still being processed.
                </p>
              )}
            </section>
          );
        })}
      </div>

      <p className="mt-6 text-xs text-navy-400">
        Source reference: each value keeps the document ID and field it came from.
      </p>
    </div>
  );
}
