import type { ReactNode } from "react";

export default function LegalPage({
  eyebrow,
  title,
  updated,
  children,
}: {
  eyebrow: string;
  title: string;
  updated: string;
  children: ReactNode;
}) {
  return (
    <>
      <section className="brand-mesh bg-navy-950">
        <div className="mx-auto max-w-3xl px-6 py-16 sm:py-20">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold-300">
            {eyebrow}
          </p>
          <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight text-white sm:text-5xl">
            {title}
          </h1>
          <p className="mt-4 text-sm text-navy-300">Last updated {updated}</p>
        </div>
      </section>

      <div className="brand-rule h-px" />

      <section className="mx-auto max-w-3xl px-6 py-14">
        <div className="space-y-8 text-sm leading-relaxed text-navy-700 [&_h2]:font-display [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-navy-900 [&_p]:mt-3 [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5 [&_strong]:font-semibold [&_strong]:text-navy-900">
          {children}
        </div>
        <p className="mt-12 rounded-xl border border-navy-100 bg-navy-50/60 p-4 text-xs text-navy-500">
          This is an illustrative document for a demonstration build. It is not legal advice and
          should be reviewed by qualified counsel before any production use.
        </p>
      </section>
    </>
  );
}
